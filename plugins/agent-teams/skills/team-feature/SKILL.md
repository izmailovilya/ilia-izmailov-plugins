---
name: team-feature
description: "Launch Agent Team for feature implementation with review gates (coders + specialized reviewers + tech lead). Use this skill whenever the user asks to 'build a feature', 'implement this', 'code this', 'add functionality', 'create a component/page/API', 'launch agent team', 'team feature', or gives any substantial implementation task that involves writing code across multiple files. Also use when the user describes a feature they want built — even if they don't explicitly say 'team' or 'agents'. This skill orchestrates parallel coders with security, logic, and quality reviewers through a structured pipeline. Prefer this over doing implementation yourself whenever the task touches 3+ files or involves both frontend and backend changes."
allowed-tools:
  - TeamCreate
  - TeamDelete
  - SendMessage
  - TaskCreate
  - TaskGet
  - TaskUpdate
  - TaskList
  - Task
  - Read
  - Write
  - Glob
  - Grep
  - Bash
  - AskUserQuestion
  - Edit
argument-hint: "<description or path/to/plan.md> [--coders=N]"
model: fable
---

# Team Feature — Implementation Pipeline with Review Gates

Team Lead orchestrating feature implementation. Coordinate researchers, coders, specialized reviewers, and a tech lead to deliver quality code through a structured pipeline.

## Philosophy: Autonomous on Technical, Ask on User-Facing Forks

**Make ALL technical decisions autonomously.** The user gives a task — possibly vague, one sentence — and Lead figures out stack, files, patterns, risks, and implementation. Do NOT go back to the user with technical questions. Instead:

- **Ambiguous requirement?** → Dispatch researchers to explore the codebase, then decide based on what exists.
- **Multiple valid technical approaches?** → Dispatch a web researcher for best practices, then pick the approach most consistent with the existing codebase.
- **Unsure about scope?** → Start with the minimal viable implementation. Easier to extend than to undo.
- **Missing context?** → Researchers find it. Don't fill Lead's context with raw file contents.

**BUT — the user MUST be consulted for user-facing forks.** Autonomy is about *how*, not *what*. When tasks involve UX layout, user flow, or architectural forks that fundamentally shape the product (polling vs websocket, split vs unified resource, wireframe choices), Lead is REQUIRED to run Step 4a and present 2-3 concrete options via `AskUserQuestion`. Picking these wrong means rework, not just bugs — that's not a call Lead makes alone.

The only reasons to contact the user:
1. **Step 4c-4 Plan Brief (COMPLEX/MEDIUM)** — after architects/Tech Lead validate the plan, Lead MUST print a short human-readable brief to chat: tasks, key decisions, affected files, out-of-scope. The user has been silent since the brief/interview — they need to see what the team decided before implementation starts. Not a question, a status report. HARD GATE.
2. **Step 4a design forks** — user-facing or architectural decisions (see `phase1-planning.md` Step 4a). This is a HARD requirement, not optional.
3. **Phase 3 Step 6 Legacy Cleanup** — if any legacy leftovers detected (from coder reports or Phase 3 safety scan), ask the user per-item what to do: Delete / Keep / Later. Never delete silently, never leave silently.
4. **Phase 3 Step 9 Human Checks** — post-verification checklist for things the team can't verify automatically (runtime behavior, deploy observation). Always present as a detailed actionable checklist.
5. **Task so vague it's impossible to begin** (e.g., just the word "improve" with no context).

Everything else — researchers, not the user.

**Do not confuse autonomy with silence.** Autonomy means Lead decides without asking permission. It does NOT mean Lead works in a black box and never surfaces progress. The user watches the run live — see the Progress Feed section below. If the user doesn't hear from Lead between "starting" and "done", Lead is doing it wrong.

## Progress Feed — Keep the User in the Loop

The user watches the run in chat and must be able to catch problems in the moment — a wrong decision, a missed risk, a stuck task. Lead prints progress at defined points; each phase reference file marks its exact print points with 📢. Principles:

- **Format follows the phase.** Phase 1 (rare, large events) = short digest blocks after each step: research done, complexity verdict, debate rounds, risk verdicts. Phase 2 (many small events) = live one-liner ticker: task done, decision made, stuck. Phase 3 = progress lines per verification round + the existing final reports.
- **Product language, user's language.** Write feed lines in the language the user speaks, in product terms ("review caught: one user could see another user's settings — fixed"), not implementation jargon ("fixed IDOR in tRPC procedure").
- **Signal over noise.** Feed only what changes behavior, security, scope, or plan: decisions, confirmed risks, edge cases, task completions, escalations, stuck tasks. Never feed routine review nitpicks (naming, style) or internal mechanics (state.md updates, spawn details).
- **Cheap by design.** Almost everything printed is data Lead already receives (researcher reports, risk findings, DONE messages). The only extra inbound messages are: architect debate round summaries, coder DONE digests, and DECISION notices from Tech Lead / Primary Architect.
- **Emoji prefixes** keep the feed scannable — use them consistently: 🚀 kickoff, 🔍 research, ⚖️ complexity, ⚔️ debate, ⚠️ risk identified, 🧪 risk/verification result, 📋 decision, ✅ task done, 🔎 task in review, ⏸️ stuck, 🧹 legacy found, 👥 team, 🔨 fix iteration, 📝 plan change.
- **The feed never replaces hard gates.** Plan Brief, design forks, legacy cleanup, and Human Checks remain mandatory interaction points — the feed fills the silence between them.

**Context is precious.** Lead is the brain of the team. Don't waste context on raw file contents and search results. Dispatch researchers and receive condensed summaries.

**Exception:** Gold standard files from `.conventions/` are short (20-30 lines each) and MUST be included in coder prompts. Read these directly.

## Arguments

- **String**: Feature description — decompose into tasks
- **File path** (`.md`): Read the plan file and create tasks from it
- **`--coders=N`**: Max parallel coders (default: 5)
- **`--no-research`**: Skip all research. Use when context is already in the prompt or brief.

## Conventions System

The `.conventions/` directory is the **single source of truth** for project patterns. It encodes taste once, so every agent follows the same conventions automatically.

```
.conventions/
  gold-standards/           # 20-30 line exemplary code snippets
  anti-patterns/            # what NOT to do (with code examples)
  checks/                   # automated pass/fail rules (naming, imports)
```

- **If `.conventions/` does not exist:** Researchers identify patterns from the codebase. After feature completion, propose creating `.conventions/` with discovered patterns.
- **If `.conventions/` exists:** Read gold-standards at Step 1. Include them in coder prompts as few-shot examples.

## Roles

| Role | Lifetime | Communicates with | Responsibility |
|------|----------|-------------------|----------------|
| **Lead** | Whole session | Everyone (sparingly) | Dispatch researchers, plan, spawn team, monitor DONE/STUCK in Phase 2, narrate the progress feed to the user |
| **Researcher** | One-shot | Lead only | Explore codebase or web, return findings with FULL file content |
| **Tech Lead** | Whole session | Lead (planning) + Coders (directly) | Validate plan, architectural review, DECISIONS.md |
| **Coder** | Per task | Reviewers + Tech Lead (directly), Lead (DONE/STUCK) | Implement, self-check, request review directly, fix feedback, commit |
| **Security Reviewer** | Whole session | Coder only | Injection, XSS, auth bypasses, IDOR, secrets |
| **Logic Reviewer** | Whole session | Coder only | Race conditions, edge cases, null handling, async |
| **Quality Reviewer** | Whole session | Coder only | DRY, naming, abstractions, CLAUDE.md + conventions compliance |
| **Architect** (COMPLEX) | Whole session | Other Architects + Coders + Lead | Debate spec (Phase 1), review code in domain (Phase 2+). Replaces Tech Lead + 3 Reviewers. |

## Complexity Classification

Classify after researchers return. Follow the detailed algorithm in `references/phase1-planning.md` (Step 3).

**Quick reference — what each level means:**

| Complexity | Team Composition | Total Agents |
|-----------|------------------|--------------|
| **SIMPLE** (0-1 MEDIUM triggers) | Lead + Coder + Unified Reviewer | 3 |
| **MEDIUM** (2-3 MEDIUM triggers, 0 COMPLEX) | Lead + Coder + 3 Reviewers + Tech Lead | 6 |
| **COMPLEX** (4+ MEDIUM or 1+ COMPLEX trigger) | Lead + 3 Architects (debate → review) + Coder(s) + Researchers + Risk Testers | 5-8+ |

**SIMPLE** differences: Skip Tech Lead, skip risk analysis, unified reviewer only, faster flow.
**MEDIUM** differences: Full flow, Tech Lead validates plan, 3 separate reviewers, risk analysis.
**COMPLEX** differences: 3 Architects debate specification before coding, one becomes Primary Architect, architects become reviewers.

## Protocol Overview

### Phase 1: Discovery, Planning & Setup

> **Full details:** `references/phase1-planning.md`

Execute these steps in order:

1. **Quick orientation** (Lead alone) — read CLAUDE.md, check `.conventions/`, glob top-level layout. Do NOT read source files.

2. **Dispatch researchers** (conditional) — adaptive: skip what's already known. Codebase researcher for stack/structure, reference researcher for gold standard files, optional web researcher for best practices. Skip all if `--no-research` or brief provides everything.

3. **Classify complexity** — mechanical algorithm with MEDIUM triggers (6 checks) and COMPLEX triggers (7 checks). Not overridable. Create team, write VERIFICATION_PLAN.md (SIMPLE/MEDIUM) or defer to architects (COMPLEX). Compile gold standard block for coders. Create tasks with acceptance criteria + convention checks.

4. **Validate plan** — SIMPLE: skip. MEDIUM: Tech Lead validates. COMPLEX: 3 Architects debate via SendMessage (max 3 rounds), converge, one becomes Primary Architect, architects compile VERIFICATION_PLAN.md.

4c-4. **Plan Brief to User — HARD GATE (COMPLEX/MEDIUM)**. After plan validation, Lead MUST print a short status brief to chat: task list, key decisions from the architect debate (or Tech Lead review), files/modules affected, out-of-scope, open questions. This is NOT a question — it's a status report so the user knows what the team decided before implementation begins. The user has been silent since the brief/interview — break the silence here. SIMPLE skips this. See `phase1-planning.md` Step 4c-4.

4a. **Design options — REQUIRED SCAN** (skip only for pure refactoring/bug fixes). Scan every task for UX or architectural forks: UI layout, user flow, REST vs WebSocket, split vs unified resource, data model shape, integration choice. For every fork found, present 2-3 concrete options via `AskUserQuestion` with ASCII wireframes (UX) or flow diagrams (architecture). Max 3 decision points per feature. Update task descriptions with chosen approach and log in DECISIONS.md. **Do NOT skip this step silently** — if no forks were found, state explicitly in the run log: "Step 4a: scanned N tasks, no user-facing forks detected."

4b. **Risk analysis** (MEDIUM/COMPLEX only) — Tech Lead / Primary Architect identifies risks → spawn risk testers for CRITICAL/MAJOR risks → forward findings → update VERIFICATION_PLAN.md with mitigations.

5. **Spawn team** — reviewers (or switch architects to review mode) + coders with gold standard block + write state.md for compaction resilience.

### Phase 2: Execution — Monitor Mode

> **Full details:** `references/phase2-monitoring.md`

**Lead's role is MINIMAL in coordination — but not silent.** Coders communicate directly with reviewers and tech-lead via SendMessage. Lead only:

- Prints a progress feed line for every meaningful event (see Progress Feed table in `phase2-monitoring.md`)
- Tracks progress in state.md (task status updates)
- Spawns new coders when tasks complete and unassigned work remains
- Handles STUCK/QUESTION/REVIEW_LOOP escalations
- Transitions to Phase 3 when ALL coding tasks complete

**Lead does NOT:** read code, review code, run tests, notify reviewers, or forward messages between team members.

**Compaction recovery:** If context is lost, read `.claude/teams/{team-name}/state.md` — it contains the current phase, team roster, task statuses, and executable instructions for what to do next.

### Phase 3: Completion & Verification

> **Full details:** `references/phase3-verification.md`

Execute in order:

1. **Conventions update** — assign the conventions task to a coder. NOT optional — feature cannot be declared complete without `.conventions/` being created or updated.

2. **Cross-task consistency check** — ask Tech Lead / Primary Architect.

3. **Completion gate** — verify `.conventions/` exists and was modified this session.

4. **Integrated verification** (team still alive):
   - Parse VERIFICATION_PLAN.md sections
   - Pre-flight check (curl dev server)
   - Spawn ci-verifier + browser-verifier + spec-verifier in parallel
   - Collect results with integrity audit (manifest comparison)
   - Fix-verify loop: coders fix FAIL items, re-verify (max 3 iterations)
   - Compile progressive verification report → save to VERIFICATION_REPORT.md

5. **Legacy cleanup** (team still alive) — read `LEGACY_REPORT.md` (coder-reported leftovers from Step 5.5) + run an Explore safety scan on touched files. If items exist, print full list and ask user per-item via `AskUserQuestion`: **Delete / Keep / Later**. "Delete" → cleanup task for coder. "Later" → appended to `.legacy-todo.md` at repo root. HARD STEP — always run the scan even if report is empty.

6. **Shutdown** — print summary (including legacy cleanup results), shutdown team, TeamDelete, present Human Checks to user.

## Key Rules

- **Gold standards in every coder prompt** — coders MUST receive canonical examples as few-shot context. This is the #1 lever for code quality.
- **Escalation, not silent deviation** — when a pattern doesn't fit, coders escalate to Tech Lead / Primary Architect. Every approved deviation is documented in DECISIONS.md.
- **One file = one coder** — never assign overlapping files to different coders.
- **Definition of Done** — defined in VERIFICATION_PLAN.md (the single "is it done?" document).
- **Verify before shutdown** — all auto-checks must pass (or be exhausted after 3 fix attempts) before declaring completion.

## Reference Files

Detailed protocols for each phase:

- **`references/phase1-planning.md`** — Research dispatch, complexity classification algorithm, VERIFICATION_PLAN template, gold standard block, task creation template, plan validation (Tech Lead + Architect debate), risk analysis, team spawn templates, state file template.
- **`references/phase2-monitoring.md`** — Event handling table with progress feed column, task-done digest format, noise filter, state file updates, compaction recovery, spawning new coders, stuck protocol.
- **`references/phase3-verification.md`** — Conventions update, completion gate, integrated verification pipeline (5a-5f), verification report template, legacy cleanup (6a-6e: read LEGACY_REPORT, safety scan, per-item AskUserQuestion, cleanup tasks), summary report, shutdown, human checks.
