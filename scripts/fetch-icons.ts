/**
 * Fetch, normalize and store a real icon for published listings.
 *
 *   npx tsx scripts/fetch-icons.ts              listings without an icon yet
 *   npx tsx scripts/fetch-icons.ts --all        refetch every listing
 *   npx tsx scripts/fetch-icons.ts <slug> ...   just these listings
 *   add --debug to log why each candidate image was passed over
 *
 * For each listing it tries, in order: a vendor-supplied `iconUrl`; the site
 * icons (apple-touch-icon, declared icons, web manifest, favicon) of agentUrl,
 * then providerUrl, so a product with its own brand beats its parent company;
 * the GitHub owner's avatar for GitHub-hosted listings, skipping generated
 * identicons; and finally Google's favicon service. A page on a hosting
 * platform (a GitHub repo, an npm package, a Smithery server, …) never counts
 * as the listing's site, but the platform's own home page does, so GitHub's
 * listings get GitHub's icon. Stock framework favicons are skipped.
 *
 * Sources must be at least 64px. A listing with nothing that large takes a
 * 32px source rather than no icon, and its manifest record notes the size.
 *
 * Accepted icons are fitted to a square and written as
 * public/icons/<slug>.png (128px) and public/icons/sm/<slug>.png (48px), and
 * recorded in content/icons.json, which lib/catalog.ts reads. SVGs are
 * rasterized, never served. Contact sheets of everything fetched in this run
 * are written to the OS temp dir for review before merging.
 *
 * Runs by hand or with the weekly drop — never at request time.
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';
import type { IconRecord } from '../lib/icons';

const ROOT = process.cwd();
const AGENTS_DIR = path.join(ROOT, 'content', 'agents');
const MANIFEST = path.join(ROOT, 'content', 'icons.json');
const ICON_DIR = path.join(ROOT, 'public', 'icons');
const SMALL_DIR = path.join(ICON_DIR, 'sm');
const REVIEW_DIR = path.join(os.tmpdir(), 'asb-icon-review');

const SIZE = 128;
const SMALL_SIZE = 48;
/** Smallest source side accepted on the first pass, then on the last-resort pass. */
const MIN_SOURCE = 64;
const MIN_SOURCE_LAST_RESORT = 32;
/** Sources are scaled down to this before trimming, which bounds memory for huge SVGs. */
const WORK_SIZE = 512;
/** Transparent space around a free-standing logo, per side, at SIZE. */
const LOGO_MARGIN = 10;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 12;
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const IMAGE_ACCEPT = 'image/avif,image/webp,image/png,image/svg+xml,image/*,*/*;q=0.8';
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const DEBUG = process.argv.includes('--debug');

/**
 * Hosts whose pages carry the platform's favicon, not the listing's: code and
 * package hosts, stores, social sites, MCP registries, and site builders that
 * serve their own default favicon. Static hosts such as github.io or
 * vercel.app are not here, since a site there sets its own favicon.
 */
const PLATFORM_HOSTS = [
  'github.com', 'githubusercontent.com', 'gitlab.com', 'bitbucket.org', 'codeberg.org',
  'npmjs.com', 'npmjs.org', 'pypi.org', 'crates.io', 'rubygems.org', 'pkg.go.dev', 'hub.docker.com',
  'huggingface.co', 'chromewebstore.google.com', 'chrome.google.com', 'addons.mozilla.org',
  'microsoftedge.microsoft.com', 'apps.apple.com', 'play.google.com', 'marketplace.visualstudio.com',
  'open-vsx.org', 'docs.google.com', 'sites.google.com', 'medium.com', 'substack.com', 'x.com',
  'twitter.com', 'linkedin.com', 'youtube.com', 'discord.com', 'discord.gg', 'reddit.com',
  'notion.site', 'replit.com', 'apify.com', 'rapidapi.com', 'postman.com', 'glama.ai', 'smithery.ai',
  'mcp.so', 'mcpservers.org', 'pulsemcp.com', 'lobehub.com', 'producthunt.com', 'gitbook.io',
  'readthedocs.io', 'mintlify.app', 'framer.website', 'webflow.io', 'wixsite.com', 'carrd.co',
  'linktr.ee', 'run.mcp-use.com',
];

/**
 * Stock icons that a starter template or site builder leaves on sites that
 * never set their own, by fingerprint. Each is still the right icon on its
 * owner's own listings. Print a fingerprint with `--fingerprint <image url>`.
 */
const STOCK_ICONS = [
  { hex: '71e8cc8c8ed4e871', owner: 'vercel.com' }, // create-next-app favicon (Vercel's mark)
  { hex: '71e8d49e94d4e071', owner: 'vercel.com' }, // create-next-app favicon, current template
  { hex: 'd496aa9696aa96d4', owner: 'react.dev' }, // create-react-app favicon
  { hex: '68d4d4f0e0d4d468', owner: 'react.dev' }, // create-react-app logo192
  { hex: '727169ccccf27292', owner: 'astro.build' }, // Astro starter favicon
  { hex: 'c0c09280ecb6c0e0', owner: 'lovable.dev' },
  { hex: '8084dac4e4aa4480', owner: 'wix.com' },
  { hex: '8a59d4aaaaf46186', owner: 'squarespace.com' },
  { hex: 'c8c4ba8696aed2d4', owner: 'webflow.com' },
  { hex: '71f0e8a8a496d071', owner: 'wordpress.org' }, // served at /favicon.ico by WordPress 5.4+
  { hex: 'b0f0e8a8a4d4d069', owner: 'wordpress.org' }, // the same, blue on white
  { hex: '71e8b2aa9696d471', owner: 'wordpress.com' },
];
/** Fingerprints this close (bits out of 64) are the same picture. */
const SAME_PICTURE = 6;

interface ListingFile {
  slug: string;
  name: string;
  status: string;
  iconUrl?: string;
  providerUrl?: string;
  agentUrl?: string;
}

type Manifest = Record<string, IconRecord>;

interface Candidate {
  url: string;
  /** Larger is tried first. */
  score: number;
}

interface Fetched {
  body: Buffer;
  finalUrl: string;
  type: string;
}

interface Found {
  png: Buffer;
  /** The source's shorter side (WORK_SIZE for SVGs). */
  px: number;
  source: string;
}

// ── Small helpers ───────────────────────────────────────────────────

function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/** A page hosted on a platform, as opposed to the platform's own home page. */
function isPlatformPage(url: string): boolean {
  const host = hostOf(url);
  const platform = host && PLATFORM_HOSTS.find((p) => host === p || host.endsWith(`.${p}`));
  if (!platform) return false;
  return host !== platform || new URL(url).pathname.replace(/\/+$/, '') !== '';
}

function sha1(buf: Buffer): string {
  return crypto.createHash('sha1').update(buf).digest('hex');
}

function debug(slug: string, url: string, why: string) {
  if (DEBUG) console.error(`  ${slug}: ${url} — ${why}`);
}

/** The body of a successful response, or why there is none. */
async function fetchWithLimit(url: string, accept: string): Promise<Fetched | string> {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': UA, accept },
    });
    if (!res.ok || !res.body) return `HTTP ${res.status}`;
    if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) return 'too large';
    const chunks: Buffer[] = [];
    let total = 0;
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      total += chunk.length;
      if (total > MAX_BYTES) return 'too large';
      chunks.push(Buffer.from(chunk));
    }
    return { body: Buffer.concat(chunks), finalUrl: res.url || url, type: res.headers.get('content-type') ?? '' };
  } catch (err) {
    return (err as Error).name === 'TimeoutError' ? 'timed out' : 'network error';
  }
}

function attr(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? (match[2] ?? match[3] ?? match[4] ?? '').trim() : null;
}

function largestDeclaredSize(sizes: string | null): number {
  if (!sizes) return 0;
  if (/any/i.test(sizes)) return 512;
  return Math.max(0, ...sizes.split(/\s+/).map((s) => Number.parseInt(s.split(/x/i)[0], 10) || 0));
}

function resolve(href: string, base: string): string | null {
  try {
    const url = new URL(href, base);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}

interface SiteIcons {
  /** The icons the page declares, plus the conventional root paths, best first. */
  candidates: Candidate[];
  /** The GitHub account the page links to most, if any is linked twice. */
  linkedGithubOwner: string | null;
}

const GITHUB_RESERVED = [
  'about', 'apps', 'collections', 'enterprise', 'features', 'join', 'login', 'marketplace', 'orgs',
  'pricing', 'site', 'solutions', 'sponsors', 'topics',
];

async function siteIcons(pageUrl: string): Promise<SiteIcons> {
  const candidates: Candidate[] = [];
  let linkedGithubOwner: string | null = null;
  const page = await fetchWithLimit(pageUrl, 'text/html,application/xhtml+xml');
  const base = typeof page === 'string' ? pageUrl : page.finalUrl;
  if (typeof page !== 'string' && /html/i.test(page.type)) {
    const html = page.body.toString('utf8').slice(0, 400_000);
    const owners = new Map<string, number>();
    for (const [, owner] of html.matchAll(/https?:\/\/(?:www\.)?github\.com\/([A-Za-z0-9][A-Za-z0-9-]{0,38})(?=[/"'?#\s<])/g)) {
      if (GITHUB_RESERVED.includes(owner.toLowerCase())) continue;
      owners.set(owner, (owners.get(owner) ?? 0) + 1);
    }
    const [top] = [...owners].sort((a, b) => b[1] - a[1]);
    if (top && top[1] >= 2) linkedGithubOwner = top[0];
    for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
      const rel = (attr(tag, 'rel') ?? '').toLowerCase();
      const href = attr(tag, 'href');
      if (!href) continue;
      if (rel.split(/\s+/).includes('manifest')) {
        const manifestUrl = resolve(href, base);
        const manifest = manifestUrl ? await fetchWithLimit(manifestUrl, 'application/manifest+json,application/json') : null;
        try {
          const icons = typeof manifest === 'object' && manifest ? JSON.parse(manifest.body.toString('utf8')).icons ?? [] : [];
          for (const icon of icons) {
            const url = typeof icon?.src === 'string' ? resolve(icon.src, manifestUrl ?? base) : null;
            if (url) candidates.push({ url, score: largestDeclaredSize(icon.sizes ?? null) + 5 });
          }
        } catch {
          // not JSON: ignore the manifest
        }
        continue;
      }
      if (!/\bicon\b|apple-touch-icon/.test(rel) || rel.includes('mask-icon')) continue;
      const url = resolve(href, base);
      if (!url) continue;
      const isSvg = /\.svg(\?|$)/i.test(url) || /svg/i.test(attr(tag, 'type') ?? '');
      // .ico files often claim sizes="any"; their frames are rarely large.
      const isIco = /\.ico(\?|$)/i.test(url);
      const appleTouch = rel.includes('apple-touch-icon');
      const declared = largestDeclaredSize(attr(tag, 'sizes'));
      candidates.push({ url, score: isSvg ? 400 : isIco ? 30 : declared || (appleTouch ? 180 : 32) });
    }
  }
  const origin = new URL(base).origin;
  candidates.push({ url: `${origin}/apple-touch-icon.png`, score: 170 });
  candidates.push({ url: `${origin}/favicon.ico`, score: 20 });
  const seen = new Set<string>();
  return {
    candidates: candidates
      .sort((a, b) => b.score - a.score)
      .filter((c) => (seen.has(c.url) ? false : (seen.add(c.url), true))),
    linkedGithubOwner,
  };
}

/** Whether a GitHub account is an organization, whose avatar is a logo, not a person. */
async function isGithubOrganization(owner: string): Promise<boolean> {
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  try {
    const res = await fetch(`https://api.github.com/users/${encodeURIComponent(owner)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'user-agent': 'agentswitchboard-icons', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    });
    return res.ok && (await res.json()).type === 'Organization';
  } catch {
    return false;
  }
}

// ── Decoding and normalizing ────────────────────────────────────────

interface Decodable {
  input: Buffer;
  /** Set when `input` is raw RGBA pixels rather than an encoded image. */
  raw?: { width: number; height: number; channels: 4 };
}

/** An uncompressed .ico bitmap frame (paletted, 24- or 32-bit) as raw RGBA. */
function bitmapFrame(dib: Buffer): Decodable | null {
  if (dib.length < 40) return null;
  const headerSize = dib.readUInt32LE(0);
  const width = dib.readInt32LE(4);
  const height = dib.readInt32LE(8) / 2; // the colour image, then a 1-bit AND mask
  const bits = dib.readUInt16LE(14);
  if (dib.readUInt32LE(16) !== 0 || ![1, 4, 8, 24, 32].includes(bits)) return null;
  if (width <= 0 || height <= 0 || !Number.isInteger(height)) return null;
  const paletteStart = headerSize;
  const pixelStart = paletteStart + (bits <= 8 ? (dib.readUInt32LE(32) || 1 << bits) * 4 : 0);
  const stride = Math.ceil((width * bits) / 32) * 4;
  const maskStride = Math.ceil(width / 32) * 4;
  const maskStart = pixelStart + stride * height;
  if (maskStart > dib.length) return null;

  const out = Buffer.alloc(width * height * 4);
  let hasAlpha = false;
  for (let y = 0; y < height; y++) {
    const row = pixelStart + (height - 1 - y) * stride; // rows are stored bottom-up
    for (let x = 0; x < width; x++) {
      let src: number;
      if (bits <= 8) {
        const bit = x * bits;
        const index = (dib[row + (bit >> 3)] >> (8 - bits - (bit & 7))) & ((1 << bits) - 1);
        src = paletteStart + index * 4;
      } else {
        src = row + x * (bits / 8);
      }
      const dst = (y * width + x) * 4;
      out[dst] = dib[src + 2];
      out[dst + 1] = dib[src + 1];
      out[dst + 2] = dib[src];
      out[dst + 3] = bits === 32 ? dib[src + 3] : 255;
      if (bits === 32 && dib[src + 3] > 0) hasAlpha = true;
    }
  }
  if (!hasAlpha && maskStart + maskStride * height <= dib.length) {
    for (let y = 0; y < height; y++) {
      const row = maskStart + (height - 1 - y) * maskStride;
      for (let x = 0; x < width; x++) {
        if ((dib[row + (x >> 3)] >> (7 - (x & 7))) & 1) out[(y * width + x) * 4 + 3] = 0;
      }
    }
  }
  return { input: out, raw: { width, height, channels: 4 } };
}

/** The largest frame of an .ico file, or null when the buffer is not one. */
function fromIco(buf: Buffer): Decodable | null {
  if (buf.length < 6 || buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) return null;
  let best: (Decodable & { size: number }) | null = null;
  for (let i = 0; i < buf.readUInt16LE(4); i++) {
    const entry = 6 + i * 16;
    if (entry + 16 > buf.length) break;
    const length = buf.readUInt32LE(entry + 8);
    const offset = buf.readUInt32LE(entry + 12);
    if (offset + length > buf.length) continue;
    const frame = buf.subarray(offset, offset + length);
    const decoded = frame.subarray(0, 8).equals(PNG_SIGNATURE) ? { input: frame } : bitmapFrame(frame);
    const size = buf[entry] || 256;
    if (decoded && (!best || size > best.size)) best = { ...decoded, size };
  }
  return best;
}

/**
 * A square 128px PNG from any supported image, or why the image will not do:
 * too small, too far from square, unreadable, blank, or too light to see on
 * white. Transparent margins are trimmed; opaque backgrounds are kept, so
 * app-style icons stay whole.
 */
async function normalize(raw: Buffer, minSource: number): Promise<Omit<Found, 'source'> | string> {
  const frame = fromIco(raw) ?? { input: raw };
  try {
    let sourceWidth: number;
    let sourceHeight: number;
    let isSvg = false;
    if (frame.raw) {
      sourceWidth = frame.raw.width;
      sourceHeight = frame.raw.height;
    } else {
      const meta = await sharp(frame.input, { failOn: 'none' }).metadata();
      if (!meta.width || !meta.height) return 'unreadable';
      sourceWidth = meta.width;
      sourceHeight = meta.height;
      isSvg = meta.format === 'svg';
    }
    const shorter = Math.min(sourceWidth, sourceHeight);
    if (!isSvg && shorter < minSource) return `too small (${sourceWidth}×${sourceHeight})`;
    if (Math.max(sourceWidth, sourceHeight) / shorter > 1.6) return `not square (${sourceWidth}×${sourceHeight})`;

    const density = isSvg ? Math.min(2400, Math.max(1, (72 * WORK_SIZE) / Math.max(sourceWidth, sourceHeight))) : undefined;
    const { data, info } = await sharp(frame.input, frame.raw ? { raw: frame.raw } : { failOn: 'none', density })
      .resize(WORK_SIZE, WORK_SIZE, { fit: 'inside', withoutEnlargement: true })
      .toColourspace('srgb')
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const alphaAt = (x: number, y: number) => data[(y * width + x) * channels + channels - 1];
    let top = height, left = width, right = -1, bottom = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (alphaAt(x, y) <= 8) continue;
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
    if (right < 0) return 'fully transparent';
    const box = { left, top, width: right - left + 1, height: bottom - top + 1 };
    if (Math.max(box.width, box.height) / Math.min(box.width, box.height) > 2.2) return 'a wordmark, not an icon';

    const cropped = await sharp(data, { raw: { width, height, channels } }).extract(box).png().toBuffer();
    const stats = await sharp(cropped).stats();
    if (Math.max(...stats.channels.map((c) => c.stdev)) < 4) return 'a flat colour';

    // Icons render on a white chip. A full-bleed tile (opaque corners) fills
    // it; a free-standing logo gets a margin, and one too light to see on
    // white is rejected so the next candidate gets a chance.
    const fullBleed = [
      [left, top], [right, top], [left, bottom], [right, bottom],
    ].every(([x, y]) => alphaAt(x, y) > 250);
    if (!fullBleed) {
      let sum = 0;
      let count = 0;
      for (let y = top; y <= bottom; y++) {
        for (let x = left; x <= right; x++) {
          const i = (y * width + x) * channels;
          if (data[i + channels - 1] < 128) continue;
          sum += 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
          count++;
        }
      }
      if (count > 0 && sum / count > 235) return 'too light to see on white';
    }

    const inner = fullBleed ? SIZE : SIZE - 2 * LOGO_MARGIN;
    const pad = (SIZE - inner) / 2;
    const png = await sharp(cropped)
      .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9, palette: true, quality: 90, effort: 10 })
      .toBuffer();
    return { png, px: isSvg ? WORK_SIZE : shorter };
  } catch (err) {
    return `unreadable (${(err as Error).message.split('\n')[0]})`;
  }
}

/**
 * A 64-bit difference hash of a normalized icon on white, as 16 hex digits.
 * Re-encoded or resized copies of one picture land within a few bits.
 */
async function fingerprint(png: Buffer): Promise<string> {
  const data = await sharp(png).flatten({ background: '#ffffff' }).greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let hex = '';
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x += 4) {
      let nibble = 0;
      for (let k = x; k < x + 4; k++) nibble = (nibble << 1) | (data[y * 9 + k] > data[y * 9 + k + 1] ? 1 : 0);
      hex += nibble.toString(16);
    }
  }
  return hex;
}

function bitsApart(a: string, b: string): number {
  let bits = 0;
  for (let i = 0; i < a.length; i++) {
    for (let diff = Number.parseInt(a[i], 16) ^ Number.parseInt(b[i], 16); diff; diff >>= 1) bits += diff & 1;
  }
  return bits;
}

/** Whether an icon is a stock icon on a listing whose sites are not its owner's. */
async function isStockIcon(png: Buffer, siteHosts: string[]): Promise<boolean> {
  const hash = await fingerprint(png);
  return STOCK_ICONS.some(
    ({ hex, owner }) =>
      !siteHosts.some((host) => host === owner || host.endsWith(`.${owner}`)) && bitsApart(hash, hex) <= SAME_PICTURE,
  );
}

/** GitHub's generated default avatar: one colour on #f0f0f0 in a 5×5 grid. */
async function isIdenticon(raw: Buffer): Promise<boolean> {
  try {
    const { data, info } = await sharp(raw)
      .resize(70, 70, { kernel: 'nearest' })
      .toColourspace('srgb')
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const colours = new Set<number>();
    for (let i = 0; i < data.length; i += info.channels) colours.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
    return colours.size <= 2 && colours.has(0xf0f0f0);
  } catch {
    return false;
  }
}

// ── Choosing a listing's icon ───────────────────────────────────────

/** One place an icon can come from, with its candidates fetched on first use. */
interface Source {
  candidates: () => Promise<Candidate[]>;
  isPlaceholder?: (raw: Buffer) => Promise<boolean>;
}

function lazy<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

function githubOwner(url: string | undefined): string | null {
  const host = hostOf(url);
  if (host?.endsWith('.github.io')) return host.slice(0, -'.github.io'.length);
  if (host !== 'github.com') return null;
  const owner = new URL(url!).pathname.split('/').filter(Boolean)[0];
  return owner && !GITHUB_RESERVED.includes(owner.toLowerCase()) ? owner : null;
}

function avatar(owner: string): Candidate[] {
  return [{ url: `https://github.com/${owner}.png?size=256`, score: 0 }];
}

async function iconFor(listing: ListingFile): Promise<Found | null> {
  const sites: string[] = [];
  for (const url of [listing.agentUrl, listing.providerUrl]) {
    const host = hostOf(url);
    if (!url || !host || isPlatformPage(url)) continue;
    if (sites.some((s) => hostOf(s) === host)) continue;
    sites.push(url);
  }
  const owner = githubOwner(listing.agentUrl) ?? githubOwner(listing.providerUrl);
  const vendorIcon = listing.iconUrl;
  const pages = sites.map((url) => lazy(() => siteIcons(url)));

  const sources: Source[] = [
    ...(vendorIcon ? [{ candidates: async () => [{ url: vendorIcon, score: 0 }] }] : []),
    ...pages.map((page) => ({ candidates: async () => (await page()).candidates })),
    {
      // The listing's own GitHub account, else the organization its site links to.
      candidates: lazy(async () => {
        if (owner) return avatar(owner);
        const home = sites[0] && new URL('/', sites[0]).toString();
        const homePage = home && !sites.includes(home) ? [lazy(() => siteIcons(home))] : [];
        for (const page of [...pages, ...homePage]) {
          const linked = (await page()).linkedGithubOwner;
          if (linked && (await isGithubOrganization(linked))) return avatar(linked);
        }
        return [];
      }),
      isPlaceholder: isIdenticon,
    },
    ...sites.map((url) => ({
      candidates: async () => [
        { url: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostOf(url)!)}&sz=128`, score: 0 },
      ],
    })),
  ];

  const downloads = new Map<string, Promise<Fetched | string>>();
  for (const minSource of [MIN_SOURCE, MIN_SOURCE_LAST_RESORT]) {
    for (const source of sources) {
      for (const { url } of await source.candidates()) {
        let pending = downloads.get(url);
        if (!pending) downloads.set(url, (pending = fetchWithLimit(url, IMAGE_ACCEPT)));
        const res = await pending;
        const skip =
          typeof res === 'string' ? res
          : /text\/html/i.test(res.type) ? 'an HTML page'
          : source.isPlaceholder && (await source.isPlaceholder(res.body)) ? 'a generated placeholder'
          : null;
        if (skip) {
          if (minSource === MIN_SOURCE) debug(listing.slug, url, skip);
          continue;
        }
        const result = await normalize((res as Fetched).body, minSource);
        if (typeof result === 'string') {
          debug(listing.slug, url, result);
        } else if (await isStockIcon(result.png, sites.map((s) => hostOf(s)!))) {
          debug(listing.slug, url, 'a stock framework icon');
        } else {
          return { ...result, source: url };
        }
      }
    }
  }
  return null;
}

// ── Contact sheets ──────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

async function writeContactSheets(entries: { label: string; png: Buffer }[]): Promise<string[]> {
  fs.mkdirSync(REVIEW_DIR, { recursive: true });
  const perSheet = 100;
  const cols = 10;
  const cell = { w: 120, h: 132 };
  const files: string[] = [];
  for (let start = 0; start < entries.length; start += perSheet) {
    const batch = entries.slice(start, start + perSheet);
    const rows = Math.ceil(batch.length / cols);
    const cells = batch
      .map(({ label, png }, i) => {
        const x = (i % cols) * cell.w;
        const y = Math.floor(i / cols) * cell.h;
        const text = label.length > 18 ? `${label.slice(0, 17)}…` : label;
        return (
          `<rect x="${x + 20}" y="${y + 8}" width="80" height="80" fill="#fff" stroke="#ccc"/>` +
          `<image x="${x + 24}" y="${y + 12}" width="72" height="72" href="data:image/png;base64,${png.toString('base64')}"/>` +
          `<text x="${x + 60}" y="${y + 108}" font-family="sans-serif" font-size="11" text-anchor="middle">${escapeXml(text)}</text>`
        );
      })
      .join('');
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${cols * cell.w}" height="${rows * cell.h}"><rect width="100%" height="100%" fill="#f4f4f4"/>${cells}</svg>`;
    const file = path.join(REVIEW_DIR, `sheet-${String(start / perSheet + 1).padStart(2, '0')}.png`);
    await sharp(Buffer.from(svg)).png().toFile(file);
    files.push(file);
  }
  return files;
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  if (args[0] === '--fingerprint') {
    for (const url of args.slice(1)) {
      const res = await fetchWithLimit(url, IMAGE_ACCEPT);
      const icon = typeof res === 'string' ? res : await normalize(res.body, MIN_SOURCE_LAST_RESORT);
      console.log(`${url}  ${typeof icon === 'string' ? icon : await fingerprint(icon.png)}`);
    }
    return;
  }
  const all = args.includes('--all');
  const only = new Set(args.filter((a) => !a.startsWith('--')));

  const manifest: Manifest = fs.existsSync(MANIFEST) ? JSON.parse(fs.readFileSync(MANIFEST, 'utf8')) : {};
  const listings: ListingFile[] = fs
    .readdirSync(AGENTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8')))
    .filter((l: ListingFile) => l.status === 'published');

  const queue = listings.filter((l) => {
    if (only.size > 0) return only.has(l.slug);
    if (all) return true;
    // New listings, and listings whose vendor-supplied icon changed.
    return !manifest[l.slug] || (l.iconUrl && manifest[l.slug].source !== l.iconUrl);
  });

  fs.mkdirSync(SMALL_DIR, { recursive: true });
  const fetched: { slug: string; png: Buffer }[] = [];
  const missed: string[] = [];
  let next = 0;

  async function worker() {
    while (next < queue.length) {
      const listing = queue[next++];
      const found = await iconFor(listing);
      if (!found) {
        missed.push(listing.slug);
        continue;
      }
      const small = await sharp(found.png).resize(SMALL_SIZE, SMALL_SIZE).png({ compressionLevel: 9, palette: true }).toBuffer();
      fs.writeFileSync(path.join(ICON_DIR, `${listing.slug}.png`), found.png);
      fs.writeFileSync(path.join(SMALL_DIR, `${listing.slug}.png`), small);
      manifest[listing.slug] = {
        v: sha1(found.png).slice(0, 8),
        source: found.source,
        ...(found.px < MIN_SOURCE ? { px: found.px } : {}),
      };
      fetched.push({ slug: listing.slug, png: found.png });
      process.stdout.write(fetched.length % 25 === 0 ? `  ${fetched.length} icons\n` : '');
    }
  }

  console.log(`Fetching icons for ${queue.length} of ${listings.length} published listings…`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Drop records and files for listings that are gone or no longer published.
  const published = new Set(listings.map((l) => l.slug));
  for (const slug of Object.keys(manifest)) {
    if (published.has(slug)) continue;
    delete manifest[slug];
    fs.rmSync(path.join(ICON_DIR, `${slug}.png`), { force: true });
    fs.rmSync(path.join(SMALL_DIR, `${slug}.png`), { force: true });
  }
  const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
  fs.writeFileSync(MANIFEST, JSON.stringify(sorted, null, 2) + '\n');

  fetched.sort((a, b) => a.slug.localeCompare(b.slug));
  // Low-resolution icons are starred on the sheets.
  const sheets = await writeContactSheets(
    fetched.map(({ slug, png }) => ({ label: sorted[slug].px ? `${slug}*` : slug, png })),
  );
  const coverage = Object.keys(sorted).length;
  const lowRes = fetched.filter(({ slug }) => sorted[slug].px).map(({ slug }) => slug);
  console.log(`\nFetched ${fetched.length} (${lowRes.length} from a source under ${MIN_SOURCE}px); no usable icon for ${missed.length}.`);
  console.log(`Coverage: ${coverage}/${listings.length} published listings (${Math.round((coverage / listings.length) * 100)}%).`);
  if (lowRes.length) console.log(`Low resolution: ${lowRes.join(', ')}`);
  if (missed.length) console.log(`No icon: ${missed.sort().join(', ')}`);

  // The same image on unrelated listings is usually a platform's default favicon.
  const byHash = new Map<string, string[]>();
  for (const { slug } of fetched) byHash.set(sorted[slug].v, [...(byHash.get(sorted[slug].v) ?? []), slug]);
  const shared = [...byHash.values()].filter((slugs) => slugs.length > 1);
  if (shared.length) {
    console.log('\nShared icons (check for platform defaults):');
    for (const slugs of shared) console.log(`  ${slugs.join(', ')}  ← ${sorted[slugs[0]].source}`);
  }
  if (sheets.length) console.log(`\nReview before merging:\n  ${sheets.join('\n  ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
