# Phase 1: Discovery, Planning & Setup — Detailed Protocol

## Step 1: Quick Orientation (Lead alone — minimal context use)

Only read what's tiny and critical:

```
1. Read CLAUDE.md (if exists) — project conventions and constraints
2. Quick Glob("*") — see top-level layout (just file/dir names, no content)
3. Check if .conventions/ exists (Glob(".conventions/**/*"))
   - If YES: read all gold-standards/*.* files — these are short (20-30 lines each)
   - If NO: researchers will discover patterns, you'll propose creating it later
```

Do NOT read package.json, source files, or explore deeply.

## Step 2: Dispatch Researchers (conditional)

Research is **adaptive** — skip what's already known, research what's not.

**Decision algorithm:**

```
1. Check --no-research flag → if set, skip ALL research entirely
2. Check if input contains a brief file (e.g., .briefs/*.md from /interviewed-team-feature)
   → If YES: read the brief. It already has Project Context section.
3. Evaluate what you HAVE vs what you NEED:

   NEED for planning:
   a) Codebase context: stack, structure, affected layers, build/test commands
   b) Reference files: actual file contents for gold standard examples

   CHECK (a): Does input/brief contain stack, directory structure, and key patterns?
   → YES: skip codebase-researcher
   → NO: spawn codebase-researcher

   CHECK (b): Does .conventions/gold-standards/ exist with relevant examples?
   → YES: already read in Step 1, skip reference-researcher
   → NO: spawn reference-researcher
```

**When BOTH researchers needed** (no brief, no .conventions/):

```
Task(
  subagent_type="agent-teams:codebase-researcher",
  prompt="Feature to plan: '{feature description}'"
)

Task(
  subagent_type="agent-teams:reference-researcher",
  prompt="Feature to implement: '{feature description}'.
Find canonical reference files for each layer this feature touches."
)
```

**When only reference-researcher needed** (brief provides codebase context, but no .conventions/):

```
Task(
  subagent_type="agent-teams:reference-researcher",
  prompt="Feature to implement: '{feature description}'.
Find canonical reference files for each layer this feature touches.
Project context: {stack and structure from brief}"
)
```

**When NEITHER needed** (brief + .conventions/ with relevant gold standards, or --no-research):

Skip directly to Step 3. Use context from brief + .conventions/ for planning.

**Optionally spawn a web researcher** if the feature requires external knowledge:

```
If the feature involves a library/pattern you're unsure about (OAuth, real-time, file uploads, etc.):

Task(
  subagent_type="general-purpose",
  prompt="Research best practices for implementing '{specific topic}' in a {framework} project.

  Use WebSearch and/or Context7 to find:
  1. Current recommended approach (2024-2025 best practices)
  2. Key libraries or built-in features to use
  3. Common pitfalls to avoid
  4. A brief example of the pattern

  Context: The project uses {stack from brief or codebase researcher}.

  Return a CONDENSED recommendation (10-20 lines max):
  - Recommended approach + why
  - Key library/API to use
  - 2-3 pitfalls to watch for
  - Pattern example (pseudocode, not full implementation)"
)
```

Researchers may be dispatched mid-session — but ONLY when genuinely lacking information not already in context (brief, .conventions/, Phase 1 findings). Do NOT dispatch a researcher for every STUCK or QUESTION signal — first check if you can answer from what you already know.

## Step 3: Classify Complexity and Synthesize Plan

Once researchers return, classify the feature complexity. Follow this algorithm **step by step in order**:

**Triggers are MANDATORY. Not overridable.** This is a mechanical rule. No downgrading with justifications like "but the changes are small" or "it's pragmatic".

---

**STEP A: Count MEDIUM triggers** (check all 6):

| # | Trigger | How to check |
|---|---------|-------------|
| 1 | **2+ layers** touched (DB, API, UI) | From researcher: which layers does the feature touch? |
| 2 | **Modifies existing logic flow** (not just adding new code to existing files) | Does the feature change how existing code behaves, or only add new functions/routes/components to existing files? Adding a new endpoint to an existing router ≠ changing existing behavior. |
| 3 | **Near sensitive areas** — code adjacent to auth, payments, permissions | From researcher: do any touched files import/call auth or billing modules? |
| 4 | **3+ tasks** in decomposition | Count tasks after planning |
| 5 | **Dependencies between tasks** — at least 1 task blocks another | Can all tasks run in parallel, or does order matter? |
| 6 | **5+ files** will be created or edited | Count all files from task descriptions. Do NOT bundle many changes into fewer tasks to dodge this trigger. |

→ If **0-1** triggered: **SIMPLE**. Skip to classification result.
→ If **2-3** triggered: tentatively MEDIUM. Go to Step B.
→ If **4+** triggered: **COMPLEX. STOP.** Do not check Step B. 4+ medium signals = complex task by accumulation.

---

**STEP B: Count COMPLEX triggers** (check all 7 — only if Step A result was 2-3):

| # | Trigger | How to check |
|---|---------|-------------|
| 1 | **3 layers simultaneously** (DB + API + UI all touched) | From researcher |
| 2 | **Changes behavior other features depend on** — shared utils, middleware, core hooks | From researcher: are modified files imported by 3+ other modules? |
| 3 | **Direct changes to auth/payments/billing** — not adjacent, but the actual auth/payment code | From researcher: are auth/billing files in the edit list? |
| 4 | **5+ tasks** in decomposition | Count tasks after planning |
| 5 | **Chain of 3+ dependent tasks** — A blocks B blocks C | Check task dependency graph |
| 6 | **No gold standard exists** for this type of code — new pattern for the project | No matching file in .conventions/ or researcher found no reference files |
| 7 | **10+ files** will be created or edited | Count all files from task descriptions |

→ If **0** triggered: **MEDIUM**.
→ If **1+** triggered: **COMPLEX**.

---

**Classification result** (MUST follow this format):

```
STEP A — MEDIUM triggers: N/6 fired
  [list which triggered, with evidence]
STEP A result: [SIMPLE / tentatively MEDIUM / COMPLEX by accumulation]

STEP B — COMPLEX triggers: N/7 fired (skip if Step A = SIMPLE or COMPLEX)
  [list which triggered, with evidence]

FINAL: [SIMPLE / MEDIUM / COMPLEX] (mandatory, not overridable)
```

Now plan:

```
TeamCreate(team_name="feature-<short-name>")
```

### VERIFICATION_PLAN.md Template

Write the single source of truth for "is it done?" — combines Definition of Done, business criteria, risk mitigation checks, and automated verification checks.

**For SIMPLE/MEDIUM** — Lead writes it now based on researcher findings + brief:

```
Write(".claude/teams/{team-name}/VERIFICATION_PLAN.md"):

# Verification Plan
## Feature: {feature name}

## Definition of Done
- Build passes: {build command from researcher}
- All tests pass: {test command from researcher}
- Automated convention checks pass (naming, imports, structure)
- No unresolved CRITICAL review findings
- CLAUDE.md conventions followed
- Gold standard patterns matched (or deviation explicitly justified)

## Business Criteria
{From brief's Success Criteria — restate each as a verifiable check}
- [ ] {User can do X}
- [ ] {Y is visible on screen}
- [ ] Exclusions respected: {from brief's Exclusions}

## Risk Mitigation Checks
{Added after Step 4b risk analysis — leave empty until then}

## Build & Types
- [ ] `{build command}` passes
- [ ] `{typecheck command}` no errors

## Tests
- [ ] `{test command}` all pass

## Browser Checks
- [ ] Page {url} loads without console errors
- [ ] {Element} is visible and clickable
{add checks based on task acceptance criteria that involve UI}

## Spec Checks
- [ ] File `{path}` exists and exports `{symbol}`
- [ ] {config/API/structural checks from acceptance criteria}

## Human Checks
- [ ] {Anything that can't be automated}
  → {Step-by-step instructions for manual verification}
```

How to populate: Definition of Done from technical quality bar + CLAUDE.md, Business Criteria from brief's Success Criteria, Build/Tests from researcher findings, Browser Checks from UI criteria, Spec Checks from acceptance criteria, Human Checks for anything requiring judgment. Risk Mitigation Checks are added after Step 4b.

**For COMPLEX** — skip writing VERIFICATION_PLAN.md here. Architects populate it during the debate phase (Step 4c) — each adds checks from their domain expertise.

Sections are optional — omit empty sections. Section names are fixed keywords used for parsing during Phase 3 verification.

### Gold Standard Block

From researcher findings + `.conventions/` (if exists), compile canonical examples coders will receive:

```
GOLD STANDARD BLOCK (compiled by Lead):

--- GOLD STANDARD: [layer] — [file path] ---
[Full file content or .conventions/ snippet]
[Note: pay attention to X, Y naming]

--- GOLD STANDARD: [layer] — [file path] ---
[Full file content]

--- CONVENTIONS ---
[Key rules from .conventions/checks/ or CLAUDE.md — naming patterns, import rules, etc.]
```

Keep this block to 3-5 examples, ~100-150 lines total. Prioritize by relevance to the feature.

See `references/gold-standard-template.md` for the full template and rules (if it exists).

### Task Creation Template

Create tasks with gold standard context from researcher findings:

```
TaskCreate(
  subject="Add settings API endpoint",
  description="Create GET/PUT /api/settings endpoint.

  Files to create/edit: src/server/routers/settings.ts
  Reference files (read for patterns): src/server/routers/profile.ts, src/server/routers/account.ts

  Acceptance criteria:
  - GET returns current user settings
  - PUT updates settings with validation
  - Follow the same tRPC router pattern as profile.ts

  Convention checks (MUST PASS before requesting review):
  - Router file named: [resource].ts (lowercase, singular)
  - Procedure names: get[Resource], update[Resource] (camelCase)
  - Zod schemas colocated in same file
  - Error handling matches profile.ts pattern

  Tooling:
  - Test: pnpm vitest
  - Lint: pnpm biome check
  - Type check: pnpm tsc --noEmit

  Feature DoD applies — see VERIFICATION_PLAN.md"
)
```

**Every task description MUST include:**
- Files to create/edit
- Reference files (from researcher findings — existing files showing the pattern to follow)
- Acceptance criteria
- **Convention checks** — specific pass/fail rules for THIS task (naming, structure, imports)
- Tooling commands (from researcher findings)

**Always create a conventions task as the SECOND TO LAST task** (blocked by all other coding tasks):

```
TaskCreate(
  subject="Update .conventions/ with discovered patterns",
  description="Run the /conventions command logic to create or update .conventions/.

  Additional context from THIS session (use alongside codebase analysis):
  1. Issues reviewers flagged 2+ times (recurring = missing convention)
  2. New patterns this feature introduced
  3. Approved escalations (Tech Lead approved deviations from existing patterns)

  This is NOT optional. Every /team-feature run must leave .conventions/ up to date."
)
```

Then set it as blocked by all other coding tasks via TaskUpdate. The conventions task is the LAST task — verification runs automatically in Phase 3 after all tasks complete.

## Step 4: Validate Plan

**For SIMPLE:** Skip plan validation entirely.

**For MEDIUM:** Spawn Tech Lead and validate.

Spawn Tech Lead (permanent teammate, uses `agents/tech-lead.md`):
```
Task(
  subagent_type="agent-teams:tech-lead",
  team_name="feature-<short-name>",
  name="tech-lead",
  prompt="Feature: '{feature description}'.
Team name: feature-<short-name>.

Definition of Done: {DoD from Step 3}

CODEBASE CONTEXT (from research):
{Paste codebase-researcher findings: tech stack, project structure, relevant existing code}

Wait for my instructions (VALIDATE PLAN, IDENTIFY RISKS, review requests)."
)
```

Then **validate the plan**:
```
SendMessage to tech-lead:
"VALIDATE PLAN: Please review the task list for this feature.
Check task scoping, file assignments, dependencies, and architectural approach.

Feature Definition of Done:
{DoD from Step 3}

Reply PLAN OK or suggest changes."
```

Wait for Tech Lead response. If they suggest changes → adjust tasks → re-validate.

**For COMPLEX:** Spawn 3 Architects and run specification debate.

### Step 4c-1: Spawn architects (all 3 in parallel as team members):

```
Task(subagent_type="agent-teams:architect", team_name="feature-<short-name>", name="architect-frontend",
  prompt="You are the FRONTEND Architect for team feature-<short-name>.
PERSONA: FRONTEND
EXPERTISE: Component architecture, state management, UI patterns, client-side performance, accessibility, design system usage.
Wait for DEBATE PLAN from Lead.")

Task(subagent_type="agent-teams:architect", team_name="feature-<short-name>", name="architect-backend",
  prompt="You are the BACKEND Architect for team feature-<short-name>.
PERSONA: BACKEND
EXPERTISE: API design, DB schema, data integrity, server-side performance, scalability, migration strategy.
Wait for DEBATE PLAN from Lead.")

Task(subagent_type="agent-teams:architect", team_name="feature-<short-name>", name="architect-systems",
  prompt="You are the SYSTEMS Architect for team feature-<short-name>.
PERSONA: SYSTEMS
EXPERTISE: Testing strategy, CI/CD impact, convention compliance, developer experience, deployment, monitoring.
Wait for DEBATE PLAN from Lead.")
```

### Step 4c-2: Launch debate:

```
SendMessage to architect-frontend, architect-backend, architect-systems:
"DEBATE PLAN: Review the task list for this feature from your expertise perspective.

Feature: {feature description}
Feature Definition of Done: {DoD from Step 3}

CODEBASE CONTEXT (from research):
{Paste codebase-researcher findings: tech stack, project structure, existing features, conventions}

REFERENCE CODE (gold standards):
{Paste reference-researcher findings or .conventions/ gold standards — the same canonical examples coders will receive}

YOUR TEAM:
- architect-frontend (UI/UX/components)
- architect-backend (API/DB/security)
- architect-systems (testing/CI/DX)

INSTRUCTIONS:
1. Read all tasks (TaskList + TaskGet)
2. Read CLAUDE.md and .conventions/ for project context
3. Post your CRITIQUE to the other two architects via SendMessage — ground it in the codebase context and reference code above
4. Respond to their critiques — debate directly with each other
5. Add VERIFICATION CHECKS from your domain — what should be verified after implementation:
   - Frontend: browser checks (pages load, elements visible, interactions work)
   - Backend: spec checks (files exist, exports correct, API returns expected status)
   - Systems: CI checks (build passes, types clean, tests pass, conventions met)
6. Max 3 rounds of exchange
7. When you agree, send me: SPEC APPROVED + final recommendations + your verification checks"
```

### Step 4c-3: Monitor debate and handle convergence:

Wait for all 3 architects to send "SPEC APPROVED" to Lead. If they converge:
- Collect all recommendations
- Apply agreed changes to task descriptions (TaskUpdate)
- Designate the **most relevant architect as Primary** based on feature type:
  - Feature is mostly UI → architect-frontend is Primary
  - Feature is mostly API/DB → architect-backend is Primary
  - Feature is cross-cutting/infra → architect-systems is Primary
- **Compile VERIFICATION_PLAN.md** from all architects' verification checks + brief + DoD:

```
Lead collects verification checks from all 3 architects and writes:

Write(".claude/teams/{team-name}/VERIFICATION_PLAN.md"):

# Verification Plan
## Feature: {feature name}

## Definition of Done
- Build passes, all tests pass
- Automated convention checks pass
- No unresolved CRITICAL review findings
- CLAUDE.md conventions followed
- Gold standard patterns matched (or deviation explicitly justified)

## Business Criteria
{From brief's Success Criteria — restate each as a verifiable check}
- [ ] {User can do X}
- [ ] {Y is visible on screen}
- [ ] Exclusions respected: {from brief's Exclusions}

## Risk Mitigation Checks
{Added after Step 4b risk analysis}

## Build & Types
{checks from architect-systems: build commands, typecheck}

## Tests
{checks from architect-systems: test commands, specific test files}

## Browser Checks
{checks from architect-frontend: pages, elements, interactions}

## Spec Checks
{checks from architect-backend: file existence, exports, API contracts}
{checks from architect-systems: config values, convention compliance}

## Human Checks
{anything architects flagged as not automatable}
```

```
SendMessage to {primary architect}:
"You are now PRIMARY ARCHITECT. Additional responsibilities:
- Create and maintain DECISIONS.md
- Handle escalations from coders
- Cross-task consistency checks
- Tiebreaker when architects disagree during review

Include the debate summary in DECISIONS.md."
```

**If architects don't converge after 3 rounds:** Lead reads their final positions, makes the decision, applies changes, and picks Primary. Document the disagreement in DECISIONS.md.

## Step 4a: Design Options (when UX or architectural decisions exist)

After the plan is validated but before risk analysis, check if any tasks involve **UX or architectural decisions** that the user should weigh in on. This step exists because some choices fundamentally shape implementation — picking them wrong means rework, not just bugs.

**When to trigger:** Scan task descriptions for signals:
- UI layout choices (page structure, navigation, forms)
- User flow decisions (onboarding, auth, checkout steps)
- Architectural forks (REST vs WebSocket, polling vs push, monolith vs split)
- Data model choices that affect UX (what entities exist, how they relate)
- Integration decisions (which services, which auth methods)

**When to skip:** Pure backend tasks, refactoring, bug fixes, or when the brief/interview already specified exact requirements with no ambiguity.

### How to present options

For each decision point, present 2-3 concrete options with visual schemas.

**For UX decisions — ASCII wireframes:**

```
AskUserQuestion(
  questions=[{
    "question": "[What the decision is about — in simple terms]",
    "header": "[Short label]",
    "options": [
      {
        "label": "[Option 1 name]",
        "description": "[What this means + ASCII wireframe if it fits in 3-5 lines]\n\n┌─────────────┐\n│   Email     │\n│ [Get link]  │\n│ ── or ──    │\n│ [Telegram]  │\n└─────────────┘"
      },
      {
        "label": "[Option 2 name]",
        "description": "[What this means + wireframe]"
      },
      {
        "label": "[Option 3 name]",
        "description": "[What this means + wireframe]"
      }
    ],
    "multiSelect": false
  }]
)
```

**For architectural decisions — flow diagrams:**

If the schema is too complex for AskUserQuestion description fields (more than 5-6 lines), draw it in the chat first, then ask:

```
Present in chat:

## Option A: Polling
  Client ──GET /status──▶ Server ──▶ DB
  Client ◀──200 JSON────── Server
  (repeat every 5s)

## Option B: WebSocket
  Client ◀═══ws═══▶ Server ──▶ DB
  (real-time push, persistent connection)

## Option C: SSE
  Client ◀──stream──── Server ──▶ DB
  (server pushes, client listens, HTTP-based)

Then:
AskUserQuestion(
  questions=[{
    "question": "Which approach fits better for real-time updates?",
    "header": "Architecture",
    "options": [
      {"label": "Polling", "description": "Simplest. Works everywhere. 5s delay."},
      {"label": "WebSocket", "description": "Instant. But needs infrastructure (connection management, reconnect)."},
      {"label": "SSE", "description": "Middle ground. Real-time over HTTP. Already used in chat streaming."}
    ],
    "multiSelect": false
  }]
)
```

### Rules

- **Max 3 decision points per feature.** If there are more, bundle related ones or make the call yourself for less important ones.
- **Always show 2-3 options, never 1.** If there's only one viable option, don't ask — just do it.
- **Explain trade-offs, not implementation details.** The user is deciding WHAT, not HOW. "Faster but harder to change later" > "Uses Redis pub/sub with TTL-based expiration."
- **Include a "Your call" option** if the decision is purely technical and the user might not care.
- **After user picks:** Update the relevant task descriptions with the chosen approach (TaskUpdate). Add the decision to DECISIONS.md if it exists.
- **Wireframes should be rough and fast** — box-drawing characters, simple text layout. Not art. Enough to see the structure.

### Example wireframe vocabulary

```
Page layouts:           Flow diagrams:          Data relationships:
┌───────────────┐       A ──▶ B ──▶ C          User ──1:N──▶ Project
│  Header       │       A ──▶ B                 Project ──1:N──▶ Entity
├───────────────┤            └──▶ C             Entity ──M:N──▶ Tag
│ Sidebar │ Main│       
│         │     │       States:
│         │     │       [Draft] ──▶ [Active] ──▶ [Archived]
└───────────────┘              └──▶ [Deleted]
```

## Step 4b: Risk Analysis (MEDIUM and COMPLEX only)

After plan validation (Tech Lead for MEDIUM, Architect debate for COMPLEX), run a pre-implementation risk analysis.

**Skip this step for SIMPLE tasks.**

1. **Tech Lead / Primary Architect identifies risks:**
   ```
   SendMessage to {tech-lead (MEDIUM) / primary architect (COMPLEX)}:
   "IDENTIFY RISKS: Review the validated task list and identify what could go wrong during implementation.

   For each risk:
   - What could break or go wrong?
   - Which tasks are affected?
   - Severity: CRITICAL (data loss, security hole, breaks production) / MAJOR (logic bugs, integration failures) / MINOR (edge cases, suboptimal patterns)
   - What should a risk tester investigate in the codebase to verify this risk?

   Format:
   RISK-1: [description]
     Severity: CRITICAL
     Affected tasks: #1, #3
     Verify: [specific things to check — files to read, code paths to trace, constraints to validate]

   RISK-2: [description]
     Severity: MAJOR
     Affected tasks: #2
     Verify: [what to check]

   Focus on: data integrity, auth/security implications, breaking changes to existing features,
   integration points between tasks, missing edge cases, performance implications, external API contracts.

   Return at least 3 risks, prioritized by severity."
   ```

2. **Spawn risk testers** (one-shot, parallel — one per CRITICAL/MAJOR risk):

   Risk testers use the dedicated `agent-teams:risk-tester` agent type (defined in `agents/risk-tester.md`).
   Unlike reviewers, they can **write and run test scripts** for empirical verification.

   ```
   Task(
     subagent_type="agent-teams:risk-tester",
     prompt="RISK: {risk description from Tech Lead}
   SEVERITY: {severity}
   AFFECTED TASKS: {task IDs and their descriptions}
   WHAT TO VERIFY: {verification instructions from Tech Lead}
   RELEVANT CODE: {file paths from researcher findings that relate to this risk}"
   )
   ```

   Spawn risk testers for all CRITICAL risks and up to 3 MAJOR risks. Skip MINOR risks.
   Launch them **in parallel** — each investigates independently.

   **Reference for risk testers:** If needed, Lead reads `references/risk-testing-example.md` for the detailed case study pattern. Only load this reference when spawning risk testers — not at initialization.

3. **Forward findings to Tech Lead / Primary Architect** for review and plan updates:
   ```
   SendMessage to {tech-lead (MEDIUM) / primary architect (COMPLEX)}:
   "RISK ANALYSIS RESULTS:

   {paste all risk tester findings}

   Based on these findings:
   1. Update DECISIONS.md with confirmed risks and their mitigations
   2. For CONFIRMED risks: add mitigation criteria to affected task descriptions (use TaskUpdate to append to description)
   3. If any risk requires task reordering or new tasks — recommend changes

   Reply with summary of changes made."
   ```

4. **Lead applies recommendations:**
   - If new tasks suggested → create them (TaskCreate)
   - If reordering suggested → adjust dependencies (TaskUpdate)
   - If a risk requires user decision (e.g., "accept data loss during migration or add backward compatibility?") → notify user
   - **Update VERIFICATION_PLAN.md** — add confirmed risk mitigations to the "Risk Mitigation Checks" section:
     ```
     ## Risk Mitigation Checks
     - [ ] RISK-1 ({severity}): {what to verify — from risk tester findings}
     - [ ] RISK-2 ({severity}): {what to verify}
     ```

**What risk analysis catches that review doesn't:**

| Risk Analysis (BEFORE code) | Review (AFTER code) |
|------------------------------|---------------------|
| "This endpoint will break the mobile app" | "This endpoint has a typo in the response" |
| "The migration will delete user data" | "The migration has a syntax error" |
| "Auth middleware won't cover the new routes" | "Auth check is missing on line 42" |
| "Two tasks will create conflicting DB columns" | "This column name doesn't match convention" |

## Step 5: Spawn Team and Write State File

Spawn everyone NOW — reviewers (or switch architects to review mode), and coders.

### 1. Reviewers

**For SIMPLE** — spawn unified reviewer:
```
Task(subagent_type="agent-teams:unified-reviewer", team_name="feature-<short-name>", name="unified-reviewer",
  prompt="You are the unified reviewer for team feature-<short-name>.

FEATURE CONTEXT:
Feature: {feature description — what we're building and why}
Definition of Done: {DoD from Step 3}
Gold standard references: {list reference files from researcher findings or .conventions/}

Wait for REVIEW requests from coders via SendMessage.
When reviewing, verify code matches the gold standard patterns and meets the Definition of Done.
If code touches auth/payments/migrations, send ESCALATE TO MEDIUM to Lead.")
```

**For MEDIUM** — spawn all 3 reviewers in parallel. Include feature context, DoD, gold standards, and confirmed risks:
```
Task(subagent_type="agent-teams:security-reviewer", team_name="feature-<short-name>", name="security-reviewer",
  prompt="You are the security reviewer for team feature-<short-name>.

FEATURE CONTEXT:
Feature: {feature description — what we're building and why}
Definition of Done: {DoD from Step 3}
Gold standard references: {list reference files from researcher findings or .conventions/}
Confirmed risks from risk analysis: {list CONFIRMED risks from Step 4b, especially security-related}

Wait for REVIEW requests from coders via SendMessage.
Pay special attention to the confirmed risks above — verify that code properly addresses their mitigations.")

Task(subagent_type="agent-teams:logic-reviewer", team_name="feature-<short-name>", name="logic-reviewer",
  prompt="You are the logic reviewer for team feature-<short-name>.

FEATURE CONTEXT:
Feature: {feature description — what we're building and why}
Definition of Done: {DoD from Step 3}
Gold standard references: {list reference files from researcher findings or .conventions/}
Confirmed risks from risk analysis: {list CONFIRMED risks from Step 4b, especially logic/race-condition risks}

Wait for REVIEW requests from coders via SendMessage.
Pay special attention to the confirmed risks above — verify that code properly addresses their mitigations.")

Task(subagent_type="agent-teams:quality-reviewer", team_name="feature-<short-name>", name="quality-reviewer",
  prompt="You are the quality reviewer for team feature-<short-name>.

FEATURE CONTEXT:
Feature: {feature description — what we're building and why}
Definition of Done: {DoD from Step 3}
Gold standard references: {list reference files from researcher findings or .conventions/}

Wait for REVIEW requests from coders via SendMessage.
Verify code matches the gold standard patterns and project conventions.")
```

**For COMPLEX** — switch architects to review mode (already spawned from Step 4c):
```
SendMessage to architect-frontend, architect-backend, architect-systems:
"SWITCH TO REVIEW MODE. The debate phase is complete.

You are now reviewing code from coders in your domain:
- architect-frontend: UI, components, accessibility, client-side security
- architect-backend: API, DB, data integrity, race conditions, server-side security
- architect-systems: tests, conventions, naming, code quality, DX

CONFIRMED RISKS FROM RISK ANALYSIS:
{List confirmed risks from Step 4b — verify that code properly addresses their mitigations during review}

Wait for REVIEW requests from coders via SendMessage."
```

No separate security/logic/quality reviewers for COMPLEX — architects cover all review areas through their domain expertise.

### 2. Coders (up to --coders in parallel, uses `agents/coder.md`)

**Enforcement:** Count available tasks. Spawn min(available_tasks, --coders) coders. Do NOT exceed --coders (default 3) at initial spawn.

Tell each coder their team roster so they can communicate directly:

**For SIMPLE/MEDIUM:**
```
Task(
  subagent_type="agent-teams:coder",
  team_name="feature-<short-name>",
  name="coder-<N>",
  prompt="You are Coder #{N}. Team: feature-<short-name>.

FEATURE GOAL: {1-2 sentences — what we're building and why, so you understand the big picture}
DEFINITION OF DONE: {DoD from Step 3}

YOUR TEAM ROSTER (communicate directly via SendMessage):
- Reviewers: {unified-reviewer (SIMPLE) / security-reviewer, logic-reviewer, quality-reviewer (MEDIUM)}
- Tech Lead: tech-lead
- Lead: for DONE/STUCK signals only

IMPORTANT: If DECISIONS.md exists at .claude/teams/{team-name}/DECISIONS.md — read it before starting. It contains architectural decisions, confirmed risks, and their mitigations that affect your implementation.

YOUR TASK CONTEXT:
{Brief summary of what this coder will work on — from task descriptions}

--- GOLD STANDARD EXAMPLES ---
{GOLD STANDARD BLOCK compiled by Lead in Step 3}
--- END GOLD STANDARDS ---

Claim your first task from the task list and start working."
)
```

For SIMPLE tasks, tell coders: `Reviewers: unified-reviewer` (no separate reviewers, no tech-lead in roster).

**For COMPLEX:**
```
Task(
  subagent_type="agent-teams:coder",
  team_name="feature-<short-name>",
  name="coder-<N>",
  prompt="You are Coder #{N}. Team: feature-<short-name>.

FEATURE GOAL: {1-2 sentences — what we're building and why, so you understand the big picture}
DEFINITION OF DONE: {DoD from Step 3}

YOUR TEAM ROSTER (communicate directly via SendMessage):
- Reviewers (specialized architects):
  - architect-frontend: UI, components, accessibility, client-side security
  - architect-backend: API, DB, data integrity, race conditions, server-side security
  - architect-systems: tests, conventions, naming, code quality
- Primary Architect: {primary architect name} (escalations, architectural decisions)
- Lead: for DONE/STUCK signals only

Send REVIEW requests to ALL 3 architects — each reviews from their domain.

IMPORTANT: Read DECISIONS.md at .claude/teams/{team-name}/DECISIONS.md before starting — it contains the architect debate summary, confirmed risks, and mitigations that affect your implementation.

YOUR TASK CONTEXT:
{Brief summary of what this coder will work on — from task descriptions}

--- GOLD STANDARD EXAMPLES ---
{GOLD STANDARD BLOCK compiled by Lead in Step 3}
--- END GOLD STANDARDS ---

Claim your first task from the task list and start working."
)
```

### 3. Write Initial State File (for compaction resilience)

```
Write(".claude/teams/{team-name}/state.md"):

# Team State — feature-{name}

## Recovery Instructions
If you lost context after compaction, read this file.
- Check current phase below and follow its instructions
- Update this file after each event

## Phase: EXECUTION
## Complexity: {SIMPLE | MEDIUM | COMPLEX}
## Team Name: feature-{short-name}

## Phase 2 Instructions (EXECUTION)
Your role: listen for DONE/STUCK/ESCALATE from team members.
- DO NOT read code, run checks, or notify reviewers — coders do that directly
- Update this file after each event
- When ALL coding tasks show COMPLETED → change Phase to VERIFICATION and follow Phase 3 instructions below

## Phase 3 Instructions (VERIFICATION) — follow step by step when Phase changes
When you change Phase to VERIFICATION, execute these steps IN ORDER:

### Step 1: Conventions task
- Check TaskList for the conventions task — assign to a coder if not yet assigned
- Wait for it to complete

### Step 2: Final checks
- Ask Tech Lead / Primary Architect for cross-task consistency check
- Verify .conventions/ exists: Glob(".conventions/**/*")

### Step 3: Prepare verification plan
- Read .claude/teams/{team-name}/VERIFICATION_PLAN.md
- Update with actual file paths and endpoints from completed tasks

### Step 4: Integrated verification (team is still alive!)
- Parse VERIFICATION_PLAN.md sections, pre-flight check (curl dev server)
- Spawn ci-verifier + browser-verifier + spec-verifier in parallel via Task()
- Collect results + integrity audit
- If FAIL items → create fix tasks for coders → re-verify (max 3 iterations)
- Compile progressive verification report
- Save to .claude/teams/{team-name}/VERIFICATION_REPORT.md

### Step 5: Shutdown & report
- Print summary report with verification results
- SendMessage(type="shutdown_request") to all permanent teammates
- TeamDelete
- Present Human Checks to user via AskUserQuestion (items that couldn't be auto-verified)

## Team Roster
### SIMPLE/MEDIUM:
- tech-lead: {ACTIVE | NOT_SPAWNED}
- security-reviewer: {ACTIVE | NOT_SPAWNED}
- logic-reviewer: {ACTIVE | NOT_SPAWNED}
- quality-reviewer: {ACTIVE | NOT_SPAWNED}
- unified-reviewer: {ACTIVE | NOT_SPAWNED}
### COMPLEX:
- architect-frontend: {ACTIVE | NOT_SPAWNED} {PRIMARY if designated}
- architect-backend: {ACTIVE | NOT_SPAWNED} {PRIMARY if designated}
- architect-systems: {ACTIVE | NOT_SPAWNED} {PRIMARY if designated}

## Tasks
- #{id}: {subject} — {STATUS} ({assignment})

## Active Coders: {N} (max: {M})
```

Coders drive their own review process via SendMessage to reviewers and tech-lead. Lead is NOT in the review loop.
