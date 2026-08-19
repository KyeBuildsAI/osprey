# Osprey delivery roadmap

Original demonstration target: **5 September 2026**
Status reviewed: **19 August 2026**

This roadmap preserves the original 20-day intent but no longer labels a whole
day “complete” when only its visual or in-memory demonstration exists. Current
truth is in [`status.md`](status.md); the locked constraints are in
[`build-principles.md`](build-principles.md).

## Target outcome

```text
governed evidence -> deterministic/agent assessment -> challenge
-> versioned decision packet -> server policy -> authenticated human decision
-> authorised task/communication -> acknowledgement -> measured outcome
```

The workflow must remain safe and auditable without a model. No milestone may
move exact calculations, permissions, approval, durable state, or external
authority into an LLM.

## Progress summary

| Workstream | Status | Interpretation |
| --- | --- | --- |
| Product/safety boundary and command-room shell | Implemented | Product shape, live/demo boundary, responsive UI, map, and representative journey are visible. |
| Live evidence and spatial intelligence | Partial | Useful public-source integrations and deterministic spatial/risk logic exist; durable connector/evidence contracts and full failure isolation do not. |
| Shared state and workflow | Partial → designed | Browser state demonstrates the journey; server-owned durable state, workflow history, timers, recovery, and audit are designed. |
| Decision/approval/task chain | Partial → designed | UI states and representative lineage exist; identity, policy, version-bound approval, persistence, and outbox are designed. |
| Model specialists, routing, and RAG | Designed | No provider call exists. Gateway, routing, governed retrieval, and structured specialist contracts must precede model use. |
| Evaluation and autonomy | Designed | One smoke test exists; scenario evaluation and release gates remain to build. |
| Real external effects and multi-user operations | Future | Explicitly deferred until security, authority, recovery, and evaluation gates pass. |

## Days 1–3 — product boundary and vertical slice

Status: **partial**, not blanket complete.

Delivered:

- product positioning, command-room visual system, Houston–Galveston scenario,
  live/demo labels, MapLibre surface, and a representative evidence-to-action
  journey;
- repository build and a rendered-HTML smoke test.

Still required before this foundation is complete:

- make the 15 Build Principles canonical in review and delivery practice;
- replace ambiguous “agent/approval/workflow” completion claims with the status
  ledger;
- resolve the local/remote repository authority risk in
  [`repository-governance.md`](repository-governance.md);
- clear or explicitly accept the lint and bundle-size baselines.

## Days 4–7 — operational API, durable state, and connectors

Status: **partial**.

Build:

1. Move incident commands and workflow-like transitions out of browser state and
   behind authenticated, versioned Osprey APIs.
2. Persist incidents, hazards, evidence references, spatial queries, packets,
   tasks, and append-only audit events.
3. Formalize connector contracts: schema/version, event/receipt/valid time,
   source health, freshness, idempotency, timeout, retry, raw snapshot reference,
   and degraded behaviour.
4. Save reproducible radius/polygon/asset exposure queries and forecast frames.
5. Isolate parallel source failures so successful evidence survives a sibling
   failure.

Exit criteria:

- reload/restart does not lose accepted state;
- stale or failed sources visibly qualify dependent state;
- spatial results can be reconstructed from versioned inputs;
- the browser no longer owns authoritative incident transitions.

## Days 8–12 — deterministic workflow, Evidence Layer, and model gateway

Status: **designed**.

Build in this order:

1. Add durable workflow orchestration for stages, activities, timeouts, retries,
   timers, idempotency, recovery, and audit.
2. Add the governed Evidence Layer: permissioned/versioned retrieval, source
   snapshots, citations, freshness, and reproducible retrieval results.
3. Implement the provider-neutral model gateway and adapters; keep provider SDKs
   outside workflows and domain contracts.
4. Establish task/risk/cost routing with a qualified fallback matrix.
5. Convert specialist roles incrementally from deterministic rules to evaluated,
   structured model-backed activities where a model adds value.
6. Represent delegation and disagreement as durable tasks/events.

Exit criteria:

- workflows resume without duplicate accepted outputs or effects;
- workflow progress and policy work with all model providers unavailable;
- every model result records evidence, citations, assumptions, uncertainty,
  provider/model/configuration, prompt/routing versions, latency, cost, and error;
- no unpermissioned or uncited retrieval enters model context;
- deterministic calculations remain independently testable.

## Days 13–16 — server-enforced human authority and simulated execution

Status: **designed**.

Build:

1. Freeze decision packets against exact incident/evidence/workflow versions.
2. Add authenticated roles and deterministic server-side policy evaluation.
3. Support request-analysis, modify, reject, defer, and approve transitions;
   modification creates a new packet version.
4. Invalidate approval after material evidence, action, policy, authority, or
   expiry change.
5. Release only approved simulated tasks/messages through an idempotent outbox.
6. Persist delivery, acknowledgement, retry, failure, compensation, and outcome.

Exit criteria:

- no model or client request can forge approval or bypass policy;
- a reviewer can reconstruct who approved exactly what and why;
- restart/retry cannot duplicate a simulated external effect;
- every downstream record retains authorization lineage.

## Days 17–18 — evaluation, security, resilience, and accessibility

Status: **designed**.

Build:

- deterministic source/GIS/threshold/permission contract tests;
- scenario cases for missing/stale evidence, false and missed escalation,
  disagreement, approval invalidation, provider timeout, invalid model output,
  retrieval injection, workflow restart, and delivery failure;
- provider/task qualification with factuality, citation, safety, latency, and
  cost thresholds;
- audit reconstruction, secret/data-access, idempotency, keyboard, responsive,
  loading, empty, and error-state checks;
- baseline-backed response-time, decision-quality, workload, action, and outcome
  measures.

Exit criteria are the gates in [`evaluation.md`](evaluation.md) and
[`security.md`](security.md), not a successful scripted demo alone.

## Days 19–20 — evidence-backed demonstration and release

Status: **future for the target architecture**. The current vertical slice can
support a clearly bounded preview.

Build:

- freeze representative live/replay fixtures without future-information leak;
- verify the full degraded and happy paths from evidence to outcome;
- publish the exact build/deployment provenance and known boundaries;
- rehearse a journey, not a dashboard tour;
- publish measured evaluation results and unresolved risks.

Exit:

- build, tests, contract/evaluation/security gates, accessibility, and the
  repeatable scenario pass;
- every live/simulated/future boundary remains unambiguous;
- repository authority and release commit are protected and recoverable.

## Scope guardrails

The target demonstration will not build a general GIS/weather/sensor platform,
send public warnings, contact emergency services, control infrastructure, let a
model authorize its own recommendation, or claim operational improvement without
a baseline and method. Real external effects and multi-user operations remain
future capabilities until independently reviewed gates pass.
