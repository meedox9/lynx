# Lynx

Voice-first field intelligence for physical networks.

Lynx converts technician recordings into evidence-backed infrastructure changes before the technician leaves the site. It is designed for telecom, data-center, utility, and network teams whose physical infrastructure changes faster than their systems of record.

## Workflows

- **Commission:** Draft inventory, connectivity, and configuration updates from narrated installation work.
- **Reconcile:** Compare field observations with documented topology and expose hidden operational risk.

Changes are staged in an isolated graph change set. A network operator reviews the original evidence and approves each update before it enters the source of truth.

## Current MVP

- Multi-page operator interface with Sessions, Inventory, Topology, Integrations, and Workspace views
- Pre-recorded field audio and transcript input
- Live Crusoe extraction into canonical, confidence-scored field events
- Live Neo4j Aura graph writes, dependency traversal, staged changes, and approval
- Commissioning completeness checks for missing operational fields
- Documented-versus-observed topology comparison
- Light and dark themes
- Vercel-compatible Next.js deployment

## Architecture

- **PLAUD** is the target hands-free capture and transcription layer.
- **Crusoe** converts transcripts into canonical, confidence-scored field events.
- **Neo4j Aura** stages graph changes and reasons across physical dependencies.
- **Next.js** provides the operator review and approval interface.

The current demo uses committed sample recordings and transcripts. Crusoe and Neo4j run live when credentials are configured. PLAUD Embedded credentials are supported, but direct transcription currently requires a bound-device entitlement. Until that is enabled, recordings can be transcribed in PLAUD Web and pasted into Lynx.

## Data flow

```text
Field recording
  → transcript
  → Crusoe structured observations
  → Neo4j proposed graph changes
  → dependency and completeness checks
  → operator approval
  → source-of-truth update
```

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

Configure integrations in `.env.local`:

- `CRUSOE_API_KEY`, `CRUSOE_MODEL`, and `CRUSOE_MAX_CALLS_PER_PROCESS`
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE`
- `PLAUD_CLIENT_ID`, `PLAUD_CLIENT_SECRET`, and `PLAUD_API_KEY`
- `PLAUD_TRANSCRIPTION_ENABLED=false` when the application has no bound-device entitlement

## Deploy

Lynx deploys as a standard Next.js application on Vercel. Add the same variables in Vercel Project Settings → Environment Variables. Set `PLAUD_TRANSCRIPTION_ENABLED=false` unless the PLAUD application has a bound-device entitlement.

## Inspect the graph

Reconciliation topology:

```cypher
MATCH p=(a:LynxDemo)-[r]-(b:LynxDemo)
RETURN p
LIMIT 100;
```

Commissioning change set:

```cypher
MATCH p=(c:LynxCommission:ChangeSet)-[*1..2]-(n)
RETURN p
LIMIT 100;
```

## Current limitations

- The demo uses a fixed network domain model and synthetic sites.
- Inventory and configuration adapters are represented by Neo4j rather than external operational systems.
- PLAUD transcription is not active without a bound-device entitlement.
- Sample transcript extraction is cached in memory to limit inference usage.
- Operator approval is not yet protected by authentication or role-based access.
- Confidence values are model-reported extraction confidence, not calibrated probabilities.

## Next steps

1. Wrap the web application with PLAUD's Capacitor plugin for device pairing, recording, and file sync.
2. Add NetBox, Nautobot, ServiceNow, and configuration-management adapters.
3. Replace the fixed schema with customer-defined asset and relationship types.
4. Verify approved changes against live telemetry before closing maintenance.
5. Add authenticated operators, immutable audit history, and approval policies.
6. Persist field sessions and extraction caches outside the application process.
7. Build an evaluation set for extraction accuracy and confidence calibration.
