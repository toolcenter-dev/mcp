import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface A11yViolation {
  id?: string;
  impact?: "minor" | "moderate" | "serious" | "critical" | string;
  description?: string;
  help?: string;
  helpUrl?: string;
  nodes?: unknown[];
}

interface A11yResponse {
  url?: string;
  score?: number;
  summary?: { violations?: number; passes?: number; incomplete?: number };
  violations?: A11yViolation[];
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
        if (data.score !== undefined) lines.push(`**Score:** ${data.score}/100`);
        if (data.summary) {
          const s = data.summary;
          lines.push(`**Violations:** ${s.violations ?? 0} · **Passes:** ${s.passes ?? 0} · **Incomplete:** ${s.incomplete ?? 0}`);
        }

        const byImpact: Record<string, A11yViolation[]> = {};
        for (const v of data.violations ?? []) {
          const i = v.impact ?? "minor";
          (byImpact[i] ??= []).push(v);
        }
        for (const impact of ["critical", "serious", "moderate", "minor"]) {
          const group = byImpact[impact];
          if (!group?.length) continue;
          lines.push(`\n## ${impact.charAt(0).toUpperCase() + impact.slice(1)} (${group.length})`);
          for (const v of group) {
            lines.push(`- **${v.id ?? "unknown"}** — ${v.description ?? v.help ?? ""}`);
            if (v.helpUrl) lines.push(`  [Fix guide](${v.helpUrl})`);
            if (v.nodes?.length) lines.push(`  _${v.nodes.length} affected element(s)_`);
          }
        }
        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
