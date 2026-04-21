import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface LinkPreviewResponse {
  url?: string;
  title?: string;
  description?: string;
  image?: string;
  favicon?: string;
  site_name?: string;
  type?: string;
  author?: string;
  published_at?: string;
}

export function registerPreviewLink(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "preview_link",
    {
      title: "Link Unfurl / Preview Card",
      description:
        "Generate a Slack/Discord-style link preview card for a URL — title, description, hero image, " +
        "favicon, site name, author. Lighter than `get_metadata` and formatted for UI display rather than " +
        "deep analysis. Useful when an agent needs to show a user what a URL contains.",
      inputSchema: {
        url: z.string().url().describe("URL to unfurl"),
      },
    },
    async ({ url }) => {
      try {
        const data = await client.request<LinkPreviewResponse>("/v1/link-preview", { body: { url } });
        const header = `# ${data.title ?? url}`;
        const info = section("Preview", [
          kv("URL", data.url ?? url),
          kv("Site", data.site_name),
          kv("Type", data.type),
          kv("Author", data.author),
          kv("Published", data.published_at),
          kv("Image", data.image),
          kv("Favicon", data.favicon),
        ]);
        const desc = data.description ? `> ${data.description}` : "";
        return { content: [{ type: "text", text: joinSections(header, desc, info) || "No preview data." }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
