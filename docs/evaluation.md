# Evaluation and autonomy gates

Status: **designed**. The current repository has one rendered-HTML smoke test;
it does not yet contain a scenario evaluation harness or evidence that any
model, retrieval strategy, workflow, or autonomy level meets these gates.

## Evaluation doctrine

Evaluate before autonomy. Compare provider/model choices by task, risk, quality,
latency, and cost. A cheaper model is acceptable only when it meets the defined
standard for that task. Deterministic calculations and policy are tested as
software, not delegated to model graders.

## Evaluation layers

1. **Sources and deterministic tools** — schema, timestamps, units, freshness,
   spatial correctness, threshold logic, permissions, and failure behaviour.
2. **Evidence Layer/RAG** — permission filtering, retrieval relevance, citation
   fidelity, freshness/version selection, missing-evidence disclosure, and
   prompt-injection resistance.
3. **Model gateway and specialists** — structured-output validity, factual
   grounding, unsupported claims, calibration, routing, fallbacks, latency,
   tokens/cost, and provider-specific regressions.
4. **Workflow and policy** — legal transitions, idempotency, retries, recovery,
   approval invalidation, effect prevention, and audit reconstruction.
5. **Human-system outcomes** — comprehension, time to defensible decision,
   override patterns, workload, action completion, and operational outcomes.

## Representative scenario record

Each case versions its mode, location, evidence timeline, permissions, expected
deterministic facts, allowed claim range, forbidden claims, required human gates,
failure injections, grading rubric, and risk class. Replay reveals only evidence
available at the simulated time.

## Core measures

- factual and geospatial correctness;
- critical-hazard recall and false/missed escalation;
- citation precision/coverage and unsupported-claim rate;
- distinction between observation, interpretation, and uncertainty;
- policy and human-gate compliance;
- task/delegation correctness and evidence preservation;
- recovery from stale/missing sources, timeouts, invalid output, and restart;
- end-to-end latency and cost by task/provider/risk class;
- reproducibility and audit reconstruction completeness;
- human decision quality, workload, override, and time-to-decision.

Confidence emitted by a model is a signal to calibrate, not a probability to
trust by declaration.

## Routing and provider qualification

The model gateway keeps a versioned qualification matrix by task and risk class.
A route is enabled only after it meets minimum quality/safety thresholds on a
representative suite and remains within latency/cost budgets. Fallback providers
must pass the same task gate. High-risk tasks may require a stronger model,
independent verification, or mandatory human analysis even when a cheaper model
passes routine tasks.

Routing changes are evaluated like code changes: frozen cases, before/after
results, documented regressions, named owner, and rollback criteria.

## Release gates by autonomy

| Level | Capability | Required evidence |
| --- | --- | --- |
| A0 | Read-only deterministic display | Contract/tool tests, freshness and degraded-state tests, correct demo/live labels. |
| A1 | Model draft or assessment | Model/RAG task gate, citations, injection tests, visible uncertainty, no state or effect authority. |
| A2 | Model proposes workflow tasks | A1 plus structured-task validation, tool allowlist, durable audit, recovery, and cost limits. |
| A3 | Human-approved simulated effect | Server policy, authenticated/version-bound approval, idempotent outbox, full reconstruction, failure drills. |
| A4 | Human-approved real effect | Independent security/operational review, certified connector, monitoring/rollback, incident-specific owner and limits. |

Osprey is currently at **A0 for its implemented read-only slice**. The browser
may display representative approvals/tasks, but this does not qualify as A3.

## Reproducibility record

Every evaluated run records scenario and evidence versions, source snapshots,
retrieval results, workflow/rule build, model/provider/configuration, prompt and
policy versions, tool calls/receipts, structured outputs, timing, cost, human
decisions, and final actions. A model-assisted grader must be calibrated against
human judgement and cannot be the sole judge of safety-policy compliance.

## Current next steps

1. Add deterministic unit/contract tests for source normalization, exposure,
   thresholds, and partial failure.
2. Add versioned synthetic/replay fixtures with forbidden claims and expected
   human gates.
3. Build workflow/policy tests before model integration.
4. Add gateway and RAG evaluations before enabling the first provider route.
5. Publish measured results and known failures; do not substitute screenshots or
   subjective demo quality for evidence.
