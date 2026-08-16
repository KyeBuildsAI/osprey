# Osprey product direction

## Positioning

Osprey is the agentic incident-command layer that turns verified information
from weather, GIS, infrastructure, asset, sensor, and operational systems into
coordinated decisions, governed actions, and measurable outcomes.

Osprey is not a replacement GIS, CCTV viewer, sensor-management product, or a
collection of generic disaster dashboards. Those systems remain authoritative
sources and are connected to Osprey through adapters.

## Locked design principles

These principles govern product, interaction, data, and architecture decisions.

1. **Hazard-specific operations.** Each hazard view exposes the decisions,
   thresholds, map layers, evidence, assets, and procedures relevant to that
   hazard while preserving a compound-incident view.
2. **Spatial and temporal reasoning.** Operators can query exposure by area,
   boundary, asset, and administrative geography, then move through forecast
   time without losing the selected operational context.
3. **Connect, do not duplicate.** Weather, GIS, asset, CCTV, sensor, and field
   systems are ingested through versioned connectors with visible health,
   freshness, and provenance.
4. **Evidence before assertion.** Every operational claim is linked to its
   source, observation and receipt timestamps, transformations, confidence,
   challenges, and superseding versions.
5. **Collaborative agents under human authority.** Specialist agents may
   investigate, disagree, and recommend. A challenge function tests important
   assumptions. Consequential actions remain behind explicit human gates.
6. **Decision packets, not dashboard sprawl.** The primary output is a
   time-bounded packet containing the decision, options, evidence, uncertainty,
   challenge findings, trade-offs, authority, and reversible first actions.
7. **Decisions continue into operations.** Approved decisions create owned
   tasks, governed communications, acknowledgements, and outcome checks in one
   traceable thread.
8. **Measure operational value.** Osprey measures response-time reduction,
   evidence coverage and decision quality, operator workload, action completion,
   and outcome attainment. Screen views and chatbot usage are not success
   measures by themselves.

## Interaction model

The core journey is:

`hazard view -> exposure and forecast query -> evidence graph -> agent challenge -> decision packet -> human gate -> tasks and communications -> outcome measurement`

Every primary screen should move an incident forward through this journey.

## Product guardrails

- Do not build a general-purpose map platform when a connector can provide the
  required spatial data or tools.
- Do not expose model prose without linked evidence and timestamps.
- Do not allow an agent to convert its own recommendation into accepted truth.
- Do not separate task and communication records from the decision that
  authorised them.
- Do not report operational improvement without a defined baseline, measurement
  window, and accountable owner.
- Keep simulations, demonstrations, and live operations visibly distinct.

## Current demonstration

The command-room slice represents these principles through hazard lenses,
connector health, spatial exposure tools, a time-based forecast control, an
evidence graph, specialist and challenge agents, governed decision packets, a
decision-to-outcome chain, and operational performance measures. The data and
external effects remain representative until the corresponding integrations,
persistence, orchestration, policy, and evaluation layers are implemented.

## Documentation governance

This document is the authoritative product charter. Its eight principles must
remain traceable in:

- [`architecture.md`](architecture.md), which defines the components, data
  contracts, workflows, safety controls, and measures required to implement
  them;
- [`20-day-sprint.md`](20-day-sprint.md), which assigns each capability to
  delivery days, acceptance criteria, scope guardrails, and the definition of
  done; and
- the repository [`README`](../README.md), which states the product boundary,
  current implementation status, and documentation precedence.

Any proposal to remove, weaken, or reverse a locked principle requires an
explicit product decision and coordinated updates to all three documents. New
features must state which principle they advance and where they enter the core
operational journey.
