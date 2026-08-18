# zero-downtime-deploy

Set up, harden, or audit deployment so that releases don't interrupt service — and so the rollback is
something that was actually executed, not just written down.

```bash
/plugin install zero-downtime-deploy@ilia-izmailov-plugins
```

## Usage

```
/zero-downtime-deploy                       # set up or audit deploy for the current project
/zero-downtime-deploy "у нас 502 при выкатке"
/zero-downtime-deploy "безопасно ли выкатывать эту миграцию"
```

## What it does

1. **Maps how traffic reaches the process today** — two scouts in parallel: one reads the repository,
   one looks at the live system read-only. Where they disagree, the drift is the first finding.
2. **Stops and shows you the plan** as a "now → after" table. Nothing is changed until you say go.
3. **Changes only what the chosen traffic switch needs** — readiness, draining, the switch itself,
   migrations, workers and state.
4. **Verifies with real commands**, smoke-tests the new version directly (not through the public
   domain, which would test the old one), and rehearses the rollback with a measured time.
5. **Sends an adversarial critic** over the finished scheme to find where users would still see
   errors and where the rollback would fail.
6. **Reports in three lists**: what was verified, what was not, and which assumptions were never
   checked.

## What it will not do

- Move you to Kubernetes, Terraform, or a new cloud provider. It uses the platform you already have.
- Run a production deploy, change DNS, or touch secrets without explicit approval for that exact
  action.
- Report anything as "работает" that was not actually executed. A file it wrote is not a check it ran.
- Add lint, tests, a staging environment, or monitoring that the chosen traffic switch doesn't need.

## Honest by construction

Every production fact is tagged `CHECKED` (a command ran, output included), `INFERRED` (from
repository files only) or `UNCHECKED`. Every check is `PASS`, `FAIL`, `SKIP` or `NOT-RUN`. A rollback
that was never executed is reported as such — because the report is what you will lean on at 3am.

## Structure

```
skills/zero-downtime-deploy/
  SKILL.md                      protocol, gates, evidence vocabulary, report contract
  references/
    discovery.md                the five decisive questions, drift, re-entry, no access
    strategies.md               one decisive question, invariants, capacity, concurrency
    traffic-switch.md           readiness, keep-alive, draining, shutdown order
    migrations.md               expand → migrate → contract, rollback window, locks
    workers-and-state.md        queues, cron, sessions, caches, bundles, front/back order
    verification.md             what counts as verified, smoke tests, bake window, drill
    platform-playbooks.md       VM+nginx, Docker Compose, managed platforms, GitHub Actions
agents/
  infra-scout.md                repository side, read-only, reports INFERRED
  live-drift-checker.md         live system, strictly read-only, CHECKED or UNCHECKED
  rollback-critic.md            adversarial: proves the rollback won't work
```
