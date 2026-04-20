import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface A11yIssue {
  type?: "error" | "warning" | "notice" | string;
  rule?: string;
  wcag?: string;
  message?: string;
  selector?: string;
  count?: number;
  details?: unknown;
}

interface A11yResponse {
  url?: string;
  score?: number;
  grade?: string;
  total_issues?: number;
  summary?: { errors?: number; warnings?: number; notices?: number };
  landmarks?: Record<string, number> | unknown[];
  issues?: A11yIssue[];
}

export function registerAnalyzeAccessibility(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "analyze_accessibility",
    {
      title: "Accessibility (a11y) Audit",
      description:
        "Run an axe-core accessibility audit on a URL. Reports WCAG violations grouped by impact " +
        "(critical/serious/moderate/minor) with the rule, description, and a link to the fix guide. " +
        "Use to check pages before launch or to monitor a11y regressions.",
      inputSchema: {
        url: z.string().url().describe("URL to audit for accessibility"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<A11yResponse>("/v1/accessibility", { body: { url }, timeoutMs: 60_000 });
        const lines: string[] = [`# Accessibility Audit — ${url}`];
        if (data.score !== undefined) {
          lines.push(`**Score:** ${data.score}/100${data.grade ? ` (grade ${data.grade})` : ""}`);
        }
        if (data.summary) {
          const s = data.summary;
          lines.push(`**Errors:** ${s.errors ?? 0} · **Warnings:** ${s.warnings ?? 0} · **Notices:** ${s.notices ?? 0}`);
        }

        const byType: Record<string, A11yIssue[]> = {};
        for (const issue of data.issues ?? []) {
          const t = issue.type ?? "notice";
          (byType[t] ??= []).push(issue);
        }
        for (const type of ["error", "warning", "notice"]) {
          const group = byType[type];
          if (!group?.length) continue;
          lines.push(`\n## ${type.charAt(0).toUpperCase() + type.slice(1)}s (${group.length})`);
          for (const i of group) {
            const tag = i.wcag ? ` [WCAG ${i.wcag}]` : "";
            const count = i.count && i.count > 1 ? ` _×${i.count}_` : "";
            lines.push(`- **${i.rule ?? "rule"}**${tag} — ${i.message ?? ""}${count}`);
            if (i.selector) lines.push(`  _selector:_ \`${i.selector}\``);
          }
        }

        const lmEntries = data.landmarks && typeof data.landmarks === "object" && !Array.isArray(data.landmarks)
          ? Object.entries(data.landmarks as Record<string, number>)
          : [];
        if (lmEntries.length) {
          lines.push(`\n## Landmarks`);
          for (const [k, v] of lmEntries) lines.push(`- ${k}: ${v}`);
        }

        if (!data.issues?.length) lines.push("\n_No issues detected. Nice work._");
        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
