/** `code`, [text](url) and **bold** — the only inline Markdown CHANGELOG.md and content files use. */
export const INLINE_TOKEN = /`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*/g;

/** The same line as plain text, for the agent view and feeds. */
export function inlineMarkdownToText(text: string): string {
  return text.replace(INLINE_TOKEN, (_m, code, label, _href, bold) => code ?? label ?? bold ?? '');
}
