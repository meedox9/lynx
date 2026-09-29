import { NextRequest, NextResponse } from "next/server";

import { approveCommissioningChange } from "@/lib/neo4j";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let changeSetId = "";
  let antennaAzimuth = Number.NaN;

  try {
    const body = (await request.json()) as {
      changeSetId?: string;
      antennaAzimuth?: number;
    };
    changeSetId = body.changeSetId?.trim() ?? "";
    antennaAzimuth = Number(body.antennaAzimuth);
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  if (changeSetId !== "LYNX-TOWER-KILO-001") {
    return NextResponse.json(
      { error: "Unknown commissioning change set." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(antennaAzimuth) ||
    antennaAzimuth < 0 ||
    antennaAzimuth > 359
  ) {
    return NextResponse.json(
      { error: "Antenna direction must be between 0 and 359 degrees." },
      { status: 400 },
    );
  }

  try {
    const result = await approveCommissioningChange(
      changeSetId,
      antennaAzimuth,
    );
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The change set could not be approved.",
      },
      { status: 500 },
    );
  }
}

