"use client";

import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { CommissionGraph } from "@/components/CommissionGraph";
import { ProductNav } from "@/components/ProductNav";
import { TopologyGraph } from "@/components/TopologyGraph";
import { COMMISSION_TRANSCRIPT, DEMO_TRANSCRIPT } from "@/lib/demo";
import type {
  AnalysisResult,
  ProviderName,
  WorkflowMode,
} from "@/lib/types";

import styles from "../lynx.module.css";

type Stage =
  | "idle"
  | "transcribing"
  | "extracting"
  | "reasoning"
  | "complete"
  | "error";

type ProviderConfiguration = Record<
  ProviderName,
  { configured: boolean; connected?: boolean; uploadReady?: boolean }
>;

const reconcilePipeline = [
  {
    id: "transcribing",
    label: "Transcribe",
    detail: "PLAUD",
  },
  {
    id: "extracting",
    label: "Extract changes",
    detail: "CRUSOE",
  },
  {
    id: "reasoning",
    label: "Compare graph",
    detail: "NEO4J",
  },
] as const;

const commissionPipeline = [
  {
    id: "transcribing",
    label: "Transcribe",
    detail: "PLAUD",
  },
  {
    id: "extracting",
    label: "Build records",
    detail: "CRUSOE",
  },
  {
    id: "reasoning",
    label: "Stage changes",
    detail: "NEO4J",
  },
] as const;

const stageOrder: Record<Stage, number> = {
  idle: 0,
  transcribing: 1,
  extracting: 2,
  reasoning: 3,
  complete: 4,
  error: 0,
};

const providerLabels: Record<ProviderName, string> = {
  plaud: "PLAUD",
  crusoe: "CRUSOE",
  neo4j: "NEO4J",
};

const snapshotTimes: Record<WorkflowMode, string[]> = {
  reconcile: ["00:11", "00:18", "00:25"],
  commission: ["00:06", "00:11", "00:16", "00:22", "00:28", "00:34"],
};

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export default function Home() {
  const [mode, setMode] = useState<WorkflowMode>("reconcile");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [dragging, setDragging] = useState(false);
  const [ticketDrafted, setTicketDrafted] = useState(false);
  const [approved, setApproved] = useState(false);
  const [approving, setApproving] = useState(false);
  const [missingResolved, setMissingResolved] = useState(false);
  const [azimuth, setAzimuth] = useState("");
  const [providerConfiguration, setProviderConfiguration] =
    useState<ProviderConfiguration | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    void fetch("/api/status")
      .then((response) => response.json())
      .then((body: { providers?: ProviderConfiguration }) => {
        if (body.providers) {
          setProviderConfiguration(body.providers);
        }
      })
      .catch(() => setProviderConfiguration(null));
  }, []);

  const analyzing =
    stage === "transcribing" ||
    stage === "extracting" ||
    stage === "reasoning";
  const revealed = stage === "complete" && Boolean(result);

  const currentPipelineIndex = useMemo(() => stageOrder[stage], [stage]);
  const pipeline =
    mode === "commission" ? commissionPipeline : reconcilePipeline;
  const sampleTranscript =
    mode === "commission" ? COMMISSION_TRANSCRIPT : DEMO_TRANSCRIPT;
  const plaudUploadReady = Boolean(
    providerConfiguration?.plaud.uploadReady,
  );

  function selectMode(nextMode: WorkflowMode) {
    setMode(nextMode);
    setStage("idle");
    setResult(null);
    setAudioFile(null);
    setTranscriptDraft("");
    setError("");
    setTicketDrafted(false);
    setApproved(false);
    setMissingResolved(false);
    setAzimuth("");
  }

  function chooseFile(file: File | null) {
    if (!file) return;
    setAudioFile(file);
    setResult(null);
    setStage("idle");
    setError("");
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    chooseFile(event.target.files?.[0] ?? null);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  async function analyze() {
    setError("");
    setResult(null);
    setApproved(false);
    setMissingResolved(false);
    setAzimuth("");
    setStage("transcribing");

    const stageTimer = (async () => {
      await delay(900);
      setStage("extracting");
      await delay(1_050);
      setStage("reasoning");
      await delay(1_050);
    })();

    try {
      const request = audioFile
        ? (() => {
            const form = new FormData();
            form.append("audio", audioFile);
            form.append("mode", mode);
            if (transcriptDraft.trim()) {
              form.append("transcript", transcriptDraft.trim());
            }
            return fetch("/api/analyze", {
              method: "POST",
              body: form,
            });
          })()
        : fetch("/api/analyze", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              mode,
              transcript: transcriptDraft.trim() || undefined,
            }),
          });

      const [response] = await Promise.all([request, stageTimer]);
      const body = (await response.json()) as AnalysisResult & { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Analysis failed");
      }

      setResult(body);
      setStage("complete");
    } catch (analysisError) {
      setError(
        analysisError instanceof Error
          ? analysisError.message
          : "The field note could not be analyzed.",
      );
      setStage("error");
    }
  }

  function reset() {
    setResult(null);
    setAudioFile(null);
    setTranscriptDraft("");
    setError("");
    setTicketDrafted(false);
    setApproved(false);
    setMissingResolved(false);
    setAzimuth("");
    setStage("idle");
  }

  async function approveCommissioning() {
    const changeSetId = result?.commissioning?.changeSetId;
    if (!changeSetId) return;

    setApproving(true);
    setError("");
    try {
      const response = await fetch("/api/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          changeSetId,
          antennaAzimuth: Number(azimuth),
        }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(body.error ?? "Approval failed");
      }
      setApproved(true);
    } catch (approvalError) {
      setError(
        approvalError instanceof Error
          ? approvalError.message
          : "The staged change set could not be approved.",
      );
    } finally {
      setApproving(false);
    }
  }

  function toggleSampleAudio() {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      void audio.play();
    } else {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  return (
    <>
      <ProductNav
        context={mode === "commission" ? "Tower Kilo" : "Site Alpha"}
        detail={mode === "commission" ? "Install session" : "Walkdown session"}
      />

      <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.kicker}>NEW FIELD SESSION</span>
          <h1>
            {mode === "commission"
              ? "Commission Tower Kilo"
              : "Reconcile Site Alpha"}
          </h1>
          <p>
            {mode === "commission"
              ? "Capture a new installation as a reviewed inventory and configuration change set."
              : "Compare the latest walkdown evidence with documented topology."}
          </p>
        </div>

        <div className={styles.providerRail}>
          {(["plaud", "crusoe", "neo4j"] as ProviderName[]).map((provider) => {
            const status = result?.providers.find(
              (item) => item.name === provider,
            );
            const configured = providerConfiguration?.[provider];
            const connected =
              provider === "neo4j"
                ? configured?.connected
                : configured?.configured;
            const statusLabel = status
              ? status.mode === "live"
                ? "LIVE"
                : "FALLBACK"
              : providerConfiguration
                ? connected
                  ? "CONNECTED"
                  : "SETUP"
                : "CHECKING";
            return (
              <div className={styles.provider} key={provider}>
                <span>{providerLabels[provider]}</span>
                <i
                  className={
                    status?.mode === "live" || (!status && connected)
                      ? styles.providerLive
                      : status?.mode === "demo"
                        ? styles.providerFallback
                        : styles.providerReady
                  }
                />
                <small>{statusLabel}</small>
              </div>
            );
          })}
        </div>
      </section>

      <section className={styles.modeSwitch} aria-label="Lynx workflow mode">
        <button
          type="button"
          className={mode === "reconcile" ? styles.modeActive : ""}
          onClick={() => selectMode("reconcile")}
        >
          <span>01</span>
          <strong>Reconcile</strong>
          <small>Compare field state with inventory</small>
        </button>
        <button
          type="button"
          className={mode === "commission" ? styles.modeActive : ""}
          onClick={() => selectMode("commission")}
        >
          <span>02</span>
          <strong>Commission</strong>
          <small>Add assets, links, and configuration</small>
        </button>
      </section>

      <section className={styles.workspace}>
        {mode === "reconcile" ? (
          <TopologyGraph revealed={revealed} analyzing={analyzing} />
        ) : (
          <CommissionGraph
            revealed={revealed}
            approved={approved}
            analyzing={analyzing}
            complete={missingResolved}
          />
        )}

        <aside className={styles.capturePanel}>
          <div className={styles.captureHeader}>
            <div>
              <span className={styles.sectionLabel}>INPUT</span>
              <h2>
                {mode === "commission"
                  ? "Radio installation"
                  : "Final site walkdown"}
              </h2>
            </div>
            <span className={styles.duration}>
              {mode === "commission" ? "00:34" : "00:29"}
            </span>
          </div>

          {!revealed ? (
            <>
              <div className={styles.audioCard}>
                <button
                  type="button"
                  className={styles.playButton}
                  onClick={toggleSampleAudio}
                  aria-label="Play sample recording"
                >
                  <span />
                </button>
                <span className={styles.recordingStatus}>
                  <i />
                  <span>
                    <strong>Sample recording</strong>
                    <small>
                      {mode === "commission" ? "34 sec" : "29 sec"}
                    </small>
                  </span>
                </span>
                <div className={styles.waveform} aria-hidden="true">
                  {[8, 15, 24, 13, 29, 36, 19, 42, 27, 16, 33, 45, 22, 31, 12, 25, 18, 9].map(
                    (height, index) => (
                      <i key={index} style={{ height }} />
                    ),
                  )}
                </div>
                <audio
                  ref={audioRef}
                  src={
                    mode === "commission"
                      ? "/commission-note.wav"
                      : "/field-note.wav"
                  }
                  preload="metadata"
                />
              </div>

              <label
                className={`${styles.dropzone} ${
                  dragging ? styles.dropzoneActive : ""
                } ${!plaudUploadReady ? styles.dropzoneDisabled : ""}`}
                onDragEnter={() => setDragging(true)}
                onDragLeave={() => setDragging(false)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".wav,.mp3,.m4a,audio/wav,audio/mpeg,audio/mp4"
                  onChange={handleFileInput}
                  disabled={!plaudUploadReady}
                />
                <span className={styles.uploadIcon}>+</span>
                <span>
                  <strong>
                    {audioFile
                      ? audioFile.name
                      : plaudUploadReady
                        ? "Upload recording"
                        : "PLAUD upload unavailable"}
                  </strong>
                  <small>
                    {audioFile
                      ? `${(audioFile.size / 1024 / 1024).toFixed(1)} MB selected`
                      : plaudUploadReady
                        ? "Drop WAV, MP3, or M4A"
                        : "Paste a PLAUD transcript below"}
                  </small>
                </span>
              </label>

              <div className={styles.transcriptComposer}>
                <div className={styles.composerHeader}>
                  <span>Transcript</span>
                  <button
                    type="button"
                    onClick={() => setTranscriptDraft(sampleTranscript)}
                  >
                    Load sample
                  </button>
                </div>
                <textarea
                  value={transcriptDraft}
                  onChange={(event) => setTranscriptDraft(event.target.value)}
                  placeholder="Paste a field transcript…"
                  rows={3}
                  spellCheck
                />
                <span className={styles.characterCount}>
                  {transcriptDraft.length} characters
                </span>
              </div>

              <div className={styles.pipeline}>
                {pipeline.map((step, index) => {
                  const stepNumber = index + 1;
                  const done = currentPipelineIndex > stepNumber;
                  const active =
                    currentPipelineIndex === stepNumber && analyzing;

                  return (
                    <div
                      className={`${styles.pipelineStep} ${
                        done ? styles.pipelineDone : ""
                      } ${active ? styles.pipelineActive : ""}`}
                      key={step.id}
                    >
                      <span className={styles.stepNumber}>
                        {done ? "✓" : stepNumber}
                      </span>
                      <span>
                        <strong>{step.label}</strong>
                        <small>{step.detail}</small>
                      </span>
                      {active && <i className={styles.spinner} />}
                    </div>
                  );
                })}
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                className={styles.analyzeButton}
                type="button"
                disabled={analyzing}
                onClick={analyze}
              >
                {analyzing ? (
                  <>
                    <i className={styles.buttonSpinner} />
                    {mode === "commission"
                      ? "Drafting change set"
                      : "Reconciling topology"}
                  </>
                ) : (
                  <>
                    {audioFile
                      ? "Analyze recording"
                      : transcriptDraft.trim()
                        ? "Process transcript"
                        : "Analyze sample"}
                    <span>↗</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className={styles.resultPanel}>
              <div className={styles.transcriptBlock}>
                <span className={styles.sectionLabel}>PLAUD TRANSCRIPT</span>
                <p>“{result?.transcript}”</p>
              </div>

              <div className={styles.observationList}>
                <span className={styles.sectionLabel}>
                  FIELD EVENTS · CRUSOE CONFIDENCE
                </span>
                {(mode === "commission"
                  ? result?.observations
                  : result?.observations.slice(0, 3)
                )?.map((observation, index) => (
                  <div
                    className={styles.observation}
                    key={`${observation.subject}-${observation.relation}-${observation.object}-${index}`}
                  >
                    <span className={styles.snapshotMeta}>
                      <time>{snapshotTimes[mode][index] ?? "LIVE"}</time>
                      <i title="Crusoe extraction confidence">
                        {Math.round(observation.confidence * 100)}%
                      </i>
                    </span>
                    <span>
                      <strong>
                        {observation.subject}{" "}
                        <em>{observation.relation.replaceAll("_", " ")}</em>{" "}
                        {observation.object}
                      </strong>
                      <small>“{observation.evidence}”</small>
                    </span>
                  </div>
                ))}
              </div>

              <button className={styles.resetButton} type="button" onClick={reset}>
                {mode === "commission"
                  ? "Run another installation"
                  : "Run another walkdown"}
              </button>
            </div>
          )}
        </aside>
      </section>

      {revealed && result?.risk && mode === "reconcile" ? (
        <section className={styles.finding}>
          <div className={styles.findingSignal}>
            <span className={styles.alertIcon}>!</span>
            <div>
              <span className={styles.sectionLabel}>CRITICAL TOPOLOGY FINDING</span>
              <h2>{result.risk.title}</h2>
            </div>
          </div>

          <div className={styles.findingBody}>
            <p>{result.risk.summary}</p>
            <div className={styles.metrics}>
              <span>
                <strong>{result.risk.sharedAssetId}</strong>
                shared dependency
              </span>
              <span>
                <strong>{result.risk.impactedCircuits}</strong>
                circuits exposed
              </span>
              <span>
                <strong>0</strong>
                independent backups
              </span>
            </div>
          </div>

          <div className={styles.recommendation}>
            <span className={styles.sectionLabel}>RECOMMENDED ACTION</span>
            <p>{result.risk.recommendation}</p>
            {ticketDrafted && (
              <div className={styles.ticketDraft}>
                <strong>REM-1042 · DRAFTED</strong>
                <span>Restore path diversity at Site Alpha</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => setTicketDrafted((drafted) => !drafted)}
            >
              {ticketDrafted
                ? "Hide remediation ticket"
                : "Draft remediation ticket ↗"}
            </button>
          </div>
        </section>
      ) : revealed && result?.commissioning && mode === "commission" ? (
        <section className={styles.commissionFinding}>
          <div className={styles.commissionSummary}>
            <div className={styles.completeness}>
              <strong>{missingResolved ? "8/8" : "7/8"}</strong>
              <span>fields</span>
            </div>
            <div>
              <span className={styles.sectionLabel}>
                STAGED COMMISSIONING RECORD
              </span>
              <h2>{result.commissioning.title}</h2>
              <p>{result.commissioning.summary}</p>
            </div>
          </div>

          <div className={styles.changeList}>
            {result.commissioning.changes.map((change) => (
              <div className={styles.changeRow} key={`${change.action}-${change.target}`}>
                <span>{change.action}</span>
                <strong>{change.target}</strong>
                <small>{change.value}</small>
                <em title="Crusoe extraction confidence">
                  {Math.round(change.confidence * 100)}%
                </em>
              </div>
            ))}
          </div>

          <div className={styles.approvalPanel}>
            <span className={styles.sectionLabel}>REVIEW</span>
            <div
              className={`${styles.missingField} ${
                missingResolved ? styles.missingFieldResolved : ""
              }`}
            >
              <span>{missingResolved ? "✓" : "!"}</span>
              <p>
                <strong>
                  {missingResolved ? "Follow-up captured" : "One field still needed"}
                </strong>
                {missingResolved
                  ? `Antenna direction · ${azimuth}°`
                  : "Antenna direction (azimuth)"}
              </p>
            </div>
            {!missingResolved && (
              <label className={styles.directionInput}>
                <span>Direction in degrees</span>
                <span>
                  <input
                    type="number"
                    min="0"
                    max="359"
                    value={azimuth}
                    onChange={(event) => setAzimuth(event.target.value)}
                    placeholder="142"
                    aria-label="Antenna direction in degrees"
                  />
                  <i>°</i>
                </span>
              </label>
            )}
            <p>
              Changes stay staged until an operator approves them.
            </p>
            {error && <p className={styles.error}>{error}</p>}
            <button
              type="button"
              disabled={
                approved ||
                approving ||
                (!missingResolved &&
                  (!azimuth || Number(azimuth) < 0 || Number(azimuth) > 359))
              }
              onClick={
                missingResolved
                  ? approveCommissioning
                  : () => setMissingResolved(true)
              }
            >
              {approved
                ? "Approved and synchronized ✓"
                : approving
                  ? "Applying change set…"
                  : missingResolved
                    ? "Approve 6 staged changes ↗"
                    : "Add direction"}
            </button>
          </div>
        </section>
      ) : (
        <section className={styles.proofStrip}>
          <span className={styles.proofLabel}>EXPECTED OUTPUT</span>
          <div>
            <strong>Field evidence</strong>
            <span>
              {mode === "commission"
                ? "“Radio C is in rack two, patched to switch two port twelve.”"
                : "“Radio B is patched into switch one.”"}
            </span>
          </div>
          <span className={styles.proofArrow}>→</span>
          <div>
            <strong>{mode === "commission" ? "Staged changes" : "Graph result"}</strong>
            <span>
              {mode === "commission"
                ? "A reviewed inventory and configuration change set."
                : "“Your backup path is not independent.”"}
            </span>
          </div>
        </section>
      )}
      </main>
    </>
  );
}
