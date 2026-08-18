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

Never run anything that writes. If a command needs credentials that are not present, the answer is
`UNCHECKED` — not a guess.

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
3. The goal of a re-run is to close `UNCHECKED` items and drift, not to rebuild.

Do not create a second workflow, a second health endpoint, or a parallel deploy script "just in
case". If declared and actual agree and nothing new appeared, say so and propose only the delta:
new workers, new migrations, a new endpoint since last time.

## No access to the live system

This is common and it is fine. What changes is what you may claim:

- Do the repository work and the safe local checks.
- Every conclusion resting on an unverified assumption gets tagged and collected into one list,
  "предположения, которые я не смог проверить", at the end of the report.
- List the one-time actions the user must perform outside the repository, as commands they can run.
- Never invent a staging environment, and never describe the pipeline as proven in production.
