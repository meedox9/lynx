import { NextResponse } from "next/server";

import { listInventoryAssets } from "@/lib/neo4j";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const assets = await listInventoryAssets();

  return NextResponse.json({
    assets,
    generatedAt: new Date().toISOString(),
  });
}

