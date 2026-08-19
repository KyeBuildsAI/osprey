# Approvals UX contract

Status: **partial implementation with designed server controls**.

This document preserves the useful approval-queue specification from the
documentation-only remote history while stating the current implementation
boundary accurately.

## Purpose

Approvals are Osprey's human-control point for proposed operational actions.
They are not a general list of observations, agent messages, alerts, or prior
decisions. The operator's question is:

> What action is proposed, what supports or challenges it, and exactly what am
> I authorising?

Models and specialist logic may recommend or draft. Only authenticated
server-side policy and a named human authority may approve a consequential
action.

## Current implementation

The deployed interface already provides:

- navigation labelled **Approvals** and a **Decisions & Actions** workspace;
- **Needs your decision**, **In progress**, and **Decision history** tabs;
- a queue card and focused review workspace;
- supporting evidence, challenge, trade-off, and effect-of-approval text;
- approve, reject, edit, and request-more-analysis controls;
- a confirmation step before the demonstrated approval transition.

These controls currently mutate React/browser state. They do not authenticate
the actor, enforce authority, bind an immutable packet version, persist an audit
record, or release an external action. The UI must not be represented as an
operational authorization system.

## Information architecture

1. **Needs your decision** contains only proposed actions awaiting a human
   response.
2. **In progress** contains approved simulations or work awaiting a result.
3. **Decision history** contains rejected, completed, superseded, or otherwise
   closed records.

Queue cards should support triage with the action, affected scope, proposer,
urgency/deadline, evidence count, unresolved challenges, and lifecycle state.
They should not contain unbounded reasoning transcripts.

## Decision review workspace

The review order is:

1. exact proposed action, scope, timing, conditions, and intended owner;
2. concise rationale with links to the underlying assessment;
3. discrete evidence carrying source, timestamp, version, and relevance;
4. uncertainty, assumptions, and unresolved disagreement;
5. the exact effect approval would authorize, including whether it is only a
   simulation.

Observed facts, deterministic findings, model interpretations, and human
decisions remain visibly distinct.

## Human actions

- **Approve action** approves the displayed immutable version only.
- **Edit before approving** creates a new version while retaining the original.
- **Request more analysis** creates a scoped task linked to the packet and its
  eventual response.
- **Reject proposal** closes the proposal without deleting its evidence or
  history.

## Target lifecycle

`DRAFT -> PROPOSED -> UNDER_REVIEW -> APPROVED | MODIFIED_AND_APPROVED | REJECTED | DEFERRED | SUPERSEDED`

An approved action may then enter a separate execution lifecycle. Approval is
not proof of execution. External effects require an outbox/tool request,
idempotency key, policy result, receipt, and reconciliation state.

## Server-side invariants before operational use

- The actor is authenticated and authorized for the incident, action, and
  scope.
- The decision binds the exact packet, evidence set, policy, and version.
- Stale, expired, superseded, or materially changed packets cannot execute.
- The transition and any edit are durable and append-only.
- Models cannot invoke or counterfeit the approval transition.
- Consequential tools cannot run without a valid approval reference.
- Retries cannot duplicate an effect; failure and compensation remain visible.

## Required audit chain

`proposal -> evidence -> challenge -> human decision -> approved version -> tool request -> receipt -> outcome`

The record includes proposer, evidence and retrieval versions, assumptions,
uncertainty, reviewer identity/authority, edits, timestamps, policy result,
tool receipt, and later supersession or closure.

## Acceptance questions

An operator must be able to answer quickly:

1. What needs my decision now?
2. What exactly am I being asked to authorize?
3. Which evidence supports it and what remains uncertain or contested?
4. What will happen if I approve, edit, reject, or request more analysis?
5. Can the resulting record and any external effect be reconstructed?

See [`workflows.md`](workflows.md), [`security.md`](security.md), and
[`status.md`](status.md) for lifecycle, authority, and current maturity.
