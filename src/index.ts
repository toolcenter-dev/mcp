#!/usr/bin/env node
import * as Sentry from "@sentry/node";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ToolCenterClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";


// Optional error tracking — only active if SENTRY_DSN is set in env.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    release: `toolcenter-mcp@0.1.5`,
  });
}

async function main() {
  const config = loadConfig();
  const client = new ToolCenterClient(config);

  const server = new McpServer({
    name: "toolcenter-mcp",
    version: "0.1.5",
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for MCP protocol.
  process.stderr.write(`toolcenter-mcp 0.1.0 connected to ${config.baseUrl}\n`);
}

main().catch((err) => {
  if (process.env.SENTRY_DSN) Sentry.captureException(err);
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
