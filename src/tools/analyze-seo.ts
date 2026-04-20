import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface SeoIssue {
  severity?: "error" | "warning" | "notice" | string;
  category?: string;
  message?: string;
  recommendation?: string;
}

interface SeoResponse {
  url?: string;
  score?: number;
  grade?: string;
  issues?: SeoIssue[];
  meta?: Record<string, unknown>;
  headings?: Record<string, number>;
  links?: { internal?: number; external?: number; total?: number };
  images?: { total?: number; missing_alt?: number };
  performance?: { load_time_ms?: number; html_size_kb?: number };
}

export function registerAnalyzeSeo(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "analyze_seo",
    {
      title: "SEO Audit",
      description:
        "Analyze a URL for SEO issues and return a scored report. Checks title/description length, " +
        "heading structure, image alt attributes, link health, meta tags, canonical URL, robots.txt, " +
        "mobile viewport, load time. Returns errors/warnings grouped by severity with recommendations.",
      inputSchema: {
        url: z.string().url().describe("URL to audit"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<SeoResponse>("/v1/seo", { body: { url }, timeoutMs: 45_000 });
        const lines: string[] = [`# SEO Audit — ${url}`];
        if (data.score !== undefined) lines.push(`**Score:** ${data.score}/100${data.grade ? ` (${data.grade})` : ""}`);

        const byLevel: Record<string, SeoIssue[]> = {};
        for (const issue of data.issues ?? []) {
          const level = issue.severity ?? "notice";
          (byLevel[level] ??= []).push(issue);
        }
        for (const level of ["error", "warning", "notice"]) {
          const group = byLevel[level];
          if (!group?.length) continue;
          lines.push(`\n## ${level.charAt(0).toUpperCase() + level.slice(1)}s (${group.length})`);
          for (const i of group) {
            lines.push(`- **${i.category ?? "general"}**: ${i.message ?? ""}`);
            if (i.recommendation) lines.push(`  → _Fix:_ ${i.recommendation}`);
          }
        }

        const stats: string[] = [];
        if (data.headings) stats.push(`Headings: ${Object.entries(data.headings).map(([k, v]) => `${k}=${v}`).join(", ")}`);
        if (data.links) stats.push(`Links: ${data.links.internal ?? 0} internal, ${data.links.external ?? 0} external`);
        if (data.images) stats.push(`Images: ${data.images.total ?? 0} total, ${data.images.missing_alt ?? 0} missing alt`);
        if (data.performance?.load_time_ms) stats.push(`Load time: ${data.performance.load_time_ms}ms`);
        if (stats.length) lines.push("\n## Stats\n" + stats.map((s) => `- ${s}`).join("\n"));

        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
