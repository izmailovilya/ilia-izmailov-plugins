# Decisions

Reusable architectural decisions that persist across sessions. Each file captures a decision that future `/build` runs should respect.

## Format

Each decision file: `{topic}.md`

```markdown
# Decision: {Title}

**Date:** YYYY-MM-DD
**Context:** What prompted this decision
**Decision:** What was decided
**Alternatives considered:** What else was evaluated
**Consequences:** What follows from this decision

## Applies to
- [list of file patterns or areas this affects]
```

## How It's Used

- **build Lead**: reads decisions/ at Step 1 (orientation) to understand past choices
- **Tech Lead**: checks decisions/ before suggesting architectural changes
- **Coders**: reference relevant decisions when implementing related code

## Rules

- One file per decision topic (e.g., `state-management.md`, `auth-approach.md`)
- Decisions are append-only — don't delete, mark superseded if overridden
- Only architectural decisions — not implementation details
- Created by Tech Lead during `/build` runs when DECISIONS.md contains reusable patterns
