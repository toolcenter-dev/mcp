#!/usr/bin/env node
// Full end-to-end test of the ToolCenter MCP flow starting from a fresh account.
// 1. Create disposable mailbox via mail.tm
// 2. Register at toolcenter.dev
// 3. Receive + click verification email
// 4. Generate API key from dashboard
// 5. Spawn toolcenter-mcp (published npm package) via stdio
// 6. Invoke each of the 15 tools, record output or error
// 7. Print pass/fail report
//
// Usage: node scripts/e2e.mjs [--keep] [--site=https://toolcenter.dev]
//   --keep:  don't delete the test user at the end

import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { setTimeout as sleep } from "node:timers/promises";

const args = new Map(process.argv.slice(2).map((a) => {
  const [k, v] = a.split("=");
  return [k.replace(/^--/, ""), v ?? true];
}));
const SITE = (args.get("site") ?? "https://toolcenter.dev").replace(/\/$/, "");
const KEEP = args.has("keep");
const LOCAL = args.has("local");            // use ./dist/index.js instead of npx
const EXISTING_KEY = args.get("key");       // skip signup and reuse an existing API key (string)

const log = (msg) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`);
const fail = (msg) => { console.error(`❌ ${msg}`); process.exit(1); };

// ─── 1. Disposable mailbox ─────────────────────────────────────────────
async function createMailbox() {
  log("Creating mail.tm mailbox…");
  const domains = await (await fetch("https://api.mail.tm/domains")).json();
  const domain = domains["hydra:member"][0].domain;
  const address = `toolcenter-mcp-e2e-${randomBytes(6).toString("hex")}@${domain}`;
  const password = randomBytes(16).toString("hex");

  const register = await fetch("https://api.mail.tm/accounts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  if (!register.ok) fail(`mail.tm account creation failed: ${register.status} ${await register.text()}`);

  const tokenRes = await fetch("https://api.mail.tm/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ address, password }),
  });
  const { token } = await tokenRes.json();
  log(`  → ${address}`);
  return { address, password, token };
}

async function waitForMessage(token, subjectMatch, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await (await fetch("https://api.mail.tm/messages", {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    const msg = list["hydra:member"]?.find((m) => subjectMatch.test(m.subject ?? ""));
    if (msg) {
      const full = await (await fetch(`https://api.mail.tm/messages/${msg.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })).json();
      return full;
    }
    await sleep(2_000);
  }
  fail(`No email matching ${subjectMatch} within ${timeoutMs}ms`);
}

// ─── 2. Register + cookie-aware client ───────────────────────────────────
class Session {
  cookies = new Map();
  async request(method, path, { form, follow = true } = {}) {
    const url = path.startsWith("http") ? path : `${SITE}${path}`;
    const headers = { "user-agent": "toolcenter-mcp-e2e/1.0" };
    if (this.cookies.size) headers.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");

    let body;
    if (form) {
      body = new URLSearchParams(form).toString();
      headers["content-type"] = "application/x-www-form-urlencoded";
    }

    const res = await fetch(url, { method, headers, body, redirect: "manual" });
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const [pair] = sc.split(";");
      const eq = pair.indexOf("=");
      if (eq > 0) this.cookies.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
    }

    if (follow && [301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (loc) return this.request("GET", loc.startsWith("http") ? loc : new URL(loc, url).toString(), { follow: true });
    }
    return res;
  }

  async getCsrf(path) {
    const res = await this.request("GET", path);
    const html = await res.text();
    const match = html.match(/name="_token"\s+value="([^"]+)"/);
    if (!match) fail(`No CSRF token found at ${path}`);
    return match[1];
  }
}

// ─── 3. MCP client over stdio ────────────────────────────────────────────
class McpClient {
  constructor(apiKey) {
    const [cmd, cmdArgs] = LOCAL
      ? ["node", ["./dist/index.js"]]
      : ["npx", ["-y", "toolcenter-mcp"]];
    this.proc = spawn(cmd, cmdArgs, {
      env: { ...process.env, TOOLCENTER_API_KEY: apiKey, TOOLCENTER_BASE_URL: "https://api.toolcenter.dev" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.id = 0;
    this.buffer = "";
    this.pending = new Map();
    this.proc.stdout.on("data", (buf) => {
      this.buffer += buf.toString("utf8");
      let idx;
      while ((idx = this.buffer.indexOf("\n")) >= 0) {
        const line = this.buffer.slice(0, idx);
        this.buffer = this.buffer.slice(idx + 1);
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id && this.pending.has(msg.id)) {
            this.pending.get(msg.id)(msg);
            this.pending.delete(msg.id);
          }
        } catch { /* non-JSON stderr noise */ }
      }
    });
    this.proc.stderr.on("data", (buf) => process.stderr.write(`[mcp] ${buf}`));
  }

  request(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, resolve);
      this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n");
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`Timeout on ${method}`));
        }
      }, 120_000);
    });
  }

  notify(method, params) {
    this.proc.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
  }

  async init() {
    await this.request("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "e2e", version: "0.0.1" },
    });
    this.notify("notifications/initialized");
  }

  async callTool(name, args) {
    return this.request("tools/call", { name, arguments: args });
  }

  close() {
    this.proc.stdin.end();
    this.proc.kill("SIGTERM");
  }
}

// ─── 4. Main ─────────────────────────────────────────────────────────────
async function main() {
  let apiKey = EXISTING_KEY;
  let mailbox = { address: "(existing account)" };

  if (!apiKey) {
    mailbox = await createMailbox();
    const password = "E2e-Test-" + randomBytes(6).toString("hex") + "!";
    const name = "MCP E2E Bot";

    const session = new Session();

    log("Registering at toolcenter.dev…");
  const csrf = await session.getCsrf("/register");
  const regRes = await session.request("POST", "/register", {
    form: {
      _token: csrf,
      name,
      email: mailbox.address,
      password,
      password_confirmation: password,
    },
    follow: false,
  });
  if (![302, 303, 200].includes(regRes.status)) {
    fail(`Registration failed: ${regRes.status}\n${await regRes.text().then((t) => t.slice(0, 500))}`);
  }
  log(`  → registered (status ${regRes.status})`);

  log("Waiting for verification email…");
  const msg = await waitForMessage(mailbox.token, /verif|confirm|welcome/i, 90_000);
  const body = msg.html?.[0] ?? msg.text ?? "";
  const linkMatch = body.match(/href="(https:\/\/toolcenter\.dev\/verify-email\/[^"]+)"/) ||
                    body.match(/(https:\/\/toolcenter\.dev\/verify-email\/[^\s"<]+)/);
  if (!linkMatch) {
    console.error("Email body (first 800 chars):");
    console.error(body.slice(0, 800));
    fail("Could not find verification link in email");
  }
  const verifyUrl = linkMatch[1].replace(/&amp;/g, "&");
  log(`  → verification link found`);

  log("Visiting verification link…");
  const verifyRes = await session.request("GET", verifyUrl, { follow: true });
  log(`  → verified (final status ${verifyRes.status})`);

  log("Creating API key from dashboard…");
  const keyCsrf = await session.getCsrf("/dashboard");
  await session.request("POST", "/api-keys", {
    form: { _token: keyCsrf, name: "mcp-e2e" },
    follow: true,  // follow the redirect chain back to /dashboard
  });
  // Now GET the dashboard to scrape the rendered key
    const dash = await session.request("GET", "/dashboard");
    const dashHtml = await dash.text();
    const keyMatch = dashHtml.match(/copyKey\('(tc_[a-zA-Z0-9]{20,})'/) || dashHtml.match(/(tc_[a-zA-Z0-9]{30,})/);
    if (!keyMatch) {
      console.error(`Dashboard HTML length: ${dashHtml.length}`);
      console.error(dashHtml.slice(0, 500));
      fail("Could not extract API key from dashboard HTML");
    }
    apiKey = keyMatch[1];
    log(`  → ${apiKey.slice(0, 10)}…${apiKey.slice(-4)}`);
  } else {
    log(`Using provided API key: ${apiKey.slice(0, 10)}…${apiKey.slice(-4)}`);
  }

  log("Spawning toolcenter-mcp and initializing…");
  const mcp = new McpClient(apiKey);
  await mcp.init();
  log("  → MCP initialized");

  const tools = [
    { name: "web_search",            args: { query: "claude 4 release date", limit: 3 } },
    { name: "scrape_url",            args: { url: "https://example.com" } },
    { name: "get_metadata",          args: { url: "https://news.ycombinator.com" } },
    { name: "preview_link",          args: { url: "https://github.com/modelcontextprotocol" } },
    { name: "screenshot",            args: { url: "https://example.com", fullPage: false } },
    { name: "url_to_pdf",            args: { url: "https://example.com" } },
    { name: "website_diff",          args: { url1: "https://example.com", url2: "https://example.org" } },
    { name: "analyze_seo",           args: { url: "https://example.com" } },
    { name: "analyze_accessibility", args: { url: "https://example.com" } },
    { name: "check_broken_links",    args: { url: "https://example.com" } },
    { name: "detect_tech_stack",     args: { url: "https://github.com" } },
    { name: "dns_lookup",            args: { domain: "toolcenter.dev", type: "A" } },
    { name: "whois_lookup",          args: { domain: "toolcenter.dev" } },
    { name: "check_ssl",             args: { domain: "toolcenter.dev" } },
    { name: "check_status",          args: { url: "https://example.com" } },
  ];

  const results = [];
  for (const t of tools) {
    log(`→ ${t.name}…`);
    try {
      const res = await mcp.callTool(t.name, t.args);
      const isError = res.result?.isError || res.error;
      const text = res.result?.content?.[0]?.text ?? JSON.stringify(res.error ?? res).slice(0, 200);
      results.push({ name: t.name, ok: !isError, preview: text.slice(0, 150).replace(/\n/g, " ⏎ ") });
      log(`  ${isError ? "❌" : "✅"} ${results.at(-1).preview}`);
    } catch (err) {
      results.push({ name: t.name, ok: false, preview: `EXCEPTION: ${err.message}` });
      log(`  ❌ ${err.message}`);
    }
  }

  mcp.close();

  console.log("\n=== E2E REPORT ===");
  console.log(`Account: ${mailbox.address}`);
  console.log(`API key: ${apiKey.slice(0, 10)}…${apiKey.slice(-4)}`);
  console.log(`\nTool results:`);
  for (const r of results) {
    console.log(`${r.ok ? "✅" : "❌"} ${r.name.padEnd(24)} ${r.preview}`);
  }
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) {
    console.log(`\nFailures:`);
    for (const f of failed) console.log(`  ${f.name}: ${f.preview}`);
  }

  if (KEEP) {
    console.log(`\n(Test user kept — delete manually if desired: ${mailbox.address})`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
