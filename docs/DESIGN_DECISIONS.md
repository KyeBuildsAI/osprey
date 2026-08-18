# Design Decisions

This log captures important product/architecture decisions so the repository explains not only **what** Osprey does, but **why** it was designed this way.

## DD-001 — Osprey is an incident command room, not a weather chatbot

**Decision:** Position Osprey as an AI-native incident command room for extreme-weather operations.

**Why:** A single chat interface would underrepresent the operational problem. Incident response requires multiple roles, shared state, evolving evidence, visible decisions and controlled actions.

**Implication:** The primary UI should centre on the incident workspace, map, findings, decisions and timeline rather than a chatbot transcript.

## DD-002 — Multi-agent and multiplayer are different

**Decision:** Osprey will use specialist agents, but the product should also expose their work so humans and agents can question, redirect, delegate and disagree.

**Why:** Multiple hidden agents are only orchestration. The more interesting product problem is collaborative work between humans and agents around shared state.

**Implication:** Agent findings/tasks/disagreements are first-class UI/state objects.

## DD-003 — Specialist agents

**Decision:** Start with Weather, Infrastructure, Operations and Communications agents; add a Safety Agent when disagreement/challenge is introduced.

**Why:** These roles map to distinct questions and evidence sources, which makes specialisation meaningful rather than cosmetic.

## DD-004 — Human approval for consequential actions

**Decision:** Agents may recommend and prepare actions, but consequential actions require explicit human review.

**Why:** Osprey is exploring AI support in a high-consequence operational context. Human authority should be designed into the workflow, not added as a disclaimer.

**Implication:** Proposed actions have explicit lifecycle states and an auditable reviewer decision.

## DD-005 — Houston–Galveston is the first live trial area

**Decision:** Use Houston–Galveston as the initial operational area, with Oklahoma City as the next severe-weather stress test.

**Why:** Houston–Galveston provides multi-hazard diversity and strong geospatial/flood/coastal use cases. Oklahoma City provides a contrasting fast-moving tornado/severe-convective environment.

## DD-006 — Use multiple weather sources in the US

**Decision:** Combine Met Office Global Spot with the US National Weather Service rather than relying on Met Office alone.

**Why:** Met Office provides a useful global forecast source, while NWS provides authoritative US alerts and local observations/forecasts. Multiple sources also create a realistic evidence-reconciliation problem.

**Implication:** Osprey must preserve source identity and surface source disagreement rather than merge feeds blindly.

## DD-007 — Live mode must remain real

**Decision:** Do not fabricate severe conditions in LIVE mode.

**Why:** A live-data product loses credibility if it creates artificial drama when weather is ordinary.

**Implication:** Add REPLAY mode for repeatable severe-event demonstrations and evaluations.

## DD-008 — Add Replay mode

**Decision:** Historical incidents should be replayable through the same architecture, revealing evidence incrementally.

**Why:** Severe events are intermittent. Replay allows deterministic demos, regression evaluation and comparison between system versions.

**Constraint:** Replay must avoid future-information leakage.

## DD-009 — Geospatial mapping is a core product surface

**Decision:** Terrain/elevation, hazard polygons, flood risk and infrastructure exposure belong in the core incident room.

**Why:** Weather risk is spatial. The operational question is not only what the weather is, but where it intersects people/assets and what that means.

**Planned UI stack:** MapLibre GL JS.

## DD-010 — GIS tools calculate; LLMs interpret

**Decision:** Use deterministic geospatial tools for intersections, distances, elevation and flood-zone lookup. Do not ask an LLM to infer these relationships from prose.

**Why:** Spatial calculations can be made reproducible and testable outside the model.

**Principle:** **The LLM should interpret geography; it should not invent it.**

## DD-011 — Role-specific RAG

**Decision:** Retrieval should be organised by agent role rather than one undifferentiated knowledge base.

**Why:** Weather, infrastructure, operations and communications require different evidence. Role-specific retrieval improves relevance, provenance and specialisation.

## DD-012 — Shared core state, scoped agent context

**Decision:** Maintain one canonical incident state, but give each agent only the core state plus relevant role/task context.

**Why:** Passing the full incident history to every agent will increase context costs and can weaken specialisation.

**Evaluation:** Measure whether scoped context causes important evidence to be omitted.

## DD-013 — Disagreement is a feature

**Decision:** Conflicting agent recommendations must be surfaced explicitly.

**Why:** In consequential decisions, hiding uncertainty behind a single synthetic answer is misleading. A human should be able to see the positions, evidence and unresolved assumptions.

## DD-014 — Evaluation is part of the product architecture

**Decision:** Build traces, evidence IDs, structured outputs and scenario tests early enough to evaluate system changes.

**Why:** Agentic systems cannot be understood reliably from final responses alone. Osprey should be able to inspect false escalation, missed escalation, tool failures, delegation and human overrides.

## DD-015 — Keep implementation choices honest

**Decision:** Do not claim model, database, vector store or observability technologies until they are actually selected and implemented.

**Why:** The repository is a portfolio case study. Distinguishing product intent, planned architecture and implemented behaviour makes it more credible.

## Updating this log

Add a new decision when a meaningful tradeoff changes the system, for example:

- why a particular orchestration pattern was selected;
- why an agent was removed/combined;
- a cost/latency optimisation;
- a change to context handling;
- an evaluation failure that caused an architecture change;
- a data-source reliability issue;
- a human-approval policy change.

Each entry should record the decision, rationale, consequences and — once measurable — the result.


## DD-016 — Approval queue, not a generic decisions page

**Decision:** Label the navigation surface **Approvals** and make its primary view a queue of consequential operational actions that require a human response. Use **Decisions & Actions** as the page heading.

**Why:** “Decisions” is ambiguous: it can describe agent findings, recommendations, prior choices or unresolved disagreement. The product needs to make the controller’s immediate task unmistakable: decide whether to authorise a proposed action.

**Implication:** Findings, evidence and disagreements remain accessible as support for a proposed action but must not compete with approval items in the default queue. The page must show what will happen after approval, provide approve / edit before approving / request more analysis / reject controls, and preserve the proposal-to-outcome chain. See [APPROVALS_UX.md](APPROVALS_UX.md).
