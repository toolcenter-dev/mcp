import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface MetadataResponse {
  url?: string;
  title?: string;
  description?: string;
  canonical?: string;
  favicon?: string;
  author?: string;
  keywords?: string[] | string;
  og?: Record<string, string>;
  twitter?: Record<string, string>;
  lang?: string;
  charset?: string;
  viewport?: string;
  robots?: string;
  image?: string;
  siteName?: string;
}

export function registerGetMetadata(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "get_metadata",
    {
      title: "Extract Page Metadata",
      description:
        "Extract title, description, Open Graph tags, Twitter Card data, canonical URL, favicon, " +
        "and author info from a web page. Much faster than `scrape_url` when you only need headline " +
        "information — perfect for link unfurls or quick context before deciding to read the full page.",
      inputSchema: {
        url: z.string().url().describe("Full URL to extract metadata from"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<MetadataResponse>("/v1/metadata", { body: { url } });
        const core = section("Core", [
          kv("Title", data.title),
          kv("Description", data.description),
          kv("Site", data.siteName),
          kv("Author", data.author),
          kv("Language", data.lang),
          kv("Canonical", data.canonical),
          kv("Favicon", data.favicon),
        ]);
        const og = data.og && Object.keys(data.og).length
          ? section("Open Graph", Object.entries(data.og).map(([k, v]) => kv(`og:${k}`, v)))
          : "";
        const tw = data.twitter && Object.keys(data.twitter).length
          ? section("Twitter Card", Object.entries(data.twitter).map(([k, v]) => kv(`twitter:${k}`, v)))
          : "";
        const tech = section("Technical", [
          kv("Charset", data.charset),
          kv("Viewport", data.viewport),
          kv("Robots", data.robots),
          kv("Keywords", data.keywords),
        ]);
        const text = joinSections(`# Metadata for ${url}`, core, og, tw, tech);
        return { content: [{ type: "text", text: text || "No metadata extracted." }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
