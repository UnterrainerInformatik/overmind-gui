## Why

The image build is by far the slowest part of the pipeline: 697 s of a ~14 min run on
2026-10-02 (run 37024348601), against 25-50 s for the other nginx frontends. The Dockerfile
builds the app a second time in a `node:14.15.0-alpine` stage (`apk add python3 make g++`,
`npm install`, `npm run build`), for amd64 and, emulated with QEMU, for arm64 -- although the
`build` job (`npm-build-workflow`) has already built `dist/` with `npm ci` and
`docker-build-workflow` downloads it as the `build-artifacts` artifact into `./dist`.

## What Changes

- `Dockerfile` becomes `FROM nginx:stable-alpine`, `COPY ./dist /usr/share/nginx/html`,
  `EXPOSE 80` -- the same pattern as homepage and js-cms-gui.
- The image now ships exactly what the `build` job built from the lockfile (including
  `dist/version.js`), instead of a second, `npm install`-resolved build.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. CI/packaging only, no product behaviour; the change sets `skip_specs: true`.

## Impact

- `Dockerfile` only. The served files and the nginx configuration (image default) are unchanged.
- A local `docker build` now needs a built `dist/` first (`npm run build`).
- Together with `docker-build-workflow` 4d83833 (default `platforms: linux/amd64`) the image is
  amd64 only; overmind-gui does not run on ARM.

## Non-goals

- No Node upgrade (stays on 14), no nginx configuration of its own.
