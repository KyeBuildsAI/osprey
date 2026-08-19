# Osprey product direction

## Product definition

Osprey is an evidence-led incident-command and operational-coordination layer
for extreme-weather operations. It helps operators turn governed evidence into
challenged recommendations, human decisions, coordinated work, and measurable
outcomes.

Osprey is not a replacement GIS, weather service, asset register, CCTV viewer,
sensor platform, or autonomous incident commander. Those systems remain
authoritative sources or execution endpoints. Osprey connects them through
controlled adapters.

The governing doctrine is:

> **Osprey owns the workflow, evidence, state, permissions, and decisions.
> Models supply bounded intelligence. Humans retain authority. Providers and
> interfaces remain replaceable.**

The complete, canonical set of engineering constraints is in
[`build-principles.md`](build-principles.md). Those principles govern this
product charter, the architecture, delivery plan, evaluation, security,
workflows, and development practice.

## Product capabilities

These eight capabilities describe what the product should enable. They are not
a second set of architecture principles and do not imply that every capability
is implemented.

1. **Hazard-specific operations.** Each hazard view exposes relevant decisions,
   thresholds, layers, evidence, assets, and procedures while preserving a
   compound-incident view.
2. **Spatial and temporal reasoning.** Operators can query exposure by area,
   boundary, asset, and administrative geography, then move through forecast
   time without losing operational context.
3. **Connect, do not duplicate.** Weather, GIS, asset, CCTV, sensor, and field
   systems are connected through versioned adapters with visible health,
   freshness, and provenance.
4. **Evidence before assertion.** Operational claims link to sources, event and
   receipt times, transformations, confidence, challenges, and superseding
   versions.
5. **Collaborative specialists under human authority.** Specialist reasoning
   may investigate, disagree, and recommend. Deterministic policy and an
   authenticated human govern consequential decisions and actions.
6. **Decision packets, not dashboard sprawl.** The main output is a
   time-bounded packet containing the question, options, evidence, uncertainty,
   challenge findings, trade-offs, authority, and reversible first actions.
7. **Decisions continue into operations.** Approved decisions create owned
   tasks, governed communications, acknowledgements, and outcome checks in one
   traceable thread.
8. **Measure operational value.** Osprey measures response time, evidence and
   decision quality, workload, action completion, and outcome attainment.
   Screen views and message counts are diagnostics, not outcomes.

## Core interaction

```text
hazard view -> spatial/time query -> governed evidence -> specialist analysis
-> challenge/disagreement -> versioned decision packet -> server policy
-> authenticated human decision -> authorised work -> outcome measurement
```

Specialists exchange explicit tasks and durable state references. They do not
form an unrestricted conversation that becomes operational state by accident.

## Human authority and product guardrails

- A model may recommend, explain, challenge, or draft. It cannot approve,
  authorise, alter accepted facts, or release an external effect.
- Approval must be enforced by server-side policy and bound to the exact
  action, evidence set, incident-state version, policy version, and human
  identity.
- Code and authoritative data calculate geography, thresholds, permissions,
  and other exact facts. Models interpret those results.
- Observations, deterministic findings, model assessments, and human decisions
  remain distinct records in the interface and data model.
- Live, replay, demonstration, simulation, and future capabilities are labelled
  explicitly.
- Partial failure is a normal operating condition and must remain visible.

## Current product status

As of 19 August 2026, the repository contains a working Houston–Galveston
command-room slice with live/read-only public data connectors, MapLibre spatial
interaction, deterministic exposure/risk logic, evidence references, source
health, and representative decision/task views.

The displayed specialist assessments are deterministic TypeScript rules, not
LLM-backed agents. Approvals, tasks, and workflow transitions are browser-local
demonstrations. Durable shared state, authenticated policy enforcement, a
workflow engine, a model gateway, governed retrieval, external action release,
replay, and a scored evaluation harness are not implemented. See
[`status.md`](status.md) for the authoritative capability ledger.

## Documentation governance

Documentation authority is deliberately separated:

- [`build-principles.md`](build-principles.md) governs engineering constraints.
- This document governs product intent and guardrails.
- [`architecture.md`](architecture.md) governs current and target boundaries.
- [`status.md`](status.md) governs capability-status claims.
- [`workflows.md`](workflows.md), [`security.md`](security.md), and
  [`evaluation.md`](evaluation.md) govern their respective contracts.
- [`approvals-ux.md`](approvals-ux.md) governs the human decision surface and
  its server-side authorization boundary.
- [`design-decisions.md`](design-decisions.md) records why material product and
  architecture choices were made without promoting their maturity.
- [`20-day-sprint.md`](20-day-sprint.md) governs delivery sequence, not current
  truth.

If two documents conflict on implementation status, `status.md` controls until
the conflict is resolved. Removing or weakening a build principle requires an
explicit architecture decision and coordinated updates to all affected files.
