// SEO, social cards and HTTP headers on the live site (read-only: GET/HEAD only).
// Source of truth: app/layout.tsx (root metadata), app/page.tsx, lib/share-cards.ts,
// lib/og.tsx, app/agents/[slug]/page.tsx, app/agents/[slug]/alternatives/, app/categories/[slug]/page.tsx,
// app/drops/, next.config.ts, proxy.ts.
import zlib from 'node:zlib';
import { test, expect } from './fixtures.mjs';

const ORIGIN = 'https://agentswitchboard.dev';
const UA = { 'user-agent': 'Mozilla/5.0 asb-e2e (seo-meta-headers)' };

// Pages covered by the per-page checks, with the share card each one hands out
// (lib/share-cards.ts). Slugs come from content/agents/*.json and
// content/categories.json.
const PAGES = [
  { path: '/', canonical: ORIGIN, card: '/card.png' },
  { path: '/about', canonical: `${ORIGIN}/about`, card: '/card.png' },
  { path: '/browse', canonical: `${ORIGIN}/browse`, card: '/card.png' },
  { path: '/for-agents', canonical: `${ORIGIN}/for-agents`, card: '/card.png' },
  { path: '/agents/11x-ai', canonical: `${ORIGIN}/agents/11x-ai`, card: '/agents/11x-ai/card.png' },
  {
    path: '/agents/livekit-agents/alternatives',
    canonical: `${ORIGIN}/agents/livekit-agents/alternatives`,
    card: '/agents/livekit-agents/alternatives/card.png',
  },
  { path: '/categories/language', canonical: `${ORIGIN}/categories/language`, card: '/categories/language/card.png' },
  {
    path: '/categories/code-devtools',
    canonical: `${ORIGIN}/categories/code-devtools`,
    card: '/categories/code-devtools/card.png',
  },
  { path: '/drops', canonical: `${ORIGIN}/drops`, card: '/card.png' },
  { path: '/drops/2026-10-31', canonical: `${ORIGIN}/drops/2026-10-31`, card: '/drops/2026-10-31/card.png' },
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---------- helpers ----------
const htmlCache = new Map();
async function getHtml(request, path) {
  if (htmlCache.has(path)) return htmlCache.get(path);
  const res = await request.get(path, { headers: UA });
  expect(res.status(), `GET ${path}`).toBe(200);
  const html = await res.text();
  htmlCache.set(path, html);
  return html;
}

function decode(s) {
  return s
    .replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&amp;/g, '&');
}

function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) out[m[1].toLowerCase()] = decode(m[2]);
  return out;
}

function head(html) {
  const metas = [...html.matchAll(/<meta\s[^>]*>/g)].map((m) => attrs(m[0]));
  const links = [...html.matchAll(/<link\s[^>]*>/g)].map((m) => attrs(m[0]));
  const meta = (key) => {
    const hit = metas.find((a) => a.property === key || a.name === key);
    return hit ? hit.content : undefined;
  };
  const titleM = html.match(/<title>([^<]*)<\/title>/);
  return {
    title: titleM ? decode(titleM[1]) : undefined,
    meta,
    canonical: links.find((l) => l.rel === 'canonical')?.href,
    icon: links.find((l) => l.rel === 'icon'),
  };
}

function pngSize(buf) {
  // 8-byte signature, then IHDR: length(4) "IHDR"(4) width(4) height(4)
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buf.subarray(12, 16).toString('ascii')).toBe('IHDR');
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

// Minimal PNG decoder for 8-bit RGB/RGBA non-interlaced images (what ImageResponse emits).
function pngPixel(buf, x, y) {
  const { width, height } = pngSize(buf);
  const bitDepth = buf[24];
  const colorType = buf[25];
  const interlace = buf[28];
  expect(bitDepth).toBe(8);
  expect([2, 6]).toContain(colorType);
  expect(interlace).toBe(0);
  const bpp = colorType === 6 ? 4 : 3;
  const idat = [];
  let off = 8;
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const type = buf.subarray(off + 4, off + 8).toString('ascii');
    if (type === 'IDAT') idat.push(buf.subarray(off + 8, off + 8 + len));
    if (type === 'IEND') break;
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  let prev = Buffer.alloc(stride);
  let row = Buffer.alloc(stride);
  for (let r = 0; r <= y && r < height; r++) {
    const ft = raw[r * (stride + 1)];
    const line = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1));
    row = Buffer.alloc(stride);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? row[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      if (ft === 1) v += a;
      else if (ft === 2) v += b;
      else if (ft === 3) v += (a + b) >> 1;
      else if (ft === 4) {
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      row[i] = v & 0xff;
    }
    prev = row;
  }
  const i = x * bpp;
  return [row[i], row[i + 1], row[i + 2]];
}

const near = (rgb, target, tol = 6) => rgb.every((v, i) => Math.abs(v - target[i]) <= tol);

// ---------- per-page tests ----------
test.describe('per-page head metadata', () => {
  for (const p of PAGES) {
    test(`${p.path}: canonical is absolute on agentswitchboard.dev and self-referencing`, async ({ page }) => {
      const h = head(await getHtml(page.request, p.path));
      expect(h.canonical).toBe(p.canonical);
    });

    test(`${p.path}: og:title, og:description and og:url (matching canonical) are present`, async ({ page }) => {
      const h = head(await getHtml(page.request, p.path));
      expect.soft(h.meta('og:title'), 'og:title').toBeTruthy();
      expect.soft(h.meta('og:description'), 'og:description').toBeTruthy();
      expect(h.meta('og:url'), 'og:url (one of the four required Open Graph properties)').toBe(p.canonical);
    });

    test(`${p.path}: has og:image and twitter:image (${p.card}) with twitter:card summary_large_image`, async ({ page }) => {
      const h = head(await getHtml(page.request, p.path));
      const card = new RegExp(`^${escape(ORIGIN + p.card)}\\?`);
      expect.soft(h.meta('twitter:card')).toBe('summary_large_image');
      expect.soft(h.meta('og:image'), 'og:image').toMatch(card);
      expect(h.meta('twitter:image'), 'twitter:image').toMatch(card);
    });

    test(`${p.path}: twitter:image is the same versioned URL as og:image (so X refetches a changed card)`, async ({ page }) => {
      // X caches the card image by URL. lib/share-cards.ts adds ?v=<hash of the
      // card's design and data>; a bare card URL never changes when the image
      // does, so X would keep showing the old card.
      const h = head(await getHtml(page.request, p.path));
      const tw = h.meta('twitter:image');
      expect(tw, 'twitter:image carries a cache-busting version').toMatch(/\/card\.png\?v=[0-9a-f]{8}$/);
      expect(tw).toBe(h.meta('og:image'));
    });
  }
});

// ---------- titles / descriptions ----------
test('home: title and meta description match the root metadata in app/layout.tsx', async ({ page }) => {
  const h = head(await getHtml(page.request, '/'));
  expect(h.title).toBe('Agent Switchboard — AI Agent Directory');
  expect(h.meta('description')).toBe(
    'Browse, compare, and integrate AI agents with real API, MCP, and CLI access. The curated directory for developers building on the agentic web.'
  );
});

test('titles are unique across the covered pages', async ({ page }) => {
  const titles = [];
  for (const p of PAGES) titles.push(head(await getHtml(page.request, p.path)).title);
  expect(titles.every(Boolean)).toBe(true);
  expect(new Set(titles).size).toBe(titles.length);
});

test('no page title repeats the brand ("… Agent Switchboard | Agent Switchboard")', async ({ page }) => {
  const bad = [];
  for (const p of PAGES) {
    const t = head(await getHtml(page.request, p.path)).title;
    if ((t.match(/Agent Switchboard/g) || []).length > 1) bad.push(`${p.path}: ${t}`);
  }
  expect(bad).toEqual([]);
});

test('meta descriptions are present and unique across the covered pages', async ({ page }) => {
  const descs = [];
  for (const p of PAGES) descs.push(head(await getHtml(page.request, p.path)).meta('description'));
  expect(descs.every((d) => d && d.length > 30)).toBe(true);
  expect(new Set(descs).size).toBe(descs.length);
});

test('agent page: og:title follows "<name> — <category> AI Agent"', async ({ page }) => {
  const h = head(await getHtml(page.request, '/agents/11x-ai'));
  expect(h.title).toBe('11x AI | Agent Switchboard');
  expect(h.meta('og:title')).toBe('11x AI — Sales & Marketing AI Agent');
});

// ---------- the card image itself ----------
test('home og:image: meta width/height/type declare a 1200x630 PNG', async ({ page }) => {
  const h = head(await getHtml(page.request, '/'));
  expect(h.meta('og:image:width')).toBe('1200');
  expect(h.meta('og:image:height')).toBe('630');
  expect(h.meta('og:image:type')).toBe('image/png');
});

for (const key of ['og:image', 'twitter:image']) {
  test(`home ${key} URL returns 200 image/png and the PNG is 1200x630`, async ({ page }) => {
    const h = head(await getHtml(page.request, '/'));
    const url = h.meta(key);
    expect(url).toBeTruthy();
    test.info().annotations.push({ type: key, description: url });
    const res = await page.request.get(url, { headers: UA });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toMatch(/^image\/png/);
    expect(pngSize(await res.body())).toEqual({ width: 1200, height: 630 });
  });
}

test('card image is the current directory design (yellow name block on white), not the old dark card', async ({ page }) => {
  const h = head(await getHtml(page.request, '/'));
  const buf = await (await page.request.get(h.meta('twitter:image'), { headers: UA })).body();
  // lib/og.tsx: YELLOW #FFD400 block at top-left, PAPER #ffffff elsewhere.
  // The previous card (aa8913c) was a #0a0a0f dark background.
  expect(near(pngPixel(buf, 10, 10), [0xff, 0xd4, 0x00]), 'top-left is signal yellow').toBe(true);
  expect(near(pngPixel(buf, 1180, 60), [0xff, 0xff, 0xff]), 'top-right is white paper').toBe(true);
});

test("a listing's card is its own image, not the site card", async ({ page }) => {
  const get = async (path) => {
    const url = head(await getHtml(page.request, path)).meta('og:image');
    const res = await page.request.get(url, { headers: UA });
    expect(res.status(), url).toBe(200);
    expect(pngSize(await res.body())).toEqual({ width: 1200, height: 630 });
    return (await res.body()).toString('base64');
  };
  expect(await get('/agents/11x-ai')).not.toBe(await get('/'));
});

test('the pre-2.2 card URL /opengraph-image permanently redirects to the site card', async ({ page }) => {
  const res = await page.request.get('/opengraph-image', { headers: UA, maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toMatch(/^(https:\/\/agentswitchboard\.dev)?\/card\.png$/);
});

// ---------- JSON-LD ----------
for (const path of ['/', '/agents/11x-ai', '/categories/language']) {
  test(`${path}: every JSON-LD block parses and declares @context schema.org`, async ({ page }) => {
    const html = await getHtml(page.request, path);
    const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    expect(blocks.length).toBeGreaterThan(0);
    for (const b of blocks) {
      const data = JSON.parse(b);
      const items = Array.isArray(data) ? data : [data];
      for (const it of items) {
        expect(String(it['@context'])).toMatch(/schema\.org/);
        expect(it['@type']).toBeTruthy();
      }
    }
  });
}

// ---------- favicon ----------
test('favicon: head links /icon.svg and it returns 200 image/svg+xml', async ({ page }) => {
  const h = head(await getHtml(page.request, '/'));
  expect(h.icon?.href).toMatch(/^\/icon\.svg/);
  const res = await page.request.get('/icon.svg', { headers: UA });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^image\/svg\+xml/);
  expect(await res.text()).toContain('<svg');
});

// ---------- HTTP headers ----------
test('HTML pages answer text/html; charset=utf-8', async ({ page }) => {
  for (const p of PAGES) {
    const res = await page.request.get(p.path, { headers: UA });
    expect.soft(res.headers()['content-type'], p.path).toBe('text/html; charset=utf-8');
  }
});

test('HSTS is set with max-age of at least one year', async ({ page }) => {
  const res = await page.request.get('/', { headers: UA });
  const hsts = res.headers()['strict-transport-security'];
  expect(hsts).toBeTruthy();
  expect(Number(hsts.match(/max-age=(\d+)/)[1])).toBeGreaterThanOrEqual(31536000);
});

test('/ HTML response carries Vary: Accept (next.config.ts headers + proxy.ts)', async ({ page }) => {
    // Known gap: Vercel's prerendered HTML drops Vary: Accept (see next.config.ts).
    // Marked as expected to fail, so it flags the day the header comes through.
    test.fail();
  const res = await page.request.get('/', { headers: { ...UA, accept: 'text/html' } });
  expect(res.headers()['content-type']).toMatch(/text\/html/);
  expect(res.headers()['vary'] || '').toMatch(/\bAccept\b(?!-)/i);
});

test('/ with Accept: text/markdown answers Markdown with Vary: Accept', async ({ page }) => {
  const res = await page.request.get('/', { headers: { ...UA, accept: 'text/markdown' } });
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toMatch(/^text\/markdown/);
  expect(res.headers()['vary']).toMatch(/\bAccept\b/);
  expect((await res.text()).startsWith('# Agent Switchboard')).toBe(true);
});

test('/skill.md and /openapi.json send the CORS headers from next.config.ts', async ({ page }) => {
  const skill = await page.request.get('/skill.md', { headers: UA });
  expect.soft(skill.headers()['content-type']).toBe('text/markdown; charset=utf-8');
  expect.soft(skill.headers()['access-control-allow-origin']).toBe('*');
  const oa = await page.request.get('/openapi.json', { headers: UA });
  expect.soft(oa.headers()['access-control-allow-origin']).toBe('*');
  expect(oa.headers()['access-control-allow-methods']).toBe('GET, OPTIONS');
});

test('/tos permanently redirects to /terms (next.config.ts redirects)', async ({ page }) => {
  const res = await page.request.get('/tos', { headers: UA, maxRedirects: 0 });
  expect(res.status()).toBe(308);
  expect(res.headers()['location']).toMatch(/^(https:\/\/agentswitchboard\.dev)?\/terms$/);
});

test('unknown agent slug answers 404 with robots noindex', async ({ page }) => {
  const res = await page.request.get('/agents/asb-e2e-does-not-exist', { headers: UA });
  expect(res.status()).toBe(404);
  expect(head(await res.text()).meta('robots')).toMatch(/noindex/);
});

test('robots.txt allows crawling and points at the absolute sitemap', async ({ page }) => {
  const res = await page.request.get('/robots.txt', { headers: UA });
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/Allow: \/\s/);
  expect(body).toContain('Sitemap: https://agentswitchboard.dev/sitemap.xml');
});

// ---------- transport ----------
test('http:// permanently redirects to https:// on the same path', async ({ page }) => {
  const res = await page.request.get('http://agentswitchboard.dev/about', { headers: UA, maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers()['location']).toBe('https://agentswitchboard.dev/about');
});

test('www host either redirects to the apex or canonicalises to it', async ({ page }) => {
  const res = await page.request.get('https://www.agentswitchboard.dev/about', { headers: UA, maxRedirects: 0 });
  const status = res.status();
  test.info().annotations.push({ type: 'www behaviour', description: `status ${status} location ${res.headers()['location'] || '-'}` });
  if (status >= 300 && status < 400) {
    expect(res.headers()['location']).toMatch(/^https:\/\/agentswitchboard\.dev\/about$/);
  } else {
    expect(status).toBe(200);
    expect(head(await res.text()).canonical).toBe('https://agentswitchboard.dev/about');
  }
});

test('home responds in under 3s', async ({ page }) => {
  const t0 = Date.now();
  const res = await page.request.get('/', { headers: UA });
  await res.body();
  const ms = Date.now() - t0;
  test.info().annotations.push({ type: 'home ms', description: String(ms) });
  expect(res.status()).toBe(200);
  expect(ms).toBeLessThan(3000);
});
