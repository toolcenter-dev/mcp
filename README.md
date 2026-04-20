# ToolCenter MCP

> The Swiss-Army MCP server for web tools — one install, 15 LLM-ready tools.

Give your AI agent instant access to web search, scraping, screenshots, SEO/accessibility audits, DNS/WHOIS/SSL checks, and more — all through a single [Model Context Protocol](https://modelcontextprotocol.io) server. Outputs are optimized for LLM consumption (clean Markdown, structured reports) so your agent spends tokens on reasoning, not parsing HTML soup.

## Tools included

| Tool | What it does |
|------|--------------|
| `web_search` | Search the web (aggregated engines) — news/images/science categories, time filters |
| `scrape_url` | Fetch a page and return clean Markdown (boilerplate stripped via Readability) |
| `screenshot` | Capture a page — full-page, device emulation, dark mode, ad-blocking |
| `get_metadata` | Title, description, Open Graph, Twitter Card, canonical, favicon |
| `url_to_pdf` | Render any URL to PDF — page size, orientation, headers/footers |
| `website_diff` | Compare two URLs — added/removed/modified sections with similarity score |
| `analyze_seo` | SEO audit with scored report, issues grouped by severity, fixes |
| `analyze_accessibility` | axe-core a11y audit, WCAG violations grouped by impact |
| `check_broken_links` | Scan a page for broken (4xx/5xx/timeout) links |
| `detect_tech_stack` | Wappalyzer-style stack fingerprinting |
| `preview_link` | Slack/Discord-style unfurl card for a URL |
| `dns_lookup` | DNS records — A, AAAA, MX, NS, TXT, CNAME, SOA, SRV, CAA, PTR |
| `whois_lookup` | Registrar, creation/expiry, name servers, ownership |
| `check_ssl` | TLS cert — issuer, validity, days-until-expiry, SANs, cipher |
| `check_status` | HTTP-ping — up/down, status, response time, redirects |

## Install

### 1. Get an API key

Create a free account at [toolcenter.dev](https://toolcenter.dev) and copy your API key from the dashboard.

### 2. Add to your MCP client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "toolcenter": {
      "command": "npx",
      "args": ["-y", "toolcenter-mcp"],
      "env": {
        "TOOLCENTER_API_KEY": "tc_xxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

Restart Claude Desktop. The 15 tools appear under the hammer icon.

#### Cursor

Settings → MCP → Add server:

```json
{
  "toolcenter": {
    "command": "npx",
    "args": ["-y", "toolcenter-mcp"],
    "env": { "TOOLCENTER_API_KEY": "tc_..." }
  }
}
```

#### Claude Code (CLI)

```bash
claude mcp add toolcenter -e TOOLCENTER_API_KEY=tc_... -- npx -y toolcenter-mcp
```

### 3. (Optional) Self-host the backend

The MCP server talks to `api.toolcenter.dev` by default. To point at your own ToolCenter instance, set `TOOLCENTER_BASE_URL`:

```json
"env": {
  "TOOLCENTER_API_KEY": "tc_...",
  "TOOLCENTER_BASE_URL": "https://api.your-domain.com"
}
```

## Quickstart: build an agent in 5 minutes

Ask Claude:

> Research the top 3 competitors of Linear.app. For each, give me their pricing page, tech stack, SEO score, and a screenshot of their homepage.

The agent will chain `web_search` → `scrape_url` → `detect_tech_stack` → `analyze_seo` → `screenshot` automatically. No glue code.

## Development

```bash
git clone https://github.com/toolcenter-dev/mcp
cd mcp
npm install
cp .env.example .env   # add your key
npm run build
TOOLCENTER_API_KEY=tc_... node dist/index.js   # runs over stdio
```

## Output design

Every tool returns Markdown structured for LLM consumption. For example, `scrape_url` runs the HTML through [Mozilla Readability](https://github.com/mozilla/readability) to strip nav/footer/ads, then converts the article body with [Turndown](https://github.com/mixmark-io/turndown). A 2 MB page becomes ~4 KB of Markdown — 500× fewer tokens than raw HTML.

## License

MIT © 2026 ToolCenter
