import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface SslResponse {
  domain?: string;
  valid?: boolean;
  issuer?: string;
  subject?: string;
  validFrom?: string;
  validTo?: string;
  daysUntilExpiry?: number;
  sans?: string[];
  protocol?: string;
  cipher?: string;
  grade?: string;
  error?: string;
}

export function registerCheckSsl(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "check_ssl",
    {
      title: "Check SSL Certificate",
      description:
        "Inspect a domain's TLS/SSL certificate — issuer, validity dates, days until expiry, SANs, " +
        "protocol version, cipher. Flags expired, soon-to-expire (<30 days), or self-signed certs. " +
        "Use for devops monitoring and pre-launch verification.",
      inputSchema: {
        domain: z.string().min(1).max(255).describe("Hostname — 'example.com' (no scheme)"),
      },
    },
    async ({ domain }) => {
      try {
        const data = await client.request<SslResponse>("/v1/ssl", { body: { domain } });
        const status = data.valid === false
          ? `❌ Invalid — ${data.error ?? "unknown reason"}`
          : data.daysUntilExpiry !== undefined && data.daysUntilExpiry < 30
          ? `⚠️ Valid but expires in ${data.daysUntilExpiry} days`
          : "✅ Valid";
        const main = section("Certificate", [
          `**Status:** ${status}`,
          kv("Domain", data.domain ?? domain),
          kv("Issuer", data.issuer),
          kv("Subject", data.subject),
          kv("Valid from", data.validFrom),
          kv("Valid to", data.validTo),
          kv("Days until expiry", data.daysUntilExpiry),
          kv("Protocol", data.protocol),
          kv("Cipher", data.cipher),
          kv("Grade", data.grade),
        ]);
        const sans = data.sans?.length ? section("Subject Alternative Names", data.sans.map((s) => `- ${s}`)) : "";
        return { content: [{ type: "text", text: joinSections(`# SSL — ${data.domain ?? domain}`, main, sans) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
