# Capability status ledger

Snapshot date: **19 August 2026**
Evidence basis: local deployable tree at `a6338f2`, including the uncommitted,
user-owned `lib/locations.ts` change. This file reports what the inspected code
demonstrates; it does not certify production readiness.

## Status vocabulary

- **Implemented** — exists in the current repository and is exercised in the
  running slice.
- **Partial** — a useful portion exists, but a required durability, security,
  correctness, or workflow property is absent.
- **Designed** — a concrete target and contract are documented, with no complete
  implementation.
- **Proposed** — a candidate direction still requiring a design decision.
- **Future** — intentionally deferred and not yet specified enough to build.

## Current ledger

| Capability | Status | Current evidence and boundary |
| --- | --- | --- |
| Operator command-room UI | Implemented | Responsive React/MapLibre interface with incident, map, evidence, specialist, decision, and task views. |
| Osprey API boundary | Partial | Server routes proxy or combine several read-only data sources. Core incident state and transitions still live in the browser. |
| Live public-source connectors | Partial | NWS weather/alerts, NOAA/NWS water, MRMS rainfall, TranStar impact, USGS elevation, and FEMA data paths exist. Coverage, retries, schemas, and failure isolation are not yet a production connector framework. |
| Spatial queries and exposure logic | Partial | Map interactions, radius/polygon selection, representative assets, elevation, and FEMA intersections exist. There is no durable PostGIS service or canonical saved query. |
| Evidence provenance | Partial | Source identity, timestamps, health/freshness, and references appear in normalized records and UI. Raw immutable snapshots and an evidence graph are not durable. |
| Specialist assessments | Partial | Weather, Infrastructure, Operations, and Communications views use deterministic TypeScript rules over shared page state. They are not model-backed agents or durable workers. |
| Shared incident state | Partial | Typed state is shared within one browser session. It is not a server-owned, versioned, multi-user system of record. |
| Decision packets and approval UI | Partial | Representative packet and local review transitions are visible. Identity, authority, policy checks, version binding, and persistence are absent. No external action is released. |
| Tasks and communications | Partial | Representative local records illustrate lineage. There is no durable delivery, acknowledgement, retry, or outbox execution. |
| Source fallback/degraded display | Partial | Several connectors expose health/freshness and FEMA has a bundled snapshot fallback. The intelligence fan-out can still fail as a whole and there is no workflow-level recovery. |
| Deterministic workflow engine | Designed | Target contract is documented; no durable engine, timers, idempotent workflow history, or recovery exists. |
| Model gateway and task/risk/cost routing | Designed | Provider-neutral contract and routing policy are documented; no model SDK or provider call is present. |
| Governed Evidence Layer / RAG | Designed | Retrieval, access, versioning, and citation rules are documented; no vector/document retrieval runtime is present. |
| Durable operational database and audit | Designed | PostgreSQL/PostGIS, object storage, event/outbox, and audit concepts are targets only. |
| Authenticated server-side approval policy | Designed | Policy invariants are documented; current approval is browser-local and names a representative actor. |
| Evaluation harness and release gates | Designed | Evaluation contract and metrics are documented. Only one server-render smoke test exists; there are no model/RAG/workflow scenario scores. |
| Historical replay | Designed | Requirements exist; no replay engine or evidence clock is implemented. |
| External consequential actions | Future | Explicitly out of current scope until authority, security, audit, recovery, and evaluation gates pass. |
| Multi-user operations | Future | No durable identity, roles, permissions, assignments, or concurrent incident state. |

## Verification baseline

- Production build and the single rendered-HTML smoke test pass.
- Lint currently fails on two pre-existing unused browser handlers in
  `app/page.tsx` (`queueForApproval` and `deferPacket`). This documentation pass
  does not change application code or claim a clean lint baseline.
- The build emits a non-fatal large-client-chunk warning.

Status changes require code or deployment evidence, proportionate verification,
and a coordinated update to this ledger and any affected roadmap claims.
