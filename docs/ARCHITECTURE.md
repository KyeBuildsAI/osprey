# Architecture

## Architectural goal

Osprey should behave like an operational AI system, not a collection of disconnected prompts. The architecture therefore separates:

1. **authoritative data + deterministic tools**;
2. **shared incident state**;
3. **specialist agent reasoning**;
4. **human control**;
5. **actions and communications**;
6. **audit + evaluation**.

## System overview

```text
                    ┌───────────────────────────┐
                    │      LIVE / REPLAY        │
                    │ weather + scenario inputs │
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │ Data ingestion + adapters │
                    │ Met Office / NWS / GIS    │
                    └─────────────┬─────────────┘
                                  │
                     structured, timestamped facts
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │   Shared Incident State   │
                    └─────────────┬─────────────┘
                                  │
          ┌───────────────────────┼────────────────────────┐
          │                       │                        │
          ▼                       ▼                        ▼
  ┌───────────────┐      ┌──────────────────┐      ┌───────────────┐
  │ Weather Agent │      │Infrastructure    │      │Operations     │
  │               │      │Agent             │      │Agent          │
  └───────┬───────┘      └────────┬─────────┘      └───────┬───────┘
          │                       │                        │
          └──────────────┬────────┴───────────────┬────────┘
                         │                        │
                         ▼                        ▼
                 tasks / evidence /       disagreement /
                 questions                challenge
                         │                        │
                         └──────────┬─────────────┘
                                    ▼
                           ┌────────────────┐
                           │ Human control  │
                           │ approve/modify │
                           │ reject/redirect│
                           └───────┬────────┘
                                   │
                                   ▼
                           ┌────────────────┐
                           │ Tool execution │
                           │ simulated V1   │
                           └───────┬────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Communications     │
                         │ Agent              │
                         └─────────┬──────────┘
                                   │
                                   ▼
                         ┌────────────────────┐
                         │ Audit + Evaluation │
                         └────────────────────┘
```

## Core principle: deterministic tools for deterministic questions

LLMs should not be asked to invent or infer facts that can be computed directly.

Examples:

- `get_assets_within_polygon(hazard_polygon)`
- `get_elevation(lat, lon)`
- `get_flood_zone(lat, lon)`
- `get_distance_to_waterway(asset)`
- `get_assets_below_elevation(threshold)`
- `get_active_warnings(area)`

These tools should return structured outputs with source, timestamp and units. Agents then reason over those outputs.

## Data ingestion layer

Each upstream provider should have an adapter that converts provider-specific responses into Osprey's internal schemas.

Potential adapters:

- Met Office Global Spot adapter;
- NWS forecast / alerts / observations adapter;
- USGS elevation adapter;
- FEMA flood-layer adapter;
- NOAA coastal data adapter;
- local infrastructure dataset adapter;
- procedure / playbook retrieval adapter.

This protects the agent layer from provider-specific formats and makes location/data-source changes easier later.

## Shared incident state

The shared state is the canonical operational representation of the incident.

Conceptual schema:

```ts
type IncidentState = {
  incident: IncidentSummary;
  location: OperationalArea;
  hazards: HazardAssessment[];
  warnings: OfficialAlert[];
  observations: Observation[];
  forecasts: ForecastEvidence[];
  assets: AssetExposure[];
  geospatialFindings: GeoFinding[];
  findings: AgentFinding[];
  tasks: AgentTask[];
  disagreements: Disagreement[];
  proposedActions: ProposedAction[];
  decisions: HumanDecision[];
  executedActions: ActionResult[];
  communications: CommunicationArtifact[];
  timeline: AuditEvent[];
};
```

Implementation details can change, but the conceptual separation should remain.

## Scoped agent context

Agents should not automatically receive every token in the incident history.

Each agent receives:

- a shared core incident summary;
- current high-priority facts;
- role-specific state;
- results of relevant deterministic tools;
- role-specific RAG results;
- targeted messages / tasks from humans or other agents.

Benefits:

- preserves specialisation;
- reduces context growth and token cost;
- lowers cross-agent contamination;
- makes provenance clearer;
- enables evaluation by role.

## Agent outputs

Agent responses should use structured outputs rather than free-form text alone.

A finding should include fields such as:

```ts
type AgentFinding = {
  agent: AgentRole;
  summary: string;
  severity?: Severity;
  confidence?: number;
  evidenceIds: string[];
  assumptions: string[];
  uncertainties: string[];
  recommendedNextSteps?: string[];
  createdAt: string;
};
```

Confidence must be treated as a product signal to calibrate/evaluate, not automatically accepted as a statistical probability.

## Agent delegation

Agents can create explicit tasks for other agents.

Example:

```text
Infrastructure Agent
→ Weather Agent
Question: What is the likelihood of rainfall exceeding the threshold near Asset B during the next 3 hours?
Reason: exposure decision depends on rainfall intensity at this location.
```

Delegation should be recorded in the incident timeline and linked to the resulting finding.

## Disagreement model

A disagreement is a first-class object.

Example:

```ts
type Disagreement = {
  id: string;
  topic: string;
  positions: AgentPosition[];
  evidenceIds: string[];
  status: "open" | "resolved-by-evidence" | "resolved-by-human";
  resolution?: string;
};
```

The UI should surface disagreement rather than hide it.

## Human approval gates

Any action categorised as consequential should stop before execution.

Flow:

```text
Agent proposal
   ↓
Evidence + rationale + uncertainty
   ↓
Optional agent challenge
   ↓
Human review
   ├─ Approve
   ├─ Modify + approve
   ├─ Reject
   └─ Request more analysis
   ↓
Tool execution / simulation
   ↓
Outcome recorded
```

V1 should use simulated actions only. No real-world critical infrastructure control is required or desirable.

## RAG architecture

RAG should be role-specific.

### Weather Agent
- weather-provider documentation / interpretations if needed;
- hazard definitions and thresholds.

### Infrastructure Agent
- asset records;
- vulnerability metadata;
- historical exposure information.

### Operations Agent
- operational procedures;
- response playbooks;
- historical incident reports.

### Communications Agent
- communication templates;
- tone/accessibility guidance;
- audience-specific rules.

RAG chunks should preserve source metadata and be exposed as evidence references.

## Geospatial architecture

The planned web-map layer is MapLibre GL JS.

Data types may include:

- vector / GeoJSON warning polygons;
- infrastructure point/line/polygon layers;
- raster DEM terrain/elevation;
- flood hazard polygons;
- waterways;
- Osprey-generated risk overlays.

The map and the agent tools should use the same canonical geospatial data where possible, so what humans see is consistent with what agents reason over.

## Audit architecture

Every material event should generate an audit record:

- upstream evidence received;
- tool called + result;
- agent finding created;
- task delegated;
- disagreement opened/resolved;
- action proposed;
- human decision;
- tool execution;
- communication generated.

Auditability is both a governance feature and the foundation for evaluation/observability.

## Suggested technical direction

Likely initial stack:

- Next.js + TypeScript;
- MapLibre GL JS;
- an LLM API supporting structured outputs + tool calling;
- server-side adapters for weather/GIS APIs;
- persistent incident state (implementation TBD);
- vector or document retrieval for role-specific RAG (implementation TBD);
- structured tracing/evaluation store (implementation TBD).

Specific model/provider/storage choices should be made during implementation and documented as design decisions rather than prematurely fixed.
