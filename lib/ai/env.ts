// Next.js loads .env.local automatically; plain tsx scripts do not.
// This makes both work without a dotenv dependency.

import { readFileSync } from "node:fs";

let loaded = false;

function loadEnvLocal() {
  if (loaded) return;
  loaded = true;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      if (process.env[key]) continue;
      process.env[key] = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/^<(.*)>$/, "$1");
    }
  } catch {
    // No .env.local — assume the environment is already populated.
  }
}

function required(name: string): string {
  loadEnvLocal();
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in .env.local.`);
  return value;
}

/** Accepts a bare host, a /openai path, or the portal's full Target URI. */
function toOrigin(value: string): string {
  try {
    return new URL(value.trim()).origin;
  } catch {
    return value.trim().replace(/\/+$/, "");
  }
}

export const azureConfig = {
  get endpoint() {
    return toOrigin(required("AZURE_OPENAI_ENDPOINT"));
  },
  get apiKey() {
    return required("AZURE_OPENAI_API_KEY");
  },
  get deployment() {
    return required("AZURE_OPENAI_DEPLOYMENT");
  },
  get apiVersion() {
    loadEnvLocal();
    return process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21";
  },
};
