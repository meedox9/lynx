import type {
  AnalysisResult,
  CommissioningPlan,
  Observation,
  TopologyRisk,
  WorkflowMode,
} from "./types";

export const DEMO_TRANSCRIPT =
  "Hey, quick update from Site Alpha. I’m tracing the backup path now. Radio Bravo is not landing on aggregation switch two like the drawing shows. It’s actually patched into switch one, port eight, right beside the primary path. Switch two is powered off, and its uplink has been removed. The label on Radio Bravo still says backup. Please flag that before we close the maintenance.";

export const COMMISSION_TRANSCRIPT =
  "Okay, starting the new radio install at Tower Kilo. I’ve mounted Radio Charlie in rack two at U eighteen. Serial number is L C eight eight four one. Management is patched to switch two, port twelve. The RF side is connected to dish three, and the far end is Site Bravo, Radio Delta. I’ve set it to eighteen point seven gigahertz, vertical polarization. The link is up, and I’m seeing minus forty-two dBm receive level.";

export const DEMO_OBSERVATIONS: Observation[] = [
  {
    subject: "RADIO-B",
    relation: "CONNECTED_TO",
    object: "SW-1",
    confidence: 0.98,
    evidence:
      "It’s actually patched into switch one, port eight, right beside the primary path.",
  },
  {
    subject: "SW-2",
    relation: "STATUS",
    object: "OFFLINE",
    confidence: 0.97,
    evidence: "Switch two is powered off, and its uplink has been removed.",
  },
  {
    subject: "RADIO-B",
    relation: "LABEL",
    object: "BACKUP_PATH",
    confidence: 0.94,
    evidence: "The label on Radio Bravo still says backup.",
  },
];

export const COMMISSION_OBSERVATIONS: Observation[] = [
  {
    subject: "RADIO-C",
    relation: "INSTALLED_AT",
    object: "TOWER-KILO/RACK-2/U18",
    confidence: 0.98,
    evidence: "I’ve mounted Radio Charlie in rack two at U eighteen.",
  },
  {
    subject: "RADIO-C",
    relation: "SERIAL",
    object: "LC-8841",
    confidence: 0.99,
    evidence: "Serial number is L C eight eight four one.",
  },
  {
    subject: "RADIO-C",
    relation: "CONNECTED_TO",
    object: "SW-2/PORT-12",
    confidence: 0.98,
    evidence: "Management is patched to switch two, port twelve.",
  },
  {
    subject: "RADIO-C",
    relation: "LINKED_TO",
    object: "SITE-BRAVO/RADIO-D",
    confidence: 0.96,
    evidence: "The far end is Site Bravo, Radio Delta.",
  },
  {
    subject: "RADIO-C",
    relation: "CONFIGURED_AS",
    object: "18.7_GHZ/VERTICAL",
    confidence: 0.97,
    evidence:
      "I’ve set it to eighteen point seven gigahertz, vertical polarization.",
  },
  {
    subject: "RADIO-C",
    relation: "STATUS",
    object: "LINK_UP/RX_-42_DBM",
    confidence: 0.95,
    evidence: "The link is up, and I’m seeing minus forty-two dBm receive level.",
  },
];

export const DEMO_RISK: TopologyRisk = {
  code: "FALSE_REDUNDANCY",
  severity: "critical",
  title: "Hidden single point of failure",
  summary:
    "The primary and backup paths both traverse Aggregation Switch 1. A single switch failure would isolate Site Alpha despite the documented redundant design.",
  sharedAssetId: "SW-1",
  sharedAssetLabel: "Aggregation Switch 1",
  impactedCircuits: 14,
  primaryPath: ["SITE-ALPHA", "SW-1", "RADIO-A", "CORE"],
  backupPath: ["SITE-ALPHA", "SW-1", "RADIO-B", "CORE"],
  recommendation:
    "Restore Switch 2 and move Radio B back to its documented uplink before accepting the site.",
};

export const DEMO_COMMISSIONING: CommissioningPlan = {
  changeSetId: "LYNX-TOWER-KILO-001",
  title: "Radio C commissioning change set",
  summary:
    "Lynx resolved the spoken installation into five staged updates and caught one missing commissioning field.",
  assetId: "RADIO-C",
  assetLabel: "Radio C",
  completeness: 88,
  missingFields: ["Antenna azimuth"],
  changes: [
    {
      action: "CREATE",
      target: "RADIO-C",
      value: "Tower Kilo · Rack 2 · U18 · Serial LC-8841",
      confidence: 0.98,
    },
    {
      action: "CONNECT",
      target: "RADIO-C management",
      value: "SW-2 · Port 12",
      confidence: 0.98,
    },
    {
      action: "CONNECT",
      target: "RADIO-C RF",
      value: "Dish 3 → Site Bravo / Radio D",
      confidence: 0.96,
    },
    {
      action: "CONFIGURE",
      target: "RADIO-C channel",
      value: "18.7 GHz · Vertical polarization",
      confidence: 0.97,
    },
    {
      action: "VERIFY",
      target: "Radio link",
      value: "Link up · RX −42 dBm",
      confidence: 0.95,
    },
  ],
  validationChecks: [
    {
      label: "Management path",
      status: "passed",
      detail: "SW-2/12 resolved",
    },
    {
      label: "Remote endpoint",
      status: "passed",
      detail: "Site Bravo / Radio D resolved",
    },
    {
      label: "RF telemetry",
      status: "passed",
      detail: "Link up at −42 dBm",
    },
    {
      label: "Install completeness",
      status: "pending",
      detail: "Antenna azimuth required",
    },
  ],
};

export function createDemoResult(
  mode: WorkflowMode = "reconcile",
): AnalysisResult {
  if (mode === "commission") {
    return {
      mode,
      transcript: COMMISSION_TRANSCRIPT,
      observations: COMMISSION_OBSERVATIONS,
      commissioning: DEMO_COMMISSIONING,
      providers: [
        {
          name: "plaud",
          mode: "demo",
          detail: "Sample transcript",
        },
        {
          name: "crusoe",
          mode: "demo",
          detail: "Deterministic extraction",
        },
        {
          name: "neo4j",
          mode: "demo",
          detail: "Staged graph update",
        },
      ],
      analyzedAt: new Date().toISOString(),
    };
  }

  return {
    mode,
    transcript: DEMO_TRANSCRIPT,
    observations: DEMO_OBSERVATIONS,
    risk: DEMO_RISK,
    providers: [
      {
        name: "plaud",
        mode: "demo",
        detail: "Sample transcript",
      },
      {
        name: "crusoe",
        mode: "demo",
        detail: "Deterministic extraction",
      },
      {
        name: "neo4j",
        mode: "demo",
        detail: "In-memory traversal",
      },
    ],
    analyzedAt: new Date().toISOString(),
  };
}

