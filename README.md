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

The repository contains Osprey's first working incident-room spine:

- live Houston–Galveston observations, forecast and alerts from the US National Weather Service
- an interactive MapLibre operational map with live NWS GeoJSON warning polygons
- geocoded representative assets, real radius/polygon queries and USGS 3DEP elevation samples
- a normalized internal weather contract that isolates the interface from the NWS schema
- Weather, Infrastructure, Operations and Communications assessments over one shared incident state
- evidence references, confidence, representative critical assets and an incident timeline
- a manual live-intelligence refresh and visible source/demo boundaries

The weather and warning geometry are live. Elevation values are sampled and
cached from USGS 3DEP because terrain height is stable and should not delay an
operator refresh. The infrastructure register and all proposed decisions remain
representative demonstration data; Osprey releases no external effects.

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
