export interface Config {
  apiKey: string;
  baseUrl: string;
}

export function loadConfig(): Config {
  const apiKey = process.env.TOOLCENTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "TOOLCENTER_API_KEY is not set. Get a key at https://toolcenter.dev and add it to your MCP client config."
    );
  }
  const baseUrl = (process.env.TOOLCENTER_BASE_URL ?? "https://api.toolcenter.dev").replace(/\/$/, "");
  return { apiKey, baseUrl };
}
