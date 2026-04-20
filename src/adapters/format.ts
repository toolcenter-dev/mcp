export function kv(label: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  if (Array.isArray(value) && value.length === 0) return "";
  return `**${label}:** ${formatValue(value)}`;
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => formatValue(x)).join(", ");
  if (typeof v === "object") return "```json\n" + JSON.stringify(v, null, 2) + "\n```";
  return String(v);
}

export function section(heading: string, lines: (string | null | undefined | false)[]): string {
  const body = lines.filter((l): l is string => Boolean(l && l.trim().length)).join("\n");
  if (!body) return "";
  return `### ${heading}\n${body}`;
}

export function bullet(text: string): string {
  return `- ${text}`;
}

export function joinSections(...sections: (string | null | undefined)[]): string {
  return sections
    .filter((s): s is string => Boolean(s && s.trim().length))
    .join("\n\n")
    .trim();
}
