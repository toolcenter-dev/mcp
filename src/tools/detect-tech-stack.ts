import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";

interface TechItem {
  name?: string;
  version?: string;
  category?: string;
  confidence?: number;
  website?: string;
}

interface TechResponse {
  url?: string;
  technologies?: TechItem[];
  categories?: Record<string, TechItem[]>;
}

export function registerDetectTechStack(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "detect_tech_stack",
    {
      title: "Detect Technology Stack",
      description:
        "Identify which frameworks, libraries, CMS, analytics, and hosting a website uses " +
        "(similar to Wappalyzer/BuiltWith). Returns technologies grouped by category with version " +
        "when detectable. Useful for competitor research and sales prospecting.",
      inputSchema: {
        url: z.string().url().describe("URL to fingerprint"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<TechResponse>("/v1/techstack", { body: { url }, timeoutMs: 30_000 });
        const lines: string[] = [`# Tech stack — ${url}`];

        const grouped: Record<string, TechItem[]> =
          data.categories ??
          (data.technologies ?? []).reduce((acc: Record<string, TechItem[]>, t) => {
            const cat = t.category ?? "other";
            (acc[cat] ??= []).push(t);
            return acc;
          }, {});

        const cats = Object.keys(grouped).sort();
        if (cats.length === 0) {
          lines.push("\n_No technologies detected._");
        } else {
          for (const cat of cats) {
            lines.push(`\n## ${cat}`);
            for (const t of grouped[cat]) {
              const ver = t.version ? ` v${t.version}` : "";
              const conf = t.confidence ? ` (${t.confidence}%)` : "";
              lines.push(`- **${t.name ?? "unknown"}**${ver}${conf}`);
            }
          }
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
