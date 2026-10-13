## 1. Dockerfile

- [x] 1.1 Replace `Dockerfile` with `FROM nginx:stable-alpine` / `COPY ./dist /usr/share/nginx/html` / `EXPOSE 80`; verify locally: `npm ci && npm run build` in `node:14`, then `docker build` and `curl` the running container returns 200 with `<title>Overmind`

## 2. Verification

- [x] 2.1 After pushing, `gh run list --workflow=pipeline.yml -L 1` shows the run green (bump, build, docker-build, deploy) and the docker-build job takes well under a minute instead of ~12
  - Run 38398637122 (1c9535a) green: bump 17 s, build 63 s, docker-build **42 s** (was 724 s), deploy 14 s; build step ran with `platforms: linux/amd64`.
