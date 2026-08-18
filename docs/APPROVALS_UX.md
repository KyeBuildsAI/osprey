# Approvals UX Specification

## Purpose

The approval surface is Osprey's human-control point for consequential operational actions.

It is not a general list of weather findings, agent messages, alerts or historical decisions. It presents a clear question to the incident controller:

> An operational action has been proposed. Given the evidence, uncertainty and challenges, what do you authorise Osprey to do?

This implements the product principle that AI investigates, reasons and proposes; humans retain authority for consequential actions.

## Naming

- **Navigation label:** Approvals
- **Page heading:** Decisions & Actions
- **Supporting line:** Review operational actions proposed by Osprey's agents. Nothing consequential happens without your approval.

The word “Decisions” on its own is ambiguous: it can mean agent findings, historical choices, recommendations or unresolved disagreements. “Approvals” makes the primary user task clear before the user opens the page.

## Scope boundaries

| Object | Primary surface | Meaning |
| --- | --- | --- |
| Weather assessment, risk or observation | Agent findings / incident room | A conclusion or fact; it may support a decision but does not require approval by itself. |
| Asset exposure / spatial calculation | Map and evidence | Deterministic evidence or an interpreted finding; it may support a decision. |
| Conflicting positions | Disagreement view | A challenge requiring inspection; it is not automatically an action. |
| Proposed closure, deployment, escalation or notification | Approvals | A consequential action awaiting human authority. |
| Executed simulation / communication briefing | Action result / audit timeline | What occurred after an approved action. |

## Information architecture

The page has three tabs:

1. **Needs your decision** — the default. Contains only proposed actions waiting for a human response.
2. **In progress** — actions that are approved, being simulated, or awaiting a downstream result.
3. **Decision history** — completed, rejected, superseded and otherwise closed items.

The default view must be a focused approval queue, not a broad dashboard or archive.

## Approval queue card

Every item in **Needs your decision** should show, without opening it:

- action title in plain operational language;
- affected location / asset / operational area;
- proposing agent;
- urgency and decision deadline;
- why it requires human approval;
- count of supporting evidence items;
- count and severity of unresolved challenges;
- proposed-action state.

Example:

> **Prepare closure of the I-45 underpass**  
> Houston · Decision needed by 17:30 · Proposed by Operations  
> 4 supporting evidence items · 1 unresolved challenge

Queue cards must not display long agent prose. Their job is triage: help the controller decide what needs attention first.

## Decision review workspace

Opening a queue card shows one focused decision workspace with this order.

### 1. Proposed action

State the exact operational action, operational scope, timing and owner.

> Prepare closure of the I-45 underpass from 18:00 to 22:00.

### 2. Why this is proposed

Provide a short plain-English rationale. Link to the full agent reasoning from the incident room rather than placing an unbounded transcript in the approval workflow.

### 3. Supporting evidence

Show discrete, inspectable evidence items with source identity, timestamp and relevance. Examples:

- NWS flash-flood warning;
- forecast rainfall at the location;
- elevation or flood-zone result;
- hazard / asset intersection;
- relevant operating procedure.

Each evidence item should open its source, map context or structured tool result.

### 4. Uncertainty and challenge

Make uncertainty and disagreement visible before approval.

Example:

> Weather confidence: moderate  
> Infrastructure: asset is exposed  
> Safety challenge: closure may be premature unless forecast rainfall exceeds 50 mm

Do not collapse disagreement into a single agent score or hidden narrative.

### 5. Effect of approval

State what the approval will authorise.

> Approving will simulate a field-operations notification and request an internal communications briefing. It will not control real infrastructure.

This must be visible before any consequential confirmation.

## Human actions

The review workspace provides four primary actions:

- **Approve action**
- **Edit before approving**
- **Request more analysis**
- **Reject proposal**

### Approve action

Approval confirms the exact proposed version and creates an immutable audit record. If the action is consequential, show a confirmation step that repeats:

- the approved action;
- scope and timing;
- intended downstream simulated tools;
- downstream communications effect.

### Edit before approving

A human can modify scope, timing, conditions or operational wording, then approve the changed version.

The original agent proposal must remain preserved. The audit trail should show both the original proposal and the human-approved version.

### Request more analysis

This returns the action to active analysis and should capture a targeted question. The controller can address a named agent or add a free-text request.

Example:

> Ask Weather whether the rainfall threshold is likely to be reached before 18:00.

The request, responding finding and subsequent action revision must be linked.

### Reject proposal

Rejection requires an optional short reason and records that the action was not authorised. A rejection does not erase the proposal or its evidence.

## Action states and labels

Use plain-language labels in the interface while retaining explicit lifecycle values in state.

| UI label | Lifecycle state |
| --- | --- |
| Needs decision | Proposed / Under review |
| More analysis requested | Under review |
| Approved | Approved / Modified and approved |
| Simulating action | Executing simulated tool |
| Completed | Executed / simulated |
| Rejected | Rejected |
| Replaced | Superseded |

## Audit requirements

For every approval item, Osprey must preserve:

- original proposing agent;
- original proposal and version history;
- supporting evidence IDs and timestamps;
- confidence, assumptions and uncertainties;
- related agent challenges / disagreements;
- requesting or reviewing human;
- decision taken and any edits;
- approval time;
- simulated tool action and result;
- communication artifact generated from the approved action;
- later supersession or closure.

The final audit chain must be reconstructable as:

`proposal → evidence → human decision → approved version → simulated action → result`

## Acceptance criteria

The page is successful when a controller can answer all five questions quickly:

1. What needs my decision now?
2. What exactly am I being asked to authorise?
3. Why is it proposed, and what evidence supports it?
4. What remains uncertain or contested?
5. What will happen if I approve, modify, reject or request more analysis?

The system must never execute a consequential action from an unapproved agent recommendation.
