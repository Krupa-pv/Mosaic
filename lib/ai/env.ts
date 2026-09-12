import { optionalEnv, requireEnv } from "../env-local";

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
    return toOrigin(requireEnv("AZURE_OPENAI_ENDPOINT"));
  },
  get apiKey() {
    return requireEnv("AZURE_OPENAI_API_KEY");
  },
  get deployment() {
    return requireEnv("AZURE_OPENAI_DEPLOYMENT");
  },
  get apiVersion() {
    return optionalEnv("AZURE_OPENAI_API_VERSION") ?? "2024-10-21";
  },
};
