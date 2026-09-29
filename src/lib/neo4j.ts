import "server-only";

import neo4j from "neo4j-driver";

import { DEMO_COMMISSIONING, DEMO_RISK } from "./demo";
import { baselineInventory } from "./inventory";
import type {
  CommissioningPlan,
  InventoryAsset,
  Observation,
  TopologyRisk,
} from "./types";

const assetLabels: Record<string, string> = {
  "SITE-ALPHA": "Site Alpha",
  "SW-1": "Aggregation Switch 1",
  "SW-2": "Aggregation Switch 2",
  "RADIO-A": "Primary Radio A",
  "RADIO-B": "Backup Radio B",
  CORE: "Network Core",
};

export function hasNeo4jConfig() {
  return Boolean(
    process.env.NEO4J_URI &&
      process.env.NEO4J_USERNAME &&
      process.env.NEO4J_PASSWORD,
  );
}

export async function verifyNeo4jConnection() {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return false;
  }

  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
  try {
    await driver.getServerInfo();
    return true;
  } catch {
    return false;
  } finally {
    await driver.close();
  }
}

function observedBackupSwitch(observations: Observation[]) {
  const connection = observations.find(
    (observation) =>
      observation.relation === "CONNECTED_TO" &&
      observation.subject === "RADIO-B" &&
      ["SW-1", "SW-2"].includes(observation.object),
  );

  return connection?.object ?? "SW-1";
}

export async function detectTopologyRisk(
  observations: Observation[],
): Promise<TopologyRisk> {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return DEMO_RISK;
  }

  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const backupSwitch = observedBackupSwitch(observations);
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  try {
    await driver.executeQuery(
      `
      MATCH (node:LynxDemo {demo_id: $demoId})
      DETACH DELETE node
      `,
      { demoId: "site-alpha-walkdown" },
      { database },
    );

    await driver.executeQuery(
      `
      CREATE (site:LynxDemo:Asset {
        demo_id: $demoId, id: 'SITE-ALPHA', name: 'Site Alpha', kind: 'site'
      })
      CREATE (switch1:LynxDemo:Asset {
        demo_id: $demoId, id: 'SW-1', name: 'Aggregation Switch 1', kind: 'switch'
      })
      CREATE (switch2:LynxDemo:Asset {
        demo_id: $demoId, id: 'SW-2', name: 'Aggregation Switch 2', kind: 'switch'
      })
      CREATE (radioA:LynxDemo:Asset {
        demo_id: $demoId, id: 'RADIO-A', name: 'Primary Radio A', kind: 'radio'
      })
      CREATE (radioB:LynxDemo:Asset {
        demo_id: $demoId, id: 'RADIO-B', name: 'Backup Radio B', kind: 'radio'
      })
      CREATE (core:LynxDemo:Asset {
        demo_id: $demoId, id: 'CORE', name: 'Network Core', kind: 'core'
      })
      CREATE (primary:LynxDemo:Path {
        demo_id: $demoId, id: 'PRIMARY', kind: 'primary'
      })
      CREATE (backup:LynxDemo:Path {
        demo_id: $demoId, id: 'BACKUP', kind: 'backup'
      })

      CREATE (primary)-[:USES {position: 1}]->(site)
      CREATE (primary)-[:USES {position: 2}]->(switch1)
      CREATE (primary)-[:USES {position: 3}]->(radioA)
      CREATE (primary)-[:USES {position: 4}]->(core)
      CREATE (backup)-[:USES {position: 1}]->(site)
      CREATE (backup)-[:USES {position: 3}]->(radioB)
      CREATE (backup)-[:USES {position: 4}]->(core)

      WITH switch1, switch2, backup
      FOREACH (_ IN CASE WHEN $backupSwitch = 'SW-1' THEN [1] ELSE [] END |
        CREATE (backup)-[:USES {position: 2, source: 'field_observation'}]->(switch1)
      )
      FOREACH (_ IN CASE WHEN $backupSwitch = 'SW-2' THEN [1] ELSE [] END |
        CREATE (backup)-[:USES {position: 2, source: 'field_observation'}]->(switch2)
      )

      WITH 1 AS ignored
      UNWIND $observations AS observation
      CREATE (:LynxDemo:Observation {
        demo_id: $demoId,
        subject: observation.subject,
        relation: observation.relation,
        object: observation.object,
        confidence: observation.confidence,
        evidence: observation.evidence
      })
      RETURN count(*) AS observations_written
      `,
      {
        demoId: "site-alpha-walkdown",
        backupSwitch,
        observations,
      },
      { database },
    );

    const result = await driver.executeQuery(
      `
      MATCH (shared:LynxDemo:Asset {demo_id: $demoId, kind: 'switch'})
            <-[:USES]-(primary:LynxDemo:Path {
              demo_id: $demoId, kind: 'primary'
            }),
            (shared)<-[:USES]-(backup:LynxDemo:Path {
              demo_id: $demoId, kind: 'backup'
            })
      RETURN shared.id AS id, shared.name AS name
      LIMIT 1
      `,
      { demoId: "site-alpha-walkdown" },
      { database },
    );

    const shared = result.records[0];
    if (!shared) {
      throw new Error("Neo4j found no shared switch between the two paths");
    }

    const sharedAssetId = String(shared.get("id"));
    const sharedAssetLabel =
      String(shared.get("name")) ??
      assetLabels[sharedAssetId] ??
      sharedAssetId;

    return {
      ...DEMO_RISK,
      sharedAssetId,
      sharedAssetLabel,
      backupPath: ["SITE-ALPHA", backupSwitch, "RADIO-B", "CORE"],
      summary: `The primary and backup paths both traverse ${sharedAssetLabel}. A single switch failure would isolate Site Alpha despite the documented redundant design.`,
    };
  } finally {
    await driver.close();
  }
}

export async function stageCommissioningPlan(
  observations: Observation[],
): Promise<CommissioningPlan> {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return DEMO_COMMISSIONING;
  }

  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  try {
    await driver.executeQuery(
      `
      MATCH (node:LynxCommission {demo_id: $demoId})
      DETACH DELETE node
      `,
      { demoId: "tower-kilo-commissioning" },
      { database },
    );

    await driver.executeQuery(
      `
      CREATE (change:LynxCommission:ChangeSet {
        demo_id: $demoId,
        id: $changeSetId,
        status: 'AWAITING_APPROVAL',
        created_at: datetime()
      })
      CREATE (radio:LynxCommission:ProposedAsset {
        demo_id: $demoId,
        id: 'RADIO-C',
        name: 'Radio C',
        kind: 'radio',
        serial: 'LC-8841'
      })
      CREATE (tower:LynxCommission:Asset {
        demo_id: $demoId,
        id: 'TOWER-KILO',
        name: 'Tower Kilo',
        kind: 'site'
      })
      CREATE (switch:LynxCommission:Asset {
        demo_id: $demoId,
        id: 'SW-2',
        name: 'Aggregation Switch 2',
        kind: 'switch'
      })
      CREATE (dish:LynxCommission:Asset {
        demo_id: $demoId,
        id: 'DISH-3',
        name: 'Dish 3',
        kind: 'antenna'
      })
      CREATE (remote:LynxCommission:Asset {
        demo_id: $demoId,
        id: 'RADIO-D',
        name: 'Site Bravo Radio D',
        kind: 'radio'
      })

      CREATE (change)-[:PROPOSES]->(radio)
      CREATE (radio)-[:INSTALLED_AT {
        proposed: true, location: 'Rack 2 / U18'
      }]->(tower)
      CREATE (radio)-[:MANAGED_BY {
        proposed: true, port: 12
      }]->(switch)
      CREATE (radio)-[:FEEDS {proposed: true}]->(dish)
      CREATE (radio)-[:RF_LINK {
        proposed: true,
        frequency_ghz: 18.7,
        polarization: 'vertical',
        rx_dbm: -42,
        status: 'up'
      }]->(remote)

      WITH change
      UNWIND $observations AS observation
      CREATE (finding:LynxCommission:Observation {
        demo_id: $demoId,
        subject: observation.subject,
        relation: observation.relation,
        object: observation.object,
        confidence: observation.confidence,
        evidence: observation.evidence
      })
      CREATE (change)-[:SUPPORTED_BY]->(finding)
      RETURN count(finding) AS observations_written
      `,
      {
        demoId: "tower-kilo-commissioning",
        changeSetId: DEMO_COMMISSIONING.changeSetId,
        observations,
      },
      { database },
    );

    return DEMO_COMMISSIONING;
  } finally {
    await driver.close();
  }
}

export async function approveCommissioningChange(
  changeSetId: string,
  antennaAzimuth: number,
) {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return {
      changeSetId,
      status: "APPROVED",
      antennaAzimuth,
      mode: "demo" as const,
    };
  }

  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  try {
    const result = await driver.executeQuery(
      `
      MATCH (change:LynxCommission:ChangeSet {id: $changeSetId})
            -[:PROPOSES]->(radio:LynxCommission:ProposedAsset)
      SET change.status = 'APPROVED',
          change.approved_at = datetime(),
          radio.status = 'ACTIVE',
          radio.antenna_azimuth = $antennaAzimuth
      REMOVE radio:ProposedAsset
      SET radio:Asset
      RETURN change.status AS status, radio.id AS asset_id
      `,
      { changeSetId, antennaAzimuth },
      { database },
    );

    if (!result.records[0]) {
      throw new Error("The staged Neo4j change set was not found");
    }

    return {
      changeSetId,
      status: String(result.records[0].get("status")),
      assetId: String(result.records[0].get("asset_id")),
      antennaAzimuth,
      mode: "live" as const,
    };
  } finally {
    await driver.close();
  }
}

export async function listInventoryAssets(): Promise<InventoryAsset[]> {
  const uri = process.env.NEO4J_URI;
  const username = process.env.NEO4J_USERNAME;
  const password = process.env.NEO4J_PASSWORD;

  if (!uri || !username || !password) {
    return baselineInventory;
  }

  const database = process.env.NEO4J_DATABASE ?? "neo4j";
  const driver = neo4j.driver(uri, neo4j.auth.basic(username, password), {
    disableLosslessIntegers: true,
  });

  try {
    const result = await driver.executeQuery(
      `
      MATCH (asset)
      WHERE (asset:LynxDemo OR asset:LynxCommission)
        AND (asset:Asset OR asset:ProposedAsset)
      RETURN asset.id AS id,
             asset.name AS name,
             asset.kind AS kind,
             asset.status AS status,
             asset.serial AS serial,
             labels(asset) AS labels
      `,
      {},
      { database },
    );

    const observedById = new Map<
      string,
      {
        name: string;
        kind: InventoryAsset["kind"];
        status?: string;
        serial?: string;
        proposed: boolean;
      }
    >();

    for (const record of result.records) {
      const id = String(record.get("id"));
      const labels = record.get("labels") as string[];
      observedById.set(id, {
        name: String(record.get("name") ?? id),
        kind: String(record.get("kind") ?? "radio") as InventoryAsset["kind"],
        status: record.get("status")
          ? String(record.get("status")).toLowerCase()
          : undefined,
        serial: record.get("serial")
          ? String(record.get("serial"))
          : undefined,
        proposed: labels.includes("ProposedAsset"),
      });
    }

    return baselineInventory.map((asset) => {
      const observed = observedById.get(asset.id);
      if (!observed) return asset;

      return {
        ...asset,
        name: observed.name,
        kind: observed.kind,
        status: observed.proposed
          ? "proposed"
          : observed.status === "active"
            ? "active"
            : asset.status,
        source: "field_observation",
        detail:
          observed.serial && !asset.detail.includes(observed.serial)
          ? `${asset.detail} · ${observed.serial}`
          : asset.detail,
      };
    });
  } catch {
    return baselineInventory;
  } finally {
    await driver.close();
  }
}

