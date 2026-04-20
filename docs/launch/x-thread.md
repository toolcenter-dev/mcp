# X / Twitter launch thread

## Thread structure (7 tweets)

### 1/ Hook (≤280, punchy, with demo GIF)

> Your AI agent shouldn't need 5 separate APIs just to read the web.

> Today we're open-sourcing ToolCenter MCP — 15 LLM-ready web tools in one install.

> Search, scrape, screenshot, SEO audit, DNS, and 10 more. All with clean Markdown output.

> 🧵

[Attach: 10-second screen capture of Claude using 3 chained tools]

### 2/ Problem

Every agent project starts the same way:
- Tavily for search
- Firecrawl for scraping
- Browserbase for screenshots
- …3 more APIs for DNS/SSL/metadata

5 accounts. 5 rate limits. 5 output formats. No fun.

### 3/ Solution

One `npx -y toolcenter-mcp` install. 15 tools. One API key.

```json
{
  "mcpServers": {
    "toolcenter": {
      "command": "npx",
      "args": ["-y", "toolcenter-mcp"],
      "env": { "TOOLCENTER_API_KEY": "tc_..." }
    }
  }
}
```

Works with Claude Desktop, Cursor, Claude Code, or any MCP client.

### 4/ The real wedge: output quality

`scrape_url` doesn't dump HTML soup. It runs Mozilla Readability to strip nav/footer/ads, then converts the article with Turndown.

A 2 MB HTML page becomes ~4 KB of clean Markdown.

500× fewer tokens. Your agent spends context on reasoning, not parsing.

### 5/ What's included

🔍 web_search (news, science, images — time filters)
📄 scrape_url (→ clean Markdown)
📸 screenshot (full page, device emulation, dark mode)
🔗 get_metadata, preview_link, url_to_pdf
📊 analyze_seo, analyze_accessibility
🔧 dns_lookup, whois, ssl_check, broken_links, tech_stack, website_diff, check_status

### 6/ Demo

Ask Claude:

> "Find Linear's top 3 competitors. For each, give me their pricing page content, tech stack, SEO score, and a screenshot of their homepage."

The agent chains web_search → scrape_url → detect_tech_stack → analyze_seo → screenshot. No glue code.

[attach: asciinema of the full run]

### 7/ Links + CTA

MIT open-source: github.com/toolcenter-dev/mcp
Free tier: 100 calls/month: toolcenter.dev
Docs + quickstart: github.com/toolcenter-dev/mcp#install

If you're building agents and hitting the "wire up 5 APIs" tax, I'd love your feedback. Reply with what you'd want next.

## Secondary hooks for follow-up tweets (24-72 hours)

- "Timing" thread: why bundle > best-in-class for solo agent builders
- Recipe: "Build a competitor monitor agent in 20 lines"
- Compare-and-contrast with Firecrawl/Tavily (respectful, honest)
