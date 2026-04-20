import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface LinkCheck {
  url?: string;
  text?: string;
  type?: "internal" | "external" | string;
  status?: number;
  ok?: boolean;
  redirected?: boolean;
  final_url?: string;
  response_time_ms?: number;
  error?: string;
}

interface BrokenLinksResponse {
  url?: string;
  scanned_at?: string;
  summary?: {
    total_links?: number;
    internal_links?: number;
    external_links?: number;
    broken?: number;
    redirects?: number;
    timeouts?: number;
    healthy?: number;
    broken_resources?: number;
    health_percentage?: number;
  };
  links?: LinkCheck[];
}

export function registerCheckBrokenLinks(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "check_broken_links",
    {
      title: "Find Broken Links",
      description:
        "Scan a page for broken (4xx/5xx/timeout) links. Returns a summary and the list of broken URLs " +
        "with their status codes. Great for site maintenance, pre-launch QA, and link-rot monitoring.",
      inputSchema: {
        url: z.string().url().describe("Page to scan for broken links"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<BrokenLinksResponse>("/v1/broken-links", { body: { url }, timeoutMs: 90_000 });
        const s = data.summary ?? {};
        const broken = (data.links ?? []).filter((l) => l.ok === false || (l.status !== undefined && l.status >= 400) || Boolean(l.error));
        const redirected = (data.links ?? []).filter((l) => l.redirected && l.ok !== false);
        const lines = [
          `# Broken link scan — ${data.url ?? url}`,
          `**Total:** ${s.total_links ?? data.links?.length ?? 0} ` +
            `(${s.internal_links ?? 0} internal, ${s.external_links ?? 0} external) · ` +
            `**Healthy:** ${s.healthy ?? 0} · **Broken:** ${s.broken ?? broken.length} · ` +
            `**Redirects:** ${s.redirects ?? redirected.length} · ` +
            `**Timeouts:** ${s.timeouts ?? 0}` +
            (s.health_percentage !== undefined ? ` · **Health:** ${s.health_percentage}%` : ""),
        ];

        if (broken.length === 0) {
          lines.push("\n_No broken links detected._");
        } else {
          lines.push(`\n## Broken (${broken.length})`);
          for (const l of broken.slice(0, 100)) {
            const label = l.text ? `"${l.text.slice(0, 60)}"` : l.url;
            lines.push(`- [${l.status ?? "timeout"}] ${label} → ${l.url}${l.error ? ` — ${l.error}` : ""}`);
          }
          if (broken.length > 100) lines.push(`\n_…and ${broken.length - 100} more_`);
        }

        if (redirected.length) {
          lines.push(`\n## Redirects (${redirected.length})`);
          for (const l of redirected.slice(0, 20)) {
            lines.push(`- ${l.url} → ${l.final_url ?? "?"}`);
          }
        }

        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
