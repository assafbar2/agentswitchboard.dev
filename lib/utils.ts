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

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1).trimEnd() + '…';
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
