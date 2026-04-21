import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { truncate } from "../adapters/truncate.js";

interface SearchResult {
  position: number;
  title: string | null;
  url: string | null;
  snippet: string | null;
  engine?: string | null;
  published_at?: string | null;
}

interface SearchResponse {
  query: string;
  category: string;
  total_results: number;
  returned_results: number;
  results: SearchResult[];
  suggestions?: string[];
  corrections?: string[];
  infoboxes?: { title?: string | null; content?: string | null; urls?: unknown[] }[];
}

export function registerWebSearch(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "web_search",
    {
      title: "Web Search",
      description:
        "Search the web and get ranked results with titles, URLs, and snippets. " +
        "Powered by aggregated search engines (Google, Bing, DuckDuckGo, Brave). " +
        "Best when you need fresh facts, news, or to find pages to read in detail with `scrape_url`. " +
        "Returns up to 50 results with position, title, URL, snippet, source engine, and published date if known.",
      inputSchema: {
        query: z.string().min(1).max(500).describe("Search query — e.g. 'claude 4 release date'"),
        category: z
          .enum(["general", "news", "images", "videos", "science", "it", "social_media"])
          .optional()
          .describe("Result category. Default: general. Use 'news' for recent events, 'science' for papers."),
        limit: z.number().int().min(1).max(50).optional().describe("Max results to return (default 10)"),
        time: z
          .enum(["day", "week", "month", "year"])
          .optional()
          .describe("Only results from the last day/week/month/year"),
        language: z.string().max(10).optional().describe("BCP-47 language code, e.g. 'en', 'es'"),
      },
    },
    async ({ query, category, limit, time, language }) => {
      try {
        const data = await client.request<SearchResponse>("/v1/search", {
          body: { query, category, limit, time, language },
        });
        const lines = [`# Web search: "${data.query}"`];
        if (data.results.length === 0) {
          lines.push("\n_No results._");
        } else {
          lines.push(`\n_${data.returned_results} results_\n`);
          for (const r of data.results) {
            lines.push(`## ${r.position}. ${r.title ?? "(no title)"}`);
            if (r.url) lines.push(`<${r.url}>`);
            if (r.snippet) lines.push(r.snippet);
            const meta: string[] = [];
            if (r.engine) meta.push(`source: ${r.engine}`);
            if (r.published_at) meta.push(`published: ${r.published_at}`);
            if (meta.length) lines.push(`_${meta.join(" · ")}_`);
            lines.push("");
          }
        }
        if (data.infoboxes?.length) {
          lines.push("## Knowledge panels");
          for (const box of data.infoboxes) {
            if (box.title) lines.push(`**${box.title}** — ${box.content ?? ""}`);
          }
        }
        if (data.suggestions?.length) {
          lines.push(`\n_Suggested queries: ${data.suggestions.join(", ")}_`);
        }
        return { content: [{ type: "text", text: truncate(lines.join("\n")) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
