import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { htmlToCleanMarkdown, plainTextToMarkdown } from "../adapters/markdown.js";

interface ScrapeResponse {
  url?: string;
  title?: string;
  lang?: string | null;
  content?: string;
  word_count?: number;
  headings?: { level: number; tag: string; text: string }[];
  links?: { count: number; items: { url: string; text: string }[] };
  images?: { count: number; items: unknown[] };
  type?: string;
  meta?: Record<string, string>;
}

export function registerScrapeUrl(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "scrape_url",
    {
      title: "Scrape URL as Markdown",
      description:
        "Fetch a web page and return its main readable content as clean Markdown. " +
        "Uses Mozilla Readability to strip navigation, footers, ads, and other boilerplate, " +
        "then converts the article body to Markdown optimized for LLM consumption. " +
        "Use this instead of `web_search` when you already know the URL and need to read the full content. " +
        "Executes JavaScript (headless Chrome) so it handles dynamic / SPA pages.",
      inputSchema: {
        url: z.string().url().describe("Full URL to scrape — must include https://"),
        wait_for: z
          .string()
          .max(500)
          .optional()
          .describe("CSS selector to wait for before extracting (for JS-heavy pages)"),
        delay: z.number().int().min(0).max(5000).optional().describe("Extra ms to wait after load (max 5000)"),
      },
    },
    async ({ url, wait_for, delay }) => {
      try {
        const data = await client.request<ScrapeResponse>("/v1/scrape", {
          body: { url, format: "html", wait_for, delay },
          timeoutMs: 45_000,
        });

        const raw = data.content ?? "";
        // When format=html the content is full HTML; pipe through Readability+Turndown.
        if (raw && /<[a-z][\s\S]*>/i.test(raw)) {
          const extracted = htmlToCleanMarkdown(raw, url);
          const header = [
            `# ${extracted.title ?? data.title ?? url}`,
            extracted.byline ? `_By ${extracted.byline}_` : null,
            extracted.siteName ? `_Source: ${extracted.siteName}_` : null,
            `_URL: ${data.url ?? url}_`,
            data.word_count ? `_~${data.word_count} words_` : null,
          ]
            .filter(Boolean)
            .join("\n");
          return { content: [{ type: "text", text: [header, "", extracted.markdown].join("\n") }] };
        }

        // Fallback: no HTML, just text content.
        const header = `# ${data.title ?? url}\n_URL: ${data.url ?? url}_${data.word_count ? `\n_~${data.word_count} words_` : ""}`;
        return { content: [{ type: "text", text: `${header}\n\n${plainTextToMarkdown(raw || JSON.stringify(data, null, 2))}` }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
