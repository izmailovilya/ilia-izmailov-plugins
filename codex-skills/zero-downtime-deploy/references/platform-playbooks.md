# Platform playbooks

Load this **after** the production platform is established, and only the section that applies.

Two rules for using this file. Every number here must be read from the project's actual configuration
before it is used — a playbook that contradicts the live system loses. And only the non-obvious is
written down: generic Docker and nginx knowledge is not repeated here.

## Docker Swarm (`docker stack deploy`)

Swarm has everything needed natively; the failure mode is leaving the defaults in place.

- **`update_config.order` is the whole game.** The default `stop-first` kills the old task before
  starting the new one — on a single-replica service that is guaranteed downtime on every deploy.
  Use `start-first`. It only works if the service can have two tasks alive at once, so a service
  publishing a fixed host port (`mode: host`) must move to an overlay/ingress port or accept the gap.
- **Without a `healthcheck`, `start-first` is a lie.** Swarm considers a task ready the moment the
  container starts, so traffic reaches a process that is still booting. Define `healthcheck` on the
  service (or `HEALTHCHECK` in the image) pointing at readiness — that is what makes rolling updates
  and `failure_action: rollback` mean anything.
- `failure_action: rollback` plus `rollback_config` gives automatic revert to the previous service
  spec — but only fires on a failure Swarm can see, which is why the healthcheck is a prerequisite.
- `update_config.monitor` is how long a new task must stay healthy before the update continues. It is
  the bake window for the rollout; the default is short.
- `docker service rollback <service>` returns to the previous spec — the manual rollback, no config
  edit needed. It reverts the *spec*, not the database.
- `stop_grace_period` must exceed the app's own shutdown budget, and the app's force-exit timer must
  be shorter than the grace period, so the process exits on its own rather than being killed.
- `docker service update --detach` returns immediately — the deploy script has then proven nothing.
  Wait for convergence (`docker service ps`, or poll until the desired count is running and healthy)
  before calling the deploy done. A `sleep` is not convergence.
- Run migrations as a one-shot container from a **migrator image tagged with the same release**, so
  the migration code provably matches the version being deployed, and it runs exactly once rather
  than from every starting replica.

## Single VM: process manager + nginx

- **Two slots on two ports.** nginx upstream points at one; deploy starts the other, waits for
  readiness on its port directly, then repoints and reloads.
- Reload nginx, never restart: reload lets old workers finish their connections.
- After the reload, give the old process a drain window longer than nginx's `keepalive_timeout`
  before stopping it, and have it close idle keep-alive connections.
- A release directory per commit SHA with a `current` symlink makes rollback a symlink swap plus a
  reload — keep the last few directories or the rollback has nowhere to go.
- With systemd, check `KillSignal` and `TimeoutStopSec` against what the app expects; a unit that
  kills at 10s makes a 30s graceful shutdown fiction.

## Docker Compose on a single host

- `docker compose up -d` on a changed image recreates the container — stop-then-start, not a
  zero-downtime replacement, unless something in front holds traffic. Start the new container beside
  the old one, wait for its health, repoint the proxy, then stop the old one.
- Use the image digest or a SHA tag as the production identifier; `latest` makes "which version is
  live" unanswerable and rollback ambiguous.
- Compose healthchecks gate `depends_on` and restarts — they are not the proxy's view of readiness.
  The proxy needs its own check.
- `stop_grace_period` must exceed the app's drain.
- Before trusting a rollback, confirm the previous image still exists on the host or in the registry;
  aggressive pruning is what makes rollbacks fail at the worst moment.

## Managed platforms (Render, Railway, Fly, Cloud Run, ECS, Vercel)

The platform already keeps the old version serving until the new one is healthy. Do not rebuild that.

- **Point the platform's health check at readiness** and confirm a failing new version genuinely
  blocks the switch. Left at its default, many platforms switch anyway.
- Version identity and rollback are the platform's own — release id, revision, task definition.
  Record the current one before deploying and roll back to that exact id.
- Pre-switch smoke tests are only meaningful if the candidate URL runs against the production data
  path. Where it does not, say the smoke test proves the build, not the release.
- Scale-to-zero changes the picture: a cold start is part of the user's latency during a release.

## GitHub Actions as the pipeline

- Concurrency group per environment with `cancel-in-progress: false` on the production job.
- Build once: the deploy job uses the image built and verified earlier in the same run, by digest.
- Secrets from environment secrets or short-lived OIDC — never in the workflow file, never echoed to
  logs, never a build argument that ends up in an image layer.
- Record the previous version id as a job output before the switch, so a rollback job can target it
  explicitly instead of guessing.
- A human confirmation step (`workflow_dispatch` with a typed confirmation, or a required reviewer on
  the production environment) is a cheap and effective gate for a small team.
