# Agent Teams

Launch a team of AI agents to implement features with built-in code review gates.

## Prerequisites

> **Agent teams are experimental and disabled by default.** You need to enable them before using this plugin.

Add `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` to your `settings.json` or environment:

```json
// ~/.claude/settings.json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  }
}
```

Or set the environment variable:

```bash
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
```

Restart Claude Code after enabling.

## Installation

```bash
/plugin marketplace add izmailovilya/ilia-izmailov-plugins
/plugin install agent-teams@ilia-izmailov-plugins
```

## Usage

```
/interviewed-team-feature "Add user settings page"
/team-feature <description or path/to/plan.md> [--coders=N] [--no-research]
/conventions [path/to/project]
```

**`/interviewed-team-feature`** is the recommended entry point — it conducts a short adaptive interview (2-6 questions) to understand your intent, then launches `/team-feature` with a compiled brief.

**`/team-feature`** runs the full implementation pipeline directly — useful when you already have a detailed description or a plan file.

**`/conventions`** analyzes your codebase and creates/updates the `.conventions/` directory with gold standards, anti-patterns, and automated checks.

**Examples:**
```
/interviewed-team-feature "Add user settings page with profile editing"
/team-feature docs/plan.md --coders=2
/team-feature "Refactor auth to use JWT" --no-research
/conventions
```

## How It Works

### /interviewed-team-feature

A short adaptive interview before building:

1. Analyzes your request and the codebase
2. Asks 2-6 targeted questions (scope, audience, success criteria, exclusions)
3. Compiles a brief with all answers + project context
4. Launches `/team-feature` with the compiled brief (skipping redundant research)

The number of questions adapts — a vague "improve search" gets more questions than a detailed spec.

### /team-feature

A Team Lead agent orchestrates the full implementation pipeline. The pipeline adapts based on task complexity.

#### Phase 1: Discovery & Planning

**Step 1 — Quick Orientation**

Lead reads CLAUDE.md, checks project layout, and loads `.conventions/` gold standards if they exist. Does NOT read source files — that's what researchers are for.

**Step 2 — Adaptive Research**

Research is conditional — skips what's already known:

- If a brief from `/interviewed-team-feature` provides project context → skip codebase researcher
- If `.conventions/` has relevant gold standards → skip reference researcher
- If `--no-research` flag → skip all research

When needed, two researcher agents explore your codebase in parallel:

- **Codebase Researcher** scans the project structure, tech stack, patterns, and conventions. Returns a condensed summary.
- **Reference Researcher** finds the best existing code examples for each layer the feature touches. Returns **full file contents** — these become few-shot examples for coders.

Optionally, a **web researcher** is dispatched for features requiring external knowledge (OAuth, real-time, etc.).

**Step 3 — Complexity Classification**

The Lead evaluates the feature against concrete triggers (not subjective judgment):

| Level | Triggers | Team |
|-------|----------|------|
| **SIMPLE** | 0-1 medium triggers | Lead + Coder + Unified Reviewer (3 agents) |
| **MEDIUM** | 2-3 medium triggers, 0 complex triggers | Lead + Tech Lead + 1-3 Reviewers + Coders (4-6 agents) |
| **COMPLEX** | 4+ medium triggers OR any complex trigger | Lead + 3 Architects + Coders + Risk Testers (5-8+ agents) |

**Medium triggers** (6 checks): 2+ layers touched, changes existing behavior, near sensitive areas, 3+ tasks, task dependencies, 5+ files.

**Complex triggers** (7 checks): 3 layers simultaneously, changes shared code, direct auth/payments changes, 5+ tasks, 3+ dependent task chain, no gold standard exists, 10+ files.

**Step 4 — Plan Validation**

Depends on complexity:

- **SIMPLE:** Skip validation entirely.
- **MEDIUM:** Tech Lead reviews the task list — checks scoping, file assignments, dependencies, architectural approach.
- **COMPLEX:** 3 Architects (Frontend, Backend, Systems) debate the specification before coding starts. See [Architect Debate](#architect-debate-complex-only) below.

**Step 4b — Risk Analysis** *(MEDIUM and COMPLEX only)*

Tech Lead / Primary Architect identifies what could go wrong, then **Risk Testers** verify each risk by reading code and running test scripts:

| Risk Analysis (before code) | Review (after code) |
|------------------------------|---------------------|
| "This migration will delete user data" | "This migration has a syntax error" |
| "Auth middleware won't cover new routes" | "Auth check missing on line 42" |
| "Two tasks will create conflicting DB columns" | "Column name doesn't match convention" |

Risk Testers are spawned in parallel — one per CRITICAL/MAJOR risk. Confirmed risks are added as mitigation criteria to task descriptions before coding begins.

#### Architect Debate (COMPLEX only)

For complex features, 3 specialized Architects replace the Tech Lead + 3 generic reviewers:

1. **Spawn 3 Architects** — Frontend (UI/components/accessibility), Backend (API/DB/data integrity), Systems (testing/CI/DX)
2. **Debate phase** — each architect critiques the plan from their expertise, debates with others via direct messaging (max 3 rounds)
3. **Verification checks** — each architect contributes checks from their domain to the verification plan
4. **Convergence** — architects send "SPEC APPROVED" with final recommendations
5. **Primary Architect** designated based on feature type (mostly UI → Frontend, mostly API/DB → Backend, cross-cutting → Systems)
6. **Review mode** — architects transition to specialized code reviewers during Phase 2

The Primary Architect maintains `DECISIONS.md`, handles escalations, and serves as tiebreaker.

#### Phase 2: Execution

**Coders with Gold Standards**

Coders receive their task along with gold standard examples — real files from your project. Each coder:

1. Reads gold standards and reference files
2. Implements matching the same patterns
3. Runs self-checks (build, lint, type check, convention checks)
4. Sends review requests directly to reviewers via messaging
5. Fixes feedback, gets approval, commits

**Specialized Review**

Coders drive the review process — they message reviewers directly. Lead is NOT in the review loop.

**SIMPLE** — one Unified Reviewer covers security basics, logic, and quality in a single pass. Automatically escalates to MEDIUM if code touches sensitive areas.

**MEDIUM** — three permanent reviewers work in parallel:

| Reviewer | What they catch |
|----------|----------------|
| **Security** | SQL injection, XSS, auth bypasses, exposed secrets, IDOR |
| **Logic** | Race conditions, off-by-one errors, null pointer exceptions, async issues |
| **Quality** | DRY violations, unclear naming, missing abstractions, convention drift |

**COMPLEX** — the 3 Architects serve as domain-specific reviewers (no separate security/logic/quality reviewers needed).

**Architectural Approval**

After reviewers finish, Tech Lead (MEDIUM) or Primary Architect (COMPLEX) gives final sign-off on cross-task consistency.

#### Phase 3: Completion & Verification

**Step 1 — Conventions Update**

A dedicated conventions task (blocked by all coding tasks) creates/updates `.conventions/` with patterns discovered during implementation, recurring review issues, and approved deviations.

**Step 2 — Integrated Verification**

Verification runs **before** shutting down the team, so coders can fix failures:

1. Three verifier agents run in parallel:
   - **CI Verifier** — build, typecheck, tests
   - **Browser Verifier** — pages load, elements visible, interactions work, no console errors
   - **Spec Verifier** — file existence, exports, API responses, config values

2. **Fix-verify loop** — if checks fail, coders fix while the team is still alive (max 3 iterations)

3. **Status taxonomy:**
   - PASS / FAIL (code problem) / SKIP (capability or n/a) / UNCLEAR / DEGRADED (agent crashed) / BROKEN (environment issue)

4. **Verification manifest** — integrity audit comparing items sent vs reported

5. Items that can't be auto-verified are collected as **Human Checks** and presented to the user after completion.

**Step 3 — Summary Report**

```
══════════════════════════════════════════════════
FEATURE COMPLETE — VERIFIED
══════════════════════════════════════════════════
Tasks completed: 4/4
Complexity: MEDIUM
Commits: [list]

Risk analysis: 3 risks identified, 1 confirmed & mitigated
Review stats: 2 security, 1 logic, 3 quality issues fixed
Verification: 12/14 passed, 2 human checks
Conventions: .conventions/ updated ✅
══════════════════════════════════════════════════
```

---

### /conventions

Analyzes your codebase and creates/updates `.conventions/` directory with:
- `gold-standards/` — exemplary code snippets (20-30 lines each)
- `anti-patterns/` — what NOT to do
- `checks/` — naming rules, import patterns

These conventions are used by `/team-feature` as few-shot examples for coders. Run `/conventions` standalone to bootstrap conventions for any project.

## Key Artifacts

| Artifact | Created by | Purpose |
|----------|-----------|---------|
| `.conventions/` | Conventions task | Gold standards, anti-patterns, automated checks for future runs |
| `DECISIONS.md` | Tech Lead / Primary Architect | Architectural decisions, approved deviations, debate summary |
| `VERIFICATION_PLAN.md` | Lead / Architects | Checklist of automated and manual checks |
| `VERIFICATION_REPORT.md` | Verification phase | Detailed results with pass/fail/skip per check |
| `state.md` | Lead | Team state for compaction recovery |

## Team Roles

| Role | Lifetime | Purpose |
|------|----------|---------|
| **Lead** | Whole session | Orchestrates pipeline, dispatches researchers, monitors progress |
| **Codebase Researcher** | One-shot | Returns condensed project summary (structure, stack, patterns) |
| **Reference Researcher** | One-shot | Returns full content of best example files for each layer |
| **Tech Lead** | Permanent (MEDIUM) | Validates plan, architectural review, maintains DECISIONS.md |
| **Architect** | Permanent (COMPLEX) | Debates spec, then reviews code in domain. 3 personas: Frontend, Backend, Systems |
| **Coder** | Per task | Implements matching gold standards, self-checks, requests review directly |
| **Security Reviewer** | Permanent (MEDIUM) | Injection, XSS, auth bypasses, IDOR, secrets |
| **Logic Reviewer** | Permanent (MEDIUM) | Race conditions, edge cases, null handling, async |
| **Quality Reviewer** | Permanent (MEDIUM) | DRY, naming, abstractions, convention compliance |
| **Unified Reviewer** | Permanent (SIMPLE) | All-in-one reviewer; escalates to 3 reviewers if needed |
| **Risk Tester** | One-shot | Verifies specific risks by reading code and running test scripts |
| **CI Verifier** | One-shot | Runs build, typecheck, lint, tests — reports PASS/FAIL/BROKEN |
| **Browser Verifier** | One-shot | Navigates pages, checks elements and interactions via Chrome |
| **Spec Verifier** | One-shot | Checks file existence, exports, API responses, config values |
| **Proxy Teammate** | Same as the role it carries | Holds a team role while delegating the thinking to an external CLI agent — see Engines below |

## Engines — Optional External CLI Agents

**Every role runs on Claude by default. With no config file, nothing here applies** — the pipeline
behaves exactly as documented above.

If you have other coding CLIs installed, you can reassign individual roles to them. Work moved out
bills against that tool's subscription instead of your Claude context and rate limit. Codex in
particular over-reports issues, which is useful for review and risk work as long as findings are
triaged before they reach a coder — the pipeline does that triage for you.

Copy `agent-teams.example.json` to `~/.claude/agent-teams.json` and change only what you want:

```json
{
  "roles": {
    "security-reviewer": "codex",
    "risk-tester": "codex",
    "web-researcher": "grok"
  }
}
```

Supported engines: `claude` (default), `codex`, `kimi`, `grok`.

How each kind of role is moved:

- **One-shot roles** (researchers, risk tester, CI/spec verifiers, legacy scan) — no Claude agent is
  created; the orchestrator runs the CLI and reads its report.
- **Team roles** (reviewers, tech lead, architects, coder) — a thin Claude proxy joins the team
  under the same name and delegates to a persistent external session, so review round 2 remembers
  round 1. Other teammates see no difference.

Guarantees that hold regardless of configuration:

- `lead` and `browser-verifier` always run on Claude (team ownership; Chrome extension).
- Missing binary, auth failure, or a dead engine mid-run falls back to Claude automatically and
  says so in the progress feed. Set `"fallback": "fail"` if you would rather the run stop.
- External output is never trusted as-is: findings are verified against the cited lines before they
  block a task, and verifier reports must quote real command output.
- Decisions stay on the Claude side — engines produce findings, not approvals.
- `--engines=off` on a single run ignores the config entirely.

Full spec — role registry, config schema, CLI presets, failure handling:
`skills/team-feature/references/engines.md`.

## Structure

```
agent-teams/
├── .claude-plugin/
│   └── plugin.json
├── agents/
│   ├── architect.md
│   ├── browser-verifier.md
│   ├── ci-verifier.md
│   ├── codebase-researcher.md
│   ├── coder.md
│   ├── logic-reviewer.md
│   ├── proxy-teammate.md
│   ├── quality-reviewer.md
│   ├── reference-researcher.md
│   ├── risk-tester.md
│   ├── security-reviewer.md
│   ├── spec-verifier.md
│   ├── tech-lead.md
│   └── unified-reviewer.md
├── references/
│   ├── gold-standard-template.md
│   └── risk-testing-example.md
├── skills/
│   ├── conventions/
│   │   └── SKILL.md
│   ├── interviewed-team-feature/
│   │   ├── SKILL.md
│   │   └── references/
│   │       └── interview-principles.md
│   └── team-feature/
│       ├── SKILL.md
│       └── references/
│           ├── engines.md
│           ├── phase1-planning.md
│           ├── phase2-monitoring.md
│           └── phase3-verification.md
├── agent-teams.example.json
└── README.md
```

## License

MIT
