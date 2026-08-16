# Osprey

An evidence-led, agentic incident-command layer for extreme-weather operations.

Osprey helps specialist agents and human incident commanders build a shared
operational picture, challenge uncertain evidence, compare courses of action,
and retain human approval over consequential decisions.

Its locked product direction is to connect existing operational systems and
govern the journey from evidence to decision to action and outcome. It is not a
replacement GIS or another collection of disaster dashboards. See
[`docs/product-direction.md`](docs/product-direction.md).

## Current milestone

The repository currently contains the first command-room vertical slice:

- incident overview and severity
- operational risk map
- hazard-specific operational lenses
- map-based exposure queries and time-based forecasting
- connector health and source freshness
- specialist-agent collaboration and challenge
- provenance-rich evidence graph and timeline
- governed decision packets and human approval gates
- decision-to-task-to-communication-to-outcome lineage
- response-time, decision-quality, and workload measures

The current incident is representative demonstration data. Durable incident
state, Temporal orchestration, live data sources, and Python weather analysis
will be introduced in later milestones.

## Documentation

- [`docs/product-direction.md`](docs/product-direction.md) is the authoritative
  product boundary, interaction model, and set of eight locked design
  principles.
- [`docs/architecture.md`](docs/architecture.md) maps every locked principle to
  services, data contracts, workflows, safety invariants, and operational
  measurement.
- [`docs/20-day-sprint.md`](docs/20-day-sprint.md) turns the same principles into
  daily deliverables, acceptance criteria, scope guardrails, and a definition
  of done.

When implementation or delivery decisions conflict with these documents,
`product-direction.md` governs the product intent, `architecture.md` governs
the technical boundary, and `20-day-sprint.md` governs the current delivery
sequence.

## Development

```bash
npm install
npm run dev
```

Run the production checks with:

```bash
npm test
```
