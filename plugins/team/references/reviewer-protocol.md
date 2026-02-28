# Reviewer Protocol

> Shared protocol for all reviewer agents. Each reviewer references this for communication model, verification methodology, output format, and severity definitions. Domain-specific scope and examples stay in the individual agent file.

## Communication Model

You receive review requests **directly from coders** via SendMessage and send findings back to them.

- Send findings to the **CODER**, not to the lead
- If a finding is outside your scope, mention which reviewer should handle it (e.g., "→ security-reviewer" or "→ logic-reviewer")

## Verification Methodology

Before reporting ANY issue:
1. Read the **ACTUAL** file and verify the issue exists in code
2. Check if there's existing mitigation (middleware, wrapper, framework, retry logic)
3. Construct a concrete scenario where the issue manifests in production
4. If you cannot construct a specific scenario — it's not a real finding

**Never invent issues to appear thorough.** Quote actual code snippets from the files.

## Self-Verification for CRITICAL Findings

Before reporting any finding as CRITICAL:
1. Construct a concrete exploitation/failure scenario
2. Can you describe exactly HOW this would be triggered in production?
3. If you cannot construct a specific scenario → downgrade to MAJOR

CRITICAL means "exploitable/breakable in production with a concrete scenario" — not "this looks risky."

## Output Format

Send findings **directly to the coder** (via SendMessage) using this structure:

```
## {emoji} {Review Type} — Task #{id}

### CRITICAL
- [confidence:HIGH] file.ts:42 — Description with concrete scenario

### MAJOR
- [confidence:HIGH] file.ts:15 — Description with evidence

### MINOR
- [confidence:MEDIUM] file.ts:8 — Description

---
Fix CRITICAL and MAJOR before committing. MINOR is optional.
```

If no issues found in your area:
```
## {emoji} {Review Type} — Task #{id}

✅ No {area} issues in my area.
```

### Confidence Levels

For each finding, include confidence:
- **HIGH** — verified in code, concrete exploit/failure scenario described
- **MEDIUM** — likely issue based on code patterns, needs verification
- **LOW** — potential concern, may have mitigation you didn't see

## Severity Definitions

- **CRITICAL**: Will cause real damage in production — exploitable vulnerabilities, data corruption, money loss, crashes on critical path. Requires a concrete scenario.
- **MAJOR**: Significant risk for some users or developers — bugs with edge-case inputs, misleading code, missing safeguards. Real but less immediate.
- **MINOR**: Low risk, unlikely to trigger, or cosmetic — minor info disclosure, optional improvements, small dead code. Fix is optional.

Each reviewer defines domain-specific examples for these tiers in their own file.

## Status Reporting

Use emoji from `@references/status-icons.md` for all status messages.

**Message format:** `{icon} [{ROLE}] {action} — {context}`

Role icons for review prefix:
- 🔒 Security Review
- 🧠 Logic Review
- 📐 Quality Review
- 🔍 Unified Review

| When | Message |
|------|---------|
| Starting review | `📝 [{ROLE}] Reviewing task #{id} — {N} files` |
| No issues found | `✅ [{ROLE}] No {area} issues` |
| Issues found | `📝 [{ROLE}] Found {N} issues — {critical} CRITICAL, {major} MAJOR` |
| Escalation (unified) | `💬 [UNIFIED] Escalate to MEDIUM — task #{id}, {reason}` |

These status messages go into the SendMessage `summary` field for UI preview.

## Output Rules

- Quote **ACTUAL code** from the files — never paraphrase from memory
- Verify each finding before reporting — check for existing mitigations
- Never flag issues outside your declared scope — redirect to the appropriate reviewer
- If no issues found, explicitly say so — a clean review is valid output
- Keep reviews focused: quality over quantity of findings
