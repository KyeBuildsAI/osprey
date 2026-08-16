# Osprey architecture

## Architectural intent

Osprey is an agentic incident-command and operational-coordination layer. It
connects authoritative weather, GIS, asset, infrastructure, sensor, field, and
communications systems, then governs the journey from evidence to decision,
action, and measured outcome.

Osprey does not replace source GIS, CCTV, weather-model, sensor-management, or
asset systems. The product boundary and non-negotiable interaction principles
are defined in [`product-direction.md`](product-direction.md).

## Locked capability architecture

The architecture must support all eight product capabilities as one connected
operational thread.

| Product capability | Architectural responsibility |
| --- | --- |
| Hazard-specific operational views | Hazard definitions, thresholds, procedures, map layers, evidence requirements, and decision templates are configuration-backed and versioned. Compound incidents can contain multiple hazard workspaces. |
| Map-based exposure and time forecasting | PostGIS-backed spatial queries join forecast impact zones to people, places, assets, routes, and responsibilities. Forecast frames retain model, valid-time, issue-time, and confidence metadata. |
| Operational connectors | Versioned adapters ingest weather, GIS, asset, CCTV metadata, sensor, field, and communication events. Every connector reports health, freshness, latency, and last successful synchronisation. |
| Incident evidence graph | Evidence, claims, transformations, challenges, supersessions, and decisions form a provenance graph. Every node has source, event time, receipt time, actor, confidence, version, and incident identity. |
| Agent collaboration and human gates | Durable specialist-agent workflows produce structured proposals. A challenge function tests material assumptions. Deterministic policy and named human authority govern acceptance and consequential action. |
| Decision packets | A packet binds the incident-state version, decision question, options, supporting and contradicting evidence, uncertainty, challenges, trade-offs, authority, expiry, and reversible first actions. |
| Tasks, communications, and outcomes | Approved decisions create owned tasks and governed messages. Acknowledgements, completions, exceptions, and outcome observations retain the originating approval lineage. |
| Operational measurement | An evaluation service records response time, evidence coverage, challenge closure, decision quality, operator workload, action completion, and outcome attainment against explicit baselines. |

## System context

```text
Authoritative operational systems
  Weather models · GIS · Asset registers · CCTV metadata · IoT sensors
  Field reports · Task systems · Messaging and alerting platforms
                              │
                              ▼
                    Connector and ingestion layer
             Health · freshness · schema validation · replay
                              │
                              ▼
                Incident store and evidence graph
       Incidents · hazards · evidence · claims · challenges · versions
                              │
                  ┌───────────┴───────────┐
                  ▼                       ▼
        Spatial/forecast services   Agent workflow runtime
        PostGIS · weather analysis  Specialists · challenge · synthesis
                  └───────────┬───────────┘
                              ▼
                    Decision packet service
             Options · trade-offs · authority · expiry · policy
                              │
                              ▼
                       Human approval gate
                              │
                              ▼
             Tasks · communications · acknowledgements
                              │
                              ▼
                  Outcomes and evaluation service
                              │
                              ▼
                    Shared Osprey command room
```

## Target Option A+ topology

1. The TypeScript web application presents the shared command room, hazard
   workspaces, evidence graph, decision packets, action lineage, and outcome
   measures.
2. The operational API owns identity, permissions, incidents, connectors,
   evidence, claims, challenges, decisions, approvals, tasks, communications,
   outcomes, and audit events.
3. Temporal owns durable, long-running connector, incident, agent, challenge,
   approval-expiry, task, acknowledgement, and evaluation workflows.
4. PostgreSQL is the transactional source of truth. PostGIS stores operational
   geography and exposure relationships; pgvector supports bounded retrieval.
5. Python weather-analysis services transform NetCDF, GRIB, radar, satellite,
   and ensemble products into structured, provenance-rich forecast evidence.
6. Object storage holds immutable raw inputs and derived scientific products.
7. An outbox-driven integration layer releases approved tasks and messages and
   records acknowledgements without losing the authorising decision lineage.
8. An evaluation service calculates operational measures against versioned
   baselines and publishes the method with every result.

## Core domain objects

### Incident and hazard

- Incident
- HazardWorkspace
- HazardDefinition
- OperationalThreshold
- ForecastFrame
- ExposureQuery
- ImpactZone

### Sources and evidence

- Connector
- ConnectorRun
- SourceRecord
- Evidence
- Claim
- Transformation
- Challenge
- Supersession

### Agents and authority

- Actor
- SpecialistAgent
- AgentRun
- Recommendation
- CourseOfAction
- DecisionPacket
- Decision
- Approval
- PolicyEvaluation

### Action and measurement

- Task
- Communication
- Acknowledgement
- OutcomeObservation
- OperationalBaseline
- OperationalMeasure
- AuditEvent

Every durable record carries an incident identifier, actor identity, creation
time, event or valid time where relevant, source or parent relationship,
version, and classification between demonstration and live operation.

## Evidence graph requirements

The evidence graph is part of accepted incident state, not an optional visual.

- Raw source records are immutable and content-addressed where practical.
- Evidence records reference the source connector, source identifier, event
  timestamp, Osprey receipt timestamp, transformation, geographic scope, and
  freshness state.
- Claims identify supporting, contradicting, and missing evidence.
- Challenges identify the assumption under review, owner, severity, status,
  resolution, and downstream decisions they block or qualify.
- Superseded evidence remains reconstructable and never disappears from audit.
- Decision packets bind to an exact graph and incident-state version.
- New or corrected evidence can expire or invalidate a pending packet.

## Spatial and forecast model

- Hazard views request only the spatial layers and operational attributes
  relevant to their configured decision journey.
- Exposure queries support radius, polygon, asset, route, and administrative
  boundary selection.
- Query results retain the geometry, dataset versions, time window, filters,
  and user or agent that initiated the query.
- Forecast frames distinguish issue time, valid time, model, ensemble member,
  confidence, units, and geographic resolution.
- Moving the forecast time must preserve the active hazard, map selection,
  exposed assets, and decision context.
- Scientific transformations publish their method and source product hashes.

## Connector contract

Each connector implements:

- schema and semantic version
- authentication and least-privilege scope
- poll, stream, webhook, or batch ingestion mode
- source event time and Osprey receipt time
- health, freshness, latency, and error state
- idempotency and deduplication key
- replay and backfill behaviour
- geographic and organisational scope
- source terms, classification, and retention policy
- raw-payload reference and normalised-record output

Connector failure must degrade visibly. It must not silently present stale data
as current or allow model synthesis to conceal missing authoritative input.

## Agent collaboration and challenge

Agents produce proposals rather than accepted truth:

- observations
- evidence candidates
- claims
- challenges
- recommendations
- courses of action
- requests for additional data or human input

The incident workflow coordinates specialist work, exposes disagreement, and
assigns challenge ownership. Deterministic policy and human decisions promote
proposals into accepted incident state. Agents cannot silently rewrite accepted
facts, close their own material challenge, or grant themselves authority.

## Decision packet and human gate

A decision packet contains:

- the decision question and accountable authority
- incident, hazard, and evidence-graph versions
- time window and expiry conditions
- options, assumptions, benefits, trade-offs, and reversibility
- supporting, contradicting, missing, stale, and challenged evidence
- agent recommendations and disclosed disagreements
- proposed tasks, communications, owners, and outcome checks
- policy evaluation and required approvals

Approval is bound to a specific packet payload and incident-state version. If
material evidence, authority, action scope, or expiry changes, the approval is
invalidated and must be reconsidered.

## Decision-to-outcome lineage

An approved decision creates one traceable operational thread:

```text
DecisionPacket -> Approval -> Decision -> Task / Communication
              -> Acknowledgement -> Completion / Exception
              -> OutcomeObservation -> OperationalMeasure
```

External systems may execute tasks or deliver messages, but Osprey retains the
authorising payload, recipient or owner, release time, acknowledgement,
exception, completion, and outcome reference.

## Operational measurement

The initial measurement set is:

- **Response time:** signal-to-awareness, awareness-to-decision,
  decision-to-release, release-to-acknowledgement, and release-to-completion.
- **Decision quality:** evidence coverage, source diversity, freshness,
  challenge closure, assumption disclosure, policy compliance, reversibility,
  and post-incident outcome review.
- **Operator workload:** manual coordination steps, duplicate data entry,
  unresolved decisions, alerts requiring review, handoffs, and time on task.
- **Action performance:** ownership acceptance, acknowledgement, completion,
  exception rate, and deadline attainment.
- **Outcome attainment:** the incident-specific safety or continuity outcome
  attached to the decision packet.

Every reported measure includes its definition, baseline, measurement window,
sample, owner, and calculation version. Interface usage and chatbot message
counts are diagnostics, not operational outcomes.

## Safety invariants

- Read-only tools are the default.
- Consequential tools require explicit server-side policy checks.
- Approval is bound to a specific action payload and incident-state version.
- Changed evidence can invalidate a pending approval.
- Unresolved material challenges can block or qualify approval.
- Tool inputs, outputs, failures, retries, tasks, messages, and acknowledgements
  are auditable.
- Model text alone cannot grant authority.
- Connector health and evidence freshness are visible to operators.
- A decision and every downstream effect retain one authorisation lineage.
- Operational measures include an explicit baseline and measurement window.
- Demo, simulation, training, and live actions are visibly distinguished.

## Current implementation boundary

The current slice is frontend-led and uses typed representative incident data.
It demonstrates the complete product direction through hazard lenses, connector
status, spatial exposure tools, forecast-time controls, provenance-rich
evidence, collaborative agents, an explicit challenge, governed decision
packets, human gates, decision-to-outcome lineage, and operational measurement.

Persistence, live connectors, GIS execution, durable orchestration, scientific
analysis, external tasks and communications, policy enforcement, and measured
production outcomes remain later implementation milestones.
