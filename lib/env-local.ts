// Next.js loads .env.local into process.env automatically. Plain `tsx`
// scripts do not, which silently gives a script different configuration
// from the server it is testing. Every entry point that runs outside
// Next.js should call loadEnvLocal() first.

import { readFileSync } from "node:fs";

let loaded = false;

export function loadEnvLocal(): void {
  if (loaded) return;
  loaded = true;
  try {
    for (const line of readFileSync(".env.local", "utf8").split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      // A real environment variable always wins over the file.
      if (process.env[key]) continue;
      process.env[key] = trimmed
        .slice(eq + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
        // Tolerate a leftover <placeholder> from copy-paste.
        .replace(/^<(.*)>$/, "$1");
    }
  } catch {
    // No .env.local — assume the environment is already populated.
  }
}

export function requireEnv(name: string): string {
  loadEnvLocal();
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}. Set it in .env.local.`);
  return value;
}

export function optionalEnv(name: string): string | undefined {
  loadEnvLocal();
  return process.env[name];
}
