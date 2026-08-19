# Repository governance and source-of-truth resolution

Status: **resolved and protected** as of 19 August 2026.

## Historical risk

After shared commit `0d91f96`, the repository split into two histories:

- the deployable application line reached `a6338f2` through 30 application and
  product commits;
- the former remote `main` reached `4d99317` through three documentation-only
  commits and no longer contained the application tree.

That split made ordinary pulls, merges, and fresh clones misleading. The useful
remote approval material was intentionally adapted into
[`approvals-ux.md`](approvals-ux.md) and
[`design-decisions.md`](design-decisions.md), alongside the consolidated
architecture documentation.

## Resolution record

- Reconciliation documentation commit: `c59e703`.
- Two-parent history reconciliation commit: `2fb790d`, retaining the deployable
  and documentation-only histories without accepting the remote tree deletion.
- Reviewed draft PR: `#1`, **Reconcile Osprey application and documentation
  history**.
- Authoritative merge commit on `main`: `b59d0c1`.
- Application tree: the tested deployable line derived from `a6338f2`.
- Documentation tree: the status-aware consolidated documents in this branch.

Both `a6338f2` and `4d99317` are ancestors of authoritative `main`. A fresh clone
of `main` therefore contains the application and preserves both histories.

## Effective protection

GitHub branch protection on `main` now:

- requires changes to pass through a pull request;
- applies protection to administrators;
- requires review conversations to be resolved;
- blocks force pushes;
- blocks deletion of `main`.

No status check is required yet because the repository has no configured CI
workflow. Adding a build/test workflow and making it required is the next
repository-control improvement.

## Continuing operating rules

- Treat `main` as the sole authoritative development history.
- Record the exact commit or artifact digest for every deployment.
- Do not bypass protection or recreate a parallel documentation-only default
  branch.
- Update code, status, architecture, and roadmap claims in the same reviewed
  change when capability maturity changes.
- Retain safety references until the owner confirms independent backup and
  recovery procedures.
- Keep uncommitted work out of repository reconciliation commits.

## Preserved local exception

The richer `lib/locations.ts` working-tree edit remains separate from `main` and
the deployment. It was preserved as Git object
`f4db300e5374c1ca0eff9adf2bae641dd06313b4` and must receive its own product and
implementation review before publication.

## Remaining controls

- Add CI for build, test, lint, documentation links, and dependency audit.
- Resolve the two existing lint errors before making lint a required check.
- Triage the dependency-audit baseline before production use.
- Document deployment promotion and rollback from authoritative commits.
