import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ToolCenterClient } from "../client.js";
import { formatToolError } from "../errors.js";
import { joinSections, kv, section } from "../adapters/format.js";

interface WhoisResponse {
  domain?: string;
  registrar?: string;
  createdDate?: string;
  updatedDate?: string;
  expiresDate?: string;
  nameServers?: string[];
  status?: string[];
  dnssec?: string;
  owner?: { name?: string; organization?: string; country?: string; email?: string };
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
        const registration = section("Registration", [
          kv("Domain", data.domain ?? domain),
          kv("Registrar", data.registrar),
          kv("Created", data.createdDate),
          kv("Updated", data.updatedDate),
          kv("Expires", data.expiresDate),
          kv("DNSSEC", data.dnssec),
          kv("Status", data.status),
          kv("Name servers", data.nameServers),
        ]);
        const owner = data.owner
          ? section("Owner", [
              kv("Name", data.owner.name),
              kv("Organization", data.owner.organization),
              kv("Country", data.owner.country),
              kv("Email", data.owner.email),
            ])
          : "";
        return { content: [{ type: "text", text: joinSections(`# WHOIS — ${data.domain ?? domain}`, registration, owner) || "No WHOIS data." }] };
      } catch (err) {
        return { content: [{ type: "text", text: formatToolError(err) }], isError: true };
      }
    }
  );
}
