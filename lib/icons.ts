/**
 * Listing icons. scripts/fetch-icons.ts fetches each listing's icon, writes
 * public/icons/<slug>.png (128px) and public/icons/sm/<slug>.png (48px), and
 * records it in content/icons.json. The site and its APIs only ever serve
 * these copies, never a provider-hosted image.
 */

import { BASE_URL } from './env';

export interface IconRecord {
  /** First 8 hex chars of the 128px PNG's SHA-1, used as a cache-busting query. */
  v: string;
  /** Where the source image came from. */
  source: string;
  /** The source's shorter side, recorded only when it was under 64px. */
  px?: number;
}

/** Site path of a listing's 128px icon. */
export function iconPath(slug: string, icon: Pick<IconRecord, 'v'>): string {
  return `/icons/${slug}.png?v=${icon.v}`;
}

/** The `v` of an icon path from iconPath. */
export function iconVersion(iconUrl: string): string {
  return new URL(iconUrl, BASE_URL).searchParams.get('v') ?? '';
}

/** The 48px copy of an icon path, for icons shown at 32px or less. */
export function smallIconPath(iconUrl: string): string {
  return iconUrl.replace(/^\/icons\//, '/icons/sm/');
}

/** An icon's absolute URL for the public APIs, or null when the listing has none. */
export function absoluteIconUrl(iconUrl: string | undefined, base: string = BASE_URL): string | null {
  return iconUrl ? new URL(iconUrl, base).toString() : null;
}
