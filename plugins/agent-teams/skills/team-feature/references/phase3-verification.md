# Phase 3: Completion & Verification — Detailed Protocol

When all coding tasks are completed:

## 1. Conventions Update

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

If there are **FAIL** items:
1. Create targeted fix tasks for coders based on failure evidence
2. Wait for coders to fix and commit
3. Re-run ONLY the failed checks (spawn fresh verifiers for failed items only)
4. **Hard cap: 3 iterations max.** Tag each iteration: "Verification run {N}/3: fixing {list}"
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

## 6. Summary Report

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

Conventions:
  .conventions/ updated: Y/N
  Files: [list]

Definition of Done: met / partial
══════════════════════════════════════════════════
```

## 7. Shutdown Team

- SendMessage(type="shutdown_request") to all permanent teammates:
  - MEDIUM: Tech Lead + security-reviewer + logic-reviewer + quality-reviewer
  - COMPLEX: architect-frontend + architect-backend + architect-systems
  - SIMPLE: unified-reviewer
- TeamDelete

## 8. Present Human Checks to User

If any items need human verification, use AskUserQuestion:

```
"Feature implemented and verified. {N} items need your manual check:"

For BROKEN items:
  "Environment issues — {N} checks couldn't run due to {reason}"

For SKIP(capability) + UNCLEAR + DEGRADED items:
  "{N} checks couldn't be verified automatically:"
  {list items with context and instructions}

For unresolved FAIL items (after 3 fix attempts):
  "{N} checks still failing after 3 fix attempts:"
  {list with evidence and retry trace}

Options:
- "All good — verified manually"
- "Will check later"
```

If ALL checks passed with no human checks → skip AskUserQuestion, just report success:
```
ALL CHECKS PASSED — feature fully verified, no manual checks needed.
```
