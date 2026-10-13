## Context

`pipeline.yml`: bump -> build (`npm-build-workflow`: `npm ci`, `npm run build`, writes
`dist/version.js`, uploads `dist` as `build-artifacts`) -> docker-build (`docker-build-workflow`:
downloads `build-artifacts` into `./dist`, `docker buildx build`) -> deploy. The old Dockerfile
ignored that `dist/` and rebuilt from source.

## Decisions

### D1 -- Package the artifact, do not rebuild

Copy `./dist` into `nginx:stable-alpine`. One build per pipeline run, from the lockfile, and the
image no longer depends on native toolchains or on QEMU for an arm64 `npm install`.

*Alternative:* keep the builder stage with BuildKit cache mounts -- still a second build, still
slow under emulation, and still a different dependency resolution than the `build` job.

## Risks / Trade-offs

- If the `build-artifacts` download failed, `docker-build-workflow` continues
  (`continue-on-error`) and `COPY ./dist` fails the build loudly -- nothing broken is deployed.
