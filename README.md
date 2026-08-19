# Osprey

An evidence-led incident-command and operational-coordination layer for
extreme-weather operations.

> **Osprey owns the workflow, evidence, state, permissions, and decisions.
> Models supply bounded intelligence. Humans retain authority. Providers and
> interfaces remain replaceable.**

Osprey connects authoritative weather, geospatial, infrastructure, and
operational systems. It is not a replacement GIS, autonomous incident
commander, or collection of prompts.

## Current build

The local deployable tree contains a working Houston–Galveston vertical slice:

- live/read-only NWS weather and alert data, water observations, MRMS rainfall,
  TranStar impacts, USGS elevation, and FEMA/H-GAC flood context;
- a MapLibre operational map with warning geometry, source health, spatial
  selections, representative critical assets, and deterministic exposure/risk
  logic;
- evidence references, specialist-role views, representative decision packets,
  approvals, tasks, and an incident timeline.

Important boundary: the specialist assessments are deterministic TypeScript
rules, not model-backed agents. Shared incident state, approvals, tasks, and
workflow transitions are browser-local demonstrations. There is no durable
workflow engine, operational database, model gateway, governed RAG runtime,
authenticated approval policy, external action release, replay engine, or
scenario evaluation harness yet. No external operational effect is produced.

See [`docs/status.md`](docs/status.md) for the authoritative, evidence-based
capability ledger.

## Build Principles

The 15 locked [`Osprey Build Principles`](docs/build-principles.md) require:

- a replaceable UI over Osprey-owned APIs and durable state;
- deterministic workflow, policy, tools, failure handling, and audit;
- one provider-neutral model gateway with task/risk/cost routing;
- governed, permissioned, versioned evidence retrieval—not model memory;
- authenticated human approval outside every model;
- portable contracts, reproducible consequential outputs, and evaluation before
  autonomy.

## Documentation map

- [`docs/build-principles.md`](docs/build-principles.md) — locked engineering
  constraints and conformance rule.
- [`docs/product-direction.md`](docs/product-direction.md) — product boundary,
  capabilities, interaction model, and guardrails.
- [`docs/architecture.md`](docs/architecture.md) — verified current runtime and
  designed target architecture/contracts.
- [`docs/status.md`](docs/status.md) — authoritative implementation-status
  vocabulary and capability ledger.
- [`docs/workflows.md`](docs/workflows.md) — deterministic workflow, specialist
  delegation, approval, retry, and audit contracts.
- [`docs/security.md`](docs/security.md) — identity, secrets, model/RAG/tool trust
  boundaries, human authority, and release gates.
- [`docs/evaluation.md`](docs/evaluation.md) — task/provider qualification,
  scenario measures, and autonomy gates.
- [`docs/development-guidance.md`](docs/development-guidance.md) — contributor
  checklist and code-placement rules.
- [`docs/approvals-ux.md`](docs/approvals-ux.md) — current approval interface and
  designed authorization contract.
- [`docs/design-decisions.md`](docs/design-decisions.md) — status-aware product
  and architecture decision register.
- [`docs/20-day-sprint.md`](docs/20-day-sprint.md) — status-corrected delivery
  roadmap.
- [`docs/repository-governance.md`](docs/repository-governance.md) — resolved
  source-of-truth split, branch protection, and continuing operating rules.

If documents conflict about what exists, `docs/status.md` controls. A roadmap or
target diagram never upgrades an implementation status.

## Repository control

The earlier local/deployed versus documentation-only `main` split was reconciled
through PR #1. Authoritative `main` at `b59d0c1` preserves both histories and
uses the deployable application tree with consolidated documentation. Pull
requests are required; force pushes and branch deletion are disabled. See the
governance document for provenance and continuing safeguards.

## Development

```bash
npm install
npm run dev
```

Production build and smoke test:

```bash
npm test
```

Lint is currently a known failing baseline because two existing handlers in
`app/page.tsx` are unused. This documentation update does not alter application
code or claim that failure is resolved.
