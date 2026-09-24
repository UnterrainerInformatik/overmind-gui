## Context

`.github/workflows/pipeline.yml` triggers on `push` to `master` and on `workflow_dispatch`. All jobs are reusable workflows (bump → build → docker-build → deploy); none of them can filter on changed paths themselves, so the filter has to sit on the trigger.

## Goals / Non-Goals

**Goals:**
- Skip the pipeline when a push changes only files under `openspec/` or `ai/`.

**Non-Goals:**
- Skipping other non-code paths (`README.md`, `.claude/`, `docs/`, …). Can be added to the same list later if wanted.
- Changing any job, the reusable workflows, or the manual trigger.

## Decisions

- **`paths-ignore` on the `push` trigger** rather than a `paths` allowlist: an allowlist would silently skip builds when new source directories appear; an ignore list fails safe (unknown paths still build).
- **Not a job-level `if:` with a changed-files action**: that still starts a run (visible, queued, billed for the check job) and adds a third-party dependency. Trigger-level filtering means no run is created at all.
- **Glob `openspec/**` and `ai/**`**: covers everything under both directories, including `openspec/changes/archive/`.

## Risks / Trade-offs

- [A code change pushed only together with spec files still builds; a spec-only push never does] → Intended. If a deploy is needed after a spec-only push, use `workflow_dispatch`.
- [GitHub evaluates at most 300 changed files per push for path filters; beyond that the workflow always runs] → Harmless: falls back to building.
- [A branch-protection required check tied to this workflow would stay pending on skipped pushes] → Not applicable; pushes go straight to `master` without required checks.
