## Why

Every push to `master` starts the full PIPELINE (bump, build, docker-build, deploy), even when the push only touches OpenSpec artifacts or the `ai/` notes. Those runs bump the version, rebuild and redeploy an unchanged app, costing CI minutes and producing meaningless releases.

## What Changes

- Add `paths-ignore: ['openspec/**', 'ai/**']` to the `push` trigger in `.github/workflows/pipeline.yml`.
- A push whose changed files all lie under `openspec/` or `ai/` no longer starts a pipeline run.
- A push that touches anything else (even alongside `openspec/` or `ai/` files) still runs the full pipeline, as today.
- `workflow_dispatch` stays, so a run can still be started by hand at any time.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is a CI tooling change with no product behavior; the change sets `skip_specs: true`.

## Impact

- `.github/workflows/pipeline.yml` (trigger only; jobs unchanged).
- Version numbers stop advancing on spec/notes-only pushes.
