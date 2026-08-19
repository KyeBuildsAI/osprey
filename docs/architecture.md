# Osprey architecture

## Architectural doctrine

> **Osprey owns the workflow, evidence, state, permissions, and decisions.
> Models supply bounded intelligence. Humans retain authority. Providers and
> interfaces remain replaceable.**

The locked constraints are in [`build-principles.md`](build-principles.md).
This document separates the verified current runtime from the designed target;
it must not be read as an implementation claim. Capability status is controlled
by [`status.md`](status.md).

## Verified current runtime — implemented or partial

```text
Browser command room
  React state: incident + evidence + packets + approvals + tasks
  MapLibre: layers + selections + radius/polygon interactions
                  │
                  ▼
Osprey server routes and TypeScript modules
  public-source fetches + normalisation + deterministic rules
                  │
                  ▼
Read-only public/reference sources
  NWS · NOAA/NWS water · MRMS · TranStar · USGS · FEMA/H-GAC snapshot
```

The browser is currently more than an operator interface: it owns shared state,
workflow-like transitions, and representative approval changes. The server
routes protect provider calls from the browser and normalize useful source data,
but there is no operational API, durable database, workflow engine, model
gateway, RAG runtime, authenticated policy service, or external action release.
This is a deliberate vertical slice and a known boundary violation to remove,
not the target architecture.

The TypeScript functions labelled as specialist assessments are deterministic
rules. Calling them “agents” describes a product role, not an LLM implementation.

## Designed target architecture — Option A+

```text
Operator interfaces
  ChatGPT Sites today · replaceable/self-hosted UI later
                         │ versioned Osprey API
                         ▼
Operational API and deterministic application core
  identity · permissions · incident commands · validation · policy
                         │
                         ▼
Durable workflow infrastructure
  state transitions · retries · timers · approvals · recovery · audit
             ┌───────────┼────────────┬──────────────┐
             ▼           ▼            ▼              ▼
      Evidence Layer  Model gateway  Tool registry  Outbox/adapters
      retrieval/RAG   routing/adapt. deterministic  approved effects
             └───────────┼────────────┴──────────────┘
                         ▼
Osprey-controlled durable state
  PostgreSQL/PostGIS · object snapshots · events/receipts · eval records
```

### 1. Operator interfaces

Interfaces render governed state and send commands to the Osprey API. They do
not hold secrets, durable state, permission rules, provider adapters, or the
authoritative workflow. UI hosting can change without changing domain contracts.

### 2. Operational API and application core

The API authenticates actors, authorizes commands, validates versioned schemas,
and exposes incidents, evidence, proposals, decisions, tasks, and outcomes.
Domain logic that can be expressed exactly—permissions, thresholds, geography,
calculations, state transitions—lives in normal code.

### 3. Deterministic workflow infrastructure

The workflow engine is responsible for durable progress, not reasoning. It owns
allowed stages, activity scheduling, timeouts, retries, idempotency, approval
waits, invalidation, compensation, recovery, and event emission. A workflow can
degrade, pause, or continue safely if all model providers are unavailable.

Temporal is the current **designed** implementation choice, not an installed
dependency or completed capability. A different engine remains acceptable if
it satisfies the same contracts and recovery guarantees.

### 4. Evidence Layer and governed RAG

The Evidence Layer ingests or references source snapshots, normalises records,
applies access policy, calculates freshness, and retrieves bounded context.
Each retrieval result includes source/version identifiers, retrieval time,
permissions, ranking method, citations, and the exact content supplied to a
model. Retrieval never promotes a source or model statement into accepted fact.

PostgreSQL/PostGIS, object storage, and pgvector are **designed** components.
The semantic contract is more important than those particular technologies.

### 5. Model gateway

All model-backed work uses one provider-neutral gateway:

```ts
type ModelRequest = {
  requestId: string;
  taskType: string;
  riskClass: "routine" | "elevated" | "high";
  contextRefs: string[];
  outputSchema: { name: string; version: string };
  allowedTools: string[];
  routingPolicyVersion: string;
  timeoutMs: number;
};

type ModelResult = {
  requestId: string;
  provider: string;
  model: string;
  modelConfigVersion: string;
  output: unknown;
  citations: string[];
  assumptions: string[];
  uncertainties: string[];
  usage?: { inputTokens?: number; outputTokens?: number; cost?: number };
  latencyMs: number;
  status: "succeeded" | "failed" | "timed-out" | "rejected";
  error?: { code: string; retryable: boolean };
};
```

The gateway validates outputs, records receipts, applies task/risk/cost routing,
and supports evaluated fallbacks. Provider SDK types and prompt formats do not
cross this boundary. A provider fallback is permitted only when its task-level
evaluation gate has passed.

### 6. Deterministic tools

Tools answer exact questions such as polygon intersection, distance, elevation,
threshold crossing, permissions, and state validity. Each tool has a versioned
input/output schema, authorization scope, timeout, idempotency rule, failure
contract, and receipt. Models may request an allowed tool; the workflow and
policy layer decide whether and how it runs.

### 7. Human policy and approval

Approval is a server-side transition, never a model tool. It binds:

- authenticated actor and authority role;
- exact proposed action and parameters;
- incident, evidence, retrieval, and workflow versions;
- open challenges and disclosed uncertainty;
- policy version, decision time, and expiry conditions.

Material evidence, action, policy, identity, or expiry changes invalidate the
approval. Only an approved outbox record can reach a consequential adapter.

### 8. Durable state and record types

The canonical model keeps distinct types for:

```text
SourceSnapshot -> Observation -> DeterministicFinding
              -> ModelAssessment -> Recommendation/Challenge
              -> DecisionPacket -> HumanDecision/Approval
              -> Task/Communication -> ToolReceipt/ActionResult -> Outcome
```

Every record carries an incident ID, actor or producer, created time, event or
valid time where relevant, source/parent references, schema version, and mode
(`live`, `replay`, `simulation`, or `demo`). Accepted state changes only through
validated commands and durable workflow events.

Specialist delegation is a `Task` or `WorkflowEvent` with requester, purpose,
inputs, evidence references, status, result, and lineage—not free-form shared
chat.

## Portable contracts

All trust boundaries use versioned Osprey schemas:

- connector records and source health;
- evidence, observations, transformations, and retrieval results;
- workflow commands, events, timers, and errors;
- model requests/results and structured specialist outputs;
- tool requests/results and receipts;
- decision packets, policy evaluations, approvals, and invalidations;
- tasks, communications, acknowledgements, action results, and outcomes.

Schema evolution must define compatibility and migration. Unknown or invalid
fields fail closed at authority boundaries; provider-specific data remains in a
raw envelope or adapter namespace.

## Failure and recovery contract

| Failure | Required behaviour |
| --- | --- |
| Source unavailable/stale | Preserve last-known evidence with freshness state; warn operators; block decisions that require current data. |
| One source fails in a fan-out | Persist other successful receipts; represent the missing dependency; retry independently. |
| Model timeout/invalid output | Record failure; bounded retry or evaluated fallback; continue deterministic workflow safely. |
| Retrieval failure/permission denial | Do not substitute model memory; disclose missing context and restrict the decision. |
| Tool failure | Record input/error/retry state; do not invent a result; compensate or await human direction. |
| Approval expires or state changes | Invalidate the approval and require review of a new version. |
| Downstream delivery fails | Retain outbox item and authorization lineage; retry idempotently; expose exception. |
| Workflow/runtime restart | Resume from durable history without duplicating accepted findings or effects. |

The current intelligence route does not yet isolate every parallel source
failure; this remains a documented gap rather than an implied guarantee.

## Reproducibility and observability

A consequential record must identify evidence/snapshot versions, retrieval
result, workflow build, model/provider/configuration, prompt and policy version,
tool receipts, actor decision, and output/action payload. Correlation IDs connect
the chain. Logs and traces assist diagnosis but do not replace durable audit
records.

## Security invariants

- Secrets and provider calls remain server-side.
- Least privilege and explicit authorization apply at every adapter.
- Models and retrieved documents are untrusted inputs, not authorities.
- Prompt injection cannot widen tool, data, or approval permissions.
- Consequential effects require an authenticated, policy-valid human approval.
- Demo and live records cannot be silently mixed.

The complete control model is in [`security.md`](security.md).

## Deployment portability

ChatGPT Sites/Cloudflare is the current UI and route runtime. The target keeps
interfaces, APIs, workflows, persistence, retrieval, and model providers
separable so any one can move without rewriting the domain. Postgres, Temporal,
pgvector, or a named model provider are replaceable implementation decisions,
not Osprey's identity.

## Architecture gates

1. Move incident commands and state transitions behind the operational API.
2. Add versioned durable state and append-only audit/event records.
3. Introduce workflow recovery and server-side approval policy before any
   consequential adapter.
4. Add the provider-neutral model gateway before the first model-backed role.
5. Add governed retrieval before any role depends on procedures or documents.
6. Pass task-level evaluation and degraded-mode tests before changing autonomy.

See [`workflows.md`](workflows.md), [`evaluation.md`](evaluation.md), and
[`20-day-sprint.md`](20-day-sprint.md) for the executable contracts and sequence.
