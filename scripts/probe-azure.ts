// Confirms an Azure OpenAI deployment is reachable and reports which
// structured-output mode it supports. Reads .env.local by default.
//
//   npm run probe
//   npx tsx scripts/probe-azure.ts <endpoint> <key> [deployment]

import { loadEnvLocal } from "../lib/env-local";

const API_VERSION = "2024-10-21";

loadEnvLocal();
const [, , argEndpoint, argKey, argDeployment] = process.argv;

// One bare argument means "same resource, try this deployment name instead".
const oneArg = argEndpoint !== undefined && argKey === undefined;

const rawEndpoint = (oneArg ? undefined : argEndpoint) ?? process.env.AZURE_OPENAI_ENDPOINT;
const apiKey = argKey ?? process.env.AZURE_OPENAI_API_KEY;
const deployment = (oneArg ? argEndpoint : argDeployment) ?? process.env.AZURE_OPENAI_DEPLOYMENT;

if (!rawEndpoint || !apiKey) {
  console.error("Missing endpoint or key. Set them in .env.local or pass as arguments.");
  process.exit(1);
  throw new Error("unreachable");
}

// The portal offers this value in several shapes: a bare host, a host with
// /openai appended, or the full "Target URI" including the deployment path
// and an api-version. Reduce all of them to the origin.
function toOrigin(value: string): string {
  const trimmed = value.trim();
  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

const endpoint = toOrigin(rawEndpoint);

// A pasted Target URI also carries the deployment name — recover it.
const deploymentFromUri = rawEndpoint.match(/\/deployments\/([^/?]+)/)?.[1];
const headers = { "api-key": apiKey, "Content-Type": "application/json" };

async function listDeployments(): Promise<string[]> {
  for (const version of ["2023-05-15", API_VERSION]) {
    const res = await fetch(`${endpoint}/openai/deployments?api-version=${version}`, { headers });
    if (!res.ok) {
      console.log(`  list (api-version ${version}) -> HTTP ${res.status}`);
      continue;
    }
    const json = (await res.json()) as { data?: Record<string, unknown>[] };
    const rows = json.data ?? [];
    console.log(`  list (api-version ${version}) -> HTTP 200, ${rows.length} deployment(s)\n`);
    console.log("  DEPLOYMENT NAME                MODEL");
    for (const d of rows) {
      console.log(`  ${String(d.id ?? "").padEnd(30)} ${String(d.model ?? "")}`);
    }
    console.log("");
    return rows.map((d) => String(d.id ?? ""));
  }
  return [];
}

/** The decisive test: can this deployment return schema-valid JSON? */
async function probeStructuredOutput(name: string) {
  const schema = {
    type: "object",
    additionalProperties: false,
    required: ["mobility", "interests"],
    properties: {
      mobility: { type: "string", enum: ["independent", "cane", "walker", "wheelchair"] },
      interests: { type: "array", items: { type: "string" } },
    },
  };

  const body = (responseFormat: unknown) => ({
    messages: [
      { role: "system", content: "Extract structured fields from the care plan. Reply with JSON only." },
      { role: "user", content: "Margaret ambulates with a walker. She enjoys gardening and cooking." },
    ],
    response_format: responseFormat,
    max_tokens: 200,
  });

  const url = `${endpoint}/openai/deployments/${name}/chat/completions?api-version=${API_VERSION}`;

  const strict = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(
      body({ type: "json_schema", json_schema: { name: "care_plan", strict: true, schema } }),
    ),
  });

  if (strict.ok) {
    const json = (await strict.json()) as { choices?: { message?: { content?: string } }[] };
    console.log("  strict json_schema  -> SUPPORTED");
    console.log(`  sample output: ${json.choices?.[0]?.message?.content?.trim()}\n`);
    return;
  }
  console.log(`  strict json_schema  -> HTTP ${strict.status} ${(await strict.text()).slice(0, 200)}`);

  const loose = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body({ type: "json_object" })),
  });

  if (loose.ok) {
    const json = (await loose.json()) as { choices?: { message?: { content?: string } }[] };
    console.log("  json_object mode    -> SUPPORTED (we validate the shape ourselves)");
    console.log(`  sample output: ${json.choices?.[0]?.message?.content?.trim()}\n`);
    return;
  }
  console.log(`  json_object mode    -> HTTP ${loose.status} ${(await loose.text()).slice(0, 200)}\n`);
}

async function main() {
  console.log(`\nProbing ${endpoint}\n`);
  const found = await listDeployments();

  const target = deployment ?? deploymentFromUri ?? found[0];
  if (!target) {
    console.log("  No deployment to test. Check AZURE_OPENAI_DEPLOYMENT in .env.local.\n");
    return;
  }

  if (found.length > 0 && !found.includes(target)) {
    console.log(`  WARNING: "${target}" is not in the list above — check the name.\n`);
  }

  console.log(`  Testing deployment "${target}":`);
  await probeStructuredOutput(target);
}

main();
