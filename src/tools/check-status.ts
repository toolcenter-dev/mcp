import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface StatusResponse {
  url?: string;
  up?: boolean;
  status?: number;
  statusText?: string;
  responseTimeMs?: number;
  ip?: string;
  server?: string;
  headers?: Record<string, string>;
  redirects?: { url: string; status: number }[];
  finalUrl?: string;
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
        const emoji = data.up ? "✅" : "❌";
        const main = section("Status", [
          `**Result:** ${emoji} ${data.up ? "UP" : "DOWN"}`,
          kv("Status", `${data.status ?? "?"} ${data.statusText ?? ""}`.trim()),
          kv("Response time", data.responseTimeMs !== undefined ? `${data.responseTimeMs}ms` : undefined),
          kv("IP", data.ip),
          kv("Server", data.server),
          kv("Final URL", data.finalUrl),
          data.error ? kv("Error", data.error) : "",
        ]);
        const redirects = data.redirects?.length
          ? section("Redirects", data.redirects.map((r) => `- [${r.status}] ${r.url}`))
          : "";
        return { content: [{ type: "text", text: joinSections(`# URL check — ${data.url ?? url}`, main, redirects) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
