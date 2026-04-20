import type { Config } from "./config.js";
import { ToolCenterError } from "./errors.js";

export interface RequestOptions {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  body?: Record<string, unknown>;
  timeoutMs?: number;
  accept?: "json" | "binary";
}

export class ToolCenterClient {
  private readonly userAgent = "toolcenter-mcp/0.1.0";

  constructor(private readonly config: Config) {}

  async request<T = unknown>(path: string, opts: RequestOptions = {}): Promise<T> {
    const method = opts.method ?? (opts.body ? "POST" : "GET");
    const timeoutMs = opts.timeoutMs ?? 60_000;
    const accept = opts.accept ?? "json";

    const url = new URL(path.startsWith("/") ? path : `/${path}`, this.config.baseUrl);
    if (opts.query) {
      for (const [k, v] of Object.entries(opts.query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.config.apiKey}`,
      "User-Agent": this.userAgent,
      "Accept": accept === "binary" ? "*/*" : "application/json",
    };
    if (opts.body) headers["Content-Type"] = "application/json";

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) {
        throw new ToolCenterError(`Request timed out after ${timeoutMs}ms`, undefined, path);
      }
      throw new ToolCenterError(
        `Network error: ${err instanceof Error ? err.message : String(err)}`,
        undefined,
        path
      );
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      let detail = res.statusText;
      try {
        const data = await res.json();
        if (data?.error) detail = typeof data.error === "string" ? data.error : JSON.stringify(data.error);
        else if (data?.message) detail = data.message;
      } catch {
        // response body wasn't JSON — fall through to statusText
      }
      throw new ToolCenterError(detail || `HTTP ${res.status}`, res.status, path);
    }

    if (accept === "binary") {
      const buf = await res.arrayBuffer();
      return buf as unknown as T;
    }

    return (await res.json()) as T;
  }
}
