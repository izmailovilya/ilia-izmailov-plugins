# Interview Principles — Expert Basis & Adaptive Logic

Rationale behind the interview design, drawn from expert debate (Portigal, Cagan, Torres, Krug, Hickey). Consult this when adapting questions to unusual situations.

---

## Core Design Decisions

### Why 2-6 questions, not 15

The autonomous agent team (`/build`) determines technical details itself: stack, patterns, risks, complexity, affected files, testing strategy. Asking the user about these wastes time and creates friction. The interview captures ONLY what codebase analysis cannot reveal.

**Rich Hickey's test:** "Is this essential complexity or accidental complexity?" If the process asks more questions than the output requires — it's ceremony, not value.

### Why adaptive, not scripted

**Steve Portigal:** A fixed script forces the interviewer's mental model onto the participant. Adaptive questions follow the user's thinking, not a predetermined list. The best insights come from deepening what the user already said — not from switching to the next question on the list.

**Teresa Torres:** Research questions (what we want to know) are different from interview questions (what we actually ask). The same research goal ("understand the problem") produces different questions depending on context.

### Why buttons over open questions

**Steve Krug:** Every moment the user spends thinking about HOW to answer is friction. Predefined options (buttons) reduce cognitive load. The user recognizes the right answer instead of constructing one. "Other" escape hatch preserves flexibility.

**NN/G finding:** Users of AI tools prefer "funneling" conversations — start broad, narrow with options. Single-question sequencing (one at a time) outperforms multi-question dumps.

---

## Expert Principles Applied

### Marty Cagan — Discovery Risks

Four risks in product discovery: value, usability, feasibility, viability. For this skill, only TWO matter in the interview:

- **Value risk:** Is the user solving a real problem? → Q1 (intent + situational framing)
- **Usability risk:** Will users understand the result? → Q3 (success criteria)

Feasibility and viability are the agent team's job, not the user's.

**Key Cagan principle:** "Fall in love with the problem, not the solution." Q1 is framed as "what will change" (outcome), not "what to build" (solution). This surfaces the real need.

### Teresa Torres — Branch B (Hypothesis Proposals)

When the user's request is vague, asking MORE questions increases friction without improving clarity. Instead: propose 2-3 concrete interpretations and let the user pick.

**Why this works:** The user often knows what they want but struggles to articulate it. Seeing concrete options triggers recognition ("Yes, that one!") faster than open-ended reformulation.

**How to generate hypotheses:**
1. Parse the user's words for domain terms
2. Cross-reference with researcher findings (existing features, known patterns)
3. Generate 2-3 plausible interpretations as button options
4. Each option should describe a concrete outcome, not an abstract category

### Steve Portigal — Adaptive Deepening

Instead of switching to the next topic after each answer, deepen the current answer if it's incomplete. Techniques:

- **Reflect back:** "So you're saying [X] — is that right?"
- **Ask for example:** "Can you give me a specific example?"
- **Explore exception:** "Is there a case where this wouldn't apply?"

Use these sparingly — one deepening per question maximum, then move on.

### Rich Hickey — Essential vs Accidental Complexity

Before asking any follow-up, apply the test: "Does the answer to this question CHANGE what the team builds?" If the answer is the same regardless — don't ask.

Examples:
- "What's your deadline?" → Doesn't change what gets built. Skip.
- "Should admins see all users or only their team?" → Fundamentally different features. Ask.

### Steve Krug — Friction Budget

Think of user patience as a budget. Each question spends some of it. Simple button questions cost less than open-ended ones. Confusing questions cost the most.

**Allocation:**
- Q1 (intent): Worth spending — this is the whole point
- Q2 (audience): Low-cost if buttons are good
- Q3 (success): Worth spending if Q1 was vague
- Q4 (exclusions): Skip if scope seems obvious
- AI follow-ups: High-cost — only if genuinely needed

---

## Handling Edge Cases

### User gives a very detailed initial message

If the initial message already contains: what to build, for whom, and why — skip to Phase 3 (brief compilation). Confirm understanding and ask only about exclusions.

> "From your description, I understand: [summary]. I have just one question before we start building..."

### User gives an extremely vague request

"Make it better" or "fix the thing" — this is the hardest case. Do NOT ask a barrage of questions. Instead:

1. Use researcher findings to understand what exists
2. Propose 2-3 concrete improvement hypotheses
3. Let the user pick or redirect
4. Then ask Q3 (success criteria) to nail down scope

### User doesn't know what they want

If the user picks "Other" on everything and gives short non-committal answers — this is a signal to PAUSE, not to ask more questions.

> "It sounds like you're still figuring this out. Would you like to think about it and come back, or should I build a minimal version of [X] and you can iterate from there?"

### User gives contradictory answers

If Q1 says "new feature" but Q4 excludes the areas where it would logically live — flag the contradiction as a follow-up:

> "You mentioned [X] but also said to leave [Y] alone. Should the new feature live somewhere else, or is it OK to modify [Y]?"

---

## Brief Quality Checklist

Before showing the brief to the user:

- [ ] Intent is concrete (not abstract like "improve UX")
- [ ] At least ONE observable success criterion exists
- [ ] Exclusions are noted (even if "None specified")
- [ ] No contradictions between answers
- [ ] Project context from researchers is included
- [ ] Brief is readable by a non-technical person
- [ ] Brief fits in ~200 words (it becomes one argument to /build)

---

## What NOT to Include in the Brief

These belong to the agent team, not the brief:

- Tech stack choices
- File paths or architecture decisions
- Risk analysis
- Complexity classification
- Testing strategy
- Implementation approach
- Timeline estimates
- Priority ordering (speed vs quality)

The brief is about WHAT and WHY. The team figures out HOW.
