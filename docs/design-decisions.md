# Design decision register

This register consolidates the useful decisions from the documentation-only
remote history into the deployable tree. The status column prevents a product
decision from being mistaken for implemented capability. The locked engineering
constraints remain authoritative in [`build-principles.md`](build-principles.md).

| ID | Decision | Status and interpretation |
| --- | --- | --- |
| DD-001 | Osprey is an incident command room, not a weather chatbot. | Implemented product direction. |
| DD-002 | Multi-agent orchestration and multi-user collaboration are distinct. | Designed; neither durable form exists yet. |
| DD-003 | Use Weather, Infrastructure, Operations, and Communications specialist roles, with independent safety challenge. | Partial role-framed rule cards; model-backed roles and challenge agent are Designed. |
| DD-004 | Consequential actions require explicit human approval outside models. | Partial UI; authenticated enforcement is Designed. |
| DD-005 | Houston–Galveston is the first operating area; contrasting locations follow only through governed configuration. | Houston Implemented/Partial; later locations Future. |
| DD-006 | Preserve source identity and disagreement when multiple weather sources are used. | Partial current provenance; further sources are Proposed until contracted and evaluated. |
| DD-007 | Live mode must never fabricate severe conditions. | Implemented constraint. |
| DD-008 | Add historical replay without future-information leakage. | Designed. |
| DD-009 | Geospatial mapping is a core product surface. | Implemented interface; durable spatial service is Designed. |
| DD-010 | Deterministic GIS tools calculate; models interpret. | Implemented principle and target contract. |
| DD-011 | Retrieval is permissioned and scoped by role/task rather than one undifferentiated memory. | Designed Evidence Layer. |
| DD-012 | Maintain canonical shared state while giving specialists least context. | Designed; current state is browser-local. |
| DD-013 | Disagreement is first-class evidence, not something to average away. | Partial UI language; durable challenge records are Designed. |
| DD-014 | Evaluation, traces, evidence IDs, and scenario tests are architecture. | Designed; current automated coverage is minimal. |
| DD-015 | Technology and capability claims must follow implementation evidence. | Active documentation rule. |
| DD-016 | Use an **Approvals** queue and **Decisions & Actions** workspace for consequential proposals. | Partial UI implemented; durable approval lifecycle is Designed. |

## Updating this register

Add or amend a decision when a meaningful trade-off changes. Record the reason,
consequence, capability status, evaluation evidence, and superseded decision.
Update [`status.md`](status.md) in the same change when maturity changes.

DD-016's complete interaction and server-boundary contract is in
[`approvals-ux.md`](approvals-ux.md).
