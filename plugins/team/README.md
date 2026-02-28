# Team

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
/plugin install team@ilia-izmailov-plugins
```

## Usage

```
/build <description or path/to/plan.md> [--coders=N]
/brief <description> — interview first, then build
/conventions [path/to/project]
```

**Examples:**
```
/build "Add user settings page with profile editing"
/build docs/plan.md --coders=2
/brief "Add notifications"
/conventions
```

## How It Works

### /build

A Team Lead agent orchestrates the full implementation pipeline. The pipeline adapts based on task complexity — simple tasks get a lightweight flow, complex tasks get the full treatment.

#### Phase 1: Discovery & Planning

**Step 1 — Parallel Research**

Two researcher agents explore your codebase simultaneously:

- **Codebase Researcher** scans the project structure, tech stack, patterns, and conventions. Returns a condensed summary so the Lead understands the project without reading hundreds of files.
- **Reference Researcher** finds the best existing code examples for each layer the feature touches (e.g., an existing API endpoint, a form component, a database migration). Returns **full file contents** — these become few-shot examples for coders.

> **Why:** The Lead's context window is precious — it's the brain of the team. Researchers bring back summaries, not raw search results. Meanwhile, reference files become "gold standards" that coders follow, which improves code consistency by 15-40% compared to text instructions alone.

**Step 2 — Complexity Classification**

The Lead evaluates the feature against concrete triggers:

| Level | When | What changes |
|-------|------|-------------|
| **SIMPLE** | 1 layer, no behavior changes, <3 tasks | Lightweight team (3 agents), single reviewer, no risk analysis |
| **MEDIUM** | 2+ layers, modifies existing code, 3+ tasks | Full team (4-6 agents), 3 specialized reviewers, risk analysis |
| **COMPLEX** | 3 layers, touches auth/payments, 5+ tasks | Full team + deep analysis agents, risk testers, user notified on key trade-offs |

> **Why:** Not every feature needs 8 agents. A simple "add a button" shouldn't go through the same pipeline as "rewrite the auth system". Automatic scaling saves time on small tasks and catches more issues on risky ones.

**Step 3 — Plan Validation** *(MEDIUM and COMPLEX only)*

Tech Lead reviews the task list before any code is written:
- Are tasks scoped correctly? (one file = one coder, no overlaps)
- Are dependencies set up right? (task A must finish before task B)
- Does the approach match existing architecture?

> **Why:** Catching a wrong approach at the planning stage costs minutes. Catching it after implementation costs hours. Tech Lead acts as an architectural gatekeeper.

**Step 4 — Risk Analysis** *(MEDIUM and COMPLEX only)*

Tech Lead identifies what could go wrong, then Risk Testers verify each risk by reading code and running test scripts:

| Risk Analysis (before code) | Review (after code) |
|------------------------------|---------------------|
| "This migration will delete user data" | "This migration has a syntax error" |
| "Auth middleware won't cover new routes" | "Auth check missing on line 42" |
| "Two tasks will create conflicting DB columns" | "Column name doesn't match convention" |

> **Why:** Some problems are invisible after implementation — they look correct in code review but break in production. Risk analysis catches architectural and data integrity issues that no amount of code review can find. Prevention > detection.

#### Phase 2: Execution

An always-on Supervisor monitors team health throughout execution — tracking liveness, detecting review loops, and coordinating escalations.

**Step 5 — Coding with Gold Standards**

Coders receive their task along with gold standard examples — real files from your project that show "this is how we do things here". Each coder:

1. Reads gold standards and reference files
2. Implements matching the same patterns
3. Runs self-checks (build, lint, type check)
4. Requests review

> **Why:** Telling an AI "follow project conventions" is vague. Showing it an actual file and saying "match this pattern" produces dramatically more consistent code. Gold standards are the #1 lever for code quality.

**Step 6 — Convention Checks**

Before reviewers even see the code, Lead runs quick automated checks:
- File names match expected patterns?
- New DB columns follow naming conventions?
- Imports use the right modules?

Failed checks go back to the coder immediately — no reviewer time wasted.

> **Why:** Reviewers should focus on logic and security, not "you named the file wrong". Convention checks handle the mechanical stuff.

**Step 7 — Specialized Review**

Depends on complexity:

**SIMPLE** — one Unified Reviewer covers security basics, logic, and quality in a single pass. If it detects sensitive code (auth, payments), it automatically escalates to MEDIUM.

**MEDIUM / COMPLEX** — three permanent reviewers work in parallel:

| Reviewer | What they catch | Examples |
|----------|----------------|----------|
| **Security** | Vulnerabilities that could be exploited | SQL injection, XSS, auth bypasses, exposed secrets, IDOR |
| **Logic** | Bugs that produce wrong results | Race conditions, off-by-one errors, null pointer exceptions, async issues |
| **Quality** | Code that works but is hard to maintain | DRY violations, unclear naming, missing abstractions, convention drift |

Each reviewer sends findings directly to the coder — the coder fixes, re-submits, cycle repeats until clean.

**COMPLEX** additionally triggers deep analysis agents when code touches sensitive areas:
- Auth/payments code → Security + Business Logic deep analysis
- Database code → Database Integrity analysis (race conditions, N+1 queries)
- External API calls → External Systems analysis (missing timeouts, retry logic)

> **Why:** Three specialized reviewers catch different classes of problems. A security expert misses naming issues; a quality expert misses race conditions. Specialization means deeper analysis in each area. Deep analysis agents go even further — they find semantic issues that surface-level review misses.

**Step 8 — Architectural Approval**

After reviewers finish, Tech Lead gives the final sign-off:
- Does this change fit the overall architecture?
- Is it consistent with what other coders implemented in earlier tasks?
- Any cross-task conflicts?

Only after Tech Lead approval does the coder commit.

> **Why:** Reviewers check individual files. Tech Lead checks the big picture — how changes across multiple tasks fit together. This prevents "each piece looks fine but they don't work together" problems.

#### Phase 3: Completion

The team shuts down through a deterministic teardown protocol — roster-driven shutdown with ACK/retry, Supervisor validates readiness before TeamDelete.

**Step 9 — Integration Verification**

Lead runs build + full test suite. If anything fails → creates a targeted fix task that goes through the same review pipeline.

> **Why:** Individual tasks can pass their own checks but break when combined. Integration testing is the final safety net.

**Step 10 — Conventions Update**

A dedicated task (blocked by all others) updates `.conventions/` with:
- Patterns this feature introduced
- Issues reviewers flagged 2+ times (= missing convention)
- Approved deviations from existing patterns

> **Why:** Every feature teaches the team something. Capturing it in `.conventions/` means the next `/build` run starts with better gold standards. The system improves over time.

**Step 11 — Summary Report**

```
══════════════════════════════════════════════════
FEATURE IMPLEMENTATION COMPLETE
══════════════════════════════════════════════════
Tasks completed: 4/4
Complexity: MEDIUM
Commits: [list]

Risk analysis: 3 risks identified, 1 confirmed & mitigated
Review stats: 2 security, 1 logic, 3 quality issues fixed
Integration: Build ✅ Tests ✅
Conventions: 2 gold standards added
══════════════════════════════════════════════════
```

---

### /conventions

Analyzes your codebase and creates/updates `.conventions/` directory with:
- `gold-standards/` — exemplary code snippets (20-30 lines each)
- `anti-patterns/` — what NOT to do
- `checks/` — naming rules, import patterns

These conventions are used by `/build` as few-shot examples for coders. You can also run `/conventions` standalone to bootstrap conventions for any project.

## Complexity Levels

| Level | Team Size | Reviewers | Risk Analysis | Tech Lead Validation |
|-------|-----------|-----------|---------------|---------------------|
| **SIMPLE** | 4 agents | 1 unified | Skipped | Skipped |
| **MEDIUM** | 5-7 agents | 3 specialized | Yes | Yes |
| **COMPLEX** | 6-9+ agents | 3 specialized + deep analysis | Full + risk testers | Yes + user notified on key decisions |

## Team Roles

| Role | Lifetime | Purpose |
|------|----------|---------|
| **Lead** | Whole session | Orchestrates the pipeline, protects own context by delegating research |
| **Supervisor** | Permanent | Always-on operational monitor — tracks liveness, detects loops/deadlocks, coordinates escalations, gates teardown |
| **Codebase Researcher** | One-shot | Returns condensed project summary (structure, stack, patterns) |
| **Reference Researcher** | One-shot | Returns full content of best example files for each layer |
| **Tech Lead** | Permanent | Validates plan, reviews architecture, handles escalations, maintains DECISIONS.md |
| **Coder** | Per task | Implements matching gold standard patterns, self-checks before review |
| **Security Reviewer** | Permanent | Injection, XSS, auth bypasses, secrets exposure, IDOR |
| **Logic Reviewer** | Permanent | Race conditions, edge cases, null handling, async issues |
| **Quality Reviewer** | Permanent | DRY, naming, abstractions, convention compliance |
| **Unified Reviewer** | Permanent | All-in-one for SIMPLE tasks; escalates to 3 reviewers if needed |
| **Risk Tester** | One-shot | Verifies specific risks by reading code and running test scripts |

## Structure

```
team/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   ├── build/SKILL.md
│   ├── conventions/SKILL.md
│   └── brief/
│       ├── SKILL.md
│       └── references/interview-principles.md
├── agents/
│   ├── supervisor.md
│   ├── codebase-researcher.md
│   ├── reference-researcher.md
│   ├── tech-lead.md
│   ├── coder.md
│   ├── security-reviewer.md
│   ├── logic-reviewer.md
│   ├── quality-reviewer.md
│   ├── unified-reviewer.md
│   └── risk-tester.md
├── references/
│   ├── gold-standard-template.md
│   └── risk-testing-example.md
└── README.md
```

## License

MIT
