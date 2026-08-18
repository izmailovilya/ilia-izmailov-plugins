# What counts as verified

The point of this file: make it impossible to report a deployment as ready when nothing was actually
executed.

## Only real commands

Run the checks the project already has. Do not add a linter, a type checker, or a test suite in order
to have something to run — that is a different job, and it inflates the diff of a deploy change.

Report each as a row: the command, whether it applied, whether it ran, its exit code, its verdict.

| Check | Command found in project | Status |
|---|---|---|
| install from lockfile | … | PASS / FAIL / SKIP(n/a) / SKIP(no access) / NOT-RUN |
| lint | … | … |
| typecheck | … | … |
| tests | … | … |
| production build | … | … |
| container build | … | … |
| CI config syntax | … | … |
| health endpoint locally | … | … |

`SKIP(n/a)` is a good outcome when the project genuinely has no such command. Inventing one is not.

## Smoke tests must address the new version directly

A smoke test that goes through the public domain *before* the switch is talking to the **old**
version. It is green regardless of whether the new version is alive. This is the single easiest way
to ship a broken release with a passing pipeline.

Address the new version by its own URL, its internal address, or a routing header. Then check:

- readiness on the new version
- the main public route — including that the assets it references resolve
- one critical read path
- one critical write path **only** if the project already has a safe way to do it: a marked test
  entity that gets cleaned up, a sandbox tenant, an idempotent endpoint. If it does not, report the
  write path as not verified. Never invent a "safe write".
- the worker starts and picks up a job, if workers are part of the release

Never touch real payments, real emails, or deletions. Bound the retries and set a total timeout — the
pipeline must fail rather than wait forever.

On a managed platform where the pre-switch version is only reachable through a preview URL that
points at a different database, say so: that smoke test does not prove the production path, and
calling it proof is false confidence.

## Measure the switch itself

Everything above proves the new version works. None of it proves the switch was invisible — that is
a separate number, and without it "zero downtime" stays an opinion.

Start a simple probe before the deploy and stop it after, then report what it counted:

```bash
# before triggering the deploy
end=$(( $(date +%s) + 300 ))
ok=0; bad=0
while [ "$(date +%s)" -lt "$end" ]; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://<production-url>/<cheap-route>)
  if [ "$code" = "200" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "$(date +%T) $code"; fi
  sleep 0.2
done
echo "ok=$ok failed=$bad"
```

Report the result as a sentence a person can act on: «во время переключения 1500 запросов, ошибок 0»
or «ошибок 7, все 502 в течение 3 секунд — вот когда». A non-zero count is not a failure of the work;
it is the honest baseline everything after this is measured against.

Where this cannot run (no public route reachable from here, no permission), it is `SKIP(no access)`
with the script handed to the user — never a claim that the switch was clean.

## After the switch: a bake window

Smoke tests catch a version that is dead. They do not catch a version that passes readiness and dies
of memory pressure four minutes later under real traffic.

Keep watching for a defined window (5–15 minutes is a reasonable default) with an explicit abort
condition — error rate above the pre-deploy baseline, latency past a threshold, queue lag growing —
and with the rollback still primed. Compare against the baseline captured *before* the deploy, not
against nothing.

## Partial failure

Releases are not binary. Decide up front what happens when:

- some instances updated and some did not
- the new version is ready on one instance and failing on another
- the migration applied but the rollout did not
- the rollout controller hung
- the rollback itself failed

The default that keeps users safe: stop rolling forward, return the already-updated instances to the
saved stable version, and show a human exactly what changed. Do not flip twice in the same minute —
a rollback issued while the old version is still draining creates a second outage on top of the
first. Pause, then decide.

## The rollback drill

Described in the skill's Phase C gate. What makes the drill real:

- the saved identifier of the stable version still resolves — the image was not pruned, the release
  still exists
- the credentials and permissions to run the rollback are present
- the old version's configuration and secrets are still valid
- the old code still runs on the current schema (the rollback window)
- the command actually moves traffic, and the elapsed time is measured

Anything not exercised is `SKIP(no access)` or `NOT-RUN`, with the exact command written out for the
user. "Кнопка есть, живьём не гоняли" is an acceptable answer. "Откат настроен" is not.

## What each deploy should leave behind

Use the logging and CI history that already exist — do not add a monitoring service for this. Each
deploy leaves: the version id, start and finish time, health check result, smoke test result, the
previous version id, and whether the switch succeeded or a rollback happened. That last pair is what
makes the next rollback possible.

## Shutdown behaviour is testable

Rare, but worth naming: if a release has already bitten you — work lost on a restart, a job that
resumed twice, a record left half-written — that scenario can be covered by an ordinary test that
flips the shutdown flag and asserts what survives. Suggest it only after such a bug has actually
happened; writing shutdown tests preemptively on a project that has never been bitten is exactly the
over-engineering this skill refuses elsewhere.

## The final report

Three lists, always, in this order: **verified** (with commands and output), **not verified** (with
the command the user runs to close each), and **claims that rest only on repository files** and were
never confirmed against the live system. A report without the third list is dishonest, and the third
list being long is not a failure.
