# Roadmap

## Scope principle

Osprey is intentionally ambitious, so the build should prove the architecture in layers rather than attempting a production emergency-management platform immediately.

## V1 — Core incident room

**Goal:** demonstrate one end-to-end Houston–Galveston incident with live weather data and visible specialist-agent collaboration.

Build:
- Houston–Galveston operational area;
- Met Office Global Spot integration;
- NWS forecast/alerts integration;
- core MapLibre map;
- warning polygons;
- a small curated infrastructure dataset;
- Weather Agent;
- Infrastructure Agent;
- Operations Agent;
- Communications Agent;
- shared incident state;
- one human controller;
- structured agent outputs;
- evidence provenance;
- basic audit timeline.

Exit criteria:
- live data can populate an incident room;
- agents reason over shared evidence rather than isolated prompts;
- map and agent findings remain consistent;
- human can inspect each agent's evidence and recommendations.

## V2 — Delegation + role-specific retrieval

**Goal:** turn the system from parallel agents into a collaborative agent team.

Build:
- explicit agent-to-agent tasks;
- human `@agent` questions/tasks;
- task status and lineage;
- role-scoped context;
- role-specific RAG;
- procedure/playbook retrieval for Operations;
- asset/vulnerability retrieval for Infrastructure;
- communication guidance retrieval.

Exit criteria:
- one agent can request targeted analysis from another;
- the receiving agent's result is linked back to the requesting decision;
- retrieval evidence is visible and traceable.

## V3 — Disagreement + Safety Agent

**Goal:** make conflicting AI recommendations a product feature rather than a hidden failure mode.

Build:
- first-class disagreement object;
- UI for conflicting positions/evidence;
- reconsider/challenge flow;
- Safety Agent;
- human resolution path;
- tests for overreaction and underreaction.

Exit criteria:
- agents can disagree explicitly;
- humans can inspect both positions;
- new evidence can resolve or deepen disagreement;
- final resolution is preserved in the audit trail.

## V4 — Human approval + tools

**Goal:** demonstrate controlled agentic action.

Build:
- proposed-action objects;
- approve / modify / reject / request-more-analysis controls;
- simulated operational tools;
- Communications Agent triggered only from approved state;
- action-result logging;
- approval-policy tests.

Exit criteria:
- consequential actions cannot bypass the human gate;
- only the final approved action is executed/simulated;
- complete proposal → evidence → decision → outcome chain is reconstructable.

## V5 — Multiplayer human incident room

**Goal:** demonstrate true multiplayer AI: multiple humans and agents sharing one operational workspace.

Build:
- multiple human roles;
- ownership / assignment;
- role-aware views or permissions where useful;
- shared timeline;
- human-to-human and human-to-agent handoff;
- collaborative decision state.

Exit criteria:
- more than one human can coordinate through the same incident state without losing decision provenance.

## Geospatial expansion

Can begin in V1 and deepen over time:

### Initial
- warning polygons;
- infrastructure markers;
- waterways/basic context;
- terrain/elevation lookup.

### Next
- USGS DEM / hillshade / 3D terrain;
- FEMA flood-hazard zones;
- asset exposure calculations;
- distance-to-waterway and elevation tools.

### Later
- coastal inundation context;
- Osprey-generated risk overlays;
- proposed action zones;
- richer infrastructure networks.

## Evaluation milestones

### Early
- deterministic GIS/tool tests;
- structured-output validation;
- evidence-grounding checks.

### Mid
- synthetic incident scenarios;
- false escalation / missed escalation cases;
- agent-delegation tests;
- disagreement tests;
- human-gate tests.

### Later
- historical replay;
- model/prompt comparisons;
- agent architecture comparisons;
- observability dashboard;
- cost/latency analysis.

## Location expansion

### Primary
**Houston–Galveston** — multi-hazard V1.

### Second
**Oklahoma City** — severe-convective stress test.

### Later candidates
- Carlisle/Cumbria — UK flood/hydrology case;
- London — dense urban/transport operational case.

A location should only be added when it tests a meaningful new capability or hazard pattern.

## Portfolio milestones

The repository itself is part of the demonstration.

As functionality becomes real, update the README with:

- working screenshots / GIF;
- architecture diagram;
- live demo link;
- evaluation results;
- examples of agent disagreement;
- human-approval flow;
- geospatial screenshots;
- key technical/product decisions;
- measured costs/latency;
- limitations and failures discovered during development.

The aim is for a recruiter or interviewer to understand within minutes that Osprey demonstrates:

**multi-agent orchestration + shared state + RAG + live tools + geospatial reasoning + human approval + governance + evaluation.**
