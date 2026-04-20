import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import TurndownService from "turndown";
import { truncate } from "./truncate.js";

let turndown: TurndownService | null = null;

function getTurndown(): TurndownService {
  if (turndown) return turndown;
  turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
    emDelimiter: "_",
  });
  turndown.remove(["script", "style", "noscript", "iframe", "svg" as "div"]);
  return turndown;
}

export interface ExtractedPage {
  title: string | null;
  byline: string | null;
  excerpt: string | null;
  markdown: string;
  length: number;
  siteName: string | null;
}

export function htmlToCleanMarkdown(html: string, url?: string): ExtractedPage {
  const dom = new JSDOM(html, { url });
  const reader = new Readability(dom.window.document);
  const article = reader.parse();

  if (article && article.content) {
    const md = getTurndown().turndown(article.content);
    return {
      title: article.title ?? null,
      byline: article.byline ?? null,
      excerpt: article.excerpt ?? null,
      markdown: truncate(md.trim()),
      length: article.length ?? md.length,
      siteName: article.siteName ?? null,
    };
  }

  const md = getTurndown().turndown(html);
  return {
    title: dom.window.document.title || null,
    byline: null,
    excerpt: null,
    markdown: truncate(md.trim()),
    length: md.length,
    siteName: null,
  };
}

export function plainTextToMarkdown(text: string): string {
  return truncate(text.trim());
}
