# Evaluation Framework

## Why evaluation is a first-class feature

Osprey operates in a consequential domain. A convincing demo is not enough; the project should show how an agentic system can be measured, challenged and improved.

Evaluation should cover four layers:

1. data/tool correctness;
2. individual agent quality;
3. multi-agent workflow quality;
4. human + AI operational outcomes.

## 1. Data and tool evaluation

Deterministic tools should be tested independently of the LLM.

Examples:

- Does a warning polygon correctly intersect known assets?
- Does the elevation lookup return the expected location and units?
- Does the flood-zone lookup return the correct mapped designation?
- Are upstream timestamps parsed correctly?
- Are stale feeds detected?
- Are coordinate systems handled consistently?

These should use normal software tests wherever possible.

## 2. Agent-level evaluation

### Weather Agent

Evaluate:
- correct interpretation of official alerts;
- identification of hazard escalation/de-escalation;
- grounding in supplied evidence;
- recognition of disagreement between sources;
- uncertainty handling;
- absence of invented warnings or observations.

### Infrastructure Agent

Evaluate:
- correct use of geospatial tool results;
- correct identification of exposed assets;
- distinction between exposure and actual impact;
- grounding of vulnerability claims;
- appropriate requests for missing evidence.

### Operations Agent

Evaluate:
- retrieval of relevant procedure/playbook evidence;
- proportionality of proposed action;
- awareness of uncertainty;
- correct distinction between monitoring, preparation and intervention;
- avoidance of unsupported operational claims.

### Communications Agent

Evaluate:
- consistency with approved decisions;
- no publication of unapproved recommendations;
- factual grounding;
- audience appropriateness;
- accessibility/readability requirements where defined.

### Safety Agent

Evaluate:
- detection of unsupported assumptions;
- detection of overreaction and underreaction;
- useful challenge rather than generic caution;
- escalation of unresolved high-impact disagreement.

## 3. Multi-agent evaluation

This is where Osprey should differentiate itself from a normal chatbot evaluation suite.

Potential metrics / test questions:

- Did the right agent receive the task?
- Did agents share only evidence necessary for the decision?
- Did delegation improve the answer?
- Did an agent update its recommendation after new evidence?
- Were conflicting recommendations surfaced as disagreement?
- Did one agent incorrectly overwrite another agent's finding?
- Did agents converge for a good reason, or merely imitate each other?
- Was important evidence lost as information moved between agents?

## 4. Human-in-the-loop evaluation

Evaluate the decision workflow itself:

- Was human approval requested when required?
- Could the reviewer understand why the action was proposed?
- Was supporting evidence visible?
- Were uncertainty and disagreement visible before approval?
- Did the human modify or reject the recommendation?
- Did Osprey execute only the approved version?
- Could the complete decision path be reconstructed later?

## Operational metrics

Candidate metrics include:

- critical hazard detection recall;
- false escalation rate;
- missed escalation rate;
- evidence-grounded recommendation rate;
- unsupported-claim rate;
- appropriate human-gate rate;
- human override rate;
- agent disagreement rate;
- disagreement resolution quality;
- tool-call success/error rate;
- time from new evidence to updated assessment;
- cost / tokens per incident and per agent;
- retrieval relevance;
- stale-data handling rate.

Not every metric needs to exist in V1. The important goal is to establish an evaluation harness early enough that later agent changes can be compared.

## Scenario-based evaluation

Create synthetic scenarios that vary important conditions rather than only testing one happy path.

Dimensions may include:

- hazard type;
- severity;
- forecast confidence;
- official warning state;
- time to impact;
- affected population/assets;
- terrain/elevation;
- flood-zone status;
- conflicting upstream sources;
- missing/stale data;
- procedure availability;
- agent disagreement;
- whether intervention is actually warranted.

## False positives and false negatives

Osprey should explicitly examine both.

### False positive example

The system recommends closure because an asset is low-lying, but the active hazard does not intersect the asset and official alerts do not support escalation.

### False negative example

The system recommends monitoring despite an official warning, intersecting hazard polygon and vulnerable asset being present.

The evaluation suite should make these error types visible rather than collapsing them into one overall score.

## Replay evaluation

Historical replay provides repeatability.

At each replay checkpoint:

1. reveal only information available at that simulated time;
2. capture each agent's findings;
3. capture proposed actions;
4. capture disagreements;
5. optionally capture human decisions;
6. advance to the next evidence checkpoint;
7. evaluate whether the system adapted appropriately.

Replay enables comparisons between:

- prompt versions;
- model versions;
- tool configurations;
- agent architectures;
- RAG configurations;
- confidence/approval thresholds.

## Evaluation dataset structure

A scenario should contain something like:

```ts
type EvaluationScenario = {
  id: string;
  location: string;
  mode: "synthetic" | "replay";
  evidenceTimeline: EvidenceCheckpoint[];
  expectedCriticalFacts: string[];
  forbiddenClaims?: string[];
  expectedEscalationRange?: string[];
  expectedHumanGates: string[];
  gradingNotes: string[];
};
```

Some evaluations can be deterministic; others will require rubric-based human or model-assisted grading. Model-assisted grading should itself be calibrated against human judgement.

## Observability

Every evaluation depends on traces that make the system inspectable.

For each run, capture:

- model + configuration;
- prompt/system version;
- input evidence IDs;
- retrieved documents;
- tool calls and outputs;
- structured agent output;
- token/cost data where available;
- latency;
- delegation messages;
- disagreements;
- human decisions;
- final actions.

## Evaluation principle

**The goal is not to prove Osprey is safe or production-ready. The goal is to demonstrate a disciplined method for understanding where an agentic operational system succeeds, fails, overreacts, misses risk and needs human control.**
