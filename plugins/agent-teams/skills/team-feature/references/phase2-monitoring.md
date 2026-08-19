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
