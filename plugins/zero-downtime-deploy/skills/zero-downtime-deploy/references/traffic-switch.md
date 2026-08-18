# Readiness, draining, and shutdown

This is where "we did zero downtime" and "there are still 502s in the log during releases" part ways.

## Readiness

Readiness answers one question: **can this process serve a request right now?** Code loaded, port
open, pools warm, migrations it needs already applied.

**Do not put dependencies shared by every instance into readiness.** If readiness pings the shared
database and the database blinks for three seconds, every instance reports not-ready at the same
moment, the balancer removes the entire fleet, and a brief degradation becomes a total outage.
Check shared dependencies at startup, or in a separate deep-health endpoint that nothing routes on.

Liveness is a different thing: "the process is wedged, restarting will fix it". Add it only when the
platform genuinely restarts on it and there is a detectable state that a restart actually cures. A
careless liveness probe produces restart storms — it is not free, and it is not required for zero
downtime.

The health endpoint must be reachable by whatever checks it: not behind authentication, not behind
the rate limiter, not behind a redirect. A balancer that gets 401 or 429 will remove a healthy
instance. And it returns nothing sensitive — no secrets, no config dump, no stack traces; a status
and, at most, a version id.

## The old version does not stop receiving requests because you sent it a signal

Removing an instance from the upstream is not instantaneous, and it does not close connections that
are already open. Two separate races:

1. **Propagation.** The balancer keeps sending for some seconds after deregistration — ALB
   deregistration delay, Kubernetes endpoint propagation, an nginx reload that has not finished.
2. **Keep-alive.** Connections already established stay open and carry *new* requests into a process
   that is shutting down.

So: readiness must start failing **before** the process starts shutting down, with a pause long
enough for the proxy to notice — at least two of its health-check intervals — and the server must
close idle keep-alive connections during the drain (send `Connection: close`).

Three numbers must line up. Get them from the actual configs, not from memory:

| Number | Rule |
|---|---|
| Proxy / balancer idle keep-alive timeout | Must be **shorter** than the app's own keep-alive timeout, or the proxy will reuse a connection the app just closed — the classic intermittent 502 |
| Deregistration / propagation delay | The drain must be longer than this |
| Termination grace period | Longer than propagation + the longest normal request |

If the process is killed before the grace period expires, none of the above matters — check what the
platform's timeout actually is, not what the config file wishes it were.

**Until you can show that the balancer stopped sending new requests to the old process, the shutdown
is not graceful.** "We sent SIGTERM" is not evidence.

## Shutdown order

1. Fail readiness; keep serving.
2. Wait for the proxy to actually stop sending (propagation delay), closing idle keep-alive
   connections as they fall idle.
3. Stop accepting new connections.
4. Stop accepting new background jobs.
5. Let in-flight HTTP requests finish, up to a drain timeout longer than the longest normal request.
6. Let in-flight jobs finish or return them safely to the queue.
7. **Then** close the database pool — after the requests, never before; a pool closed early turns
   finishing requests into errors and can leave a transaction half-applied.
8. Exit.

Handle the termination signal the platform actually sends, and make the process exit on its own
before the platform's hard kill.

## Long-lived connections

- **WebSocket / SSE:** they will not drain on their own. Either the client reconnects (make sure it
  does, with backoff) or the server closes them deliberately at the start of the drain with a code
  the client understands as "reconnect". Otherwise the grace period expires and everyone is cut at
  once.
- **Long requests (uploads, exports, streaming responses):** the drain timeout must exceed them, or
  they are collateral on every release. If they can run for minutes, that is a design fact to state
  in Phase A, not something to paper over.
- **Multi-step flows** (a wizard, a paginated job): step one may land on the old version, step two on
  the new. That is only safe if both versions accept the same intermediate state.

## In-flight database work

- Close the pool last (see above).
- Two versions alive at once means two pools: check the connection limit.
- A transaction interrupted by a kill rolls back — fine if the operation is idempotent and retried,
  not fine if it was a multi-statement side-effect the caller assumes completed.
