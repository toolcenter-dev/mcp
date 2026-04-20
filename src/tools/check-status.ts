import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface StatusResponse {
  url?: string;
  final_url?: string | null;
  is_up?: boolean;
  status_code?: number;
  status_text?: string;
  method?: string;
  ip_address?: string | null;
  port?: number | null;
  is_https?: boolean;
  http_version?: string | null;
  content_type?: string | null;
  content_size?: number | null;
  server?: string | null;
  powered_by?: string | null;
  timing?: { dns_ms?: number; connect_ms?: number; tls_ms?: number; ttfb_ms?: number; total_ms?: number };
  redirect_count?: number;
  redirect_chain?: string[] | null;
  error?: string;
}

export function registerCheckStatus(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "check_status",
    {
      title: "Check URL Status (Uptime Ping)",
      description:
        "HTTP-ping a URL and report whether it's up, its status code, response time, any redirects, " +
        "and server headers. Use for quick uptime checks and debugging 3xx/4xx/5xx responses.",
      inputSchema: {
        url: z.string().url().describe("URL to check"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<StatusResponse>("/v1/status", { body: { url } });
        const emoji = data.is_up ? "✅" : "❌";
        const main = section("Status", [
          `**Result:** ${emoji} ${data.is_up ? "UP" : "DOWN"}`,
          kv("Status", `${data.status_code ?? "?"} ${data.status_text ?? ""}`.trim()),
          kv("Method", data.method),
          kv("Response time", data.timing?.total_ms !== undefined ? `${data.timing.total_ms}ms (TTFB ${data.timing.ttfb_ms ?? "?"}ms)` : undefined),
          kv("IP", data.ip_address ?? undefined),
          kv("HTTP", data.http_version),
          kv("HTTPS", data.is_https !== undefined ? (data.is_https ? "yes" : "no") : undefined),
          kv("Server", data.server ?? undefined),
          kv("Powered by", data.powered_by ?? undefined),
          kv("Content-Type", data.content_type ?? undefined),
          kv("Content size", data.content_size !== undefined && data.content_size !== null ? `${data.content_size} bytes` : undefined),
          kv("Final URL", data.final_url ?? undefined),
          data.error ? kv("Error", data.error) : "",
        ]);
        const redirects = data.redirect_chain?.length
          ? section(`Redirects (${data.redirect_count ?? data.redirect_chain.length})`, data.redirect_chain.map((u) => `- ${u}`))
          : "";
        return { content: [{ type: "text", text: joinSections(`# URL check — ${data.url ?? url}`, main, redirects) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
