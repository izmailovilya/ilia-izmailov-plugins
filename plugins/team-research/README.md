# Team Research

Launch a team of AI agents for deep parallel codebase research — causal understanding, not just coverage.

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
/plugin install team-research@ilia-izmailov-plugins
```

## Usage

```
/team-research <research question or topic>
```

**Examples:**
```
/team-research "How does authentication work in this project?"
/team-research "Full architecture review"
/team-research "Security + performance audit of the API layer"
/team-research "How does data flow from UI to database?"
```

## How It Works

A Research Lead agent orchestrates a 4-phase investigation pipeline that builds **causal understanding** — not just collects facts.

### Phase 1: Plan

A **Scout** agent quickly scans the codebase landscape (5 minutes max), identifying 3-7 distinct areas and suggesting investigation angles with depth tiers. The Lead then defines MECE angles with explanation-based stop criteria.

> **Why explanation-based?** "Found all entry points" is a coverage checklist. "Can explain WHY this module exists and what breaks without it" forces actual understanding. The difference matters — coverage produces lists, understanding produces insights.

### Phase 2: Investigate

**Investigators** (2-7) work in parallel, each assigned an angle. Every investigator applies the **Depth Protocol**:

| Element | What it captures |
|---------|-----------------|
| **WHAT** | Structural description with file:line references |
| **WHY** | Causal explanation — why does this exist? Why this design? |
| **FRAGILITY** | What would break if this changed? |
| **CONTEXT** | How did this appear? (git history, comments) |
| **SURPRISE** | What was unexpected vs the mental model? |

Every claim is tagged with its source:
- **Observed** — seen directly in code (with file:line)
- **Inferred** — logical conclusion from observations
- **Hypothesized** — best guess, needs verification

Investigators can communicate with each other for cross-pollination.

### Phase 2.5: Cross-Pollinate

The Lead juxtaposes surprising findings from different investigators, looking for emergent questions that no single investigator could have asked. Up to 2 targeted deepening agents may be spawned for high-value cross-cutting questions.

### Phase 3: Challenge

A **Challenger** agent stress-tests findings through 3 adversarial lenses:

1. **Evidence Quality** — are Source Tags real? Are file:line references valid?
2. **Pre-Mortem** — imagine the research was wrong in 3 months. What did we miss?
3. **Frame Gap Detection** — what perspectives are missing from the findings?

If needed, a **Critic** (failure mode analysis) or **Specialists** (domain experts for security, database, external APIs) are spawned on demand.

### Phase 4: Deliver

The Lead synthesizes all findings into a structured report with:
- Executive summary with causal understanding
- Detailed findings in Depth Protocol format
- Cross-cutting insights (the most valuable section)
- Unresolved tensions (contradictions are features, not bugs)
- Source confidence levels
- Open questions and recommendations

## Team Roles

| Role | Lifetime | Model | Purpose |
|------|----------|-------|---------|
| **Lead** | Whole session | — | Plan, orchestrate, cross-pollinate, synthesize |
| **Scout** | One-shot | Haiku | Quick landscape scan — maps terrain, doesn't investigate |
| **Investigator** | Per angle | Sonnet | Deep investigation with Depth Protocol and Source Tags |
| **Challenger** | One-shot | Sonnet | Adversarial stress-testing of all findings |
| **Critic** | On-demand | Sonnet | Failure mode analysis when Challenger flags gaps |
| **Specialist** | On-demand | Sonnet | Domain-specific deep dives (security, database, external-api) |

## Team Size

```
N_optimal = min(ceil(sqrt(angles * complexity)), 7)
```

| Scope | Agents | Example |
|-------|--------|---------|
| Narrow question | 2-3 | "How does auth work?" |
| Medium exploration | 4-5 | "Understand full architecture" |
| Broad multi-domain | 5-7 | "Security + performance audit" |

Never exceed 7 in a flat team. For broader scope — run 2-3 separate `/team-research` instead.

## Key Principles

- **Depth > Coverage** — 3 well-explained findings beat 10 surface observations
- **Causal understanding** — not just WHAT exists, but WHY it exists and what would break
- **Source Tags everywhere** — every claim tagged Observed/Inferred/Hypothesized
- **Tensions are valuable** — contradictions in the report are features, not bugs
- **Structural mechanisms > cognitive instructions** — the Depth Protocol forces real computation

## Structure

```
team-research/
├── .claude-plugin/
│   └── plugin.json
├── commands/
│   └── team-research.md
├── agents/
│   ├── scout.md
│   ├── investigator.md
│   ├── research-challenger.md
│   ├── critic.md
│   └── specialist.md
└── README.md
```

## License

MIT
