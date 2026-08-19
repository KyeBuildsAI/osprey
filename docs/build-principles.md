# Osprey Build Principles

Status: **locked architectural constraints**
Adopted: **19 August 2026**

> **Osprey owns the workflow, evidence, state, permissions, and decisions.
> Models supply bounded intelligence. Humans retain authority. Providers and
> interfaces remain replaceable.**

These principles apply to the current build and every target architecture.
They are constraints, not claims that the corresponding infrastructure already
exists. Current implementation status is maintained separately in
[`status.md`](status.md).

## 1. Separate the operator interface from the operational core

The UI communicates through Osprey-owned APIs. It must not contain core decision
logic, provider secrets, policy enforcement, or durable operational state. The
interface may remain on ChatGPT Sites or move to self-hosted infrastructure
without changing the operational contracts.

## 2. Treat the workflow engine as deterministic infrastructure

The workflow layer controls stages, allowed transitions, retries, timeouts,
timers, approvals, audit events, idempotency, and recovery. It must continue to
operate safely when a model is unavailable, slow, or wrong. Models may reason
within a stage; they do not own stage progression.

## 3. Make models replaceable providers

All model use passes through one Osprey model gateway. Workflows use
provider-neutral requests and responses; provider adapters handle vendor SDKs,
prompt formats, authentication, and feature differences. No workflow or domain
object is coupled directly to DeepSeek, OpenAI, Anthropic, a self-hosted model,
or any other provider.

## 4. Route by task, risk, and cost

Routing policy selects a model class by task, evaluated capability, incident
risk, uncertainty, latency, and cost—not brand preference. Lower-cost models may
handle routine extraction, classification, summarisation, or first-pass
analysis only when evaluation shows they meet the required standard. Difficult,
ambiguous, high-value, or cross-source reasoning can escalate. Ordinary code
handles calculations, geometry, thresholds, permissions, and other exact rules.

## 5. Keep human approval outside the model

A model may recommend or draft but cannot authorise an external effect.
Authenticated server-side policy enforces approval and records who approved
what, against which evidence, action payload, incident-state version, and policy
version. Material change invalidates approval.

## 6. Keep evidence and shared state durable and model-independent

Osprey-controlled storage is the system of record for incident facts, source
snapshots, retrieval results, deterministic findings, model assessments,
decisions, approvals, workflow events, and tool receipts. Models receive
governed context; their conversation or context window is never durable state.

## 7. Use RAG as controlled evidence retrieval, not model memory

The Evidence Layer retrieves relevant, permissioned, versioned sources and
preserves citation, freshness, provenance, scope, and access controls. Model
outputs distinguish observed facts, reference context, assumptions, and
uncertainty. Retrieval results are traceable inputs, not silently absorbed
memory.

## 8. Design for partial failure

Sources, models, networks, tools, and downstream systems fail independently.
Every integration defines timeouts, bounded retries, idempotency, fallback or
degraded behaviour, operator warnings, and recovery. Missing or stale evidence
must not be concealed by fluent synthesis.

## 9. Keep secrets and provider calls server-side

The browser calls Osprey APIs. Osprey's protected runtime calls providers using
least-privilege secrets. Provider credentials never enter browser bundles,
repository history, model prompts, or client-visible logs.

## 10. Standardise portable, provider-neutral contracts

Model requests, structured outputs, tool calls, citations, confidence signals,
errors, workflow events, and evidence records use versioned Osprey schemas.
Provider-specific fields stay inside adapters. Contract validation occurs at
every trust boundary.

## 11. Evaluate before increasing autonomy

Representative scenarios measure factual and spatial correctness, citation
quality, unsupported claims, safety-policy adherence, calibration, latency,
cost, and failure behaviour. A cheaper or faster model is used only when it
meets a defined task standard. No autonomy level advances without documented
release criteria and evidence.

## 12. Preserve deployment freedom

UI hosting, API runtime, workflow engine, database, object storage, retrieval,
and model providers remain replaceable behind Osprey contracts. Current hosting
is a deployment choice, not the product boundary.

## 13. Separate observations from interpretations

Raw observations, normalised evidence, deterministic facts, model assessments,
human decisions, and action results are distinct record types. The system never
presents a model interpretation as an observation or silently promotes it into
accepted state.

## 14. Make consequential outputs reproducible

Every consequential output can be reconstructed from immutable or versioned
evidence, workflow version, model and configuration, prompt/policy version,
retrieval result, tool input/output, and human decision. Replay may reproduce
the decision context even when a nondeterministic model produces different text.

## 15. Coordinate specialists through shared state and contracts

Specialists communicate through explicit tasks, events, evidence references,
and versioned state. Delegation is a durable object with requester, purpose,
inputs, status, result, and lineage. Unrestricted agent-to-agent conversation
does not become accepted operational state.

## Conformance rule

Every material feature or architecture proposal must state:

1. which principles it advances or constrains;
2. whether it is **implemented**, **partial**, **designed**, **proposed**, or
   **future**;
3. where authority and durable state live;
4. its failure and recovery behaviour;
5. how it is evaluated before release.
