import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface SslResponse {
  domain?: string;
  port?: number;
  has_ssl?: boolean;
  valid?: boolean;
  domain_matches?: boolean;
  grade?: string;
  issuer?: { common_name?: string | null; organization?: string | null };
  subject?: string | null;
  cert_type?: string | null;
  is_self_signed?: boolean;
  valid_from?: string;
  valid_to?: string;
  days_remaining?: number;
  lifetime_days?: number;
  serial_number?: string | null;
  signature_algorithm?: string | null;
  key?: { type?: string; bits?: number };
  san_domains?: string[];
  protocol?: string | null;
  cipher?: string | null;
  cipher_bits?: number | null;
  warnings?: string[];
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
        const status = data.has_ssl === false
          ? `❌ No SSL — ${data.error ?? "could not connect"}`
          : data.valid === false
          ? `❌ Invalid — ${data.error ?? (data.warnings?.[0] ?? "unknown reason")}`
          : data.days_remaining !== undefined && data.days_remaining < 30
          ? `⚠️ Valid but expires in ${data.days_remaining} days`
          : "✅ Valid";
        const issuerStr = data.issuer
          ? [data.issuer.common_name, data.issuer.organization].filter(Boolean).join(" / ")
          : undefined;
        const keyStr = data.key ? [data.key.type, data.key.bits ? `${data.key.bits}-bit` : null].filter(Boolean).join(" ") : undefined;
        const cipherStr = data.cipher
          ? `${data.cipher}${data.cipher_bits ? ` (${data.cipher_bits}-bit)` : ""}`
          : undefined;
        const main = section("Certificate", [
          `**Status:** ${status}`,
          kv("Domain", data.domain ?? domain),
          kv("Domain matches", data.domain_matches !== undefined ? (data.domain_matches ? "yes" : "no") : undefined),
          kv("Grade", data.grade),
          kv("Issuer", issuerStr),
          kv("Subject", data.subject ?? undefined),
          kv("Cert type", data.cert_type ?? undefined),
          kv("Self-signed", data.is_self_signed !== undefined ? (data.is_self_signed ? "yes" : "no") : undefined),
          kv("Valid from", data.valid_from),
          kv("Valid to", data.valid_to),
          kv("Days remaining", data.days_remaining),
          kv("Lifetime", data.lifetime_days ? `${data.lifetime_days} days` : undefined),
          kv("Key", keyStr),
          kv("Protocol", data.protocol ?? undefined),
          kv("Cipher", cipherStr),
          kv("Signature", data.signature_algorithm ?? undefined),
        ]);
        const warnings = data.warnings?.length ? section("Warnings", data.warnings.map((w) => `- ⚠️ ${w}`)) : "";
        const sans = data.san_domains?.length
          ? section(`Subject Alternative Names (${data.san_domains.length})`, data.san_domains.slice(0, 50).map((s) => `- ${s}`))
          : "";
        return { content: [{ type: "text", text: joinSections(`# SSL — ${data.domain ?? domain}`, main, warnings, sans) }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
