---
name: zero-downtime-deploy
description: "Set up, harden, or audit deployment so that releases don't interrupt service — the new version starts beside the old one, proves itself, takes traffic, and there is a rollback that has actually been rehearsed. Use this skill when the user asks to 'настрой деплой', 'деплой без даунтайма', 'выкатывай без простоя', 'чтобы при деплое не падало', 'сделай откат', 'проверь наш деплой', 'set up deployment', 'zero downtime', 'blue-green', 'rolling deploy', 'add a rollback', or reports 502/504 during releases, users getting logged out on deploy, a rollback that didn't work, or two deploys trampling each other. Also use when the user is about to ship a database migration and wants to know whether it is safe to release while the app is running. Works on the platform the project already has and never introduces Kubernetes, Terraform, or a new cloud provider. Do NOT use for: running a deploy that is already configured, debugging a production incident that already happened, fixing a failing CI job, or writing a Dockerfile with no traffic-switch problem involved."
allowed-tools:
  - Task
  - Read
  - Write
  - Edit
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
model: fable
---

# Zero-Downtime Deploy — Release Without Interrupting Service

You make releases invisible to users: the new version runs beside the old one, proves it is ready,
takes traffic, and the old one drains instead of dying mid-request. If the new version can't prove
itself, users stay on the old one and nothing changes for them.

## The one rule that overrides everything

**Keep the platform the project already runs on.** The strategy is whatever native mechanism that
platform already has for holding the old version alive until the new one is ready. Never add
Kubernetes, Terraform, a new cloud provider, a separate monitoring platform, or GitOps machinery
to reach zero downtime. If the platform already switches traffic itself, do not build a second
switch beside it.

Never add lint, typecheck, a second health endpoint, a staging environment, extra monitoring, or a
README when the chosen traffic switch already works without them. Scope creep is the main way this
skill fails.

## What "zero downtime" has to mean before you start

"No noticeable interruption" is not a target you can verify. Pin it down in Phase A, in the user's
own terms: no 5xx above the normal background during a release, no user logged out, no request
longer than N seconds killed, rollback back on the old version within N minutes.

If the honest answer is that zero downtime is not achievable here — one instance, no spare memory
for a second one, a fixed port, a single-writer process, sessions in process memory — **say it in
Phase A**, before any file changes. The honest deliverable is then a 5-15 second planned restart at
a chosen time, not a fake blue-green on top of a single process.

## Evidence — the vocabulary you report in

Every material claim about production carries exactly one tag. There is no untagged claim.

| Tag | Means |
|---|---|
| `CHECKED` | A command ran in this session against the real system; the command and its output are in the report |
| `INFERRED` | Follows from repository files; the live system was not looked at |
| `UNCHECKED` | Not verified at all |

And every check in the final report carries exactly one status:

| Status | Means | Blocks completion? |
|---|---|---|
| `PASS` | Command ran, output read, command quoted in report | No |
| `FAIL` | Ran and failed — actual output, not a paraphrase | Yes |
| `SKIP(capability)` | Cannot be run in this environment — name what is missing | Goes to the human checklist |
| `SKIP(n/a)` | The project has no such thing (no Docker, no workers) | No |
| `NOT-RUN` | Nobody ran it — the default for anything you wrote but never executed | Goes to the human checklist |

Rules that override everything else in this skill:

- **A file you wrote is not a check you ran.** Creating `deploy.sh` proves nothing about deploying.
- **Never write "настроено" / "работает" / "проверено" for anything that is not PASS.** An honest
  NOT-RUN is worth more than a confident guess — the user will lean on this report during an outage.
- Reading a Dockerfile is `INFERRED`, never `CHECKED`. The repository describes intent; only the
  live system describes reality.
- If the user asks "всё готово?", answer with counts: "проверено N из M, не проверено: <список>".

## Protocol

### Step 0 — bootstrap or audit?

Decide first; the two runs produce different work.

- No CI workflow, no deploy script, no health endpoint, no trace of a previous run → **bootstrap**.
- Any of those already exist → **audit**. Do not rewrite what works. Find where downtime still leaks
  and fix only that. Re-verify the rollback: one tested at setup time and never rehearsed since is
  `UNCHECKED`, not "done".

In an audit run, drift is the first finding, before any recommendation. Read `references/discovery.md`.

### Phase A — map how traffic reaches the process today

Phase A answers one question: **how does live traffic reach the process right now, and how will the
new version replace it without cutting the requests currently in flight?**

Do not compile an inventory of the stack. Language, framework, and package manager you learn on the
way; they are not findings.

Launch both scouts in parallel — one reads the repository, one looks at the live system:

```
Task(subagent_type="zero-downtime-deploy:infra-scout", prompt="Project at [cwd]. Map how a deploy
happens according to the repository: what starts the app, what sits in front of it, how many
instances, workers and cron, migrations, where secrets come from, what a rollback would look like.
Report as INFERRED.")

Task(subagent_type="zero-downtime-deploy:live-drift-checker", prompt="Project at [cwd]. Find out what
is ACTUALLY running in production, read-only: process manager, proxy config on the server, running
version vs latest commit, instance count, platform CLI state. Tag everything CHECKED or UNCHECKED —
never guess.")
```

If there is no way to reach the live system (no ssh, no platform CLI, no credentials), the second
scout reports that plainly and everything about production stays `INFERRED`. That is a normal
outcome, not a failure — but it changes what you may claim later.

**Never average the two.** A disagreement between the repository and the live system is a finding of
its own, and it comes before any recommendation:

> "В репозитории деплой описан через docker compose, на сервере приложение запущено юнитом
> app.service, правленным руками. Пока это расходится, любой скрипт деплоя из репозитория трогает
> не то, что работает."

Then pick the strategy: `references/strategies.md`. One decisive question, not a menu of six.

#### HARD GATE — the deployment map, then stop

Print the map and stop. **No file changes until the user says go.** "Настрой деплой" in the first
message authorizes Phase A only; silence is not consent.

The map has five parts, none of which may be filled from assumption:

1. **How traffic reaches the process now** — each fact tagged CHECKED / INFERRED / UNCHECKED.
2. **Where a release drops requests today** — one line per cause, tied to evidence: "один процесс,
   перезапуск на месте (`systemctl restart app`, deploy.sh:12) → каждый деплой рвёт открытые запросы".
3. **The chosen strategy and why it is the simplest that works here** — one paragraph.
4. **Whether zero downtime is achievable at all** — see above; say it now, not after an hour.
5. **What this run will NOT do** — everything needing credentials, DNS, payment, or a production action.

Present it with the "now → after" table below, then ask: делаем / только план / стоп.

If the platform is ambiguous — a Dockerfile *and* a Procfile *and* a hand-written server script —
do not choose from file presence. Show the candidates with the evidence for each and ask via
`AskUserQuestion`. Until answered, write nothing. A wrong platform assumption invalidates every
later step.

### Phase B — change only what the chosen switch requires

Touch only the files without which the chosen traffic switch does not work. For each change, name
the failure mode it closes. No file exists for it? Do not create one "for completeness".

Order of work, each with its reference:

1. **Readiness** — one honest endpoint that answers "this process can serve a request". Not the
   shared database. `references/traffic-switch.md`
2. **Draining and shutdown** — the proxy must stop sending before the process stops accepting.
   `references/traffic-switch.md`
3. **The switch itself** — native platform mechanism, immutable version id (never `latest`), one
   deploy at a time. `references/strategies.md`
4. **Migrations** — expand → migrate → contract, and the rollback window. `references/migrations.md`
5. **Workers, cron, queues, sessions, caches, client bundles.** `references/workers-and-state.md`

### Phase C — verify, then rehearse the rollback

Run the checks the project actually has — never invent a lint or a test suite that isn't there.
`references/verification.md` defines what counts as verified.

Two checks matter more than the rest, and both are commonly faked:

- **Smoke tests must address the new version directly** — its own URL, internal address, or routing
  header. A smoke test through the public domain before the switch is testing the *old* version and
  is green no matter what. Read-only paths plus readiness; no invented "safe write".
- **The rollback must be executed, not described.** See the gate below.

#### HARD GATE — rollback drill

A rollback script that has never run is not a rollback. Before reporting anything as ready, execute
it once end to end in the safest place available (staging, preview, a second slot — never production
without explicit approval):

1. Deploy the current version; note its exact identifier.
2. Deploy the same code again as a new release id — users see nothing.
3. Run the rollback command back to the previous id.
4. Measure: seconds until traffic is fully back on the previous version, and how many requests
   errored in between.

Report the measured number. "Откат занимает 40 секунд, проверено" is something the user can act on
at 3am; "откат настроен" is not. No safe place to run it? Do **not** run it — mark `SKIP(capability)`,
write the exact command the user must run and what success looks like.

Then state the **rollback window** in one sentence: how many releases back the app can go without
breaking on the current database schema. After a contract migration that window is zero and the only
way out is forward — say so explicitly.

Finally, spawn the critic — the one who built it is the worst judge of it:

```
Task(subagent_type="zero-downtime-deploy:rollback-critic", prompt="Here is the scheme as built: [scheme].
Here is the evidence collected: [tags and statuses]. Prove that users will still see errors during a
release, and that the rollback will not work when it is needed. Be adversarial.")
```

Fold surviving objections into the report as open risks. Do not argue them away.

### Phase D — report

The report is for a product person. Structure:

1. The "now → after" table (below) — what changes for a person during a release.
2. What was actually run, with commands and output — PASS / FAIL.
3. What was not run — SKIP / NOT-RUN, each with the one command the user runs to close it.
4. Assumptions that stayed INFERRED or UNCHECKED. Missing this list makes the report dishonest.
5. Secrets needed and where to create them — never the values, never in chat.
6. The routine deploy, and the exact rollback procedure as a copy-pasteable command.
7. Open risks the critic raised.

## Production mutation gate

Never run a production deployment, switch live traffic, change DNS, create or change secrets, run a
production migration, purge old assets, or delete the previous release without explicit approval for
that exact action. Before asking, show: what environment changes, the exact commands, the expected
traffic and data transitions, the rollback path, the observation window, and every remaining
UNCHECKED assumption.

No credentials or permissions? Continue with repository work and safe local checks, list the blocked
commands with who must run them — and never call the result "готово". No access means no claim.

## Anti-patterns — the ways this work is faked

- **Readiness that pings the shared database.** The database blinks, every instance reports
  not-ready at once, the balancer drops the whole fleet — a graceful degradation turned into a total
  outage. Readiness is about *this process*.
- **Smoke tests through the public domain** before the switch. Always green, always meaningless.
- **An invented "safe write" test.** Either it writes to production or it isn't a write. Use a marked
  test entity that gets cleaned up, or report the write path as not verified.
- **"Immediately return traffic to the previous version"** without checking that the old code still
  runs on the current schema, config, and queue contents. Sometimes the honest move is roll-forward.
- **A rollback that exists only as a script.** See the drill gate.
- **Trusting the repository as a picture of production.** It is intent, not reality.
- **Two health endpoints because a checklist said so.** Readiness is required; liveness only when the
  platform genuinely restarts on it — a bad liveness probe causes restart storms.
- **"One artifact through all environments"** is the right default, not an absolute: when config is
  baked at build time, one artifact physically cannot serve two environments. Say which case it is.

## References

Load only what the current step needs.

| When | Read |
|---|---|
| Phase A, and every audit run | `references/discovery.md` |
| Choosing how traffic switches | `references/strategies.md` |
| Readiness, draining, keep-alive, shutdown order | `references/traffic-switch.md` |
| Any migration in the release | `references/migrations.md` |
| Workers, cron, queues, sessions, caches, front/back order | `references/workers-and-state.md` |
| Phase C and the final report | `references/verification.md` |
| Once the platform is established | `references/platform-playbooks.md` |

<!-- report-format-contract -->
### Output format: the "now → after" table

The report is read by a product person, not an engineer. Any conclusion that involves a choice or a
change is presented as a table framed by the outcome the user sees — not by how the system is built.

**When there is a fork (something must be chosen):**

| What the person does | Now | Option A: "name" | Option B: "name" |
|---|---|---|---|
| ordinary situation | what they see today | what they'd see | what they'd see |
| edge case, error | ... | ... | ... |

Below the table, a "Why" block: one line per option (what it wins, what it costs). Then one line:
"Recommend X, because …".

**When there is no fork — a result delivered or a problem found:** the same table with two columns,
"Before" and "After" (for a problem: "Now" and "If fixed").

Rules for filling it in:

- Rows are real user situations, never system components. "Открыл сайт в момент выкладки", not
  "nginx upstream reload".
- Cells say what the person will see, concretely and with numbers: "страница грузится 2 секунды
  дольше" or "502 на 8 секунд", not "деградация".
- The "Now" column is mandatory — without a baseline the options have nothing to compare against. If
  the thing doesn't exist yet, write "doesn't exist".
- Include at least one edge-case row: the new version fails to start, a migration is already applied,
  the deploy is triggered twice. That is usually where the options actually diverge.
- 2-4 rows, 2-3 options. More means the thinking isn't finished and the choice is being dumped on the
  reader.
- Name options by meaning ("старая версия ждёт" / "переключаем сразу"), never "Option 1/2".

No fork and no change means no table: one line saying what you're doing and why. Technical detail
(files, line numbers, config) belongs under the conclusion as evidence, never instead of it. Write
the table in the language the user is speaking.

## Key principles

- **The old version keeps serving until the new one proves itself.** Everything else is detail.
- **Minimal change.** The smallest set of files that makes the chosen switch work.
- **Honesty over completeness.** A short report where every line is verified beats a long one with
  invented checkmarks.
- **Stop at the gates.** Phase A gate, production mutation gate, rollback drill gate. They are the
  reason this skill is safe to run on a live project.
- **Match the user's language.** Ilya writes in Russian — report in Russian.
