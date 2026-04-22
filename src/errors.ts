export class ToolCenterError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly endpoint?: string
  ) {
    super(message);
    this.name = "ToolCenterError";
  }
}

export function formatToolError(err: unknown): string {

  if (err instanceof ToolCenterError) {
    const parts = [err.message];
    if (err.status) parts.push(`HTTP ${err.status}`);
    if (err.endpoint) parts.push(`endpoint: ${err.endpoint}`);
    return `ToolCenter error — ${parts.join(" · ")}`;
  }
  if (err instanceof Error) return `Error: ${err.message}`;
  return `Unknown error: ${String(err)}`;
}
