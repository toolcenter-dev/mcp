import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface LinkCheck {
  url?: string;
  status?: number;
  ok?: boolean;
  error?: string;
  type?: "internal" | "external" | string;
}

interface BrokenLinksResponse {
  url?: string;
  total?: number;
  broken?: number;
  working?: number;
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
        const broken = (data.links ?? []).filter((l) => l.ok === false || (l.status && l.status >= 400));
        const lines = [
          `# Broken link scan — ${url}`,
          `**Total:** ${data.total ?? data.links?.length ?? 0} · **Working:** ${data.working ?? 0} · **Broken:** ${data.broken ?? broken.length}`,
        ];
        if (broken.length === 0) {
          lines.push("\n_No broken links detected._");
        } else {
          lines.push("\n## Broken");
          for (const l of broken.slice(0, 100)) {
            lines.push(`- [${l.status ?? "?"}] ${l.url ?? ""}${l.error ? ` — ${l.error}` : ""}`);
          }
          if (broken.length > 100) lines.push(`\n_…and ${broken.length - 100} more_`);
        }
        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
