# Workers, queues, cron, and everything that outlives the process

The HTTP path is the easy half. Most of what actually breaks during a release lives outside it.

## Queues: compatibility runs in both directions

The schema rule applies to message payloads too, and in both directions:

- During the release, the **old** worker receives messages produced by the **new** version.
- After a rollback, the **old** worker inherits a backlog written by the new version.

So the order is fixed: **teach the consumer to read the new format first, in one release; start
producing the new format in a later one.** Deleting the old parser is a third release, after the
backlog has drained.

Also check:

- **Ack / visibility timeout** must be longer than a worker restart, or a job in flight gets
  redelivered and runs twice mid-deploy.
- **Idempotency.** A job that can run twice must be safe to run twice — an idempotency key, or a
  check before the side effect. Without it, "at least once" delivery plus a rolling restart equals
  duplicate charges or duplicate emails.
- **Retry and dead-letter behaviour** during the switch: a burst of failures caused by the deploy
  itself should not exhaust retries and dump good jobs into the DLQ.

## Cron and scheduled jobs

Two versions alive at once means the schedule fires in both. A daily billing job that runs twice is
worse than a deploy that takes 30 seconds.

Mechanisms that actually work, in order of preference:

1. Run scheduled jobs from one place only — a platform scheduler, or one designated instance.
2. A lock around the job with a TTL and a token (advisory lock, Redis lock with an owner id), so a
   crashed holder cannot block the job forever and a stale holder cannot resume as if it still owned
   it.
3. Disable cron on the version being retired as the first step of its shutdown.

"Ensure jobs are idempotent or use locking" without naming which one is an empty instruction — pick
the mechanism and write it down.

## Order of rollout: backend, then frontend

- **Backend first, and it must keep serving the old frontend.** Only additive API changes in a
  release; removing a field or an endpoint waits for the release after the clients stopped using it.
- **Frontend second.** A new frontend against an old API means calls to endpoints that do not exist.
- During any rolling release the same user's first request may hit the new version and the second the
  old one. The API contract must tolerate that, not just "eventually converge".

## Client bundles: the empty screen nobody attributes to the deploy

A person has the page open. It was served by the old build. They click, the app lazy-loads a chunk —
and it is 404, because the deploy replaced the assets.

- Keep the assets of the previous builds for at least a day; publish new immutable assets *before*
  the HTML that references them.
- Catch chunk-load failures in the client and offer a reload instead of a blank screen.
- Mind the HTML cache TTL and any service worker: they decide how long old clients linger.
- A smoke test that only fetches the main route proves nothing here — it must confirm the referenced
  JS and CSS actually resolve.

## Sessions, caches, local disk

- **Sessions in process memory make zero downtime impossible** — every release logs users out. Find
  this in Phase A and say it out loud. Do not fix it by introducing Redis unless the user asked; it
  is a fork for them to decide.
- **Shared cache between versions.** If the new version writes a different shape under the same key,
  the *old* version starts failing to deserialize — the deploy breaks the version that was working.
  Rule: change the shape, change the key prefix. Never the value alone under the same key.
- **Signing and encryption keys** must be shared by both versions during the overlap, or every
  cookie, token, and signed URL issued by one is rejected by the other.
- **Files on local disk** (uploads, generated exports) do not follow the app to a new container or a
  second slot. If the app writes to local disk, that is a constraint on the strategy, not a detail.

## Config and environment variables

A config change shipped in the same release as code that requires it is a classic outage: the config
lands, the old instances read it, and they were never built for it. Treat runtime config like the
schema — additive first, and compatible with both versions during the overlap.
