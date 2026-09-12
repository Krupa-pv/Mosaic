// ============================================================
// The ONLY file that knows which LLM provider we use.
//
// Everything else calls extractJSON(). Swapping Azure OpenAI for
// another provider means editing this file and nothing else.
// ============================================================

import { AzureOpenAI } from "openai";
import { azureConfig } from "./env";

let cached: AzureOpenAI | null = null;

function client(): AzureOpenAI {
  if (!cached) {
    cached = new AzureOpenAI({
      endpoint: azureConfig.endpoint,
      apiKey: azureConfig.apiKey,
      apiVersion: azureConfig.apiVersion,
      deployment: azureConfig.deployment,
    });
  }
  return cached;
}

/** A JSON Schema object. Strict mode requires additionalProperties:false
 *  and every property listed in `required` — make optional fields nullable
 *  rather than omitting them. */
export type JsonSchema = Record<string, unknown>;

export interface ExtractJSONOptions {
  /** Names the schema for the API; also useful in logs. */
  name: string;
  schema: JsonSchema;
  system: string;
  user: string;
  /** Returned instead of throwing when the call fails. Used to keep the
   *  recorded demo alive if the API is slow or flaky. */
  fallback?: unknown;
}

/**
 * One structured call. The model is constrained to the schema, so the
 * result parses without defensive retry logic.
 */
export async function extractJSON<T>({
  name,
  schema,
  system,
  user,
  fallback,
}: ExtractJSONOptions): Promise<T> {
  try {
    const response = await client().chat.completions.create({
      model: azureConfig.deployment,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name, strict: true, schema },
      },
      max_tokens: 1200,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("Empty response from model");
    return JSON.parse(content) as T;
  } catch (error) {
    if (fallback !== undefined) {
      console.warn(`[${name}] call failed, using fallback: ${(error as Error).message}`);
      return fallback as T;
    }
    throw error;
  }
}

/** Plain prose, for explanations rather than extraction. */
export async function generateText(
  system: string,
  user: string,
  fallback?: string,
): Promise<string> {
  try {
    const response = await client().chat.completions.create({
      model: azureConfig.deployment,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: 300,
      temperature: 0.4,
    });
    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error("Empty response from model");
    return text;
  } catch (error) {
    if (fallback !== undefined) {
      console.warn(`[generateText] call failed, using fallback: ${(error as Error).message}`);
      return fallback;
    }
    throw error;
  }
}

/** Strict mode forces every field to be present, so absent values arrive
 *  as null. Drop them so the result is a clean Partial<T>. */
export function stripNulls<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value)) {
      if (value.length > 0) out[key] = value;
      continue;
    }
    if (typeof value === "object") {
      const nested = stripNulls(value as Record<string, unknown>);
      if (Object.keys(nested).length > 0) out[key] = nested;
      continue;
    }
    out[key] = value;
  }
  return out as Partial<T>;
}
