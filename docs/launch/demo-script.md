# Demo script

For asciinema / video recordings to accompany HN + X launches. Each demo is a single agent prompt that chains multiple tools and produces a visibly impressive result.

## Demo 1: Competitor research (30 seconds)

Prompt to Claude:

> Research Linear, Height, and Notion Projects. For each: pricing tier prices, tech stack, SEO score, and a screenshot of their homepage. Summarize the comparison in a table.

Tools chained: `web_search` → `scrape_url` (×3) → `detect_tech_stack` (×3) → `analyze_seo` (×3) → `screenshot` (×3).

Recording setup:
```bash
asciinema rec docs/launch/demo-competitor.cast --title "Agent compares 3 competitors in 30s"
# Run the prompt in Claude Desktop
# Stop recording when done
asciinema upload docs/launch/demo-competitor.cast
```

## Demo 2: Site health audit (20 seconds)

Prompt:

> Audit example.com: SSL cert status, DNS records, broken links, accessibility issues, SEO score. Flag anything urgent.

Tools chained: `check_ssl` → `dns_lookup` → `check_broken_links` → `analyze_accessibility` → `analyze_seo`.

## Demo 3: Change detection (15 seconds)

Prompt:

> Has OpenAI's pricing page changed in the last week? Compare against the Wayback Machine snapshot from 7 days ago.

Tools: `web_search` (to find Wayback snapshot URL) → `website_diff`.

## Demo 4: Research-to-PDF (25 seconds)

Prompt:

> Search for the 3 most recent papers on MCP security. Scrape each one into Markdown. Render the combined report as a PDF.

Tools: `web_search` → `scrape_url` (×3) → `url_to_pdf`.

## Recording tips

- Use OBS or asciinema — both easy to embed.
- Record at 1080p, 30 fps, terminal font 16 px.
- Keep total ≤ 30 s per demo. Longer = fewer completions.
- Show the final result prominently (table, PDF, diff output) — that's what screenshots.
- Dark mode terminal. Solarized dark or Dracula.

## What to put where

- **HN post**: 1 link to asciinema for Demo 1 + embedded GIF preview (≤5 MB).
- **X launch tweet**: 10 s silent MP4 of Demo 1 (top tweet, highest engagement).
- **GitHub README**: add a "Demos" section linking all 4 recordings.
- **Product Hunt** (if launching there): use Demo 1 as primary video.
