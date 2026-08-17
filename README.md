# Osprey

**An AI-native incident command room for extreme-weather operations.**

Osprey explores how humans and specialised AI agents can work together during fast-moving, consequential weather incidents. Rather than acting as a weather chatbot, Osprey combines live environmental data, geospatial reasoning, role-specific agents, shared incident state, human approvals, tool use, and evaluation in one operational workspace.

> **Status:** Early build / portfolio project. The initial trial focuses on Houston–Galveston, Texas, with Oklahoma City planned as a contrasting severe-weather stress test.

## Product thesis

Extreme-weather response requires teams to combine changing forecasts, warnings, infrastructure exposure, procedures, operational constraints, and public communications. Osprey tests a different interface for that work: an **AI-native incident command room** in which specialist agents investigate the same incident alongside human controllers.

The system is designed around a simple principle:

**AI investigates, reasons, proposes and challenges. Humans retain authority over consequential actions.**

## Core agents

- **Weather Agent** — interprets live forecasts, observations, watches, warnings and hazard evolution.
- **Infrastructure Agent** — identifies exposed assets and reasons over geography, elevation, flood zones and infrastructure vulnerability.
- **Operations Agent** — proposes operational interventions using current evidence and relevant procedures.
- **Communications Agent** — prepares audience-specific communications based on approved operational decisions.
- **Safety Agent (planned)** — challenges assumptions, identifies failure modes and tests whether proposed actions are proportionate to the evidence.

## What makes Osprey different

Osprey is not four isolated LLM calls behind a dashboard. The agents and humans work against a **shared incident state** and can interact with one another.

Planned capabilities include:

- agent-to-agent task delegation;
- human-to-agent questioning and redirection;
- visible evidence and confidence;
- explicit agent disagreement and challenge;
- shared incident timeline and open questions;
- human approval, modification or rejection of consequential actions;
- simulated tool execution;
- complete decision and evidence audit trail;
- evaluation of model, agent and operational behaviour.

## Live weather + geospatial intelligence

The first US deployment will combine multiple authoritative sources rather than rely on a single weather provider:

- **Met Office Weather DataHub — Global Spot** for site-specific global forecasts;
- **US National Weather Service API** for US forecasts, alerts and observations;
- **USGS 3D Elevation Program (3DEP)** for terrain/elevation data;
- **FEMA National Flood Hazard Layer (NFHL)** for effective flood hazard mapping;
- **NOAA Digital Coast** datasets where coastal inundation/elevation context is useful.

The operational map is intended to use **MapLibre GL JS**, including raster DEM support for hillshade and 3D terrain.

The map is not just visualisation. Geospatial tools should perform calculations such as asset/polygon intersection, elevation lookup, flood-zone lookup and distance calculations, returning structured evidence to agents. **The LLM interprets geography; it should not invent it.**

## Initial trial locations

### 1. Houston–Galveston, Texas — primary V1 environment

A multi-hazard setting suitable for testing heat, heavy rainfall, flooding, tropical weather, wind and coastal risk. Houston–Galveston is also a strong environment for testing terrain/elevation, flood-zone and infrastructure-exposure reasoning.

### 2. Oklahoma City, Oklahoma — severe-weather stress test

A contrasting environment focused on rapidly evolving convective weather: tornadoes, severe thunderstorms, hail, damaging wind, flash flooding and heat. This should particularly stress-test escalation, uncertainty and agent disagreement.

Additional locations may be added later, but the architecture should remain location-agnostic: **location → hazard feeds → geospatial context → infrastructure → procedures → agent reasoning → human decision**.

## Live and Replay modes

Osprey should support two modes:

- **LIVE** — uses current weather and hazard data. If conditions are ordinary, Osprey should report ordinary conditions rather than manufacture an incident.
- **REPLAY** — replays a historical event through the same incident architecture, revealing information incrementally so recommendations can be evaluated at each stage.

Replay mode makes repeatable evaluation possible without waiting for a real severe-weather event.

## High-level architecture

```text
Live / replay data
       │
       ▼
Weather + geospatial ingestion
       │
       ▼
Shared incident state
       │
 ┌─────┼─────────────┐
 │     │             │
Weather Infrastructure Operations
Agent   Agent          Agent
 │       │             │
 └───────┼─────────────┘
         │
  Evidence / questions /
  delegation / disagreement
         │
         ▼
   Human Controller
Approve / Modify / Reject
         │
         ▼
  Simulated tool actions
         │
         ▼
 Communications Agent
         │
         ▼
 Audit + Evaluation
```

## Build plan

- **V1:** one Houston–Galveston incident, four specialist agents, one human controller, live weather ingestion, shared incident state and core map.
- **V2:** agent-to-agent delegation and richer role-specific retrieval.
- **V3:** explicit disagreement/challenge workflow and Safety Agent.
- **V4:** human approval gates, simulated tool execution and full audit trail.
- **V5:** multiple human roles in the same incident room.
- **Later:** historical replay, Oklahoma City stress testing, expanded geospatial/flood layers and more rigorous evaluation/observability.

See the [`docs/`](docs/) directory for the detailed product specification, architecture, data/location plan, evaluation framework, roadmap and design decisions.

## Design principles

1. **Human authority for consequential actions.**
2. **Evidence before prose.** Agents should expose the data and retrieval that support a recommendation.
3. **Deterministic tools for deterministic questions.** GIS calculations, thresholds and lookups should be performed by tools, not guessed by an LLM.
4. **Shared state, specialised context.** Agents share the incident but receive role-relevant context to preserve specialisation and control token use.
5. **Disagreement is a feature.** Conflicting agent recommendations should be surfaced, not silently averaged away.
6. **No manufactured emergencies.** Live mode reflects reality; replay mode provides controlled high-severity scenarios.
7. **Everything important is auditable and evaluable.**

## Authoritative data references

- Met Office Weather DataHub: https://datahub.metoffice.gov.uk/
- NWS API: https://api.weather.gov/
- USGS 3DEP: https://www.usgs.gov/3d-elevation-program
- FEMA flood products / NFHL: https://www.fema.gov/flood-maps/products-tools
- NOAA Digital Coast: https://coast.noaa.gov/digitalcoast/
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/

---

Osprey is a portfolio exploration of agentic AI, RAG, tool use, geospatial reasoning, shared state, human-in-the-loop control, governance and evaluation in real-world operational response.
