# Phase 3: Completion & Verification — Detailed Protocol

> Print points are marked 📢 — short feed lines in the user's language, product terms. The final reports (verification report, summary, human checks) already exist; the feed makes the *process* between them visible.

When all coding tasks are completed:

## 1. Conventions Update

📢 One line entering Phase 3: `🏁 Code is written. Wrapping up: updating project conventions, then running all checks.`

The conventions task (created in Phase 1 Step 3) should now be unblocked. Assign it to a coder.

The coder receives the task description which tells them exactly what to create/update. The coder collects signals from:

```
A. RECURRING REVIEW ISSUES:
   - Issues reviewers flagged 2+ times across tasks
   → Add to .conventions/gold-standards/ or .conventions/anti-patterns/

B. APPROVED ESCALATIONS:
   - Patterns where Tech Lead approved a deviation from existing gold standards
   → Add new gold standard for the approved pattern

C. NEW PATTERNS INTRODUCED:
   - Patterns this feature introduced that didn't exist before
   → Add to .conventions/gold-standards/

D. RESEARCHER FINDINGS (if .conventions/ didn't exist before):
   - Key patterns researchers identified in the codebase
   → Bootstrap .conventions/ with discovered patterns
```

**This step is NOT optional.** The conventions task is tracked in the task list like any other task. It goes through the same review flow (coder implements → reviewers check → Tech Lead approves → commit).

After the conventions task is done, report what was created/updated in the summary.

## 2. Cross-Task Consistency Check

Ask Tech Lead for a **final cross-task consistency check**.

## 3. Completion Gate

Lead verifies before declaring done:
```
Glob(".conventions/**/*")
```
- If .conventions/ does not exist or was not modified during this session → **STOP. Feature is NOT complete.**
- Go back to step 1 and run the conventions task. If it was never created → create it now and assign to a coder.
- Feature cannot be declared COMPLETE without .conventions/ being created or updated.

## 4. Prepare VERIFICATION_PLAN.md

```
Read(".claude/teams/{team-name}/VERIFICATION_PLAN.md")
— Update file/export paths with actual paths from completed tasks
— Update API endpoints with actual URLs
— Update browser check URLs with actual dev server URLs
— Add any new checks discovered during implementation
```

## 5. Integrated Verification (team is still alive — coders can fix failures)

### 5a. Parse the Verification Plan

Read VERIFICATION_PLAN.md and parse sections by `##` headers:

| Section | Verifier agent |
|---------|---------------|
| `## Build & Types` | ci-verifier |
| `## Tests` | ci-verifier |
| `## Browser Checks` | browser-verifier |
| `## Spec Checks` | spec-verifier |
| `## Human Checks` | reported as-is (no agent) |

- Only process `- [ ]` items (unchecked). Skip `- [x]` items.
- Warn on unknown `##` sections — items will be skipped.
- Record **manifest seed**: item count per section for integrity audit later.

### 5b. Pre-flight Readiness Check

If Browser Checks or API-based Spec Checks exist:
```
Bash: curl -s -o /dev/null -w '%{http_code}' --connect-timeout 3 {base_url}
```
- If ECONNREFUSED or timeout → move browser + API checks to Human Checks with reason: "Dev server not running at {url}"
- Do NOT try to auto-start the server
- Continue with remaining checks (build, types, file-based spec checks)

### 5c. Spawn Verifier Agents in Parallel

📢 Before spawning: `🧪 Verification: {N} automated checks (build, tests, browser, spec).`

Only spawn agents for sections with items. Launch ALL in parallel:

```
Task(subagent_type="agent-teams:ci-verifier",
  prompt="Run these CI checks:
{all items from Build & Types and Tests sections}
Report PASS/FAIL/BROKEN per check with evidence.")

Task(subagent_type="agent-teams:browser-verifier",
  prompt="Verify these browser checks:
{all items from Browser Checks section}
Report per check with evidence. SKIP(capability) if Chrome unavailable, BROKEN if server unreachable.")

Task(subagent_type="agent-teams:spec-verifier",
  prompt="Verify these spec checks:
{all items from Spec Checks section}
Report per check with evidence. UNCLEAR for ambiguous items, BROKEN for environment issues.")
```

**Status taxonomy** (all verifiers use this unified 7-status system):

| Status | Meaning | Blocks? |
|--------|---------|---------|
| PASS | Verified successfully | No |
| FAIL | Code problem found | Yes — fix loop |
| SKIP(capability) | System can't verify (Chrome missing, auth needed) | Yes — human |
| SKIP(n/a) | Doesn't apply to this feature | No |
| UNCLEAR | Ambiguous result | Yes — human |
| DEGRADED | Agent timed out or crashed | Yes — human |
| BROKEN | Environment unreliable (server down, deps missing) | Yes — human |

### 5d. Collect Results + Integrity Audit

- If an agent **times out or crashes** → mark all its items as DEGRADED
- Route special statuses:
  - SKIP(capability) → add to Human Checks with skip reason
  - UNCLEAR → add to Human Checks with verifier's explanation
  - BROKEN → collect separately (environment issue, not code issue)

**Verification Manifest** — compare items sent to agents vs items in their reports:
```
VERIFICATION MANIFEST:
  Items sent to ci-verifier: {N}. Items reported: {M}. Delta: {N-M}
  Items sent to browser-verifier: {N}. Items reported: {M}. Delta: {N-M}
  Items sent to spec-verifier: {N}. Items reported: {M}. Delta: {N-M}

  Total: {total} sent, {total} reported. Status: CONSISTENT / ⚠️ INCONSISTENT
```
If INCONSISTENT → log warning, mark missing items as DEGRADED.

### 5e. Fix-Verify Loop (team is still alive!)

📢 When results are collected (5d), print the outcome in product terms — failures named as user-visible problems, not check IDs:

```
🧪 Results: 12 of 14 ✅. Two problems: the save button does nothing on an empty form; the migration test fails.
```

(If everything passed: `🧪 All {N} checks passed ✅.`)

If there are **FAIL** items:
1. Create targeted fix tasks for coders based on failure evidence
2. Wait for coders to fix and commit
3. Re-run ONLY the failed checks (spawn fresh verifiers for failed items only)
4. **Hard cap: 3 iterations max.** Tag each iteration: "Verification run {N}/3: fixing {list}"
   📢 Per iteration: `🔨 Fix iteration {N}/3: {what's being fixed, product terms}` and, after re-verify: `🧪 Re-check: {result}`
5. After 3 attempts → mark remaining FAILs as unresolved, add to Human Checks with full retry trace

If there are **BROKEN** items: do NOT retry — these are environment issues. Add to Human Checks with action "fix environment".

### 5f. Compile Progressive Verification Report

```
══════════════════════════════════════════════════
VERIFICATION REPORT
══════════════════════════════════════════════════

## Level 0: One-line status
{STATUS} — {N}/{total} passed, {N} failed, {N} human checks, {N} broken
{STATUS: ALL_PASS | PASS_WITH_CAVEATS | HAS_FAILURES | ENVIRONMENT_BROKEN}

## Level 1: Summary by category

| Category | Total | Pass | Fail | Skip | Unclear | Broken |
|----------|-------|------|------|------|---------|--------|
| Build & Types | {n} | ... | ... | ... | ... | ... |
| Tests | {n} | ... | ... | ... | ... | ... |
| Browser Checks | {n} | ... | ... | ... | ... | ... |
| Spec Checks | {n} | ... | ... | ... | ... | ... |

## Level 2: Failure details

### Failed Checks (unresolved after {N} fix attempts)
#### {check description}
What was checked: {evidence}
Expected: {X}
Actual: {Y}
Fix attempts: {trace}

### Broken (environment issues)
#### {check description}
Problem: {what went wrong}
Action: {what to fix}

## Level 3: Integrity & scope

### Verification Manifest
{manifest from 5d}

### NOT verified (scope disclosure)
- Cross-task interactions between components
- Performance under load
- Accessibility (WCAG compliance)
- Visual design consistency
- Mobile/responsive layout
{add feature-specific uncovered areas}

## Human Checks
{items from Human Checks section + SKIP + UNCLEAR + DEGRADED + unresolved FAIL}
- [ ] {what to check}
  Context: {why human verification needed}
  → {step-by-step instructions}

══════════════════════════════════════════════════
```

Save report to `.claude/teams/{team-name}/VERIFICATION_REPORT.md`

## 6. Legacy Cleanup (team is still alive — coders can remove legacy)

**This step is MANDATORY.** Do not skip it even if `LEGACY_REPORT.md` looks empty — always run the scan for safety. The user must have a chance to decide what happens to legacy code before the team is shut down.

### 6a. Read coder-reported legacy

```
Read(".claude/teams/{team-name}/LEGACY_REPORT.md")
```

Coders appended entries here during Step 5.5 of their workflow. Parse all `## [task #N] ...` entries into a list.

### 6b. Run a safety scan for legacy coders missed

Dispatch a single Explore subagent to catch what coders might have missed. Give it the list of files touched this session (from commits or state.md):

```
Task(
  subagent_type="Explore",
  description="Scan for legacy leftovers",
  prompt="Scan the following files touched during this session for legacy code left behind after refactoring:
{list of files touched this session}

Check for each category (from CLAUDE.md legacy rules):
1. Unused imports, variables, functions, or files (grep for references to each exported symbol)
2. Duplicate implementations side-by-side (old + new version of the same function)
3. Dead code paths behind feature flags or `if (OLD_BEHAVIOR)` branches
4. Comments marking deprecation: `// deprecated`, `// TODO remove`, `// old`
5. Hardcoded fallbacks to old logic
6. Migration scripts / shims no longer needed

For each finding, output:
- Where: file:line
- What: one sentence
- Evidence: grep result showing usage count (e.g., '0 references', '2 references — one in tests')
- Suggested action: delete / keep / investigate

Thoroughness: medium. Under 3 minutes. Report findings concisely — max 10 items, prioritize highest-confidence dead code."
)
```

Append the scan findings to `LEGACY_REPORT.md` under a separate section `## From Phase 3 safety scan`.

### 6c. Decide with the user

**If LEGACY_REPORT.md is empty after the scan** (no coder reports + no scan findings):
Print to chat: `Legacy cleanup: nothing to review — no legacy leftovers detected.` Skip to Step 7 (Summary Report).

**If items exist**, print the full list in chat (human-readable, numbered):

```
══════════════════════════════════════════════════
LEGACY DETECTED — what to do with each item?
══════════════════════════════════════════════════

Found {N} legacy item(s) left after implementation:

1. **{title}** ({source: coder-N / scan})
   Where: `{file}:{line}`
   What: {description}
   Still used? {yes/no/unclear — with evidence}
   Why it's here: {reason from coder or "detected by scan"}

2. **{title}** ...
...
══════════════════════════════════════════════════
```

Then ask the user. Use **one AskUserQuestion call with one question per item** (max 5 questions per call — if more items, batch into multiple calls):

```
AskUserQuestion(
  questions=[
    {
      "question": "Item 1: {short title} at {file}:{line}. What to do?",
      "header": "Legacy #1",
      "options": [
        {"label": "Delete", "description": "Coder removes it now (creates cleanup task, goes through review)"},
        {"label": "Keep", "description": "Leave as is — it's needed or safer to keep"},
        {"label": "Later", "description": "Save to .legacy-todo.md at repo root for future cleanup"}
      ],
      "multiSelect": false
    },
    { ... item 2 ... },
    ...
  ]
)
```

### 6d. Apply user decisions

For each item based on the user's choice:

**"Delete" items** → create a single cleanup task bundling all delete items:
```
TaskCreate(
  subject="Cleanup legacy after feature completion",
  description="Remove the following legacy items approved by user:

{list of items to delete with file:line and description}

Do NOT remove anything not on this list. Run self-checks + request review as usual. Commit with: 'chore: cleanup legacy after {feature-name}'"
)
```

Assign to a coder (spawn a fresh coder if all current ones are shut down, or reuse an active one). Wait for DONE. Reviewers must approve.

**"Later" items** → append to `.legacy-todo.md` at repo root (create the file if missing):
```
Edit / Write (.legacy-todo.md):

## {YYYY-MM-DD} — deferred from feature "{feature name}"

- [ ] `{file}:{line}` — {description} (still used? {yes/no/unclear})
- [ ] `{file}:{line}` — ...
```

**"Keep" items** → no action, just log in summary report.

### 6e. Re-run verification if Delete tasks were created

If cleanup tasks were run, re-run the relevant checks from VERIFICATION_PLAN.md (build, types, tests) to make sure nothing broke. This reuses Step 5e fix-verify loop machinery. Max 2 iterations for cleanup fixes.

## 7. Summary Report

Print the summary (includes verification):
```
══════════════════════════════════════════════════
FEATURE COMPLETE — VERIFIED
══════════════════════════════════════════════════

Tasks completed: X/Y
Complexity: SIMPLE / MEDIUM / COMPLEX
Commits: [list of commit SHAs with messages]

Risk analysis (pre-implementation):
  Risks identified: N | Confirmed & mitigated: N | Dismissed: N

Review stats (post-implementation):
  Security: N found & fixed | Logic: N | Quality: N
  Convention violations: N | Escalations: N

Verification:
  Automated checks: {N}/{total} passed
  Fix-verify iterations: {N}/3
  Human checks remaining: {N}

Legacy cleanup:
  Items found: {N} (coder reports: {X} + scan: {Y})
  Deleted now: {N} | Kept: {N} | Saved to .legacy-todo.md: {N}

Conventions:
  .conventions/ updated: Y/N
  Files: [list]

Definition of Done: {static criteria met / partial}
Runtime verification: {N/A if no human checks | PENDING — see Human Checks below}
══════════════════════════════════════════════════
```

**Do NOT stop here.** Always proceed to Step 8 (shutdown) and Step 9 (Human Checks) — the user needs the full checklist in the same turn, not after prompting.

## 8. Shutdown Team

- SendMessage(type="shutdown_request") to all permanent teammates:
  - MEDIUM: Tech Lead + security-reviewer + logic-reviewer + quality-reviewer
  - COMPLEX: architect-frontend + architect-backend + architect-systems
  - SIMPLE: unified-reviewer
- TeamDelete

## 9. Present Human Checks to User

**This step is mandatory whenever any Human Checks, BROKEN, SKIP, UNCLEAR, or unresolved FAIL items exist.** The user must see the full actionable checklist in this same turn — never stop at "Human Checks below" without showing them.

### Step 9a — Print the detailed checklist IN CHAT (not inside AskUserQuestion)

Render as a numbered, step-by-step checklist so the user can follow it without asking a follow-up. Group by stage if multiple phases are involved (deploy → observe → verify).

Template:

```
══════════════════════════════════════════════════
HUMAN CHECKS — what you need to do
══════════════════════════════════════════════════

{One-line summary: "Team is done statically. {N} things still need human eyes."}

{If changes touch deploy/runtime, structure as stages:}

### Stage 1 — Deploy ({estimated time})
Command: `{exact command}`
What happens: {one sentence — what the deploy does}
How to know it's done: {specific signal — "GitHub Actions green", "service restarts"}

### Stage 2 — Observe on {env} ({time window})
Watch for specific signals:
- [ ] {Specific log line / metric / behavior to look for} — means {what it confirms}
- [ ] {Absence of specific error pattern} — e.g., "no `{error text}` in last {N} minutes"
- [ ] {Specific endpoint / UI flow to hit manually}

### Stage 3 — Sanity checks ({time window})
- [ ] {User flow 1 to try end-to-end}
- [ ] {User flow 2}
- [ ] {Rollback command ready if needed}: `{command}`

{If simpler — just list items directly:}

- [ ] {Check 1 with concrete instructions}
- [ ] {Check 2 with concrete instructions}

### What "good" looks like
{2-3 bullets describing the positive signals the user should see}

### If something looks wrong
- Rollback: `{command}`
- Logs: `{command or dashboard URL}`
- Ping me in chat with the error — I can investigate

══════════════════════════════════════════════════
```

**Populating the checklist** — pull items from:
- VERIFICATION_PLAN.md `## Human Checks` section
- BROKEN items (environment issues)
- SKIP(capability) + UNCLEAR + DEGRADED items
- Unresolved FAIL items (after 3 fix attempts)

If the VERIFICATION_PLAN's Human Checks are vague ("deploy and watch logs"), **expand them here into concrete stages** based on what the feature actually touches. Look at the commits — if they touch deploy config, billing, pg-boss, auth middleware, database migrations, etc., generate stage-specific checks (exact log lines, error patterns, user flows). Do not output generic "watch logs" without specifics.

### Step 9b — Follow up with AskUserQuestion

After printing the checklist, ask:

```
AskUserQuestion(
  questions=[{
    "question": "Ready to run the checklist? I can help with any stage.",
    "header": "Human checks",
    "options": [
      {"label": "Start Stage 1 now", "description": "Run the deploy command"},
      {"label": "Walk me through it", "description": "Go stage by stage with me"},
      {"label": "I'll do it myself later", "description": "Park the checklist, report back when done"}
    ],
    "multiSelect": false
  }]
)
```

### When no human checks are needed

If ALL checks passed and there are zero human-check items — skip Step 9 entirely and print:

```
ALL CHECKS PASSED — feature fully verified, no manual checks needed.
```
