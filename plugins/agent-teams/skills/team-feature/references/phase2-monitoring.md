# Phase 2: Execution — Monitor Mode (Detailed Protocol)

## Lead's Role: Coordinate Minimally, Narrate Continuously

Coders communicate directly with reviewers/architects and tech-lead/primary-architect via SendMessage. Lead handles progress tracking and exceptional events — and **prints a live feed line for every meaningful event** (📢 column below). This is the user's only window into the work; without it Phase 2 is a black box.

Feed rules: user's language, product terms, one entry per event, always include the progress counter `{done}/{total}` on task events. See "Progress Feed" in SKILL.md.

## Event Handling

| Event from team member | Action | 📢 Print to chat |
|------------------------|--------|------------------|
| Coder: `IN_REVIEW: task #N` | Update state.md (mark IN_REVIEW). | `🔎 Task #N in review: {short title}` |
| Coder: `DONE: task #N` (any variant) | Update state.md (mark completed). If unassigned tasks remain AND active coders < max, spawn new coder with team roster. If coder claimed next task — no spawn needed. | Task-done digest — see "Task-Done Digest" below. |
| Coder: `DONE: task #N. ALL MY TASKS COMPLETE` | Update state.md. Check if ALL coding tasks done → **change Phase in state.md to VERIFICATION and follow Phase 3 Instructions in state.md step by step.** If unassigned remain, spawn new coder. | Task-done digest. If transitioning: `🏁 All {N} tasks done — moving to verification.` |
| Coder: `QUESTION: task #N. [question]` | Answer from Phase 1 context if possible. If not — dispatch a researcher (Explore or general-purpose with WebSearch), then SendMessage the answer to coder. | Only if a researcher was dispatched: `🔍 Task #N raised a question ({what, in product terms}) — researching.` Answered-from-context questions are noise, don't print. |
| Coder: `STUCK: task #N` | First, try to answer from Phase 1 context. Only dispatch a researcher if the problem requires reading code not yet seen. Then: adjust the task, split it, or reassign to a different coder. | `⏸️ Task #N stuck: {problem in product terms} — {what Lead is doing about it}` |
| Coder: `LEGACY_FOUND: task #N` | Note it (entries are in LEGACY_REPORT.md; handled in Phase 3). | `🧹 Task #N left old code behind ({N} item(s)) — I'll ask you what to do with it at the end.` |
| Coder: `REVIEW_LOOP: task #N` | MEDIUM: forward to tech-lead. SIMPLE and COMPLEX: **you rule on it yourself** — ask both sides for their position in three lines each (you do not need to read the code to see which one matches the plan), decide, and write it to DECISIONS.md. If the disagreement is genuinely technical and you lack the knowledge, dispatch a researcher. | `⏸️ Task #N: review going in circles ({topic}) — escalated to {tech lead / primary architect} for a ruling.` |
| Tech Lead: `DECISION: [one-liner]` (MEDIUM only) | No action — decision is already logged in DECISIONS.md by its author. On SIMPLE/COMPLEX you write these yourself. | `📋 Decision: {the one-liner, in product terms — what was decided and why}` |
| Proxy teammate: `ENGINE RUNNING: {role} on {engine}, started {HH:MM}` + output path | Record the start time and output path in state.md. No other action. | `⚙️ {role} работает на {engine}, запущен в {HH:MM}.` |
| Proxy teammate: `ENGINE_DOWN: {role}. {reason}` | Apply `fallback` from the engine config (default `claude`): spawn the normal Claude teammate under the **same name**, then SendMessage affected coders: "ROSTER UPDATE: {role} is back — re-send any pending REVIEW request." If `fallback: "fail"`, stop the run and report. | `⚙️ {engine} отвалился на роли «{role}» ({reason}) — переключил на Claude, работа продолжается.` |
| Unified reviewer: `ESCALATE TO MEDIUM` | Spawn 3 specialized reviewers (security, logic, quality) + tech-lead. SendMessage to coder: "ROSTER UPDATE: your reviewers are now security-reviewer, logic-reviewer, quality-reviewer. Your architectural gate is now tech-lead. Cancel pending unified-reviewer wait and re-send REVIEW to new roster." Shut down unified-reviewer. | `⚖️ Task turned out riskier than expected ({reason}) — strengthening the team: 3 specialized reviewers + tech lead.` |

## Task-Done Digest

Coders' DONE messages carry a SUMMARY / REVIEW / EDGE CASES block (see coder.md Step 9). Print it as a compact digest:

```
✅ {done}/{total} done: {what now works, product language} ({N} review round(s))
   Review caught: {notable findings — only behavior/security-level, in product terms}
   Edge cases: {handled edge cases}
```

- Omit the "Review caught" line if there were no notable findings, and "Edge cases" if none — a clean task is a single ✅ line.
- If a coder's DONE arrives without the digest block (older format), print the single ✅ line from the task title — don't chase the coder for details.

## Noise Filter — What NOT to Print

The "Signal over noise" rules in SKILL.md apply. In addition: **never repeat anything already printed** — a decision that was already fed goes out once.

## What Lead Does NOT Do

Full list in SKILL.md and state.md — in short: no reading or reviewing code, no running checks, no forwarding messages (teammates communicate directly).

## State File Updates

After every event, update `.claude/teams/{team-name}/state.md`:
- Task status: UNASSIGNED → IN_PROGRESS(coder-N) → IN_REVIEW(coder-N) → COMPLETED
- Coder spawns/shutdowns
- Reviewer escalations

## Compaction Recovery

If context feels incomplete or current state is unclear: read `.claude/teams/{team-name}/state.md` — it is self-describing (the **Phase** field tells which phase instructions to follow step by step; roster, task statuses, and exact commands are all there). Honor its `## Engines` section for later spawns — do NOT re-read `~/.claude/agent-teams.json` and do NOT re-probe the CLIs; if the section is absent, every role is Claude.

## When a Teammate Goes Quiet — Bounded Wait

A proxy that finishes its engine run and then stalls is the observed failure mode, seen twice. In
the worst case Lead waited **two hours**, then committed the coder's work itself — breaking its own
rule about never touching code, and paying for it in the most expensive context in the team.

**For a healthy task this section costs nothing.** The coder's DONE wakes you; you never check. What
follows runs only on suspicion.

**Never poll on a timer.** Do not schedule wakeups to ask "is it done yet" — each one is a full turn
at your context size, and in a real run forty of them bought nothing. You are woken by messages;
suspicion is what a check needs, not a clock.

### The check (one Bash call, at most three times, ≥15 minutes apart)

```bash
tail -3 .claude/teams/{team}/ledger.jsonl
ps -eo pid,etime,command | grep -E 'codex (exec|resume)|grok|kimi' | grep -v grep
```

Read the two together:

| Ledger tail | Engine process | Verdict |
|-------------|----------------|---------|
| `launch`, nothing since | alive | **Working.** Engine runs vary from minutes to over an hour. Wait. |
| `launch`, nothing since | gone | Engine died without the proxy noticing → treat as dead proxy |
| `engine_done` / `checks_done`, nothing since ≥15 min | gone | **Dead proxy.** The work exists, the reporter does not |
| `committed` but no DONE message | gone | Work is finished — just the message was lost. Mark the task complete and move on |

### When the verdict is "dead proxy"

**Do not read the code and do not commit anything yourself.** Instead:

1. `TaskStop` the silent teammate. Confirm it stopped.
2. Spawn a **fresh coder** under a new name with a finishing brief:
   ```
   The engine already did the implementation for task {id}. Its report:
   .claude/teams/{team}/engine/{role}/{NNN}.out.md — read it.
   Files it was allowed to touch: {list}.
   Your job is the tail only: verify with `git status` that nothing outside that list changed,
   run the self-checks, fix what fails by resuming the engine session {session id} — not by hand —
   and commit. Do not redo the implementation.
   ```
3. 📢 `⏸️ Кодер по задаче {id} перестал отвечать. Работа движка цела — поднял свежего кодера доделать проверки и коммит.`

A fresh finisher starts near 90k and does a handful of turns. That is strictly cheaper than you
reading the diff at 380k, and it keeps you out of the code.

## Rotating Reviewers

Reviewers live for the whole run, so they accumulate every review of every task — the same disease
the architects had. Measured on a real run: three reviewers took **55%** of the whole run, and the
heaviest one reached a 346k context and cost more than all eleven coders combined.

**Rotate one reviewer every 3 completed tasks, round-robin.** Never all three at once — that drops
all continuity at the same moment. Rotation happens at a task boundary, never mid-review.

When the counter comes up for reviewer X:

1. SendMessage to X:
   ```
   ROTATION. Write a standing-findings note to
   .claude/teams/{team-name}/reports/standing-{your-role}-{n}.md — at most 15 lines:
   - issues you saw repeat across more than one task
   - decisions already settled, so your successor does not reopen them
   - what deserves extra suspicion in the remaining tasks
   Do NOT summarise your individual reviews — they are all in reports/. Then send DONE and stop.
   ```
2. Wait for DONE, then shut X down.
3. Spawn a fresh reviewer under **the same name** (so coders' rosters stay valid), with the normal
   Step 5 prompt plus:
   ```
   --- STANDING FINDINGS FROM YOUR PREDECESSOR ---
   {contents of reports/standing-{role}-*.md — all of them, 15 lines each}
   --- END ---
   ```
4. 📢 `🔄 {Ревьюер X} сменился — новый принял смену, накопленные наблюдения переданы.`

The successor starts near 100k instead of 350k. What is lost is the memory of individual past
reviews; what mattered — the cross-task patterns — is in the note, and every review itself is in
`reports/`.

**Do not rotate on a timer or on turn count.** Task boundaries are the only safe point: no review is
in flight, and no coder is waiting on an answer.

## Spawning New Coders

When a coder reports "DONE" and unassigned tasks remain:
1. Update state.md (mark task completed)
2. If active coders < max AND unassigned tasks exist (if the `coder` role is on an external engine per the `## Engines` section of state.md, spawn `agent-teams:proxy-teammate` with the same name and the coder role brief instead — see `engines.md` Mechanic B):
   ```
   Task(
     subagent_type="agent-teams:coder",
     team_name="feature-<short-name>",
     name="coder-<N>",
     prompt="You are Coder #{N}. Team: feature-<short-name>.

   YOUR TEAM ROSTER:
   {current roster from state.md}

   {If foreign changes were present at Step 5, repeat the FOREIGN CHANGES block here —
    re-run `git status --short` first, since the list may have grown mid-run.}

   --- GOLD STANDARD EXAMPLES ---
   {GOLD STANDARD BLOCK}
   --- END GOLD STANDARDS ---

   Claim your next task from the task list and start working."
   )
   ```
3. Update state.md with new coder

## Stuck Protocol

When things go wrong, handle without involving the user:

| Situation | Action |
|-----------|--------|
| Tech Lead rejects architecture > 2 times (MEDIUM) | Review the disagreement. Only dispatch a web researcher if genuinely lacking domain knowledge. Make the final call, document in DECISIONS.md. |
| Coder escalates "pattern doesn't fit" | MEDIUM: forward to Tech Lead. SIMPLE and COMPLEX: decide yourself — this is a scope question and you own the plan. Check the architect review briefs in `reports/` first, they often already answer it. If unsure, dispatch a web researcher. Document in DECISIONS.md. |
| Build/tests fail after all tasks | Create targeted fix tasks. Only fix what's broken, don't redo completed work. |
| A coder goes idle unexpectedly | **Never conclude an agent is dead from files not changing.** Message delivery between teammates can lag by tens of minutes, and an external engine can work for a long time without touching anything. Ask `STATUS?` and wait for an answer. Only after an explicit no-response — a second unanswered `STATUS?` well past any `ENGINE RUNNING` estimate — shut the coder down, confirm the shutdown, and only then spawn a replacement. **Never run two coders on the same files**; a duplicate destroys the first one's uncommitted work. |
| A proxy teammate has been quiet for a long time | **Never guess from elapsed time — there is no expected duration, engine runs vary from two minutes to over an hour.** Establish the facts instead, in this order: (1) is the engine process alive? `ps -eo pid,etime,command \| grep -E 'codex (exec\|resume)\|grok\|kimi'`; (2) is the output file still growing? compare size and mtime a minute apart; (3) what does the output file already contain? If the process is alive or the file is growing → it is working, wait. If neither → the run has ended: read the output file, then ask the proxy to report. Only if the proxy itself does not answer twice do you shut it down and replace it. |
| Need best practices mid-session | Dispatch a web researcher (general-purpose with WebSearch). Don't research yourself — protect context. |
| Risk analysis reveals a CRITICAL confirmed risk requiring architectural change | Adjust the task list based on Tech Lead's recommendations. If the risk requires a fundamentally different approach — re-plan affected tasks and re-validate with Tech Lead. |
| Risk tester and Tech Lead disagree on risk severity | Tech Lead's judgment takes priority — broader architectural context. Document the disagreement in DECISIONS.md. (Risk analysis happens in Phase 1, while architects are still present on COMPLEX.) |
| Convention violations keep recurring | This is a signal: missing or unclear gold standard. Note it for Phase 3 conventions update. |
