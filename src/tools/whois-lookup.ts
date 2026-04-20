import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface WhoisResponse {
  domain?: string;
  tld?: string;
  is_registered?: boolean;
  registrar?: string;
  registrar_url?: string;
  registrar_whois_server?: string;
  dates?: { created?: string; expires?: string; updated?: string };
  domain_age?: { human?: string; years?: number; months?: number; total_days?: number };
  days_until_expiry?: number;
  name_servers?: string[];
  status?: string[];
  status_codes?: string[];
  dnssec?: string;
  registrant?: { organization?: string | null; country?: string | null; state?: string | null; email?: string | null };
  abuse_contact?: string;
  raw?: string;
}

export function registerWhoisLookup(server: McpServer, client: ToolCenterClient) {
  server.registerTool(
    "whois_lookup",
    {
      title: "WHOIS Lookup",
      description:
        "Get WHOIS registration info for a domain — registrar, creation/expiry dates, name servers, " +
        "ownership (where not redacted), DNSSEC status. Useful for domain research, expiry monitoring, " +
        "and detecting recently registered domains (often phishing signals).",
      inputSchema: {
        domain: z.string().min(1).max(255).describe("Domain name — 'example.com'"),
      },
    },
    async ({ domain }) => {
      try {
        const data = await client.request<WhoisResponse>("/v1/whois", { body: { domain } });
        if (data.is_registered === false) {
          return { content: [{ type: "text", text: `# WHOIS — ${data.domain ?? domain}\n\n✅ **Domain is available** (not registered).` }] };
        }
        const registration = section("Registration", [
          kv("Domain", data.domain ?? domain),
          kv("TLD", data.tld),
          kv("Registrar", data.registrar),
          kv("Registrar URL", data.registrar_url),
          kv("WHOIS server", data.registrar_whois_server),
          kv("Created", data.dates?.created),
          kv("Updated", data.dates?.updated),
          kv("Expires", data.dates?.expires),
          kv("Days until expiry", data.days_until_expiry),
          kv("Age", data.domain_age?.human),
          kv("DNSSEC", data.dnssec),
          kv("Abuse contact", data.abuse_contact),
        ]);
        const ns = data.name_servers?.length
          ? section(`Name servers (${data.name_servers.length})`, data.name_servers.map((s) => `- ${s}`))
          : "";
        const statusCodes = data.status_codes?.length
          ? section("Status codes", data.status_codes.map((s) => `- ${s}`))
          : "";
        const registrant = data.registrant && Object.values(data.registrant).some((v) => v)
          ? section("Registrant", [
              kv("Organization", data.registrant.organization ?? undefined),
              kv("Country", data.registrant.country ?? undefined),
              kv("State", data.registrant.state ?? undefined),
              kv("Email", data.registrant.email ?? undefined),
            ])
          : "";
        return {
          content: [{
            type: "text",
            text: joinSections(`# WHOIS — ${data.domain ?? domain}`, registration, ns, statusCodes, registrant) || "No WHOIS data.",
          }],
        };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
