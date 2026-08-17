# Product Specification

## Product definition

**Osprey is an AI-native incident command room for extreme-weather operations.**

It is designed to help operational teams understand fast-moving hazards, identify what is exposed, decide what to do, communicate decisions, and preserve an auditable record of how those decisions were reached.

Osprey is not intended to replace an incident commander. Its central interaction model is **human + specialised agents sharing one incident workspace**.

## Primary user

The initial persona is a **human incident controller / operations lead** responsible for coordinating response to severe weather affecting people, infrastructure or services.

Later multi-user roles may include:

- Incident Commander
- Operations Controller
- Infrastructure Lead
- Communications Lead
- Safety / Risk Lead

## Core user journey

1. Osprey creates or receives an incident from live data or a replay scenario.
2. The Weather Agent assesses hazard conditions and evidence.
3. The Infrastructure Agent identifies exposed assets using geospatial and infrastructure data.
4. The Operations Agent proposes interventions using current evidence and procedures.
5. The Safety Agent, when enabled, challenges assumptions and proposed actions.
6. Conflicts and uncertainty are surfaced explicitly.
7. A human controller can question, redirect or task any agent.
8. Consequential actions require human approval, modification or rejection.
9. Approved actions trigger simulated tools and/or Communications Agent workflows.
10. Osprey records evidence, proposals, approvals, actions and outcomes for evaluation.

## Agent responsibilities

### Weather Agent

Answers: **What is happening, what may happen next, and how certain are we?**

Responsibilities:
- interpret forecasts, observations, watches and warnings;
- compare multiple weather sources;
- identify changes in hazard severity;
- estimate uncertainty without inventing unsupported precision;
- answer targeted questions from humans and other agents;
- attach evidence and timestamps to findings.

### Infrastructure Agent

Answers: **What is exposed and why does it matter?**

Responsibilities:
- identify assets within warning/hazard polygons;
- query elevation, flood zones, waterways and other geospatial context;
- combine hazard exposure with asset vulnerability metadata;
- identify high-priority assets;
- request more weather analysis when needed;
- distinguish calculated spatial facts from LLM interpretation.

### Operations Agent

Answers: **What should the operational team consider doing?**

Responsibilities:
- retrieve relevant procedures and playbooks;
- propose proportionate interventions;
- specify assumptions, expected benefit and downside;
- distinguish preparation, monitoring, escalation and closure actions;
- update recommendations when evidence changes;
- surface actions requiring approval.

### Communications Agent

Answers: **What do different audiences need to know after a decision is made?**

Responsibilities:
- draft operational briefings;
- draft staff/customer/public communications;
- adapt content to approved decisions rather than unapproved recommendations;
- use communication guidance and templates;
- preserve provenance linking communications to the approved action.

### Safety Agent — planned

Answers: **What could be wrong with this recommendation, and is the response proportionate?**

Responsibilities:
- challenge assumptions;
- identify missing evidence;
- identify plausible failure modes;
- compare action severity with confidence/evidence;
- flag overreaction and underreaction;
- escalate unresolved conflicts to the human controller.

## Multiplayer AI behaviour

Osprey should go beyond multi-agent orchestration. The incident room should make agent work visible and collaborative.

Required interaction patterns:

- Human: `@Weather investigate whether rainfall is likely to exceed the local trigger threshold.`
- Agent: Infrastructure can request targeted Weather analysis.
- Agent: Operations can be instructed to reconsider using a newly added finding.
- Human: ask an agent to explain or defend a recommendation.
- Human: modify a recommendation before approval.
- System: surface conflicting recommendations as an explicit disagreement state.

The product should never hide disagreement by averaging or silently selecting one agent response.

## Shared incident state

Every participant works against a common incident model containing, at minimum:

- incident ID and location;
- current operational severity;
- active hazards;
- current warnings / alerts;
- weather evidence and timestamps;
- affected / potentially affected assets;
- geospatial findings;
- agent findings and confidence;
- open questions;
- delegated tasks;
- disagreements;
- proposed actions;
- human decisions;
- executed / simulated actions;
- communications;
- timeline / audit events.

Agents should receive role-specific slices of this state plus the core facts necessary for collaboration.

## Geospatial incident room

The map is a primary operational surface, not a decorative background.

Planned map layers:

### Base
- roads and settlements;
- waterways;
- administrative boundaries;
- infrastructure / critical assets.

### Terrain
- elevation;
- hillshade;
- optional 3D terrain.

### Weather
- warning polygons;
- current conditions / forecast context;
- rainfall and wind layers where available;
- storm track or hazard geometry where available.

### Flood / coastal
- FEMA flood hazard areas;
- low-lying terrain;
- rivers / bayous;
- NOAA coastal inundation context where appropriate.

### Osprey-generated
- agent risk areas;
- affected assets;
- proposed operational zones/actions;
- approved interventions.

## Live and Replay modes

### LIVE

Uses current upstream data. Osprey must not manufacture an incident. Normal conditions should produce normal operational status.

### REPLAY

Uses a historical event and releases evidence incrementally through the same incident architecture. This allows repeatable testing of agent recommendations and human workflows.

Replay should preserve what information would have been available at each step rather than giving agents future knowledge.

## Human authority model

Consequential actions must be gated.

Possible proposal states:

- Proposed
- Under review
- Approved
- Modified and approved
- Rejected
- Executed / simulated
- Superseded

The audit record should preserve:

- proposing agent;
- supporting evidence;
- confidence / uncertainty;
- other agent challenges;
- reviewing human;
- final decision;
- action result.

## Product success criteria

Osprey succeeds as a portfolio system if it demonstrates that:

1. specialist agents can collaborate around shared state;
2. live weather and geospatial tools can ground agent reasoning;
3. humans can inspect and redirect agent work;
4. disagreements and uncertainty are made visible;
5. consequential actions are controlled through approval gates;
6. system behaviour can be evaluated and audited;
7. the same architecture can generalise beyond one location or hazard.

## Explicit non-goals for early versions

- autonomous emergency response;
- direct control of real critical infrastructure;
- replacing official emergency alerts;
- pretending an LLM can calculate GIS relationships from prose;
- supporting every weather hazard or city at launch;
- production-grade emergency-management certification.
