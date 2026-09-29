import "server-only";

import { COMMISSION_OBSERVATIONS, DEMO_OBSERVATIONS } from "./demo";
import type { Observation, WorkflowMode } from "./types";

const CRUSOE_BASE_URL =
  process.env.CRUSOE_BASE_URL ??
  "https://api.inference.crusoecloud.com/v1";
const DEFAULT_MODEL = "deepseek-ai/Deepseek-V4-Flash";
const observationCache = new Map<string, Observation[]>();
let liveRequestCount = 0;

type CrusoeResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function hasCrusoeConfig() {
  return Boolean(process.env.CRUSOE_API_KEY);
}

export function getCrusoeRuntimeBudget() {
  const limit = Number(process.env.CRUSOE_MAX_CALLS_PER_PROCESS ?? 8);
  return {
    used: liveRequestCount,
    limit,
    cachedTranscripts: observationCache.size,
  };
}

function parseJsonObject(content: string) {
  const unfenced = content
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(unfenced) as unknown;
  } catch {
    const objectMatch = unfenced.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error("Crusoe returned no JSON object");
    }
    return JSON.parse(objectMatch[0]) as unknown;
  }
}

function isObservation(value: unknown): value is Observation {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<Observation>;
  return (
    typeof candidate.subject === "string" &&
    [
      "CONNECTED_TO",
      "STATUS",
      "LABEL",
      "INSTALLED_AT",
      "LINKED_TO",
      "CONFIGURED_AS",
      "SERIAL",
    ].includes(candidate.relation ?? "") &&
    typeof candidate.object === "string" &&
    typeof candidate.confidence === "number" &&
    typeof candidate.evidence === "string"
  );
}

export async function extractObservations(
  transcript: string,
  mode: WorkflowMode = "reconcile",
): Promise<Observation[]> {
  const apiKey = process.env.CRUSOE_API_KEY;
  if (!apiKey) {
    return mode === "commission"
      ? COMMISSION_OBSERVATIONS
      : DEMO_OBSERVATIONS;
  }

  const model = process.env.CRUSOE_MODEL ?? DEFAULT_MODEL;
  const cacheKey = `${model}:${mode}:${transcript.trim()}`;
  const cached = observationCache.get(cacheKey);
  if (cached) {
    return cached.map((observation) => ({ ...observation }));
  }

  const requestLimit = Number(process.env.CRUSOE_MAX_CALLS_PER_PROCESS ?? 8);
  if (liveRequestCount >= requestLimit) {
    throw new Error(
      `Crusoe request budget reached (${requestLimit} uncached calls in this process)`,
    );
  }

  const modeInstructions =
    mode === "commission"
      ? `The technician is commissioning a new installation.
Canonical IDs include TOWER-KILO, SW-2, RADIO-C (Radio Charlie), DISH-3, SITE-BRAVO, and RADIO-D (Radio Delta).
Extract installation location, serial number, management connection, RF link, frequency/polarization, and observed status.
Use INSTALLED_AT, SERIAL, CONNECTED_TO, LINKED_TO, CONFIGURED_AS, and STATUS as appropriate.
Preserve every rack position, port number, remote endpoint, frequency, polarization, and signal measurement in the object value.
Use these exact object formats when the transcript supplies the data:
- INSTALLED_AT: TOWER-KILO/RACK-2/U18
- SERIAL: LC-8841
- CONNECTED_TO: SW-2/PORT-12
- LINKED_TO: DISH-3 or SITE-BRAVO/RADIO-D
- CONFIGURED_AS: 18.7_GHZ/VERTICAL
- STATUS: LINK_UP/RX_-42_DBM
Emit separate observations when one sentence establishes multiple relationships.`
      : `The technician is reconciling an existing installation.
Canonical asset IDs:
- SITE-ALPHA: Site Alpha
- SW-1: Aggregation Switch 1, switch one
- SW-2: Aggregation Switch 2, switch two
- RADIO-A: Primary radio A
- RADIO-B: Backup radio B, Radio Bravo
- CORE: Network core

Use CONNECTED_TO, STATUS, and LABEL as appropriate.`;

  liveRequestCount += 1;
  const response = await fetch(`${CRUSOE_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 500,
      messages: [
        {
          role: "system",
          content: `You extract physical network observations from field technician transcripts.

Return only valid JSON in this exact shape:
{"observations":[{"subject":"RADIO-B","relation":"CONNECTED_TO","object":"SW-1","confidence":0.98,"evidence":"exact supporting quote"}]}

${modeInstructions}

Use canonical IDs whenever an asset can be resolved. Never invent observations.`,
        },
        {
          role: "user",
          content: transcript,
        },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `Crusoe extraction failed (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const completion = (await response.json()) as CrusoeResponse;
  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Crusoe returned an empty completion");
  }

  const parsed = parseJsonObject(content) as { observations?: unknown[] };
  const observations = (parsed.observations ?? []).filter(isObservation);

  if (observations.length === 0) {
    throw new Error("Crusoe returned no valid field observations");
  }

  const normalized = observations.map((observation) => ({
    ...observation,
    subject: observation.subject.toUpperCase(),
    object: observation.object.toUpperCase(),
    confidence: Math.min(1, Math.max(0, observation.confidence)),
  }));

  observationCache.set(cacheKey, normalized);
  return normalized.map((observation) => ({ ...observation }));
}

