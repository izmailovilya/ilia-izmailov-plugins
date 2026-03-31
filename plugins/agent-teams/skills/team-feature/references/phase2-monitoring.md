# Phase 2: Execution — Monitor Mode (Detailed Protocol)

## Lead's Role is MINIMAL

Coders communicate directly with reviewers/architects and tech-lead/primary-architect via SendMessage. Lead only handles progress tracking and exceptional events.

## Event Handling

| Event from team member | Action |
|------------------------|--------|
| Coder: `IN_REVIEW: task #N` | Update state.md (mark IN_REVIEW). No other action needed. |
| Coder: `DONE: task #N` | Update state.md (mark completed). If unassigned tasks remain AND active coders < max, spawn new coder with team roster. |
| Coder: `DONE: task #N, claiming task #M` | Update state.md (mark #N completed, #M in progress by same coder). No spawn needed — coder already claimed next task. |
| Coder: `DONE: task #N. ALL MY TASKS COMPLETE` | Update state.md. Check if ALL coding tasks done → **change Phase in state.md to VERIFICATION and follow Phase 3 Instructions in state.md step by step.** If unassigned remain, spawn new coder. |
| Coder: `QUESTION: task #N. [question]` | Answer from Phase 1 context if possible. If not — dispatch a researcher (Explore or general-purpose with WebSearch), then SendMessage the answer to coder. |
| Coder: `STUCK: task #N` | Dispatch a researcher to investigate. Adjust task description or reassign to different coder. |
| Coder: `REVIEW_LOOP: task #N` | Forward to tech-lead (MEDIUM) or Primary Architect (COMPLEX) — they have code context and authority to arbitrate. For SIMPLE: resolve from context or dispatch researcher. |
| Unified reviewer: `ESCALATE TO MEDIUM` | Spawn 3 specialized reviewers (security, logic, quality) + tech-lead. SendMessage to coder: "ROSTER UPDATE: your reviewers are now security-reviewer, logic-reviewer, quality-reviewer. Your architectural gate is now tech-lead. Cancel pending unified-reviewer wait and re-send REVIEW to new roster." Shut down unified-reviewer. |

## What Lead Does NOT Do

- Do NOT read code files or review code
- Do NOT run smoke tests or convention checks (coders do self-checks)
- Do NOT notify reviewers about completed tasks (coders message them directly)
- Do NOT notify tech-lead about reviews (coders message tech-lead directly)
- Do NOT forward messages between team members (they communicate directly)

## State File Updates

After every event, update `.claude/teams/{team-name}/state.md`:
- Task status: UNASSIGNED → IN_PROGRESS(coder-N) → IN_REVIEW(coder-N) → COMPLETED
- Coder spawns/shutdowns
- Reviewer escalations

## Compaction Recovery

If context feels incomplete or current state is unclear:
1. Read `.claude/teams/{team-name}/state.md`
2. Check the **Phase** field — it tells what to do:
   - `EXECUTION` → follow Phase 2 Instructions (monitor mode)
   - `VERIFICATION` → follow Phase 3 Instructions **step by step** (the literal commands are in state.md)
3. The state file contains EVERYTHING needed — team roster, task statuses, and exact commands to run.

**This is the safety net.** State.md is an executable script, not just a log.

## Spawning New Coders

When a coder reports "DONE" and unassigned tasks remain:
1. Update state.md (mark task completed)
2. If active coders < max AND unassigned tasks exist:
   ```
   Task(
     subagent_type="agent-teams:coder",
     team_name="feature-<short-name>",
     name="coder-<N>",
     prompt="You are Coder #{N}. Team: feature-<short-name>.

   YOUR TEAM ROSTER:
   {current roster from state.md}

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
| Coder reports STUCK | First, try to answer from Phase 1 context. Only dispatch a researcher if the problem requires reading code not yet seen. Then: adjust the task, split it, or assign to a different coder. |
| Coder reports REVIEW_LOOP (3+ review rounds on same task) | Forward to tech-lead (MEDIUM) or Primary Architect (COMPLEX) — they have code context and authority to arbitrate. For SIMPLE: resolve from context or dispatch researcher. |
| Tech Lead / Primary Architect rejects architecture > 2 times | Review the disagreement. Only dispatch a web researcher if genuinely lacking domain knowledge. Make the final call, document in DECISIONS.md. |
| Coder escalates "pattern doesn't fit" | Forward to Tech Lead / Primary Architect for decision. If unsure, dispatch a web researcher for best practices. Document decision in DECISIONS.md. |
| Build/tests fail after all tasks | Create targeted fix tasks. Only fix what's broken, don't redo completed work. |
| A coder goes idle unexpectedly | Send a message asking for status. If no response, shut down and spawn a replacement. |
| Need best practices mid-session | Dispatch a web researcher (general-purpose with WebSearch). Don't research yourself — protect context. |
| Risk analysis reveals a CRITICAL confirmed risk requiring architectural change | Adjust the task list based on Tech Lead's recommendations. If the risk requires a fundamentally different approach — re-plan affected tasks and re-validate with Tech Lead. |
| Risk tester and Tech Lead / Primary Architect disagree on risk severity | Tech Lead / Primary Architect's judgment takes priority — they have broader architectural context. Document the disagreement in DECISIONS.md. |
| Convention violations keep recurring | This is a signal: missing or unclear gold standard. Note it for Phase 3 conventions update. |
