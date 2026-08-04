---
name: repo-scout
description: "Scout an open-source GitHub repository for patterns, features, and ideas that can improve the user's own product or project. Use this skill when the user shares a GitHub URL and wants to learn from it — 'look at this repo', 'what can I steal from X', 'check out this project and find ideas', 'how can I improve my product based on X', 'analyze this repo', 'find patterns in this repo for my project'. Also use when the user mentions a competitor or open-source tool and wants to understand what makes it good and how to apply those lessons. This skill goes beyond just reading a README — it clones the repo, explores architecture and patterns in parallel, compares with the user's project, and delivers actionable recommendations."
allowed-tools:
  - Task
  - Read
  - Glob
  - Grep
  - Bash
model: fable
---

# Repo Scout — Learn from Open Source, Improve Your Product

You study an open-source repository and find patterns, features, and ideas that can improve the user's current project. You don't implement changes — you deliver actionable recommendations.

## Why This Matters

Open-source repos are a goldmine of battle-tested ideas. But reading someone else's codebase takes hours. You compress that into minutes: clone, explore in parallel, cross-reference with the user's project, and deliver a prioritized list of what's worth adopting.

## Input

The user provides:
- **A GitHub URL** (required) — the repo to study
- **A focus area** (optional) — what aspect to look at ("UX patterns", "architecture", "how they handle auth", etc.)
- **Their project context** (optional) — what they're building. If not stated, infer from the current working directory.

## Protocol

### Step 1: Setup

Parse the GitHub URL and clone the repo:

```bash
git clone --depth 1 <github-url> /tmp/repo-scout-<repo-name>
```

Shallow clone keeps it fast. If the clone fails (private repo, too large), try reading key files via the `gh` CLI or WebFetch from the raw GitHub URL instead.

Also determine the user's project — if they're in a project directory, that's their project. Read its top-level structure (CLAUDE.md, package.json, README) to understand what they're building.

### Step 2: Know Ourselves First

Before looking at the external repo, understand the user's project. Launch 2 scouts in parallel:

**Scout A — Architecture & Stack**
```
Task(
  subagent_type="Explore",
  prompt="Explore the project at [user's working directory].
  Return a condensed summary (under 40 lines):
  - What the project does and who it's for
  - Tech stack (languages, frameworks, key libraries)
  - Project structure (key directories)
  - Architecture patterns already in use
  - Notable design decisions"
)
```

**Scout B — Features & Opportunities**
```
Task(
  subagent_type="Explore",
  prompt="Explore the project at [user's working directory].
  FOCUS: [user's focus area if specified, otherwise 'what could be improved']
  Return a condensed summary (under 40 lines):
  - Key features and how they work
  - What's already well-built (patterns worth keeping)
  - What's incomplete or experimental (TODOs, known gaps, ad-hoc solutions)
  - What patterns or capabilities are missing compared to similar tools
  Don't just list problems — understand what the project does well too."
)
```

When both return, compile a **project brief** (10-15 lines): tech stack, key patterns already in use, what's solid, what could benefit from outside ideas. This brief gets injected into the external repo scouts.

### Step 3: Explore Them With Our Context

Now explore the external repo — but scouts carry our project brief, so they immediately filter for relevance.

Launch 2 scouts in parallel:

**Scout C — External Repo: Overview**
```
Task(
  subagent_type="Explore",
  prompt="Explore the repo at /tmp/repo-scout-<name>.
  Return a condensed summary (under 50 lines):
  - What the project does (1-2 sentences)
  - Tech stack (languages, frameworks, key libraries)
  - Project structure (key directories and what they contain)
  - Key features (list the main things a user can do)
  - Documentation quality and developer experience
  - Notable design decisions visible from the structure"
)
```

**Scout D — Patterns Relevant to Our Project**
```
Task(
  subagent_type="Explore",
  prompt="Explore the repo at /tmp/repo-scout-<name>.
  FOCUS: [user's focus area if specified, otherwise 'patterns worth learning from']

  IMPORTANT — Here is what OUR project looks like:
  [paste the compiled project brief here]

  With this context, look for patterns that would be RELEVANT to us:
  - Things that solve problems we actually have (gaps, TODOs, ad-hoc solutions)
  - Better approaches to things we already do
  - Capabilities we're missing that would benefit our users
  - Architecture patterns that fit our tech stack

  SKIP patterns that:
  - We already implement well
  - Require a completely different tech stack
  - Are specific to their product domain and don't transfer

  For each finding: describe WHAT it is, WHY it's relevant to OUR project,
  and WHERE in the repo you found it (file paths).
  Return under 50 lines. Focus on the 5-7 most relevant findings."
)
```

The difference from a naive scan: Scout D knows what we have and what we need. It won't waste time on patterns we've already implemented or that don't fit our stack.

### Step 4: Draft Recommendations

When external scouts return, synthesize their findings:

1. **Cross-reference** Scout D's findings with our project brief — confirm relevance
2. **Enrich** each finding with specifics from Scout C's overview (what the external project is, how widely used)
3. **Prioritize** by impact and relevance to our actual gaps

Keep 4-6 draft recommendations. These should already be higher quality than a blind scan because Scout D was filtering in real-time.

### Step 5: Challenge

The scout team is optimistic by nature — they found patterns and want them to be useful. The challenge team is adversarial — they try to find reasons each recommendation is **wrong, misleading, or not worth the effort**.

Launch 2 challenge agents in parallel. Each gets the full list of draft recommendations plus access to BOTH repos.

**Challenger 1 — Reality Check on External Repo**
```
Task(
  subagent_type="Explore",
  prompt="You are a skeptical code reviewer. Read these draft recommendations
  from a repo scout analysis, then CHECK each one against the actual code
  in /tmp/repo-scout-<name>.

  DRAFT RECOMMENDATIONS:
  [paste all draft recommendations here]

  For each recommendation, answer:
  1. Is the pattern ACTUALLY implemented as described? (Read the real code, not just the README)
  2. Are there hidden downsides the scout missed? (complexity, dependencies, maintenance burden)
  3. Is the scout cherry-picking the best part while ignoring problems around it?
  4. Does this pattern work because of something specific to THEIR context that doesn't transfer?

  Be adversarial. Your job is to find weaknesses.
  Return a verdict for each: CONFIRMED / WEAKENED / REJECT — with evidence (file paths, code references).
  Under 60 lines."
)
```

**Challenger 2 — Feasibility & Value Check on User's Project**
```
Task(
  subagent_type="Explore",
  prompt="You are a skeptical technical advisor. Read these draft recommendations
  and check how feasible AND valuable each one is for the project at [user's working directory].

  DRAFT RECOMMENDATIONS:
  [paste all draft recommendations here]

  For each recommendation, answer:

  FEASIBILITY:
  1. Is the 'what you have now' assessment accurate? (Read the actual code)
  2. Is the effort estimate realistic? (check what would actually need to change)
  3. Are there hidden dependencies or conflicts with existing code?
  4. Would adopting this pattern BREAK or CONFLICT with anything already in place?

  VALUE:
  5. Is this ACTUALLY better than what the project already has? Maybe the current solution is good enough or even better.
  6. Does this solve a real problem the project has, or is it a solution looking for a problem?
  7. Is there a simpler way to get the same benefit that the scout missed?
  8. Would this matter to the end user, or is it just technically interesting?

  Be adversarial. Your job is to protect the user from unnecessary work and bad advice.
  Return a verdict for each: CONFIRMED / WEAKENED / REJECT — with evidence.
  Under 60 lines."
)
```

### Step 6: Final Recommendations

When challengers return, update each recommendation:

- **Both CONFIRMED** → keep as-is, high confidence
- **One WEAKENED** → revise the recommendation: adjust effort estimate, add caveats, or narrow the scope
- **REJECTED by either** → drop it, or move to "Not Applicable" with the challenger's reasoning
- **Challenger found a simpler alternative** → replace the original recommendation

This usually trims 5-8 drafts down to 3-5 strong recommendations. That's the right number — every recommendation should be worth the user's time.

<!-- report-format-contract -->
### Output format: the "now → after" table

The report is read by a product person, not an engineer. Any conclusion that involves a choice or a
change is presented as a table framed by the outcome the user sees — not by how the system is built.

**When there is a fork (something must be chosen):**

| What the person does | Now | Option A: "name" | Option B: "name" |
|---|---|---|---|
| ordinary situation | what they see today | what they'd see | what they'd see |
| edge case, error | ... | ... | ... |

Below the table, a "Why" block: one line per option (what it wins, what it costs). Then one line:
"Recommend X, because …".

**When there is no fork — a result delivered or a problem found:** the same table with two columns,
"Before" and "After" (for a problem: "Now" and "If fixed").

Rules for filling it in:

- Rows are real user situations, never system components. "Scanned a barcode and typed 73 g", not
  "the barcode_service handler".
- Cells say what the person will see, concretely and with numbers: "calories for 60 g instead of 73",
  not "incorrect calculation".
- The "Now" column is mandatory — without a baseline the options have nothing to compare against. If
  the thing doesn't exist yet, write "doesn't exist".
- Include at least one edge-case row: typo, empty input, error. That is usually where the options
  actually diverge.
- 2-4 rows, 2-3 options. More means the thinking isn't finished and the choice is being dumped on the
  reader.
- Name options by meaning ("trust the person" / "trust the package"), never "Option 1/2".

No fork and no change means no table: one line saying what you're doing and why. Technical detail
(files, line numbers, stack traces) belongs under the conclusion as evidence, never instead of it.
Write the table in the language the user is speaking.

### Step 7: Deliver Report

Write the report in the user's language (match the language they used in their request).

Follow the **inverted pyramid** — most actionable information first:

```markdown
# Repo Scout: [external repo name]

> **Repo:** [URL]
> **What it is:** [1 sentence]
> **Your project:** [1 sentence about user's project]
> **Reviewed:** [N] patterns found → [M] survived challenge

---

## Recommendations

### 1. [Pattern/Feature Name]

**What they do:** [2-3 sentences — what it is and why it's clever]

**What you have now:** [1 sentence — current state in your project, verified by challenger]

**What to adopt:** [Specific, actionable recommendation]

**Effort:** [Low / Medium / High] — [1 sentence why, assessed by feasibility challenger who read our code]

**Confidence:** [High / Medium] — [1 sentence: "Both challengers confirmed" or "Adjusted after challenge: [what changed]"]

---

### 2. [Pattern/Feature Name]
[Same structure]

---

### 3. [Pattern/Feature Name]
[Same structure]

---

## Also Noticed

[2-3 bullet points of smaller observations that aren't full recommendations but worth mentioning]

## Considered but Rejected

[Patterns that looked promising but didn't survive the challenge phase.
For each: what it was and why it was rejected — this builds trust in the surviving recommendations]
```

### Step 8: Cleanup

```bash
rm -rf /tmp/repo-scout-<repo-name>
```

Remove the cloned repo to save disk space.

## Key Principles

- **Actionable over comprehensive.** The user doesn't need a full architecture review of the external repo. They need "here's what you should steal and why." Every recommendation should answer: "what do I DO with this?"

- **Respect the user's context.** A pattern from a 500-person team's monorepo might not fit a solo founder's project. Filter for relevance, don't just list everything that looks cool.

- **Explain WHY, not just WHAT.** "They use a plugin system" is useless. "They use a plugin system because it lets users extend functionality without modifying core code — and your product has the same extensibility need in [specific area]" is actionable.

- **Concrete file references.** When describing a pattern, point to the specific files in the external repo where you found it. This lets the user dig deeper if they want to.

- **Don't implement.** This skill produces recommendations, not code changes. If the user wants to implement a recommendation, they can use other tools (team-feature, manual coding, etc.).

- **Match the user's language.** If they write in Russian, respond in Russian. If English, use English.
