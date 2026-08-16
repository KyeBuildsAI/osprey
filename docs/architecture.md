# Osprey architecture

## Product boundary

Osprey is an operational coordination system that uses AI. The incident is the
top-level durable object; agent runs are contributors to it.

The product direction and design guardrails are defined in
`docs/product-direction.md`. Architecture decisions must preserve its core
boundary: Osprey connects existing operational systems and governs the journey
from evidence to decision to action; it does not replace source GIS, weather,
asset, CCTV, or sensor platforms.

Agents produce proposals:

- observations
- evidence
- claims
- challenges
- recommendations
- courses of action

Deterministic policy and human decisions promote proposals into accepted
incident state. Agents do not silently rewrite accepted truth.

## Target Option A+ topology

1. The TypeScript web application presents the shared command room.
2. The operational API owns identity, permissions, incidents, evidence,
   decisions, and audit events.
3. Temporal owns durable, long-running incident and agent workflows.
4. PostgreSQL is the source of truth; PostGIS stores operational geography and
   pgvector supports retrieval.
5. Python weather-analysis services transform scientific datasets into
   structured, provenance-rich evidence.
6. Object storage holds raw and derived NetCDF, GRIB, radar, satellite, and
   raster products.

## Initial domain objects

- Incident
- Actor
- SpecialistAgent
- AgentRun
- Evidence
- Claim
- Challenge
- CourseOfAction
- Decision
- Approval
- AuditEvent
- Connector
- SourceRecord
- ExposureQuery
- Task
- Communication
- OutcomeMeasure

Every record should carry an incident identifier, actor identity, creation
time, source or parent relationship, and version where applicable.

## Safety invariants

- Read-only tools are the default.
- Consequential tools require explicit server-side policy checks.
- Approval is bound to a specific action payload and incident-state version.
- Changed evidence can invalidate a pending approval.
- Tool inputs, outputs, failures, and retries are auditable.
- Model text alone cannot grant authority.
- Demo and simulation actions are visibly distinguished from live actions.
- Connector health and evidence freshness are visible to operators.
- A decision, its tasks, communications, acknowledgements, and outcomes retain
  one traceable authorisation lineage.
- Operational measures include an explicit baseline and measurement window.

## Current implementation

The first slice is intentionally frontend-led and uses typed representative
incident data. It now demonstrates the complete product direction: hazard
lenses, connector status, spatial and temporal queries, provenance-rich
evidence, agent challenge, decision packets, human gates, action lineage, and
operational measurement. Its contracts establish the vocabulary that later
persistence and orchestration work will implement.
