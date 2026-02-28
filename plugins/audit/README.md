# Audit

Interactive feature audit for vibe-coded projects. Finds dead code, unused features, and experiments through **conversation** with the developer.

## Problem

In vibe-coding lots of experimental code gets created:
- Try a feature → doesn't work → forget to delete
- Refactor → old code remains
- A/B test → both variants stay in code

**Static analysis doesn't help** — code is technically used, but the business logic is outdated.

## Solution

**Interactive audit:**
1. Agent finds "suspicious" areas
2. Asks you whether it's needed
3. Safely removes with git backup

## Installation

```bash
/plugin marketplace add izmailovilya/ilia-izmailov-plugins
/plugin install audit@ilia-izmailov-plugins
```

## Usage

```
/audit              # Full codebase scan (feature-scanner)
/audit features     # src/features/ deep audit (features-auditor)
/audit server       # src/server/ routers & services (server-auditor)
/audit ui           # src/design-system/ components (ui-auditor)
/audit stores       # src/stores/ Zustand state (stores-auditor)
```

## Workflow

```
┌─────────────────────────────────────────────────────────────┐
│  1. DISCOVERY                                               │
│     feature-scanner finds suspicious areas                  │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  2. INTERVIEW                                               │
│     "Is this still used?"                                   │
│                                                             │
│     Delete    Deprecated    Keep    Not sure                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  3. CLEANUP                                                 │
│     cleanup-executor safely removes                         │
│     (git branch + commit + TypeScript check)                │
└─────────────────────────────────────────────────────────────┘
```

## Agents

### Core Agents

| Agent | Purpose |
|-------|---------|
| `feature-scanner` | Full scan: features, routers, pages |
| `usage-analyzer` | Deep analysis of a specific feature |
| `cleanup-executor` | Safe removal with git backup |

### Specialized Auditors

| Agent | Target | What it finds |
|-------|--------|---------------|
| `ui-auditor` | `src/design-system/` | Unused components, style inconsistencies |
| `stores-auditor` | `src/stores/` | Dead Zustand slices, unused selectors |
| `features-auditor` | `src/features/` | Unused exports, internal dead code |
| `server-auditor` | `src/server/` | Unused tRPC procedures, dead services |

## Safety

- Never deletes without confirmation
- Creates git branch before deletion
- Checks TypeScript after deletion
- Logs all changes

## License

MIT
