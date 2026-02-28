# Risk Testing Example: Parallel API Parsing (Poizon)

> This is a real-world example of how pre-implementation risk analysis catches bugs that post-implementation review would miss.

## Feature

"Add parallel workers to speed up parsing 5.5M products from Poizon API (currently sequential, ~8 hours)."

## Tech Lead Identified 4 Risks

```
RISK-1: Rate limit stricter than documented 3 QPS
  Severity: CRITICAL
  Affected tasks: #1 (parallel worker implementation)
  Verify: Send requests at 1, 2, 3, 4, 5 QPS — find where errors start

RISK-2: IP/token ban from too many requests
  Severity: CRITICAL
  Affected tasks: ALL
  Verify: Monitor response codes during rate limit test, check if access breaks after

RISK-3: Parallel cursors lose or duplicate data (startId works differently than expected)
  Severity: CRITICAL
  Affected tasks: #1 (worker), #2 (cursor splitting)
  Verify: Download 2000 items sequentially (ground truth), then same range with 2 and 4
  parallel workers — compare ID sets, must be identical

RISK-4: API returns inconsistent data for same cursor under load
  Severity: MAJOR
  Affected tasks: #1 (worker)
  Verify: Same startId requested multiple times — results must match
```

## Risk Tester Spawns

Lead spawned 3 risk testers in parallel (RISK-2 combined with RISK-1):

**Tester 1 (rate limit + ban):** Wrote test script with incremental load 1→2→3→4→5 QPS.
**Tester 2 (data correctness):** Wrote ground truth comparison — sequential vs parallel.
**Tester 3 (consistency):** Same startId requested 5x concurrently.

## Results

```
Risk Tester 1 (rate limit + ban):
  Method: Incremental load 1→2→3→4→5 QPS, 10 seconds each level
  RESULT: 4 QPS works clean, 5 QPS triggers error code 30300016 (rate limit)
  Ban check: No bans — API returns error code, not connection block
  → Verdict: CONFIRMED — real limit is 4 QPS, not documented 3
  → Mitigation: use 3 workers (safe margin below 4 QPS limit)

Risk Tester 2 (data correctness):
  Method: Ground truth comparison — sequential vs parallel download of 2000 items
  FIRST RUN: Data mismatched! Cursor was cycling between two values.
  INVESTIGATION: Production code uses `spu_list[-1].get('id')` for cursor,
    but test used `dwSpuId` — WRONG FIELD. 'id' is the pagination cursor,
    'dwSpuId' is the product article number.
  FIXED RUN: 2000 sequential = 2000 parallel (2 workers) = 2000 parallel (4 workers)
  Zero lost, zero duplicated.
  → Verdict: CONFIRMED — cursor field choice is critical, wrong field causes silent data loss
  → Mitigation: acceptance criteria must specify: cursor = item['id'], NOT item['dwSpuId']

Risk Tester 3 (consistency):
  Same startId requested 5x concurrently
  → Verdict: THEORETICAL — responses identical every time, API is deterministic
```

## Impact

Tech Lead updated tasks:
- Task #1: added "cursor MUST use `id` field, not `dwSpuId`"
- Task #1: added "max 3 parallel workers (rate limit at 4 QPS)"
- Task #2: marked high-risk (cursor splitting — extra review)
- Created Task #4: "Add rate limit monitoring — log and alert if 30300016 errors appear"
- DECISIONS.md: documented rate limit finding and cursor field requirement

## Why This Matters

The cursor bug (Risk-3) would have **silently lost data in production** — the code reads logically (`dwSpuId` seems like a valid ID), but only empirical testing against ground truth revealed the problem. A post-implementation reviewer would likely NOT catch this. Risk analysis caught it before a single line of production code was written.

## Risk Analysis vs Review

| Risk Analysis (BEFORE code) | Review (AFTER code) |
|------------------------------|---------------------|
| "This endpoint will break the mobile app" | "This endpoint has a typo in the response" |
| "The migration will delete user data" | "The migration has a syntax error" |
| "Auth middleware won't cover new routes" | "Auth check is missing on line 42" |
| "Two tasks will create conflicting DB columns" | "This column name doesn't match convention" |
