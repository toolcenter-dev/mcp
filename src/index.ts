#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config.js";
import { ToolCenterClient } from "./client.js";
import { registerAllTools } from "./tools/index.js";


// Optional error tracking — only active if SENTRY_DSN is set in env.
async function main() {
  const config = loadConfig();
  const client = new ToolCenterClient(config);

  const server = new McpServer({
    name: "toolcenter-mcp",
    version: "0.1.6",
  });

  registerAllTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr only — stdout is reserved for MCP protocol.
  process.stderr.write(`toolcenter-mcp 0.1.0 connected to ${config.baseUrl}\n`);
}

main().catch((err) => {
  process.stderr.write(`Fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
