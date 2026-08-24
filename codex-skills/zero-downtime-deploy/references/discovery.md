# Discovery and drift

Phase A answers one question: **how does live traffic reach the process right now, and how will the
new version replace it without cutting the requests in flight?**

Everything below serves that question. Nothing here is a form to fill in.

## The five decisive questions

Answers to these change the strategy. Answers to anything else do not.

1. **Who holds the public port, and can it move traffic between two versions without dropping open
   connections?** nginx, Caddy, a cloud load balancer, the platform's own router, or nothing at all
   (the process is exposed directly — the hardest case).
2. **How many instances of the app run at once, and can the host hold two versions simultaneously?**
   Check spare memory, CPU, free ports, database connection limit, license limits. One instance on a
   box with no headroom means zero downtime is not achievable without changing something the user
   has not agreed to change.
3. **How does the process restart today, and what happens to requests in flight?** In-place restart,
   process manager reload, container replace, platform deploy.
4. **Are there background workers and cron jobs, and do they live with the web process or apart?**
5. **Who applies migrations, and at what moment relative to the traffic switch?** From CI, from a
   deploy script, or on application boot from every instance.

Two more that are cheap to answer and expensive to miss: where sessions live (process memory or a
shared store), and whether a built frontend is served with hashed asset filenames.

## Where to look

Repository side — `infra-scout` covers this:

- CI config (`.github/workflows/`, `.gitlab-ci.yml`), any `deploy*.sh`, `Makefile` deploy targets
- `Dockerfile`, `docker-compose*.yml`, `Procfile`, `fly.toml`, `render.yaml`, `app.json`, `vercel.json`
- process manager files: systemd units, `ecosystem.config.js`, supervisor configs
- proxy config committed in the repo (`nginx/`, `Caddyfile`)
- migration tooling and where it is invoked from
- health routes already in the code
- how secrets reach the app (`.env.example`, CI secret names — never values)

Live side — `live-drift-checker` covers this, read-only:

| Question | Typical read-only command |
|---|---|
| What starts the app | `systemctl status <unit>`, `pm2 list`, `docker ps` |
| Which version is live | platform CLI, deployed image digest, `git rev-parse HEAD` on the server |
| Proxy actually in force | `nginx -T`, the platform's router config |
| Instance count | `docker ps`, `pm2 list`, platform CLI |
| Managed platform state | `fly status`, `render services list`, `gcloud run revisions list`, `aws ecs describe-services` |

Never run anything that writes. If a command needs credentials that are not present, the fact simply
has no live source — say so; never fill the gap with a guess from the repository.

## Drift is a finding, not a nuisance

The repository is intent. The live system is reality. When they disagree, report the disagreement
before any recommendation, and never average them:

> "В репозитории описан деплой через docker compose, на сервере приложение запущено юнитом
> app.service, менялся 2024-11-03. Пока это расходится, любой скрипт деплоя из репозитория трогает
> не то, что работает."

Typical drift worth naming explicitly: a proxy config edited by hand on the server, a systemd unit
with flags no file mentions, a cron job absent from git, an environment variable the running process
has and the repository never mentions, a deployed version that is not any commit on the main branch.

Fixing drift silently is the fastest way to take a working system down. Show it, then ask.

## Re-entry: the skill has run here before

Signs of a previous run: a CI deploy workflow, `deploy.sh` / `rollback.sh`, a health route, a
`DEPLOYMENT.md` written by this skill.

1. Read what the previous run claimed — that is the **declared** state.
2. Compare against the live system — that is the **actual** state.
3. The goal of a re-run is to close `NOT-RUN` items and drift, not to rebuild.

Do not create a second workflow, a second health endpoint, or a parallel deploy script "just in
case". If declared and actual agree and nothing new appeared, say so and propose only the delta:
new workers, new migrations, a new endpoint since last time.

## No access to the live system

This is common and it is fine. What changes is what you may claim:

- Do the repository work and the safe local checks.
- Every conclusion resting only on repository files is collected into one list, "предположения,
  которые я не смог проверить", at the end of the report.
- List the one-time actions the user must perform outside the repository, as commands they can run.
- Never invent a staging environment, and never describe the pipeline as proven in production.

## Picking the strategy — one decisive question

**Is there something in front of the app that can move traffic between two versions without dropping
open connections, and is there room to run both at once?**

| Answer | What that means |
|---|---|
| The platform switches traffic itself (managed PaaS, orchestrator with rolling updates) | Use its native mechanism. Do not build a second switch beside it. Your work is readiness, draining, migrations, and a rollback you can prove. |
| There is a proxy you control and the host can hold two versions | Two slots behind the proxy: start the new one, prove it, repoint, drain the old one. |
| There is a proxy, but no room for two versions | Free capacity first, or accept a short planned restart. Say which, in Phase A. |
| Nothing in front — the process owns the public port | Zero downtime is unreachable without adding something in front. That is a real change: put it to the user as a fork, don't do it silently. |

Canary only when the platform already supports it and the user actually needs it.

### The invariants — true on every platform

- The new version takes no production traffic until readiness passes.
- The old version is not stopped until traffic has moved off it *and* drained.
- The production version has an immutable id — commit SHA, image digest, release id. Never `latest`.
- One production deploy at a time; a new push must not interrupt one that is mid-switch.
- **The deployed version has a durable authoritative record.** For repository-driven desired state,
  this can be a committed file. For managed platforms, use the platform release/revision record and
  persist the exact stable id in the deploy run. Record it *before* the deploy — never infer "the
  previous entry in the list", which can reorder. Git describes intent; the platform record still
  decides what is actually live.
- The artifact that was verified is the artifact that ships.

That last one is the right default, not a law: when configuration is baked in at build time
(`NEXT_PUBLIC_*`, `import.meta.env`, compiled asset URLs), one artifact physically cannot serve two
environments. Then say the build is per-environment and keep source and toolchain provably identical
instead of pretending to promote one artifact.

### Capacity, before committing to two slots

Two versions alive at once means, briefly, double the footprint: memory and CPU headroom, a free port
or container slot, and database connections (two versions × pool size under the server limit). Any
per-instance lock or single-writer constraint breaks the plan outright. Better an honest planned
restart than a blue-green that exhausts the connection pool mid-switch.

### One deploy at a time

A CI-level lock protects the CI job only — not a manual deploy, a console deploy, or a migration run
by hand at the same moment. Lock the production *environment* where the platform allows it, and make
the deploy idempotent so a retry of the same version is a no-op rather than a second switch. On
GitHub Actions use a concurrency group per environment with `cancel-in-progress: false`, so a new
push queues behind a deploy that is already switching traffic instead of killing it halfway.
