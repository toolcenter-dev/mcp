import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";

import { registerWebSearch } from "./web-search.js";
import { registerScrapeUrl } from "./scrape-url.js";
import { registerScreenshot } from "./screenshot.js";
import { registerGetMetadata } from "./get-metadata.js";
import { registerUrlToPdf } from "./url-to-pdf.js";
import { registerWebsiteDiff } from "./website-diff.js";
import { registerAnalyzeSeo } from "./analyze-seo.js";
import { registerAnalyzeAccessibility } from "./analyze-accessibility.js";
import { registerCheckBrokenLinks } from "./check-broken-links.js";
import { registerDetectTechStack } from "./detect-tech-stack.js";
import { registerPreviewLink } from "./preview-link.js";
import { registerDnsLookup } from "./dns-lookup.js";
import { registerWhoisLookup } from "./whois-lookup.js";
import { registerCheckSsl } from "./check-ssl.js";
import { registerCheckStatus } from "./check-status.js";

export function registerAllTools(server: McpServer, client: ToolCenterClient) {
  registerWebSearch(server, client);
  registerScrapeUrl(server, client);
  registerScreenshot(server, client);
  registerGetMetadata(server, client);
  registerUrlToPdf(server, client);
  registerWebsiteDiff(server, client);
  registerAnalyzeSeo(server, client);
  registerAnalyzeAccessibility(server, client);
  registerCheckBrokenLinks(server, client);
  registerDetectTechStack(server, client);
  registerPreviewLink(server, client);
  registerDnsLookup(server, client);
  registerWhoisLookup(server, client);
  registerCheckSsl(server, client);
  registerCheckStatus(server, client);
}
