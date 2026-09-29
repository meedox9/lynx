import "server-only";

import { createHash } from "node:crypto";

const PLAUD_BASE_URL =
  process.env.PLAUD_BASE_URL ??
  "https://platform-us.plaud.ai/developer/api/open/partner";
const PLAUD_AUTH_BASE_URL =
  process.env.PLAUD_AUTH_BASE_URL ??
  "https://platform-us.plaud.ai/developer/api";
let cachedUserToken: { token: string; expiresAt: number } | null = null;

type PresignedPart = {
  PartNumber: number;
  PresignedUrl: string;
};

type PresignedUpload = {
  FileId: string;
  UploadId: string;
  ChunkSize: number;
  Parts: PresignedPart[];
};

type TranscriptionResponse = {
  transcription_id: string;
  status:
    | "PENDING"
    | "RECEIVED"
    | "STARTED"
    | "PROGRESS"
    | "SUCCESS"
    | "FAILURE"
    | "REVOKED";
  data?: {
    text?: string;
  };
};

export function hasPlaudTranscriptionConfig() {
  return Boolean(
    process.env.PLAUD_CLIENT_ID &&
      process.env.PLAUD_API_KEY &&
      process.env.PLAUD_TRANSCRIPTION_ENABLED !== "false",
  );
}

export function hasPlaudUploadConfig() {
  return (
    hasPlaudTranscriptionConfig() &&
    Boolean(
      process.env.PLAUD_USER_ACCESS_TOKEN ||
        (process.env.PLAUD_CLIENT_ID && process.env.PLAUD_CLIENT_SECRET),
    )
  );
}

function transcriptionHeaders() {
  const clientId = process.env.PLAUD_CLIENT_ID;
  const apiKey = process.env.PLAUD_API_KEY;

  if (!clientId || !apiKey) {
    throw new Error("PLAUD_CLIENT_ID and PLAUD_API_KEY are required");
  }

  return {
    "Content-Type": "application/json",
    "X-Client-Id": clientId,
    "X-Client-Api-Key": apiKey,
  };
}

async function responseJson<T>(response: Response, action: string): Promise<T> {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${action} failed (${response.status}): ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function getPlaudUserAccessToken() {
  if (process.env.PLAUD_USER_ACCESS_TOKEN) {
    return process.env.PLAUD_USER_ACCESS_TOKEN;
  }

  if (cachedUserToken && cachedUserToken.expiresAt > Date.now() + 60_000) {
    return cachedUserToken.token;
  }

  const clientId = process.env.PLAUD_CLIENT_ID;
  const clientSecret = process.env.PLAUD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "PLAUD_CLIENT_SECRET or PLAUD_USER_ACCESS_TOKEN is required for uploads",
    );
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const partnerResponse = await fetch(
    `${PLAUD_AUTH_BASE_URL}/oauth/partner/access-token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams(),
      cache: "no-store",
    },
  );
  const partner = await responseJson<{
    access_token: string;
    expires_in?: number;
  }>(partnerResponse, "PLAUD partner authentication");

  const userResponse = await fetch(
    `${PLAUD_AUTH_BASE_URL}/open/partner/users/access-token`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${partner.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: process.env.PLAUD_DEMO_USER_ID ?? "lynx-demo-user",
        expires_in: 86400,
      }),
      cache: "no-store",
    },
  );
  const user = await responseJson<{
    access_token: string;
    expires_in?: number;
  }>(userResponse, "PLAUD user authentication");

  cachedUserToken = {
    token: user.access_token,
    expiresAt: Date.now() + (user.expires_in ?? 86400) * 1000,
  };
  return user.access_token;
}

export async function transcribeAudioUrl(fileUrl: string): Promise<string> {
  const submitResponse = await fetch(`${PLAUD_BASE_URL}/ai/transcriptions/`, {
    method: "POST",
    headers: transcriptionHeaders(),
    body: JSON.stringify({
      file_url: fileUrl,
      params: {
        transcribe: {
          language: "auto",
          model: "plaud-fast-whisper",
        },
        vad: { decode_silence: false },
        diarization: { enabled: true, return_embedding: false },
      },
    }),
    cache: "no-store",
  });

  const submitted = await responseJson<TranscriptionResponse>(
    submitResponse,
    "PLAUD transcription submission",
  );

  for (let attempt = 0; attempt < 45; attempt += 1) {
    await wait(attempt === 0 ? 600 : 1_600);

    const pollResponse = await fetch(
      `${PLAUD_BASE_URL}/ai/transcriptions/${submitted.transcription_id}`,
      {
        headers: transcriptionHeaders(),
        cache: "no-store",
      },
    );
    const result = await responseJson<TranscriptionResponse>(
      pollResponse,
      "PLAUD transcription polling",
    );

    if (result.status === "SUCCESS" && result.data?.text) {
      return result.data.text.trim();
    }

    if (result.status === "FAILURE" || result.status === "REVOKED") {
      throw new Error(`PLAUD transcription ended with status ${result.status}`);
    }
  }

  throw new Error("PLAUD transcription timed out");
}

export async function uploadToPlaud(
  bytes: Uint8Array,
  filetype: "wav" | "mp3" | "m4a",
): Promise<string> {
  const accessToken = await getPlaudUserAccessToken();

  const authorizationHeaders = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const presignResponse = await fetch(
    `${PLAUD_BASE_URL}/files/upload/generate-presigned-urls`,
    {
      method: "POST",
      headers: authorizationHeaders,
      body: JSON.stringify({
        filesize: bytes.byteLength,
        filetype,
      }),
      cache: "no-store",
    },
  );
  const upload = await responseJson<PresignedUpload>(
    presignResponse,
    "PLAUD upload initialization",
  );

  const uploadedParts: Array<{ PartNumber: number; ETag: string }> = [];

  for (const part of upload.Parts) {
    const start = (part.PartNumber - 1) * upload.ChunkSize;
    const end = Math.min(start + upload.ChunkSize, bytes.byteLength);
    const chunk = bytes.slice(start, end);
    const partResponse = await fetch(part.PresignedUrl, {
      method: "PUT",
      body: chunk,
    });

    if (!partResponse.ok) {
      throw new Error(
        `PLAUD file part ${part.PartNumber} failed (${partResponse.status})`,
      );
    }

    const etag = partResponse.headers.get("etag");
    if (!etag) {
      throw new Error(`PLAUD file part ${part.PartNumber} returned no ETag`);
    }

    uploadedParts.push({ PartNumber: part.PartNumber, ETag: etag });
  }

  const completeResponse = await fetch(
    `${PLAUD_BASE_URL}/files/upload/complete-upload`,
    {
      method: "POST",
      headers: authorizationHeaders,
      body: JSON.stringify({
        file_id: upload.FileId,
        upload_id: upload.UploadId,
        part_list: uploadedParts,
        filetype,
        file_md5: createHash("md5").update(bytes).digest("hex"),
      }),
      cache: "no-store",
    },
  );

  const completed = await responseJson<{ DownloadUrl: string }>(
    completeResponse,
    "PLAUD upload completion",
  );

  return completed.DownloadUrl;
}

