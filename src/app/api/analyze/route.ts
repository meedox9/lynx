import { NextRequest, NextResponse } from "next/server";

import { extractObservations, hasCrusoeConfig } from "@/lib/crusoe";
import {
  COMMISSION_OBSERVATIONS,
  COMMISSION_TRANSCRIPT,
  DEMO_COMMISSIONING,
  DEMO_OBSERVATIONS,
  DEMO_RISK,
  DEMO_TRANSCRIPT,
} from "@/lib/demo";
import {
  detectTopologyRisk,
  hasNeo4jConfig,
  stageCommissioningPlan,
} from "@/lib/neo4j";
import {
  hasPlaudTranscriptionConfig,
  hasPlaudUploadConfig,
  transcribeAudioUrl,
  uploadToPlaud,
} from "@/lib/plaud";
import type { ProviderStatus, WorkflowMode } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function shortError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown provider error";
  return message.replace(/\s+/g, " ").slice(0, 120);
}

function inferFiletype(file: File): "wav" | "mp3" | "m4a" | null {
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "wav" || extension === "mp3" || extension === "m4a") {
    return extension;
  }
  if (file.type.includes("wav")) return "wav";
  if (file.type.includes("mpeg") || file.type.includes("mp3")) return "mp3";
  if (file.type.includes("mp4") || file.type.includes("m4a")) return "m4a";
  return null;
}

function publicSampleUrl(request: NextRequest, mode: WorkflowMode) {
  if (process.env.PLAUD_SAMPLE_AUDIO_URL) {
    return process.env.PLAUD_SAMPLE_AUDIO_URL;
  }

  const hostname = request.nextUrl.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") {
    return null;
  }

  return new URL(
    mode === "commission" ? "/commission-note.wav" : "/field-note.wav",
    request.nextUrl.origin,
  ).toString();
}

export async function POST(request: NextRequest) {
  let transcript = "";
  let audioUrl = "";
  let audioFile: File | null = null;
  let mode: WorkflowMode = "reconcile";
  let plaudLive = false;

  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const possibleFile = form.get("audio");
      audioFile = possibleFile instanceof File ? possibleFile : null;
      transcript = String(form.get("transcript") ?? "").trim();
      audioUrl = String(form.get("audioUrl") ?? "").trim();
      mode = form.get("mode") === "commission" ? "commission" : "reconcile";
    } else {
      const body = (await request.json()) as {
        transcript?: string;
        audioUrl?: string;
        mode?: WorkflowMode;
      };
      transcript = body.transcript?.trim() ?? "";
      audioUrl = body.audioUrl?.trim() ?? "";
      mode = body.mode === "commission" ? "commission" : "reconcile";
    }
  } catch {
    return NextResponse.json(
      { error: "The request body could not be read." },
      { status: 400 },
    );
  }

  const providers: ProviderStatus[] = [];
  const submittedTranscript = transcript;

  if (audioFile && hasPlaudUploadConfig()) {
    const filetype = inferFiletype(audioFile);
    if (!filetype) {
      return NextResponse.json(
        { error: "PLAUD uploads support WAV, MP3, and M4A files." },
        { status: 400 },
      );
    }
    if (audioFile.size > 15 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Please use an audio file smaller than 15 MB." },
        { status: 400 },
      );
    }

    try {
      const bytes = new Uint8Array(await audioFile.arrayBuffer());
      const downloadUrl = await uploadToPlaud(bytes, filetype);
      transcript = await transcribeAudioUrl(downloadUrl);
      providers.push({
        name: "plaud",
        mode: "live",
        detail: "Embedded transcription API",
      });
      plaudLive = true;
    } catch (error) {
      providers.push({
        name: "plaud",
        mode: "demo",
        detail: `Fallback: ${shortError(error)}`,
      });
    }
  } else if (hasPlaudTranscriptionConfig()) {
    const candidateUrl = audioUrl || publicSampleUrl(request, mode);
    if (candidateUrl) {
      try {
        transcript = await transcribeAudioUrl(candidateUrl);
        providers.push({
          name: "plaud",
          mode: "live",
          detail: "Embedded transcription API",
        });
        plaudLive = true;
      } catch (error) {
        providers.push({
          name: "plaud",
          mode: "demo",
          detail: `Fallback: ${shortError(error)}`,
        });
      }
    }
  }

  if (!providers.some((provider) => provider.name === "plaud")) {
    providers.push({
      name: "plaud",
      mode: "demo",
      detail: transcript ? "Provided transcript" : "Sample field recording",
    });
  }

  transcript ||=
    mode === "commission" ? COMMISSION_TRANSCRIPT : DEMO_TRANSCRIPT;

  const knownSampleTranscript =
    transcript === DEMO_TRANSCRIPT || transcript === COMMISSION_TRANSCRIPT;
  if (
    !hasCrusoeConfig() &&
    (plaudLive || (Boolean(submittedTranscript) && !knownSampleTranscript))
  ) {
    return NextResponse.json(
      {
        error:
          "A Crusoe API key is required to structure a custom field transcript.",
      },
      { status: 503 },
    );
  }

  let observations =
    mode === "commission" ? COMMISSION_OBSERVATIONS : DEMO_OBSERVATIONS;
  if (hasCrusoeConfig()) {
    try {
      observations = await extractObservations(transcript, mode);
      providers.push({
        name: "crusoe",
        mode: "live",
        detail: process.env.CRUSOE_MODEL ?? "DeepSeek V4 Flash",
      });
    } catch (error) {
      providers.push({
        name: "crusoe",
        mode: "demo",
        detail: `Fallback: ${shortError(error)}`,
      });
    }
  } else {
    providers.push({
      name: "crusoe",
      mode: "demo",
      detail: "Deterministic extraction",
    });
  }

  let risk = mode === "reconcile" ? DEMO_RISK : undefined;
  let commissioning =
    mode === "commission" ? DEMO_COMMISSIONING : undefined;
  if (hasNeo4jConfig()) {
    try {
      if (mode === "commission") {
        commissioning = await stageCommissioningPlan(observations);
      } else {
        risk = await detectTopologyRisk(observations);
      }
      providers.push({
        name: "neo4j",
        mode: "live",
        detail:
          mode === "commission"
            ? "Aura staged change set"
            : "Aura graph traversal",
      });
    } catch (error) {
      providers.push({
        name: "neo4j",
        mode: "demo",
        detail: `Fallback: ${shortError(error)}`,
      });
    }
  } else {
    providers.push({
      name: "neo4j",
      mode: "demo",
      detail: "In-memory traversal",
    });
  }

  return NextResponse.json({
    mode,
    transcript,
    observations,
    risk,
    commissioning,
    providers,
    analyzedAt: new Date().toISOString(),
  });
}

