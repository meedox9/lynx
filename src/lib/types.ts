export type ProviderName = "plaud" | "crusoe" | "neo4j";
export type WorkflowMode = "reconcile" | "commission";

export type ProviderStatus = {
  name: ProviderName;
  mode: "live" | "demo";
  detail: string;
};

export type Observation = {
  subject: string;
  relation:
    | "CONNECTED_TO"
    | "STATUS"
    | "LABEL"
    | "INSTALLED_AT"
    | "LINKED_TO"
    | "CONFIGURED_AS"
    | "SERIAL";
  object: string;
  confidence: number;
  evidence: string;
};

export type TopologyRisk = {
  code: "FALSE_REDUNDANCY";
  severity: "critical";
  title: string;
  summary: string;
  sharedAssetId: string;
  sharedAssetLabel: string;
  impactedCircuits: number;
  primaryPath: string[];
  backupPath: string[];
  recommendation: string;
};

export type InventoryChange = {
  action: "CREATE" | "CONNECT" | "CONFIGURE" | "VERIFY";
  target: string;
  value: string;
  confidence: number;
};

export type CommissioningPlan = {
  changeSetId: string;
  title: string;
  summary: string;
  assetId: string;
  assetLabel: string;
  completeness: number;
  missingFields: string[];
  changes: InventoryChange[];
  validationChecks: Array<{
    label: string;
    status: "passed" | "pending";
    detail: string;
  }>;
};

export type AnalysisResult = {
  mode: WorkflowMode;
  transcript: string;
  observations: Observation[];
  risk?: TopologyRisk;
  commissioning?: CommissioningPlan;
  providers: ProviderStatus[];
  analyzedAt: string;
};

export type InventoryAsset = {
  id: string;
  name: string;
  kind: "site" | "switch" | "radio" | "antenna" | "core";
  site: string;
  status: "active" | "offline" | "proposed";
  source: "inventory" | "field_observation";
  detail: string;
  lastObserved: string;
};

