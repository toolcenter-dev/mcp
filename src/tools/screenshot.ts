import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";

interface StoreResponse {
  status?: string;
  url?: string;
  storage_url?: string;
  mime_type?: string;
  file_size?: number;
  expires_at?: string;
  cached?: boolean;
}

export function registerScreenshot(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "screenshot",
    {
      title: "Take Screenshot",
      description:
        "Capture a screenshot of a web page and return a hosted URL to the image. " +
        "Supports full-page capture, custom viewport size, device emulation (iPhone/iPad/Pixel/etc.), " +
        "dark mode, ad/cookie-banner blocking. The returned URL is cached and can be shown to the user " +
        "or fetched later. Use when you need to visually verify what a page looks like.",
      inputSchema: {
        url: z.string().url().describe("Full URL to capture"),
        fullPage: z
          .boolean()
          .optional()
          .describe("Capture the entire scrollable page (default: only viewport)"),
        width: z.number().int().min(320).max(3840).optional().describe("Viewport width in px (default 1920)"),
        height: z.number().int().min(240).max(2160).optional().describe("Viewport height in px (default 1080)"),
        format: z.enum(["png", "jpg", "webp"]).optional().describe("Image format (default png)"),
        emulateDevice: z
          .enum([
            "iPhone 12",
            "iPhone 14",
            "iPhone 15",
            "iPhone 16",
            "iPad",
            "iPad Pro",
            "Pixel 7",
            "Samsung Galaxy S23",
            "MacBook Pro",
          ])
          .optional()
          .describe("Emulate a device preset (overrides width/height)"),
        darkMode: z.boolean().optional().describe("Render with prefers-color-scheme: dark"),
        blockAds: z.boolean().optional().describe("Block advertisement trackers before capture"),
        blockCookieBanners: z.boolean().optional().describe("Dismiss GDPR/cookie banners before capture"),
        delay: z.number().int().min(0).max(10_000).optional().describe("Ms to wait after load before capture"),
      },
    },
    async (args) => {
      try {
        const data = await client.request<StoreResponse>("/v1/screenshot", {
          body: { ...args, store: true, response_type: "json" },
          timeoutMs: 60_000,
        });
        if (!data.url) {
          return {
            content: [{ type: "text", text: `Screenshot succeeded but no URL returned: ${JSON.stringify(data)}` }],
          };
        }
        const lines = [
          `Screenshot saved: ${data.url}`,
          data.mime_type ? `Format: ${data.mime_type}` : null,
          data.file_size ? `Size: ${(data.file_size / 1024).toFixed(1)} KB` : null,
          data.expires_at ? `Expires: ${data.expires_at}` : null,
          data.cached ? "(served from cache)" : null,
        ]
          .filter(Boolean)
          .join("\n");
        return {
          content: [
            { type: "text", text: lines },
            { type: "resource_link", uri: data.url, name: "screenshot", mimeType: data.mime_type ?? "image/png" },
          ],
        };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
