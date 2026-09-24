## 1. Workflow trigger

- [x] 1.1 Add `paths-ignore: ['openspec/**', 'ai/**']` under `on.push` in `.github/workflows/pipeline.yml`, keep `branches: ['master']` and `workflow_dispatch` unchanged; verify the file parses as YAML and `on.push` holds both `branches` and `paths-ignore`

## 2. Verification

- [ ] 2.1 After pushing, confirm with `gh run list --workflow=pipeline.yml` that the push containing the workflow change itself started a run (it touches `.github/`), and that a later push touching only `openspec/` or `ai/` did not
