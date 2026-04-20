import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";

interface StoreResponse {
  url?: string;
  hash?: string;
  mime?: string;
  size?: number;
}

export function registerUrlToPdf(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "url_to_pdf",
    {
      title: "Convert URL to PDF",
      description:
        "Render a web page to a PDF document and return the hosted file URL. " +
        "Supports page size (A4/Letter/etc.), orientation, custom margins, headers/footers. " +
        "Use for generating reports, archiving pages, or producing printable documentation.",
      inputSchema: {
        url: z.string().url().describe("URL to convert to PDF"),
        format: z.enum(["A4", "A3", "A5", "Letter", "Legal", "Tabloid"]).optional().describe("Page size (default A4)"),
        landscape: z.boolean().optional().describe("Landscape orientation (default false)"),
        printBackground: z.boolean().optional().describe("Include CSS backgrounds (default true for styled pages)"),
        scale: z.number().min(0.1).max(2).optional().describe("Zoom factor (0.1–2, default 1)"),
        darkMode: z.boolean().optional().describe("Render with dark mode"),
      },
    },
    async (args) => {
      try {
        const data = await client.request<StoreResponse>("/v1/pdf", {
          body: { ...args, store: true, response_type: "json" },
          timeoutMs: 60_000,
        });
        if (!data.url) {
          return { content: [{ type: "text", text: `PDF succeeded but no URL: ${JSON.stringify(data)}` }] };
        }
        return {
          content: [
            {
              type: "text",
              text: `PDF saved: ${data.url}${data.size ? `\nSize: ${(data.size / 1024).toFixed(1)} KB` : ""}`,
            },
            { type: "resource_link", uri: data.url, name: "document.pdf", mimeType: "application/pdf" },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
