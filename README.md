# obzly.com

The public website for [Obzly](https://github.com/obzly/obzly), the self-hosted observability
platform: marketing pages plus the user docs, built with [Astro](https://astro.build) and
[Starlight](https://starlight.astro.build) and served by GitHub Pages at https://obzly.com.

| Path | What |
|---|---|
| `src/pages/` | Marketing pages: `/`, `/features/`, `/architecture/` |
| `src/content/docs/docs/` | Docs, served under `/docs/` (Starlight, with Pagefind search) |
| `src/styles/custom.css` | Brand colours and Jost on Starlight's CSS variables |
| `public/` | `logo.svg`, `favicon.svg` (copied from obzly-dev), `CNAME` |
| `mockup/index.html` | The one-page clickable mockup used for design sign-off |
| `.github/workflows/deploy.yml` | Builds on pull requests, deploys to Pages on `main` |

## Run it

With Docker (nothing else to install):

```bash
docker compose up --build site                # production build, http://localhost:8080
docker compose --profile dev up dev           # hot-reloading dev server, http://localhost:4321
docker compose --profile mockup up mockup     # the sign-off mockup, http://localhost:8081
```

The `site` image builds with the same Node version as CI and serves `dist/` with nginx using
clean URLs and Astro's `404.html`, the same way GitHub Pages serves it.

Or with Node 26 (see `.nvmrc`):

```bash
npm ci
npm run dev       # http://localhost:4321
npm run build     # writes dist/; fails on broken internal links
npm run preview   # serves dist/
```

Search (Pagefind) is built at `npm run build` time, so it works in `site`/`preview`, not in `dev`.

Dependencies are pinned to exact versions; update them deliberately and commit `package-lock.json`.

## Where the docs come from

Every docs page is adapted from files in the product repo (obzly-dev) and names them in a
`Source:` comment under its frontmatter. When those files change, update the page here.

| Docs page | obzly-dev source |
|---|---|
| `docs/index.mdx` | `README.md` |
| `getting-started/quick-install` | `README.md`, `install-obzly.sh` |
| `getting-started/docker-compose` | `README.md`, `deploy/docker/README.md` |
| `getting-started/first-project` | `README.md` |
| `getting-started/send-first-logs` | `README.md`, `docs/configuration.md` |
| `deploy/docker` | `deploy/docker/README.md` |
| `deploy/helm` | `deploy/helm/obzly/README.md` |
| `deploy/kubernetes-eks` | `deploy/kubernetes/eks/README.md`, `deploy/kubernetes/eks/ha/README.md` |
| `deploy/multi-site` | `deploy/README.md`, `deploy/kubernetes/eks/control-plane/README.md`, `ARCHITECTURE.md` (Multi-site) |
| `how-to/kubernetes-otel-collector` | `frontend/src/features/projects/ui/kubernetesOtelConfig.ts`, `deploy/kubernetes/obi/README.md` |
| `how-to/grafana-promql` | `README.md` (Metrics, Attribute names) |
| `how-to/mcp` | `README.md`, `ARCHITECTURE.md` (MCP server, AI observability) |
| `how-to/alerts` | `README.md` (Alerting), `docs/configuration.md` |
| `how-to/sso-scim` | `README.md`, `ARCHITECTURE.md` (Federated SSO, MFA) |
| `how-to/promoted-fields` | `README.md` (Logs) |
| `operations/upgrade` | `docs/runbooks/upgrade.md` |
| `operations/backup-restore` | `docs/runbooks/backup-restore.md` |
| `operations/disaster-recovery` | `docs/runbooks/dr.md` |
| `operations/monitoring` | `deploy/observability/README.md` |
| `reference/configuration` | `docs/configuration.md` |
| `reference/log-query-api` | `backend/internal/features/logs/querying/readme.md` |
| `reference/data-sources` | `frontend/src/features/projects/ui/dataSources/` |

Never copy internal material into this repo: `SECURITY_REVIEW.md`, `ROADMAP.md`,
`docs/ENTERPRISE_SCALE_PLAN.md` or other plans, internal hostnames, or the outdated
`docs/ARCHITECTURE*.png` diagrams (the architecture page draws its own).

## Publishing

1. Create the GitHub repository and push `main`.
2. In the repository's **Settings → Pages**, set **Source** to **GitHub Actions**. The workflow
   then deploys every push to `main`.
3. Set **Custom domain** to `obzly.com` (`public/CNAME` already holds it).

### DNS for obzly.com

Add these records at the DNS host for obzly.com:

| Name | Type | Value |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153` |
| `@` | AAAA | `2606:50c0:8001::153` |
| `@` | AAAA | `2606:50c0:8002::153` |
| `@` | AAAA | `2606:50c0:8003::153` |
| `www` | CNAME | `obzly.github.io` |

Once the DNS check in **Settings → Pages** passes and the certificate is issued, turn on
**Enforce HTTPS**.

## License

[Apache 2.0](LICENSE), like Obzly itself.
