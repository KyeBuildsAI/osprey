# Osprey 20-day shipping sprint

Target: a polished stakeholder demonstration by 5 September 2026.

## Sprint outcome

The demonstration must prove one connected operational journey:

```text
hazard view -> exposure and forecast query -> evidence graph
-> specialist analysis and challenge -> governed decision packet
-> human approval -> tasks and communications -> outcome measurement
```

It must not present eight disconnected feature demos or drift into building a
general-purpose GIS platform. The locked product boundary is defined in
[`product-direction.md`](product-direction.md), and the implementation model is
defined in [`architecture.md`](architecture.md).

## Non-negotiable demonstration capabilities

1. Hazard-specific views with a compound-incident overview.
2. Map-based exposure queries and time-based forecast exploration.
3. Visible weather, GIS, asset, and sensor connector health and freshness.
4. A provenance-rich incident evidence graph with timestamps and versions.
5. Specialist-agent collaboration, explicit evidence challenge, and a human
   approval gate.
6. An actionable decision packet containing options, evidence, uncertainty,
   trade-offs, authority, and reversible first actions.
7. Traceable decision-to-task-to-communication-to-outcome lineage.
8. Baseline-backed measures for response time, decision quality, and operator
   workload.

## Days 1-3 - Foundation - complete

### Day 1 - Product and safety boundary

- Establish the repository, quality checks, and private deployment path.
- Define Osprey as the agentic coordination layer above authoritative source
  systems, not a replacement GIS or sensor platform.
- Establish the representative compound-weather incident and simulation
  boundary.

### Day 2 - Domain and interaction contracts

- Define incident, hazard, evidence, agent, challenge, decision, approval,
  task, communication, outcome, and audit vocabulary.
- Bind source, event time, receipt time, confidence, and version to evidence.
- Define the evidence-to-decision-to-action interaction journey.

### Day 3 - Command-room foundation

- Establish the Osprey visual language and responsive command-room shell.
- Demonstrate hazard lenses, connector status, spatial and temporal controls,
  evidence flow, decision packets, action lineage, and operational measures.
- Publish the first private stakeholder version.

Exit: Osprey is recognisable, navigable, safe by design, and the complete
product direction is visible in one representative incident.

## Days 4-7 - Working command room

### Day 4 - Durable incident and hazard workspaces

- Add incident creation, selection, status, and durable state.
- Add configured flood, wind, landslide, and heat workspaces.
- Preserve a compound-incident view across hazards.
- Persist the active hazard, operational posture, and incident timeline.

Acceptance:

- An operator can create an incident, add two hazards, switch views, and return
  without losing state.
- Hazard views change thresholds, map layers, evidence requirements, and
  decision context rather than merely changing labels.

### Day 5 - Connector contracts and source health

- Implement versioned connector contracts for weather, GIS, asset, and sensor
  inputs using representative fixtures.
- Record source event time, Osprey receipt time, freshness, latency, health,
  errors, and raw-payload references.
- Make delayed, stale, missing, and failed source states visible.

Acceptance:

- A connector fixture can be ingested idempotently and replayed.
- A stale or failed source visibly degrades dependent evidence and decisions.
- No agent can conceal connector failure behind a synthesized summary.

### Day 6 - Spatial exposure queries

- Replace illustrative map behaviour with real map primitives.
- Support radius, polygon, and asset-selection queries.
- Join selected areas to representative people, facilities, routes, and owners.
- Persist query geometry, filters, dataset versions, initiator, and result time.

Acceptance:

- An operator can draw or select an area and obtain a reproducible exposure
  result with provenance.
- Changing map layers does not lose the selected exposure context.

### Day 7 - Time-based forecasting and operational timeline

- Add forecast frames with issue time, valid time, model, ensemble agreement,
  units, and confidence.
- Add a time control that updates impact zones and exposure while preserving
  incident context.
- Add evidence detail, filtering, source, freshness, and a change timeline.

Acceptance:

- Moving through forecast time changes the operational picture and can be
  reconstructed from saved inputs.
- The operator can distinguish observation time, receipt time, forecast issue
  time, and forecast valid time.

Exit: a user can enter an incident, select a hazard, query exposure, move
through forecast time, and understand the freshness and provenance of the
operational picture.

## Days 8-12 - Evidence and Option A+ intelligence

### Day 8 - Incident evidence graph

- Persist source records, evidence, claims, transformations, challenges, and
  supersessions as a graph.
- Link every claim to supporting, contradicting, missing, or stale evidence.
- Keep superseded records reconstructable.

Acceptance:

- Selecting a claim reveals its full source and transformation chain.
- Corrected evidence updates downstream state without deleting history.

### Day 9 - Durable specialist-agent workflow

- Introduce the Temporal incident workflow.
- Add meteorology, infrastructure, community-impact, and operations agents.
- Require structured outputs with evidence references and disclosed
  assumptions.

Acceptance:

- Agent work survives interruption and resumes without duplicate accepted
  findings.
- Unreferenced model assertions cannot enter accepted incident state.

### Day 10 - Challenge and disagreement

- Add the challenge agent and human-assigned challenges.
- Represent agent disagreement and unresolved assumptions explicitly.
- Allow material challenges to block or qualify decisions.

Acceptance:

- A challenger can dispute a claim, request evidence, and record a resolution.
- An agent cannot close its own material challenge or grant approval.

### Day 11 - Scientific weather-analysis service

- Scaffold the Python analysis service.
- Process one deterministic NetCDF rainfall fixture.
- Publish transformation method, source hash, units, geographic scope, valid
  time, and confidence as structured evidence.

Acceptance:

- The same fixture produces the expected result and provenance record.
- Unsupported units, missing dimensions, and stale products fail visibly.

### Day 12 - Evidence-to-decision synthesis

- Assemble the active evidence graph into a bounded decision context.
- Identify supporting, contradicting, stale, missing, and challenged evidence.
- Generate structured courses of action without granting authority.

Acceptance:

- Every course of action discloses its evidence, assumptions, reversibility,
  benefit, trade-off, and unresolved challenge.

Exit: scientific and agent findings flow into a shared evidence graph, material
disagreement is visible, and structured decision options can be generated from
an exact incident-state version.

## Days 13-16 - Human authority and operational execution

### Day 13 - Governed decision packets

- Create decision packets with question, authority, expiry, options, evidence,
  uncertainty, challenges, trade-offs, and reversible first actions.
- Bind the packet to incident, hazard, and evidence-graph versions.

Acceptance:

- An operator can compare options against the same evidence set.
- New material evidence marks an open packet stale or invalid.

### Day 14 - Human approval and policy

- Add request-analysis, edit, reject, defer, and approve paths.
- Bind approval to the exact packet and proposed external effects.
- Enforce authority and unresolved-challenge policy server-side.

Acceptance:

- No consequential action can be released without a named, authorised human.
- Changing action scope or evidence state invalidates the approval.

### Day 15 - Tasks and communications

- Convert approved actions into owned tasks with deadlines and status.
- Prepare governed messages for defined audiences.
- Hold, release, acknowledge, retry, and fail communications explicitly.
- Use simulated external adapters for the demonstration.

Acceptance:

- Every task and message links to the authorising decision and approval.
- Failed delivery or rejected ownership appears in the incident thread.

### Day 16 - Outcome tracking and audit reconstruction

- Add acknowledgements, completion, exceptions, and outcome observations.
- Add a reconstructable audit timeline from source ingestion through outcome.
- Make simulation and live classifications unavoidable in the interface.

Acceptance:

- A reviewer can reconstruct who knew what, when, why an option was selected,
  who authorised it, what was released, and what happened next.

Exit: the complete safe decision journey works end to end, with every action
and outcome retaining its authorisation and evidence lineage.

## Days 17-18 - Evaluation, resilience, and usability

### Day 17 - Operational measurement

- Define baselines and calculation versions for response time, decision
  quality, and operator workload.
- Measure signal-to-awareness, awareness-to-decision, decision-to-release, and
  release-to-acknowledgement intervals.
- Measure evidence coverage, challenge closure, manual coordination steps, and
  outcome attainment.

Acceptance:

- Every displayed measure includes its definition, baseline, window, owner,
  and calculation version.
- Screen views and chatbot-message counts are not presented as operational
  outcomes.

### Day 18 - Failure, accessibility, and recovery

- Test stale evidence, unsupported claims, connector failure, agent
  disagreement, approval expiry, task rejection, and message failure.
- Test workflow interruption and resumption.
- Complete accessibility, keyboard, touch, responsive, loading, empty, and
  error-state checks.

Acceptance:

- The primary journey remains understandable when one connector or agent is
  unavailable.
- Every approval and map interaction has a usable keyboard path.

Exit: the primary operational journey is dependable, explainable, measurable,
and usable under degraded conditions.

## Days 19-20 - Presentation and shipping

### Day 19 - Scenario freeze and rehearsal

- Freeze the representative incident fixtures and expected findings.
- Verify one flood-led compound incident from source ingestion to outcome.
- Prepare a 10-15 minute demonstration that follows the operational journey,
  not a tour of dashboards.
- Record known boundaries, assumptions, and deferred integrations.

### Day 20 - Final validation and private release

- Run production build, contract tests, safety checks, accessibility checks,
  and the full demonstration path.
- Verify every critical interaction and every simulation label.
- Publish the stakeholder environment privately.
- Capture the initial response-time, decision-quality, and workload baselines
  for subsequent iterations.

Exit: a repeatable stakeholder-ready demonstration is live and shows Osprey's
distinctive value: converting verified operational evidence into challenged,
human-governed decisions, coordinated actions, and measurable outcomes.

## Scope guardrails

The 20-day demonstration will not:

- build a general-purpose GIS, CCTV viewer, sensor platform, or weather model
- send public warnings or contact emergency services
- control operational infrastructure
- permit agents to approve or release their own recommendations
- claim operational improvement without a defined baseline and measurement
  window

External effects remain simulated until approval, security, governance,
connector certification, and evaluation layers are independently validated.

## Definition of done

- All eight locked capabilities appear in one connected incident journey.
- Evidence and decision state are reconstructable and versioned.
- Material challenges and stale data affect approval readiness.
- Human authority controls every consequential external effect.
- Tasks, communications, acknowledgements, and outcomes retain decision
  lineage.
- Response time, decision quality, and operator workload are measured against
  explicit baselines.
- The demonstration is accessible, repeatable, private, and clearly labelled
  as simulated.
