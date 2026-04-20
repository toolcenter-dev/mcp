const MAX_CHARS = 60_000;

export function truncate(text: string, max: number = MAX_CHARS): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const omitted = text.length - max;
  return `${cut}\n\n[… truncated ${omitted.toLocaleString()} chars]`;
}
