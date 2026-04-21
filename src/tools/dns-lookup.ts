import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";

interface DnsRecord {
  type?: string;
  host?: string;
  ip?: string;
  ipv6?: string;
  target?: string;
  pri?: number;
  ttl?: number;
  txt?: string;
  value?: string;
}

interface DnsResponse {
  domain?: string;
  type?: string;
  records?: DnsRecord[] | Record<string, DnsRecord[]>;
  lookup_time?: number;
}

export function registerDnsLookup(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "dns_lookup",
    {
      title: "DNS Lookup",
      description:
        "Resolve DNS records for a domain. Supports A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, PTR, " +
        "or ALL (returns all common record types). Useful for debugging DNS config, finding mail servers, " +
        "or verifying ownership records.",
      inputSchema: {
        domain: z.string().min(1).max(255).describe("Domain to look up — 'example.com' (no scheme)"),
        type: z
          .enum(["A", "AAAA", "MX", "NS", "TXT", "CNAME", "SOA", "SRV", "CAA", "PTR", "ALL"])
          .optional()
          .describe("Record type (default ALL)"),
      },
    },
    async ({ domain, type }) => {
      try {
        const data = await client.request<DnsResponse>("/v1/dns", { body: { domain, type: type ?? "ALL" } });
        const lines = [`# DNS — ${data.domain ?? domain}`];
        if (data.lookup_time) lines.push(`_Lookup: ${data.lookup_time}ms_`);

        const records = data.records;
        if (!records) {
          lines.push("\n_No records returned._");
        } else if (Array.isArray(records)) {
          for (const r of records) lines.push(formatRecord(r));
        } else {
          for (const [kind, arr] of Object.entries(records)) {
            if (!arr || arr.length === 0) continue;
            lines.push(`\n## ${kind}`);
            for (const r of arr) lines.push(formatRecord(r));
          }
        }
        return { content: [{ type: "text", text: lines.join("\n") }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}

function formatRecord(r: DnsRecord): string {
  const val = r.ip ?? r.ipv6 ?? r.target ?? r.txt ?? r.value ?? "";
  const pri = r.pri !== undefined ? ` (priority ${r.pri})` : "";
  const ttl = r.ttl !== undefined ? ` · TTL ${r.ttl}` : "";
  return `- ${r.type ? `[${r.type}] ` : ""}${val}${pri}${ttl}`;
}
