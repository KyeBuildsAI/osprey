# Workflow and approval contract

Status: **designed**. The current browser demonstrates portions of this journey
but does not implement a durable workflow engine or server-enforced approval.

The detailed operator interaction for proposed actions is defined in
[`approvals-ux.md`](approvals-ux.md).

## Ownership boundary

The deterministic workflow owns progress, recovery, policy checks, and durable
events. Specialists—whether rules or models—produce bounded proposals within an
allowed activity. Humans retain decision authority. No model response, chat
message, or browser state transition is itself an operational command.

## Incident lifecycle

```text
created -> evidence-collecting -> assessing -> decision-preparing
        -> awaiting-human -> approved/rejected/deferred/stale
        -> releasing-authorised-work -> monitoring-outcome -> closed
```

Not every incident needs every stage. The workflow definition determines valid
transitions, required inputs, timeouts, and compensation. A model can suggest a
next investigation but cannot advance the lifecycle.

## Standard activity envelope

Every activity receives and returns a versioned envelope containing:

- workflow/incident/activity IDs and attempt number;
- actor or service identity;
- incident-state and evidence versions;
- allowed tools and data scopes;
- deadline, timeout, retry, and idempotency keys;
- structured result or typed error;
- receipts, citations, and produced record IDs.

Accepted outputs are persisted before the next activity is scheduled.

## Specialist work and delegation

Specialist output is one or more typed proposals: assessment, claim, challenge,
recommendation, question, or task. It identifies evidence, assumptions,
uncertainty, and the schema/model/rule version that produced it.

Delegation is a durable task:

```ts
type SpecialistTask = {
  id: string;
  incidentId: string;
  requestedBy: string;
  assignedRole: string;
  purpose: string;
  inputEvidenceIds: string[];
  stateVersion: string;
  status: "queued" | "running" | "blocked" | "completed" | "failed";
  resultIds: string[];
};
```

Free-form agent conversation may be retained as diagnostic context, but cannot
mutate accepted state without validation into a typed record.

## Decision and approval workflow

1. Freeze a decision packet against exact incident/evidence versions.
2. Run deterministic policy eligibility checks.
3. Surface supporting, contradicting, missing, stale, and challenged evidence.
4. Ask an authenticated human with the required role to approve, modify, reject,
   defer, or request more analysis.
5. Persist the decision and signed approval scope.
6. Revalidate state and policy immediately before release.
7. Write an authorised outbox item; an adapter performs the bounded effect.
8. Persist delivery, acknowledgement, failure, compensation, and outcome.

Modification creates a new packet version. An approval cannot be copied to a
changed action. A model cannot invoke or simulate the approval transition.

## Timers, retries, and partial failure

- Network/source/model/tool activities use explicit timeouts and bounded retry
  policies by error class.
- Side effects use idempotency keys and durable outbox/inbox receipts.
- Parallel activities persist independent success/failure; one failure does not
  erase successful evidence.
- Retry exhaustion produces a visible blocked/degraded state and an operator
  task; it never produces a synthetic success.
- Approval expiry, new material evidence, policy changes, and incident closure
  cancel or invalidate pending work deterministically.
- Workflow replay must not repeat a consequential external effect.

## Audit events

Material events include evidence receipt, transformation, retrieval, tool call,
model request/result, specialist proposal, task/delegation, challenge,
state transition, policy evaluation, human decision, approval invalidation,
outbox release, acknowledgement, error/retry, and outcome observation.

Audit records are append-only and queryable by incident, decision, actor,
evidence version, workflow run, and external effect.

## Current-to-target migration

1. Treat the existing browser transitions as a demonstrator and document them.
2. Define API commands and versioned state before moving transitions server-side.
3. Persist incidents, evidence, packets, decisions, and events.
4. Add durable workflow execution and recovery.
5. Add authenticated policy and approval.
6. Add the outbox with simulated adapters; only consider real effects after the
   security and evaluation gates pass.

Until steps 2–5 are implemented, the UI must continue to label approvals and
tasks as representative and non-operational.
