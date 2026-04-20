# MCP directory submissions

Directories that aggregate MCP servers. Submit to all of them.

## 1. Anthropic MCP directory

Where: https://github.com/modelcontextprotocol/servers (submit a PR adding our entry), plus https://www.claudemcp.com / https://modelcontextprotocol.io/registry.

Submission entry (README line format):

```markdown
- **[ToolCenter](https://github.com/toolcenter-dev/mcp)** - 15 LLM-ready web tools in one install: web search, scraping (clean Markdown), screenshots, PDFs, SEO/a11y audits, DNS/WHOIS/SSL, website diff, and more. Backed by SearXNG + Puppeteer; outputs optimized for LLM consumption.
```

PR branch: `add-toolcenter-mcp`. Title: `Add ToolCenter MCP server`.

## 2. Glama.ai

Where: https://glama.ai/mcp/servers (they auto-index from GitHub topics `mcp` + `model-context-protocol`, which we already set).

Action: nothing active needed beyond our existing GitHub topics, but can also submit via their form at https://glama.ai/mcp/servers/submit. Verify indexing within 48 h.

## 3. Smithery.ai

Where: https://smithery.ai/

Submission form: https://smithery.ai/new

Required:
- Repo URL: https://github.com/toolcenter-dev/mcp
- Install command: `npx -y toolcenter-mcp`
- Description: (use 160-char one-liner below)
- Category: Web / Search / Research tools
- Required env vars: `TOOLCENTER_API_KEY`
- Optional env vars: `TOOLCENTER_BASE_URL`

## 4. mcp.so

Where: https://mcp.so/

Submission: PR to their GitHub repo listing MCP servers.

## Shared assets for all directories

### One-liner (160 chars)

> 15 LLM-ready web tools in one MCP install: search, scrape→markdown, screenshot, SEO/a11y, DNS/WHOIS/SSL, diff. Backed by SearXNG + Puppeteer.

### Tagline (60 chars)

> Swiss-army MCP for web tools.

### Logo / icon

TODO: 512×512 PNG, transparent bg, derived from ToolCenter brand. Store at `assets/logo.png` in the repo before submissions.

### Categories to claim

- Web & HTTP
- Search
- Scraping
- Analysis / audit
- DevOps / monitoring

## Verification checklist (run before submitting)

- [ ] `npx -y toolcenter-mcp` works from a clean npm cache
- [ ] Package published to npm at `toolcenter-mcp@0.1.0`
- [ ] README renders correctly on GitHub (tables align, install snippets work)
- [ ] Public assets accessible (no CORS issues on `api.toolcenter.dev`)
- [ ] At least one end-to-end demo run with a real API key (asciinema recorded)
- [ ] License file present (MIT)
- [ ] Topics set on GitHub repo (already done: `mcp`, `model-context-protocol`, `claude`, `ai-agents`, `toolcenter`, `web-scraping`, `llm-tools`)
