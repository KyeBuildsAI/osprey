# Repository governance and source-of-truth risk

Status: **active unresolved risk** as of 19 August 2026.

## Verified divergence

The local deployable branch and `origin/main` share commit `0d91f96`, then
diverge:

- local `main` at `a6338f2` is 30 commits ahead of the shared base and contains
  the application, live/read-only connectors, map, tests, and current local
  documentation;
- `origin/main` at `4d99317` is three different commits ahead of the shared base
  and contains a documentation-heavy tree that removes the deployable
  application. Its two newest commits add an approval UX specification and the
  associated design-decision entry.

Therefore neither a routine pull/merge nor a fresh clone of remote `main` can be
assumed to preserve or reveal the deployable truth. The current remote tracking
ref was refreshed on 19 August 2026; it may change again after that observation.

The useful approval material has been intentionally adapted into
[`approvals-ux.md`](approvals-ux.md) and
[`design-decisions.md`](design-decisions.md) on the reconciliation branch. That
content transfer does not make a tree-level merge safe.

## Immediate operating rules

- Do not run a routine pull, merge, rebase, force-push, or branch deletion as a
  housekeeping action.
- Do not treat `origin/main` as the application source of truth or the local
  branch as safely backed up until authority is explicitly chosen.
- Before any history operation, capture both commit IDs, inspect the full graph
  and tree diff, preserve uncommitted work, and create recoverable references.
- Deployments must record the exact commit/tree or artifact digest used.
- Documentation must name whether it describes the local deployable tree, the
  remote documentation branch, or a reconciled successor.

## Resolution decision required

The owner must choose and record one authoritative history. A safe reconciliation
plan should preserve both lines, review the remote documents for useful content,
integrate them intentionally into the deployable tree, verify the resulting
application, and only then update the protected default branch. The exact Git
method is deliberately not prescribed here because it depends on ownership,
remote state, backup, and review decisions outside this documentation task.

## Protection after reconciliation

- Protect the authoritative default branch and require reviewed changes.
- Require build/test and documentation-status checks.
- Prevent force pushes and accidental deletion.
- Tag or otherwise retain the last known deployable and documentation-only
  histories.
- Document deployment provenance and a recovery procedure.

This risk is not resolved by the present documentation changes.
