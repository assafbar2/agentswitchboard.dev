export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Shorten text to at most `maxLength` characters, ellipsis included. The cut
 * falls on the last word boundary before the limit, never mid-word, and
 * dangling separators (",", ";", ":", dashes) are dropped. Only a single word
 * longer than the limit is cut mid-word, since there is no boundary to use.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const head = text.slice(0, Math.max(0, maxLength - 1));
  // The limit falls between words if the next character is whitespace;
  // otherwise back up to the last whitespace in the head.
  const lastSpace = /\s/.test(text[maxLength - 1] ?? '') ? head.length : head.search(/\s\S*$/);
  const cut = lastSpace > 0 ? head.slice(0, lastSpace).replace(/[\s,;:\-–—]+$/, '') : '';
  return (cut || head.trimEnd()) + '…';
}

export function authTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    apiKey: 'API Key',
    oauth2: 'OAuth 2.0',
    bearer: 'Bearer Token',
    none: 'None',
  };
  return labels[type] ?? type;
}
