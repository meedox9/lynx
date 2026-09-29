import { NextResponse } from "next/server";

import { getCrusoeRuntimeBudget, hasCrusoeConfig } from "@/lib/crusoe";
import { hasNeo4jConfig, verifyNeo4jConnection } from "@/lib/neo4j";
import {
  hasPlaudTranscriptionConfig,
  hasPlaudUploadConfig,
} from "@/lib/plaud";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const neo4jConfigured = hasNeo4jConfig();
  const neo4jConnected = neo4jConfigured
    ? await verifyNeo4jConnection()
    : false;

  return NextResponse.json({
    providers: {
      plaud: {
        configured: hasPlaudTranscriptionConfig(),
        uploadReady: hasPlaudUploadConfig(),
      },
      crusoe: {
        configured: hasCrusoeConfig(),
        runtimeBudget: getCrusoeRuntimeBudget(),
      },
      neo4j: {
        configured: neo4jConfigured,
        connected: neo4jConnected,
      },
    },
  });
}

