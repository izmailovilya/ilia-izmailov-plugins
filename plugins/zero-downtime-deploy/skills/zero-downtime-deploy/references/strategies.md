# Choosing how traffic switches

There is no menu to pick from. There is one decisive question and a small number of consequences.

## The decisive question

**Is there something in front of the app that can move traffic between two versions without dropping
open connections — and is there room to run both versions at once?**

| Answer | What that means |
|---|---|
| Yes, and the platform does the switching itself (managed PaaS, container platform with rolling updates) | Use its native mechanism. Do not build a second switch beside it. Your work is readiness, draining, migrations, and a rollback you can prove. |
| Yes, there is a proxy or balancer you control, and the host can hold two versions | Two slots behind the proxy: start the new one, prove it, repoint, drain the old one. |
| There is a proxy, but the host cannot hold two versions at once | Either free capacity first, or accept a short planned restart. Say which, in Phase A. |
| Nothing in front of the app — the process owns the public port | Zero downtime is not reachable without adding something in front. That is a real change: name it as a fork for the user, don't do it silently. |

Canary only if the platform already supports it and the user actually needs it. Otherwise it is extra
machinery with no payoff.

## The invariants — these hold on every platform

Keep these; the concrete steps differ per platform and live in `platform-playbooks.md`.

- The new version receives no production traffic until readiness passes.
- The old version is not stopped until traffic has moved off it *and* drained.
- The production version is identified by an immutable id — commit SHA, image digest, release id.
  Never `latest` alone.
- One production deploy at a time. A new push must not interrupt a deploy that is mid-switch.
- The identifier of the currently stable version is recorded *before* the deploy starts, and it is a
  real reference — never "the previous entry in the list of deployments", which reorders and lies.
- The artifact that was verified is the artifact that ships. Rebuilding between environments means
  something else shipped than what passed the checks.

That last one is the right default, not a law of nature: when configuration is baked in at build time
(`NEXT_PUBLIC_*`, `import.meta.env`, compiled asset URLs), one artifact physically cannot serve two
environments. In that case do not pretend to promote a single artifact — say the build is
per-environment, and keep source and toolchain provably identical instead.

## Capacity check before committing to two slots

Two versions alive at once means, briefly, double the footprint:

- memory and CPU headroom on the host
- a free port or a second container slot
- database connections: two versions × pool size must stay under the server limit
- any per-instance lock or single-writer constraint

If any of these fails, the strategy is wrong for this project. Better an honest planned restart than
a blue-green that runs the database out of connections mid-switch.

## Concurrency: one deploy at a time

A CI-level concurrency lock protects the CI workflow only. It does not protect against a manual
deploy, a platform-console deploy, or a migration run by hand at the same moment. Where the platform
allows it, lock the production *environment*, not just the job — and make the deploy idempotent, so a
retry of the same version is a no-op rather than a second switch.

On GitHub Actions, the semantics matter: `cancel-in-progress: false` for the production job, so a new
push queues behind a deploy that is already switching traffic instead of killing it halfway.
