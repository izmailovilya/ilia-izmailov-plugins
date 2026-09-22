# Database migrations during a zero-downtime release

During the release both versions of the code are alive at the same time. The schema has to be
compatible with both — not just with the new one.

## Expand → migrate → contract

1. **Expand.** Add new tables, columns, indexes. Nothing removed, nothing renamed. New columns are
   nullable or have a default.
2. **Release code that works against both shapes** — writes to both if needed, reads the old shape as
   a fallback.
3. **Backfill data separately**, in batches, outside the deploy.
4. **Switch the code to the new shape** in a later release.
5. **Contract** — drop the old columns — in a release *after* that.

Contract is never in the same release as expand. This is the whole point of the pattern, and it is
the part that gets collapsed under time pressure.

## The rollback window

The consequence nobody writes down: **rolling the app back only works if the previous version of the
code still runs against the current schema.**

State it explicitly, once per release, in one sentence: *how many releases back can we go without
breaking on the current schema?*

- After expand only → the window is at least one release. Rollback is a button.
- After contract → the window is zero. Rollback is an incident, and the only way out is forward or a
  restore from backup.

Rolling the application back must never trigger a down-migration automatically. A down-migration that
drops a column destroys the data written since the deploy. If the old code cannot run on the current
schema, the answer is roll-forward, a feature flag, or a manual plan — never an automatic reverse
migration.

## Operations that need a separate plan, never a casual deploy

- `DROP COLUMN`, `DROP TABLE`
- renaming a column or table that is in use (it is two releases: add, dual-write, migrate, drop)
- adding a `NOT NULL` column with no default and no backfill
- changing a column type in a way that rewrites the table
- any long, blocking migration
- an irreversible data transformation

If a safe automatic migration cannot be produced, **stop before the production deploy** and write out
the manual plan. That is a valid, complete outcome for this skill.

## Locks: the migration that took 10 ms on the dev database

On a real table with traffic, the danger is not the migration's own duration — it is the lock queue.
In PostgreSQL, a statement waiting for a lock blocks every query that arrives behind it, and the
table stalls for everyone.

- Set `lock_timeout` and `statement_timeout` on the migration connection, so a migration that cannot
  get its lock fails fast instead of freezing the table.
- Create indexes concurrently where the engine supports it (`CREATE INDEX CONCURRENTLY` in Postgres —
  and know that it cannot run inside a transaction and leaves an invalid index behind if it fails).
- Do not assume "adding an index" is part of the harmless expand phase. It depends on the engine, the
  table size, and the traffic.

## Run migrations exactly once

Migrating on application boot means every instance starts migrating simultaneously during a rolling
release. Some tools lock and it merely serializes; some do not and it corrupts.

Run migrations as one step — from CI or a deploy step — before the new version takes traffic, and
make that step non-concurrent with any other deploy. If the project migrates on boot today, say so in
Phase A; it is a downtime cause in its own right.

## Order relative to the traffic switch

The safe default: schema first (expand only, compatible with the old code), then the new version,
then traffic. A schema change that the currently-running old version cannot tolerate must never land
before the code that needs it.
