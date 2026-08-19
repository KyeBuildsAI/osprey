# Security and authority model

Status: **designed controls with a partial current boundary**. Current API
routes keep public-source calls server-side, but durable identity, roles, policy,
approval enforcement, secret management for model providers, and external
action controls are not implemented.

## Assets and trust boundaries

Protect incident state, evidence/source snapshots, operator identity, approval
authority, connector/model credentials, retrieval corpora, workflow history,
tool receipts, external-action payloads, and audit/evaluation records.

Trust boundaries exist between the browser and Osprey API; Osprey and every
source/model/tool/downstream provider; retrieval content and a model; model
output and accepted state; a recommendation and human approval; and approved
outbox records and external effects.

## Non-negotiable controls

### Identity, policy, and human authority

- Authenticate humans and services; authorize every command against incident,
  organisation, role, and action scope.
- Enforce consequential approval server-side. Client state, model output, and a
  display name are not proof of authority.
- Bind approval to exact payload, evidence/state versions, policy version,
  approver identity, time, and expiry.
- Require fresh review after material change and prevent self-approval where
  policy requires separation of duties.

### Secrets and provider isolation

- Store credentials in the protected runtime or managed secret store.
- Never expose credentials to the browser, repository, prompt, retrieval corpus,
  trace payload, or operator-visible error.
- Give adapters least-privilege scopes and independent rotation/revocation.
- Provider-specific SDKs and credentials terminate inside adapters behind the
  Osprey gateway.

### Models, tools, and retrieval are untrusted

- Treat prompts, retrieved documents, source content, and model output as
  untrusted data.
- Validate structured outputs and citations before persistence.
- A model cannot expand its tool allowlist, data scope, permissions, workflow
  stage, or approval status.
- Apply document-level permissions before retrieval and again before context is
  assembled. Prompt injection in a source cannot override system policy.
- Separate facts, interpretations, recommendations, and decisions in storage
  and presentation.

### Data integrity and audit

- Preserve immutable raw snapshots or verifiable source references where
  lawful; content-hash material evidence where practical.
- Use append-only audit events, versioned accepted state, and correlation IDs.
- Encrypt sensitive data in transit and at rest; minimize retention and redact
  secrets/personal data from logs and model context.
- Back up and test restoration of the system of record and workflow history.

### External effects

- Default tools to read-only.
- Require server policy, current approval, scoped service identity, idempotency,
  and an outbox record before a consequential effect.
- Record the exact released payload, endpoint, attempt, acknowledgement, error,
  and compensation/result.
- Keep demo, simulation, training, replay, and live execution modes technically
  and visually distinct. Never let a demo flag alone grant live access.

## Threats that must be tested

- forged or replayed approval;
- stale approval after evidence/action/policy change;
- horizontal incident or organisation access;
- prompt injection from source or RAG documents;
- fabricated citations or tool receipts;
- model-request data leakage across providers;
- secret exposure in client bundles, logs, errors, or prompts;
- duplicate external effects after retry/restart;
- source spoofing, stale data, schema drift, and poisoned snapshots;
- unbounded model/tool cost or denial of service;
- audit deletion or mismatch between UI and accepted state.

## Release gates

No consequential adapter may leave simulation until authentication,
authorization, version-bound approval, audit reconstruction, idempotency,
failure recovery, secret scanning, data-access tests, and relevant scenario
evaluations pass. Any model-backed capability additionally requires calibrated
task accuracy, citation, injection-resistance, fallback, latency, and cost gates.

## Current known gaps

- Approval and task transitions are local browser demonstrations.
- A representative actor name is not authenticated identity.
- There is no durable policy decision, system-of-record audit, or external
  action outbox.
- There is no model provider or RAG runtime yet, so their controls are designed
  rather than verified.
- The current fan-out route needs finer-grained failure isolation before it can
  meet the target degraded-mode contract.
