/** `code`, [text](url) and **bold** — the only inline Markdown CHANGELOG.md and content files use. */
export const INLINE_TOKEN = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** The same line as plain text, for the agent view and feeds. */
export function inlineMarkdownToText(text: string): string {
  return text.replace(INLINE_TOKEN, (_m, code, label, _href, bold) => code ?? label ?? bold ?? '');
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The same line as HTML, for the feeds. */
export function inlineMarkdownToHtml(text: string): string {
  let html = '';
  let last = 0;
  for (const match of text.matchAll(INLINE_TOKEN)) {
    const at = match.index ?? 0;
    const [whole, code, label, href, bold] = match;
    html += escapeHtml(text.slice(last, at));
    if (code !== undefined) html += `<code>${escapeHtml(code)}</code>`;
    else if (label !== undefined) html += `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
    else html += `<strong>${escapeHtml(bold)}</strong>`;
    last = at + whole.length;
  }
  return html + escapeHtml(text.slice(last));
}
