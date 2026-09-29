# Lynx

Voice-first field intelligence for physical networks.

Lynx converts hands-free technician recordings into evidence-backed infrastructure changes before the technician leaves the site.

## What it does

- **Commission:** Draft inventory, connectivity, and configuration updates from narrated installation work.
- **Reconcile:** Compare field observations with documented topology and expose hidden operational risk.

Changes are staged in an isolated graph change set. A network operator reviews the original evidence and approves each update before it enters the source of truth.

## Architecture

- **PLAUD** captures and transcribes real-world field recordings.
- **Crusoe** converts transcripts into canonical, confidence-scored field events.
- **Neo4j Aura** stages graph changes and reasons across physical dependencies.
- **Next.js** provides the operator review and approval interface.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

Configure integrations in `.env.local`:

- `PLAUD_CLIENT_ID`, `PLAUD_API_KEY`, and optionally `PLAUD_USER_ACCESS_TOKEN`
- `CRUSOE_API_KEY`
- `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`, and `NEO4J_DATABASE`

## Deploy

Lynx deploys as a standard Next.js application on Vercel. Add the same variables in Vercel Project Settings → Environment Variables. Set `PLAUD_TRANSCRIPTION_ENABLED=false` unless the PLAUD application has a bound-device entitlement.
