# Phase 1: Discovery, Planning & Setup — Detailed Protocol

> Print points are marked 📢 — at each one, Lead prints a short feed update to chat (user's language, product terms). See "Progress Feed" in SKILL.md for principles.

## Step 0: 📢 Kickoff Roadmap

Before anything else, print a one-block roadmap so the user knows what to expect and where the run currently is:

```
🚀 Launching the team. Route: research → complexity assessment → plan → risk analysis → implementation → verification.
I'll report at every step — interrupt me anytime if something looks wrong.
```

(Complexity isn't known yet — this is the generic route. SIMPLE runs will just skip steps; no need to re-print the map.)

## Step 0b: Resolve Engines

`Read ~/.claude/agent-teams.json`.

- **File missing** (the normal case) → every role runs on Claude. **Stop here, print nothing.** No probing, no extra tool calls. The rest of this document then applies verbatim, unchanged.
- **`--engines=off`, or `"enabled": false`, or invalid JSON** → same: all Claude. On invalid JSON print one warning line.
- **Otherwise** → follow `references/engines.md` "Step 0b": probe only the CLIs named in `roles` with a single `command -v` call, build the role→engine table, record it in state.md under `## Engines`, and print the 📢 line.

**Applying the table at every spawn point below.** Before every `Task()` in this document, check the engine of the role it spawns. Two spawns do not carry an `agent-teams:` type but are still roles in the registry: the web-research `Task(subagent_type="general-purpose", ...)` in Step 2 is the `web-researcher` role, and the Phase 3 `Task(subagent_type="Explore", ...)` safety scan is the `legacy-scanner` role.

| Engine | One-shot role (researchers, risk-tester, verifiers, legacy scan) | Teammate role (reviewers, tech-lead, architects, coder) |
|--------|------------------------------------------------------------------|----------------------------------------------------------|
| `claude` (default) | `Task()` exactly as written | `Task()` exactly as written |
| external | **No `Task()`.** Write the same prompt to a file and run the CLI via Bash — `engines.md` Mechanic A | `Task(subagent_type="agent-teams:proxy-teammate", name="<same role name>", ...)` with the role's own agent file pasted in as the role brief — `engines.md` Mechanic B |

The prompts printed in this document are the source of truth for both paths — an external engine receives the *same* prompt text, plus the Output Contract from `engines.md`. Never write a shorter prompt for an external engine.

`lead` and `browser-verifier` ignore any non-Claude assignment.

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

**Optionally spawn a web researcher** if the feature involves a library/pattern you're unsure about (OAuth, real-time, file uploads, etc.):

```
Task(
  subagent_type="general-purpose",
  prompt="Research current best practices for implementing '{specific topic}' in a {framework} project.
  Context: the project uses {stack from brief or codebase researcher}.
  Use WebSearch and/or Context7. Return a CONDENSED recommendation (10-20 lines max):
  recommended approach + why, key library/API, 2-3 pitfalls to watch for, pattern example (pseudocode)."
)
```

Researchers may be dispatched mid-session — but ONLY when genuinely lacking information not already in context (brief, .conventions/, Phase 1 findings). Do NOT dispatch a researcher for every STUCK or QUESTION signal — first check if you can answer from what you already know.

### Save every report you receive

Whatever a researcher, risk tester or verifier returns — Claude subagent or external engine —
**write it to `.claude/teams/{team-name}/reports/` before you act on it**:
`research-{role}.md`, `risk-{n}.md`, `verify-{role}.md`.

A subagent's return value survives only until the next compaction — on disk it stays auditable
(external engines already leave this trail in `engine/`), and you keep just a short digest in context.

### 📢 Research feed

**When dispatching** (skip if no researchers spawned), one line:

```
🔍 Research: 2 researchers exploring the project (stack & structure + reference patterns)
```

**When researchers return**, a 3-4 line digest of what was learned — the user should recognize their own project in it:

```
🔍 Research done: {stack in plain terms}, the feature touches {N} layers ({which, in product terms}).
Reference examples found for {layers}; {missing layer, if any} has no established pattern — we'll be setting a new one.
{One line for anything surprising: unusual structure, missing tests, tangled module — only if genuinely notable.}
```

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

### 📢 Complexity verdict

After the classification block, print the verdict in human terms — why, and what it means for the team:

```
⚖️ Complexity: COMPLEX — touches all 3 layers, has a chain of dependent tasks.
This means: 3 architects debate the plan first, up to 5 coders, risks get verified before any code.
```

(For SIMPLE: "⚖️ Complexity: SIMPLE — one coder + one reviewer, no risk analysis. Fast lane.")

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
- [ ] {Concrete item — NEVER "deploy and watch logs"}
  → {Step-by-step instructions: exact command, exact signal, exact time window}
```

How to populate: Definition of Done from technical quality bar + CLAUDE.md, Business Criteria from brief's Success Criteria, Build/Tests from researcher findings, Browser Checks from UI criteria, Spec Checks from acceptance criteria, Human Checks for anything requiring judgment. Risk Mitigation Checks are added after Step 4b.

**Human Checks quality bar — no vague items allowed.** If tasks touch deploy config, infrastructure, billing, background jobs (pg-boss, queues), database migrations, auth middleware, or anything that only shows up at runtime, every Human Check must follow the template above, plus a failure pattern to reject (e.g., "no `ECONNREFUSED to db-02` in last 10 min"). Vague placeholders like "deploy and verify it works" are banned.

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

**Always create a conventions task as the LAST task** (blocked by all other coding tasks):

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

📢 Before spawning, one line: `📝 Plan drafted: {N} tasks. Tech Lead is validating it now.` (The validation outcome is reported via the Step 4c-4 MEDIUM brief.)

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

Debate protocol, round summaries to Lead, domain verification checks, and convergence (SPEC APPROVED) — follow your agent file."
```

### Step 4c-3: Monitor debate and handle convergence:

📢 **Print debate rounds as they happen.** When ROUND SUMMARY messages arrive from the architects, print a per-round digest — what's being argued and each side's position, one line per persona, in product terms:

```
⚔️ Round 1: debating how to store settings.
• Backend: separate table — cleaner migrations
• Frontend: JSON field — fewer requests
• Systems: separate table is easier to test
```

When positions converge (or Lead breaks a deadlock), close the thread:

```
⚔️ Round 2: agreed on a separate table. Debate settled in 2 rounds.
```

Don't wait for all 3 summaries of a round to print — post what you have when 2+ arrive or when the debate moves on. Skip printing a round if nothing new was argued.

Wait for all 3 architects to send "SPEC APPROVED" to Lead. If they converge:
- Collect all recommendations
- Apply agreed changes to task descriptions (TaskUpdate)
- Designate the **most relevant architect as Primary** based on feature type:
  - Feature is mostly UI → architect-frontend is Primary
  - Feature is mostly API/DB → architect-backend is Primary
  - Feature is cross-cutting/infra → architect-systems is Primary
- **Compile VERIFICATION_PLAN.md** from all architects' verification checks + brief + DoD. Same template as Step 3. Populate: Build & Types / Tests ← architect-systems; Browser Checks ← architect-frontend; Spec Checks ← architect-backend (plus architect-systems config/convention checks); Human Checks ← anything architects flagged as not automatable.

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

### Step 4c-4: MANDATORY Plan Brief to User (HARD GATE — COMPLEX)

**This is not optional.** Before moving on, Lead MUST present a short human-readable brief in chat — the user has been silent since the interview and has no idea what was debated or decided.

Print to chat (not inside AskUserQuestion):

```
══════════════════════════════════════════════════
PLAN READY — architects converged
══════════════════════════════════════════════════

Feature: {feature name}
Complexity: COMPLEX ({N} architects, {M} rounds of debate)

## Tasks ({N} total)
1. {task title} — {one-line intent}
2. {task title} — {one-line intent}
...

## Key decisions from architect debate
- {decision 1 — what was chosen and why, 1-2 sentences}
- {decision 2}
- {decision 3}
(Cite the architect persona that drove each: "Backend Architect: chose X over Y because Z")

## What this will change in the codebase
- {files/modules most affected, 2-3 bullets}
- {migrations / schema / infra changes, if any}

## What's NOT in scope
{From brief's Exclusions + anything architects explicitly deferred}

## Open questions for you
{If any — list them. Otherwise say "None — proceeding to Step 4a design options if applicable."}
══════════════════════════════════════════════════
```

After printing this brief, immediately proceed to Step 4a (design options). The brief exists so the user can (a) interrupt if something is wrong, and (b) have context for the Step 4a buttons that follow.

**For MEDIUM:** Run a shorter version of this same checkpoint after Tech Lead validates the plan. Print a 5-8 line summary: "Plan validated. Tasks: ... Key approach: ... Proceeding to risk analysis." The user still needs to see *something* after Tech Lead review.

**For SIMPLE:** Skip this checkpoint — SIMPLE features are small enough that the upfront task list is sufficient.

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

**For architectural decisions** — same pattern with flow diagrams. If the schema is too long for the AskUserQuestion description fields (more than 5-6 lines), draw it in chat first, then ask with short labels.

### Rules

- **Max 3 decision points per feature.** If there are more, bundle related ones or make the call yourself for less important ones.
- **Always show 2-3 options, never 1.** If there's only one viable option, don't ask — just do it.
- **Explain trade-offs, not implementation details.** The user is deciding WHAT, not HOW. "Faster but harder to change later" > "Uses Redis pub/sub with TTL-based expiration."
- **Include a "Your call" option** if the decision is purely technical and the user might not care.
- **After user picks:** Update the relevant task descriptions with the chosen approach (TaskUpdate). Add the decision to DECISIONS.md if it exists.
- **Wireframes should be rough and fast** — box-drawing characters, simple text layout. Not art. Enough to see the structure.

## Step 4b: Risk Analysis (MEDIUM and COMPLEX only)

After plan validation (Tech Lead for MEDIUM, Architect debate for COMPLEX), run a pre-implementation risk analysis.

**Skip this step for SIMPLE tasks.**

1. **Tech Lead / Primary Architect identifies risks:**
   ```
   SendMessage to {tech-lead (MEDIUM) / primary architect (COMPLEX)}:
   "IDENTIFY RISKS: Review the validated task list — what could go wrong during implementation?
   Focus on: data integrity, auth/security implications, breaking changes to existing features,
   integration points between tasks, missing edge cases, performance, external API contracts.
   For each risk, say what a risk tester should investigate in the codebase to verify it."
   ```

1b. 📢 **Print the risk list** when it arrives — severity in human terms, before spawning testers:

   ```
   ⚠️ {Tech Lead / Primary Architect} identified {N} risks. Verifying the serious ones before writing any code:
   1. {risk in product language} — critical
   2. {risk} — critical
   3. {risk} — moderate (not verified separately, watched during review)
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

   **If `risk-tester` is on an external engine** (Step 0b table): no `Task()` — write this exact prompt to `.claude/teams/{team}/engine/risk-tester-{n}.prompt.md`, append the Output Contract from `engines.md`, and run the CLI with the **write** sandbox in background (risk testers create throwaway scripts — tell the engine to keep them in `.claude/teams/{team}/tmp/`). Read the report as you would the agent's return value. A report without the script and its actual output is not a verdict — resume the session and ask for the evidence.

2b. 📢 **Print each verdict** as risk tester results come back — what was found and what it changes:

   ```
   🧪 Risk 1 CONFIRMED: real API limit is 2 req/s, not the documented 5. Lowering parallelism.
   🧪 Risk 2 not confirmed: all existing users have the field populated — migration is safe.
   ```

3. **Forward findings to Tech Lead / Primary Architect** for review and plan updates:
   ```
   SendMessage to {tech-lead (MEDIUM) / primary architect (COMPLEX)}:
   "RISK ANALYSIS RESULTS:
   {paste all risk tester findings}
   Update the plan per your protocol. Reply with summary of changes made."
   ```

4. **Lead applies recommendations:**
   - If new tasks suggested → create them (TaskCreate)
   - If reordering suggested → adjust dependencies (TaskUpdate)
   - If a risk requires user decision (e.g., "accept data loss during migration or add backward compatibility?") → notify user
   - 📢 Close the risk step with one line on what changed: `📝 Plan adjusted: +1 task (request queue), confirmed risks added to the verification checklist.` (If nothing changed: `📝 Plan unchanged — no confirmed risks required it.`)
   - **Update VERIFICATION_PLAN.md** — add confirmed risk mitigations to the "Risk Mitigation Checks" section:
     ```
     ## Risk Mitigation Checks
     - [ ] RISK-1 ({severity}): {what to verify — from risk tester findings}
     - [ ] RISK-2 ({severity}): {what to verify}
     ```

## Step 5: Spawn Team and Write State File

Spawn everyone NOW — reviewers (or switch architects to review mode), and coders.

**Engine check before every spawn in this step.** For any teammate role assigned to an external engine, swap `subagent_type` to `agent-teams:proxy-teammate`, keep `name` and `team_name` identical, and prepend to the prompt below:

```
ROLE: {role id}
ENGINE: {engine name}, cmd/resume/session pattern: {from engines.md presets, with user overrides applied}
SANDBOX: read-only   (coder: workspace-write + explicit allowed-file list)

--- ROLE BRIEF (follow literally) ---
{agents/{role}.md prepared per "Preparing the Role Brief" in engines.md — body and <example> blocks verbatim, tools/model frontmatter dropped, SendMessage instructions translated. Never a summary.}
--- END ROLE BRIEF ---
```

Then the normal prompt text follows unchanged. The roster other teammates see is identical — coders address `security-reviewer` either way.

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

**For MEDIUM** — spawn all 3 reviewers in parallel from one template, {role} = security-reviewer / logic-reviewer / quality-reviewer:
```
Task(subagent_type="agent-teams:{role}", team_name="feature-<short-name>", name="{role}",
  prompt="You are the {security | logic | quality} reviewer for team feature-<short-name>.

FEATURE CONTEXT:
Feature: {feature description — what we're building and why}
Definition of Done: {DoD from Step 3}
Gold standard references: {list reference files from researcher findings or .conventions/}
Confirmed risks from risk analysis: {CONFIRMED risks from Step 4b relevant to this reviewer's domain}

Wait for REVIEW requests from coders via SendMessage.
Pay special attention to the confirmed risks above — verify that code properly addresses their mitigations.")
```

For quality-reviewer, omit the confirmed-risks line and the last sentence — instead: "Verify code matches the gold standard patterns and project conventions."

**For COMPLEX** — architects hand over and stand down; fresh reviewers take over code review.

Architects are excellent at the debate and terrible value in review, and the reason is mechanical:
by the time review starts they carry the whole debate transcript, so every review turn costs several
times what a debate turn cost. Measured on a real run: an architect's debate turns cost ~36k each,
its review turns ~143k each — same agent, same work, four times the price. Across two runs the three
architects consumed 54% and 69% of the entire run, against 12–17% for all coders combined.

So: keep the debate, end the tenure.

**Step 5a-1 — collect a review brief from each architect** (this is where their domain expertise is
preserved), then let them go:

```
SendMessage to architect-frontend, architect-backend, architect-systems:
"DEBATE COMPLETE — HAND OVER AND STAND DOWN.

Write a review brief for your domain to
.claude/teams/{team-name}/reports/review-brief-{your-name}.md — at most 25 lines:
- what a reviewer must check in your domain for THIS feature specifically
- the traps you identified during the debate and where they would surface
- which files or boundaries deserve extra suspicion

This brief replaces you in the review phase, so write what a competent reviewer could not derive
from the task and the gold standards alone. Then send DONE and stop working."
```

**Step 5a-2 — the Primary Architect stands down too.** The "Primary" designation matters only
during the debate, as the tiebreaker; once the spec is approved there is nothing left that needs a
session-long architect. Measured across real runs, the post-debate architect was invoked **twice** —
two escalations, zero review-loop arbitrations. Keeping an agent alive for the whole run to answer
twice is the same mistake as keeping architects on for review, just quieter.

Its duties are reassigned:

| Duty | Now handled by |
|------|----------------|
| Coder escalations ("this pattern doesn't fit") | **Lead** — this is a scope-and-plan decision, and Lead owns both |
| Review-loop arbitration | **Lead** — both sides state their position in a few lines; Lead rules on which matches the plan |
| DECISIONS.md | **Lead** — it already maintains state.md |
| Phase 3 cross-task consistency | **A one-shot consistency checker** — reads the final diff, reports, dies (Phase 3 Step 2) |

Only the last one genuinely needs to read code, and a one-shot agent does it with a narrow context
instead of carrying a debate transcript through the whole run.

**Step 5a-3 — spawn reviewers** exactly as for MEDIUM (see the three `Task(...)` blocks above), with
the architects' briefs added to each prompt:

```
--- REVIEW BRIEFS FROM THE ARCHITECT DEBATE ---
{contents of reports/review-brief-*.md — all three, they are 25 lines each}
--- END BRIEFS ---
```

Reviewers start narrow (~90k) and stay narrow, which is the entire point of the swap.

### 2. Coders (up to --coders in parallel, uses `agents/coder.md`)

**Enforcement:** Count available tasks. Spawn min(available_tasks, --coders) coders. Do NOT exceed --coders (default 5) at initial spawn.

**Before spawning, check what else is in the working tree.** Run `git status --short`. Any modified
or untracked file that is NOT part of this feature belongs to someone else — another agent team, or
the user's own work in progress. Uncommitted work exists in exactly one place, so a coder that
sweeps it into a commit (or wipes it while cleaning up) destroys something with no copy anywhere.

Coders already have rules against `git add .` and against every reset/checkout/stash/clean command,
but a rule cannot protect a file the coder does not know exists. If `git status` shows foreign
changes, add this to **every** coder prompt below — engine-independent, it applies to Claude coders
too:

```
FOREIGN CHANGES IN THE WORKING TREE — do not touch, do not stage, do not clean:
{list of paths from git status that are not part of this feature}

If one of your task's files also appears in that list, someone is editing it alongside you: stage
your commit by building the file's content from its committed version plus your own change, so
their edits stay out of your commit. Report it in your DONE digest.
```

Tell each coder their team roster so they can communicate directly. One prompt template for all complexities — only the YOUR TEAM ROSTER block varies:

```
Task(
  subagent_type="agent-teams:coder",
  team_name="feature-<short-name>",
  name="coder-<N>",
  prompt="You are Coder #{N}. Team: feature-<short-name>.

FEATURE GOAL: {1-2 sentences — what we're building and why, so you understand the big picture}
DEFINITION OF DONE: {DoD from Step 3}

YOUR TEAM ROSTER (communicate directly via SendMessage):
{roster block by complexity — see below}

IMPORTANT: If DECISIONS.md exists at .claude/teams/{team-name}/DECISIONS.md — read it before starting. It contains architectural decisions, confirmed risks, and their mitigations that affect your implementation.

YOUR TASK CONTEXT:
{Brief summary of what this coder will work on — from task descriptions}

--- GOLD STANDARD EXAMPLES ---
{GOLD STANDARD BLOCK compiled by Lead in Step 3}
--- END GOLD STANDARDS ---

Claim your first task from the task list and start working."
)
```

**Roster block by complexity:**

- **SIMPLE:**
  ```
  - Reviewers: unified-reviewer
  - Lead: for DONE/STUCK signals only
  ```
- **MEDIUM:**
  ```
  - Reviewers: security-reviewer, logic-reviewer, quality-reviewer
  - Tech Lead: tech-lead
  - Lead: for DONE/STUCK signals only
  ```
- **COMPLEX:**
  ```
  - Reviewers: security-reviewer, logic-reviewer, quality-reviewer
    (the architects handed over review briefs and stood down — do NOT message them)
  - Primary Architect: {primary architect name} — escalations and architectural decisions ONLY,
    not per-task code review. Do not send REVIEW requests there.
  - Lead: for DONE/STUCK signals only
  ```
  For COMPLEX, also make the DECISIONS.md line unconditional: "Read DECISIONS.md at .claude/teams/{team-name}/DECISIONS.md before starting — it contains the architect debate summary, confirmed risks, and mitigations that affect your implementation."

### 3. Initialize Legacy Report

Create an empty legacy report so coders have a single place to append findings during implementation:

```
Write(".claude/teams/{team-name}/LEGACY_REPORT.md"):

# Legacy Report — feature-{name}

Coders append entries here when their task replaces, rewrites, or supersedes existing behavior and leaves old code behind. Lead reads this in Phase 3 and asks the user what to do with each item.

---
(no entries yet)
```

### 4. Write Initial State File (for compaction resilience)

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
- Print a progress feed line to chat for each event — task digests, decisions, stuck reports (see phase2-monitoring.md event table). The user is watching the run live.
- When ALL coding tasks show COMPLETED → change Phase to VERIFICATION and follow Phase 3 instructions below

## Phase 3 Instructions (VERIFICATION) — follow step by step when Phase changes
When you change Phase to VERIFICATION, execute IN ORDER (full details: references/phase3-verification.md):
1. Conventions task — assign to a coder if unassigned, wait for completion
2. Final checks — cross-task consistency via Tech Lead / Primary Architect; verify .conventions/ exists
3. Prepare verification plan — read VERIFICATION_PLAN.md, update with actual paths/endpoints
4. Integrated verification — spawn ci-verifier + browser-verifier + spec-verifier in parallel, fix-verify loop for FAIL items (max 3 iterations), save VERIFICATION_REPORT.md
5. Legacy cleanup — read LEGACY_REPORT.md + Explore scan, AskUserQuestion Delete/Keep/Later per item, cleanup tasks or .legacy-todo.md
6. Summary & shutdown — final report, shutdown_request to all teammates, TeamDelete, present Human Checks via AskUserQuestion

## Engines
{Omit this whole section if no config file exists — the default is Claude everywhere.}
- {role}: {engine} {(fallback applied: <reason>) if it fell back}
- fallback policy: {claude | fail}

## Team Roster
### SIMPLE/MEDIUM:
- tech-lead: {ACTIVE | NOT_SPAWNED}
- security-reviewer: {ACTIVE | NOT_SPAWNED}
- logic-reviewer: {ACTIVE | NOT_SPAWNED}
- quality-reviewer: {ACTIVE | NOT_SPAWNED}
- unified-reviewer: {ACTIVE | NOT_SPAWNED}
### COMPLEX:
- architect-frontend: {DEBATING | STOOD_DOWN | ACTIVE if PRIMARY} {PRIMARY if designated}
- architect-backend: {DEBATING | STOOD_DOWN | ACTIVE if PRIMARY} {PRIMARY if designated}
- architect-systems: {DEBATING | STOOD_DOWN | ACTIVE if PRIMARY} {PRIMARY if designated}
- security-reviewer / logic-reviewer / quality-reviewer: {ACTIVE | NOT_SPAWNED}
  (spawned at Step 5a-3, after the architects handed over)

## Tasks
- #{id}: {subject} — {STATUS} ({assignment})

## Active Coders: {N} (max: {M})
```

### 5. 📢 Team Assembled

After spawning everyone and writing state.md, print one line — composition in human terms, and set the expectation for the ticker:

```
👥 Team assembled: 3 architects (now acting as reviewers), 4 coders. Writing code — you'll see a line here for every completed task, decision, and problem.
```

Coders drive their own review process via SendMessage to reviewers and tech-lead. Lead is NOT in the review loop.
