# Development guidance

This is the implementation checklist for applying the
[`Osprey Build Principles`](build-principles.md). It does not override the
current capability ledger in [`status.md`](status.md).

## Before changing a feature

1. State the user/operational outcome and affected build principles.
2. Classify the change as implemented, partial, designed, proposed, or future.
3. Identify the authoritative state owner, actor/permission boundary, failure
   behaviour, audit records, and evaluation gate.
4. Reuse or version an Osprey contract; do not leak provider SDK types into the
   domain or workflow.
5. Preserve demo/live/replay/simulation distinctions.

## Code placement rules

- UI components render state and send commands; they do not own durable
  workflow, authorization, provider secrets, or consequential policy.
- API/application services validate identity, commands, schemas, and policy.
- Workflow definitions orchestrate activities, waits, retries, and recovery;
  they do not contain model-vendor logic.
- The model gateway owns routing, provider adapters, output validation, usage,
  and model receipts.
- The Evidence Layer owns permissioned/versioned retrieval and citations.
- Deterministic tools own calculations, geometry, thresholds, and permissions.
- Repositories/event stores own durable state and audit; model context does not.

## Model-backed feature checklist

- Use the gateway—never call a provider SDK from UI, workflow, or domain code.
- Declare task/risk class, output schema, allowed tools, timeout, and routing
  policy version.
- Supply only permissioned evidence references and the minimum needed context.
- Validate structured output; persist citations, assumptions, uncertainties,
  provider/model/configuration, prompt version, cost, latency, and errors.
- Define evaluated fallback and no-model behaviour.
- Do not let model confidence grant authority or suppress uncertainty.

## Workflow and effect checklist

- Make transitions deterministic, versioned, and server-owned.
- Use idempotency keys, bounded retries, explicit timeouts, and typed errors.
- Persist success/failure independently for parallel activities.
- Bind approvals to identity, payload, state/evidence/policy versions, and expiry.
- Revalidate immediately before writing an outbox item.
- Keep adapters read-only by default and record every effect receipt.

## Evidence and data checklist

- Separate source snapshots, normalized observations, deterministic findings,
  model assessments, human decisions, and action results.
- Preserve source/event/receipt/valid times, units, geography, transformation,
  freshness, permissions, schema version, and mode.
- Never hide stale or missing evidence with synthesis.
- Keep retrieval results versioned and reproducible; do not call RAG “memory.”

## Documentation and review

- Update `status.md` only when evidence supports a status change.
- Update architecture/workflow/security/evaluation docs when their contracts
  change; update the roadmap when sequence changes.
- Add an architecture decision for a changed constraint or meaningful tradeoff.
- In reviews, reject ambiguous claims such as “agent complete,” “approval
  enforced,” or “live” unless the exact implemented boundary is stated.
- Preserve user-owned/unrelated working-tree changes.

## Verification

Use proportionate checks: schema/unit/contract tests; workflow restart and
idempotency tests; source/model/tool failure injection; authorization and
approval tests; replay/evaluation suites; production build; lint/accessibility;
and rendered documentation review. Record known failures instead of turning a
partial baseline into a completion claim.
