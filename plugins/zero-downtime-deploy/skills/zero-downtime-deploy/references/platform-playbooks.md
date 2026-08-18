# Platform playbooks

Load this **after** the production platform is established, and only the section that applies.

These are starting shapes, not verified recipes. Every number here — timeouts, delays — must be read
from the project's actual configuration before it is used. A playbook that contradicts what the live
system does loses; the live system is the truth.

## Single VM: process manager + nginx

The usual case: one or a few app processes behind nginx on the same box.

- **Two slots.** Run the app on two ports (blue and green). nginx upstream points at one; the deploy
  starts the other, waits for readiness on its port directly, then repoints and reloads.
- **`nginx -s reload` / `systemctl reload nginx`, never restart.** Reload starts new workers for new
  connections and lets old workers finish theirs. Restart drops everything in flight.
- **Where the old version dies:** after the reload, give the old process a drain window longer than
  nginx's `keepalive_timeout` before stopping it, and have it close idle keep-alive connections.
- **Version identity:** a release directory named by commit SHA with a `current` symlink is the
  simplest immutable id that also makes rollback a symlink swap plus a reload.
- **Rollback:** repoint at the previous release directory and reload. It works only if the previous
  release directory still exists — keep at least the last few.
- **Capacity:** two slots means two full app footprints and two database pools on one box.

If systemd manages the process, check `KillSignal`, `TimeoutStopSec`, and whether the unit is a
`Type=notify` service — the grace period the app expects and the one systemd grants must match.

## Docker Compose on your own server

- **Start the new container beside the old one** (a second service or a scaled replica), wait for its
  healthcheck, then repoint the proxy, then stop the old one.
- `docker compose up -d` on a changed image recreates the container — that is a stop-then-start, not
  a zero-downtime replacement, unless something in front is holding traffic.
- Use the image **digest** or a SHA tag as the production identifier. `latest` makes rollback
  ambiguous and makes "which version is live" unanswerable.
- Compose healthchecks gate `depends_on` and restarts — they are not the same thing as the proxy's
  view of readiness. The proxy must have its own check.
- `stop_grace_period` must exceed the app's drain; otherwise the container is killed mid-request.
- Rollback: run the previous digest. Confirm the image is still on the host or still in the registry —
  aggressive pruning is what makes rollbacks fail at the worst moment.

## Managed platforms (Render, Railway, Fly, Cloud Run, ECS, Vercel)

The platform already keeps the old version serving until the new one is healthy. Your job is not to
rebuild that.

- **Configure the platform's health check to point at readiness**, and make sure a failing new
  version genuinely blocks the switch. This is the part that is most often left at its default and
  silently switches traffic anyway.
- **Give the platform a real grace period** and handle its termination signal.
- **Version identity and rollback are the platform's own** — a release id, a revision, a task
  definition, a deployment id. Record the current one *before* deploying, and roll back to that exact
  id. Never "the previous item in the list": that list reorders.
- **Pre-switch smoke tests** are only meaningful if the preview/candidate URL runs against the
  production data path. On platforms where it does not, say the smoke test proves the build, not the
  release.
- **Scale to zero** (Cloud Run and similar) changes the picture: a cold start is part of the user's
  latency during a release. Check the minimum-instance setting before claiming no impact.

## GitHub Actions as the pipeline

- **Concurrency** on the production job: a group per environment with `cancel-in-progress: false`, so
  a new push queues behind a deploy that is mid-switch rather than killing it halfway.
- **Environments** for production: separate credentials, and a required reviewer if the user wants a
  human in the loop.
- **Build once.** The job that deploys uses the artifact or image built and verified earlier in the
  same run, addressed by digest. Rebuilding in the deploy job means shipping something that was never
  checked.
- **Secrets** come from repository/environment secrets or short-lived OIDC where the platform
  supports it. Never in the workflow file, never echoed into logs, never passed as a build argument
  that ends up in an image layer.
- **Record** the previous version id as a job output before the switch, so the rollback job can be
  run later with an explicit target rather than a guess.
