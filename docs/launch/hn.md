# HN launch post

## Title options (pick one, under 80 chars)

- **Show HN: ToolCenter MCP – 15 LLM-ready web tools for your agent, one install**
- **Show HN: An MCP server bundling web search, scraping, screenshots, SEO audits**
- **Show HN: Give your Claude agent 15 web tools via one MCP install**

Recommended: the first — "Show HN:" prefix + concrete hook ("one install") + mentions the category buyers care about ("LLM-ready web tools").

## Body (target ~200 words — HN rewards tight)

Hi HN — I built ToolCenter MCP, an open-source MCP server that exposes 15 curated web tools to any AI agent in a single install: web search, scraping (clean Markdown, not HTML soup), screenshots, PDF rendering, SEO/accessibility audits, DNS/WHOIS/SSL checks, website diff, and more.

Why I built it: I kept wiring 4-5 separate APIs (Tavily for search, Firecrawl for scraping, Browserbase for screenshots, a random DNS lib…) every time I built an agent. Each one needed its own account, auth, rate-limit handling, and quirky output format. One config block, one key, one rate limit across everything was the goal.

The wedge is output formatting. Every tool pipes through an adapter — `scrape_url` runs Mozilla Readability + Turndown so a 2 MB page becomes ~4 KB of Markdown (500× fewer tokens). SEO/a11y audits come back as grouped-by-severity reports, not raw JSON dumps. That's the actual pain: raw JSON from a scraping API eats your context window.

Backend is SearXNG (self-hosted) + Puppeteer + Laravel on our infra. Node 22 MCP wrapper is open-source MIT.

Install (Claude Desktop / Cursor / Claude Code):

```json
{"mcpServers": {"toolcenter": {"command": "npx", "args": ["-y", "toolcenter-mcp"], "env": {"TOOLCENTER_API_KEY": "..."}}}}
```

Repo: https://github.com/toolcenter-dev/mcp
Free tier: 100 calls/month.

Feedback very welcome — especially from folks building agents and hitting the "wire up 5 APIs" tax.

## Timing

Post Tuesday–Thursday, 08:00–09:30 PT (front-page trajectory is best at that window).

## First-hour response plan

- Refresh once/min for first hour. Reply to every substantive comment within 10 min.
- Have answers queued for the predictable questions:
  - "How is this different from [Firecrawl/Tavily/Composio]?" → bundle vs best-in-class tradeoff; we're the "one install" play for devs who don't want 5 subscriptions
  - "What about self-hosting?" → the MCP server is MIT open-source; you can point `TOOLCENTER_BASE_URL` at your own ToolCenter instance; Laravel backend isn't open-source yet (undecided)
  - "Rate limits?" → free: 100/month, hobby $19/10k, pro $49/50k
  - "Does it work with [Cline/Continue/Zed]?" → any MCP-compatible client; tested on Claude Desktop, Cursor, Claude Code
  - "Can I see the outputs?" → yes, link to a live agent demo / asciinema
