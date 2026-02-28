---
name: brief
description: "This skill should be used when the user asks to 'interview before building', 'discuss feature before implementation', 'team feature with interview', 'ask me questions first', or invokes /brief. Conducts a short adaptive interview (2-6 questions) to understand intent, then launches /build with a compiled brief."
model: opus
---

# Brief — Adaptive Interview Before Implementation

Conduct a short adaptive interview to understand the user's intent, then compile a brief and hand off to `/build`.

## Core Principle: Ask Only What AI Cannot Infer

`/build` is fully autonomous — it scans the codebase, determines tech stack, finds patterns, classifies complexity, identifies risks, and plans tasks. It does NOT need help with technical details.

The interview exists for ONE reason: to capture **intent and business context** that no amount of code scanning can reveal. Every question must pass this test: "Can the AI figure this out from the codebase?" If yes — don't ask.

**What AI can infer (DO NOT ASK):** tech stack, affected files, architecture, risks, complexity, testing strategy, implementation approach, existing patterns.

**What AI cannot infer (ASK):** what to build, why it matters, who it's for, what success looks like, what's out of scope.

## Protocol

- One question at a time via `AskUserQuestion`
- Buttons (predefined options) wherever possible — minimize typing
- Skip questions already answered in the user's initial message
- Conversational tone, no technical jargon
- Total interview: 2-6 questions, under 5 minutes

**HARD GATE:** No implementation until brief is compiled and approved by the user.

---

## Phase 0: Project Study (parallel, while greeting user)

Launch researchers to understand the project. Use findings to generate smart button options.

```
// Launch in parallel:

Task(subagent_type="team:codebase-researcher",
  prompt="Quick scan: tech stack, project structure, existing features (brief list), conventions.")

Task(subagent_type="team:codebase-researcher",
  prompt="Find user-facing features: pages/screens, user roles, key user flows, settings.")

Task(subagent_type="team:codebase-researcher",
  prompt="Architecture layers: data sources, main modules/domains, most complex areas, tests.")
```

While waiting, greet the user:

> I'll ask a few quick questions to make sure I build exactly what you need. Takes 2-3 minutes.

When researchers return, show a brief project summary and use findings to populate button options in subsequent questions.

---

## Phase 1: Core Questions (2-4 questions, adaptive)

### Q1 — Intent (always ask, unless initial message is already detailed)

**"What will change when this works — and for whom?"**

```
AskUserQuestion(
  questions=[{
    "question": "What should change when this feature works? Who will notice the difference?",
    "header": "Feature",
    "options": [
      // Generate 2-3 options from researcher findings if relevant, e.g.:
      // {"label": "Improve [existing feature]", "description": "Make [X] work better for [users]"},
      // {"label": "Add new [capability]", "description": "Users will be able to [Y]"},
    ],
    "multiSelect": false
  }]
)
```

This question combines WHAT, WHY, and WHO in one. Situational framing forces concrete thinking — "reporting system" becomes "clients can export last month's invoices as PDF."

**If the answer is vague** (< 15 words or abstract like "improve the dashboard"):
Apply Branch B — propose 2-3 hypotheses as buttons:

```
AskUserQuestion(
  questions=[{
    "question": "I want to make sure I understand. Which of these is closest?",
    "header": "Clarify",
    "options": [
      {"label": "[Hypothesis A]", "description": "[What this would mean concretely]"},
      {"label": "[Hypothesis B]", "description": "[What this would mean concretely]"},
      {"label": "[Hypothesis C]", "description": "[What this would mean concretely]"}
    ],
    "multiSelect": false
  }]
)
```

Generate hypotheses from: the user's words + researcher findings about the project.

### Q2 — Audience (only if Q1 didn't reveal who it's for)

**"Who will use this most?"**

Build options from researcher findings (existing user roles, pages, flows):

```
AskUserQuestion(
  questions=[{
    "question": "Who will use this most?",
    "header": "Audience",
    "options": [
      // Dynamic from researcher findings, e.g.:
      {"label": "All users", "description": "Everyone who uses the product"},
      {"label": "[Role from project]", "description": "[Description]"},
      {"label": "[Role from project]", "description": "[Description]"}
    ],
    "multiSelect": true
  }]
)
```

### Q3 — Success criteria (only if Q1 was abstract)

**"How will you know it's working?"**

If Q1 was specific ("clients can export invoices as PDF"), success criteria are implicit — SKIP. If Q1 was abstract ("improve the dashboard"), this question is essential.

```
AskUserQuestion(
  questions=[{
    "question": "How will you know this feature is working? What's the clearest sign of success?",
    "header": "Success",
    "options": [
      {"label": "Users can do [X]", "description": "A specific action becomes possible"},
      {"label": "Something gets faster/easier", "description": "An existing process improves"},
      {"label": "Complaints stop", "description": "A known pain point goes away"},
      {"label": "I'll describe it", "description": "I have specific criteria in mind"}
    ],
    "multiSelect": false
  }]
)
```

### Q4 — Exclusions (optional, ask when scope seems broad)

**"Anything that must NOT be included?"**

Without explicit exclusions, `/build` builds the maximum possible scope. Ask this when the feature description sounds broad or could be interpreted expansively.

```
AskUserQuestion(
  questions=[{
    "question": "Anything that must NOT be part of this? (Things someone might assume are included but shouldn't be)",
    "header": "Exclude",
    "options": [
      {"label": "Nothing specific", "description": "Build what makes sense"},
      {"label": "Don't touch [X]", "description": "Leave [existing area] as is"},
      {"label": "I'll list exclusions", "description": "I have specific things to exclude"}
    ],
    "multiSelect": true
  }]
)
```

---

## Phase 2: AI-Generated Follow-ups (0-2 questions)

After core questions, analyze all answers collected so far. If gaps or ambiguities remain, generate additional questions dynamically. These are NOT from a fixed list — generate them based on context.

### When to generate a follow-up

Analyze answers and researcher findings. Ask a follow-up ONLY when:

- **Ambiguity detected:** The answer could mean two very different things for implementation
- **Contradiction found:** User said X but the project context suggests Y
- **Critical unknown:** Something specific to THIS feature that the AI cannot infer and hasn't been covered
- **User seems to have more context:** Answer hints at deeper knowledge not yet shared

### How to generate follow-ups

Frame every follow-up as a choice with buttons, not an open question. Use AskUserQuestion with 2-4 options that represent the concrete alternatives the AI is weighing.

```
AskUserQuestion(
  questions=[{
    "question": "[Generated question about the specific gap]",
    "header": "[Short label]",
    "options": [
      {"label": "[Option A]", "description": "[What this means for the build]"},
      {"label": "[Option B]", "description": "[What this means for the build]"},
      {"label": "Your call", "description": "Let the team decide"}
    ],
    "multiSelect": false
  }]
)
```

### Examples of good AI-generated follow-ups

- "You mentioned 'admin panel' — should admins see all users' data, or only their team's?" (scope ambiguity)
- "Your project has email notifications for orders. Should this feature also send notifications, or is it display-only?" (context from researcher)
- "This would change how [existing feature] works. Is that intentional, or should the new feature be separate?" (contradiction with codebase)

### What NOT to ask

- Anything about tech stack, architecture, or implementation (agents determine this)
- Risks or complexity (agents assess and mitigate)
- Timeline or deadlines (doesn't affect agent behavior)
- Effort level or priority (agents optimize by default)
- Testing strategy (agents decide based on complexity)

**Maximum 2 follow-ups.** If still unclear after 6 total questions — compile what is known and note uncertainties in the brief.

---

## Phase 3: Brief Compilation, Approval & Handoff

### Step 1: Compile the brief

```markdown
# Feature Brief: [descriptive name]

## Intent
[What should change, for whom, why — from Q1 and any clarifications]

## Audience
[Who will use this — from Q2 or inferred from Q1]

## Success Criteria
[Concrete, observable criteria — from Q3 or inferred from Q1.
Each criterion should be verifiable: "User can do X", "Y is visible on screen", "Z happens when...".
These criteria are the PRIMARY reference for code reviewers.]

## Exclusions
[What NOT to build — from Q4, or "None specified"]

## Additional Context
[Anything from AI-generated follow-ups]

## Project Context
[Condensed summary from researchers: stack, relevant features, key patterns]

---

## Review Checklist (for code reviewers)

Use this section to verify the implementation meets the user's intent:

- [ ] [Success criterion 1 — restated as a checkable item]
- [ ] [Success criterion 2]
- [ ] [...]
- [ ] Exclusions respected: [list what must NOT be present]
```

### Step 2: Show brief and confirm

Present the compiled brief to the user, then ask:

```
AskUserQuestion(
  questions=[{
    "question": "Here's the plan I'll send to the build team. All correct?",
    "header": "Launch?",
    "options": [
      {"label": "Looks good, launch!", "description": "Save the plan and start building"},
      {"label": "I want to adjust", "description": "Let me change something first"}
    ],
    "multiSelect": false
  }]
)
```

If adjustments needed — update brief, show again.

### Step 3: Save brief to file

When the user approves, save the brief as a file in the project root:

```
Write(file_path=".briefs/[feature-name-kebab-case].md", content="{compiled brief}")
```

The file serves two purposes:
1. **For `/build`** — the team reads it as the source of truth for what to build
2. **For reviewers** — the Review Checklist section is the acceptance test for code review

### Step 4: Hand off to /build

The brief already contains Project Context from Phase 0 researchers — no need for build to re-research the codebase.

```
Skill("build", args=".briefs/[feature-name].md --no-research")
```

This skips codebase-researcher (brief has project context) and reference-researcher (build will check .conventions/ itself). If .conventions/ doesn't exist, build will spawn only reference-researcher as needed.

---

## Adaptive Behavior Summary

| User's initial message | Interview path | Total questions |
|------------------------|---------------|-----------------|
| Detailed description with audience and success criteria | Confirm understanding → Q4 exclusions → Launch | 1-2 |
| Clear feature but missing context | Q1 (refine) → Q3 (success) → Launch | 2-3 |
| Vague idea ("improve the dashboard") | Q1 → Branch B (hypotheses) → Q2 → Q3 → Q4 → Launch | 4-5 |
| Very vague ("make it better") | Q1 → Branch B → Follow-ups → Q3 → Q4 → Launch | 5-6 |

The interview should feel like a **2-minute conversation**, not a form.

## Additional Resources

- **`references/interview-principles.md`** — Expert principles from Cagan, JTBD, Shape Up, Torres, and rationale for question design
