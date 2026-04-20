import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface DiffResponse {
  mode?: string;
  url1?: string;
  url2?: string;
  changes?: {
    added?: string[];
    removed?: string[];
    modified?: { before?: string; after?: string }[];
  };
  summary?: {
    added_count?: number;
    removed_count?: number;
    modified_count?: number;
    similarity?: number;
  };
  text_diff?: string;
}

export function registerWebsiteDiff(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "website_diff",
    {
      title: "Compare Two Web Pages",
      description:
        "Diff two URLs and get a summary of what changed — added lines, removed lines, modified sections. " +
        "Modes: 'text' (visible content only), 'structure' (DOM/HTML structural changes), " +
        "'full' (both). Great for competitor monitoring, change detection, and verifying deployments.",
      inputSchema: {
        url1: z.string().url().describe("First URL"),
        url2: z.string().url().describe("Second URL to compare against url1"),
        mode: z
          .enum(["full", "text", "structure", "visual"])
          .optional()
          .describe("What to diff — 'text' for content only (default), 'structure' for HTML changes"),
      },
    },
    async ({ url1, url2, mode }) => {
      try {
        const data = await client.request<DiffResponse>("/v1/diff", {
          body: { url1, url2, mode: mode ?? "text" },
          timeoutMs: 60_000,
        });
        const parts: string[] = [`# Diff: ${url1} → ${url2}`];
        if (data.summary) {
          const s = data.summary;
          parts.push(
            `**Added:** ${s.added_count ?? 0}  ·  **Removed:** ${s.removed_count ?? 0}  ·  **Modified:** ${s.modified_count ?? 0}` +
              (s.similarity !== undefined ? `  ·  **Similarity:** ${(s.similarity * 100).toFixed(1)}%` : "")
          );
        }
        if (data.changes?.added?.length) {
          parts.push("## Added\n" + data.changes.added.slice(0, 30).map((l) => `+ ${l}`).join("\n"));
        }
        if (data.changes?.removed?.length) {
          parts.push("## Removed\n" + data.changes.removed.slice(0, 30).map((l) => `- ${l}`).join("\n"));
        }
        if (data.changes?.modified?.length) {
          parts.push(
            "## Modified\n" +
              data.changes.modified
                .slice(0, 15)
                .map((m) => `- **Before:** ${m.before ?? ""}\n  **After:** ${m.after ?? ""}`)
                .join("\n")
          );
        }
        if (!data.changes && data.text_diff) parts.push(data.text_diff);
        return { content: [{ type: "text", text: truncate(parts.join("\n\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
