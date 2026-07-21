---
name: conventions
description: "Analyze codebase and create/update .conventions/ directory with gold standards, anti-patterns, and checks. Use this skill when the user asks to 'set up conventions', 'create coding standards', 'extract patterns from the codebase', 'document how code should be written', 'create gold standards', 'establish code style', or wants to ensure consistent code quality across the project. Also use when starting work on a new codebase that lacks a .conventions/ directory — conventions are the foundation for all agent-teams code quality."
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Task
  - Edit
  - Write
argument-hint: "[path/to/project]"
model: fable
---

# Conventions — Analyze Codebase & Build Convention Files

You analyze the codebase and create or update the `.conventions/` directory. This directory is the **single source of truth** for project patterns — it encodes taste once, so every agent (and human) follows the same conventions.

## Target Structure

```
.conventions/
  gold-standards/           # 20-30 line exemplary code snippets
    [pattern-name].tsx/ts   # one file per pattern (form, api-endpoint, hook, etc.)
  anti-patterns/            # what NOT to do (with code examples)
    [avoid-something].md    # one file per anti-pattern
  checks/                   # automated pass/fail rules
    naming.md               # naming conventions (regex patterns, examples)
    imports.md              # allowed/forbidden import patterns
```

## How It Works

### Step 1: Check current state

```
Glob(".conventions/**/*")
```

- If `.conventions/` exists → this is an **update** (add missing patterns, refresh stale ones)
- If `.conventions/` does not exist → this is a **bootstrap** (create from scratch)

### Step 2: Dispatch researchers (parallel)

Spawn 3 researchers in parallel to scan the codebase:

```
Task(
  subagent_type="Explore",
  prompt="Analyze this project's STRUCTURE and STACK.
  Return: framework, language, package manager, DB, key libraries,
  directory structure, where API routes/pages/components live.
  Be specific — file paths and command names. Under 30 lines."
)

Task(
  subagent_type="Explore",
  prompt="Find the 5-7 BEST example files in this codebase — files that represent
  'how things are done here'. Look for:
  - A well-structured UI component
  - An API endpoint / router
  - A custom hook
  - A form component
  - A test file
  - A database query / migration
  For each: return the file path, what pattern it shows, and the FULL file content.
  Skip patterns that don't exist in this project."
)

Task(
  subagent_type="Explore",
  prompt="Analyze NAMING CONVENTIONS and IMPORT PATTERNS in this codebase.
  Check:
  - File naming: kebab-case? camelCase? PascalCase? (check src/ files)
  - Function/variable naming: camelCase? snake_case?
  - Component naming: PascalCase?
  - DB tables/columns: snake_case? camelCase?
  - API endpoints: /kebab-case? /camelCase?
  - Import patterns: what's imported from where, any barrel exports, any forbidden imports
  - Design system: what UI library, any wrapper components
  Return specific patterns with regex examples where possible. Under 40 lines."
)
```

### Step 3: Build conventions

From researcher findings, create the files:

**Gold standards** — For each pattern found by the reference researcher:
- Extract the BEST 20-30 lines that demonstrate the pattern
- Strip implementation-specific details, keep the structural skeleton
- Add a 2-line comment at the top: what this file demonstrates and what to pay attention to
- File name = pattern name in kebab-case (e.g., `api-endpoint.ts`, `form-component.tsx`)

**Anti-patterns** — Look for:
- Inconsistencies found by researchers (some files do X, others do Y → the minority is an anti-pattern)
- Common mistakes visible in the codebase (raw HTML where design system should be used, direct DB calls where ORM should be used)
- Each anti-pattern file: short description, BAD example, GOOD example

**Checks** — From naming researcher:
- `naming.md`: file naming, function naming, component naming, DB naming — with regex patterns and examples
- `imports.md`: what should be imported from where, forbidden imports

### Step 4: Write files

If **bootstrap** (no `.conventions/` yet):
- Create the full directory structure
- Write all discovered gold standards, anti-patterns, and checks

If **update** (`.conventions/` already exists):
- Read existing files first
- Add new patterns that weren't covered
- Update patterns that have drifted from what the codebase actually does
- Do NOT delete existing files — only add or update
- Report what was added/changed

### Step 5: Report

```
══════════════════════════════════════════════════
CONVENTIONS {CREATED / UPDATED}
══════════════════════════════════════════════════

Gold standards:
  [created/updated] .conventions/gold-standards/api-endpoint.ts
  [created/updated] .conventions/gold-standards/form-component.tsx
  ...

Anti-patterns:
  [created] .conventions/anti-patterns/avoid-inline-styles.md
  ...

Checks:
  [created/updated] .conventions/checks/naming.md
  [created/updated] .conventions/checks/imports.md

Total: N files created, M files updated
══════════════════════════════════════════════════
```

## Rules

- Gold standards are **20-30 lines max** — short enough to include in agent prompts as few-shot examples
- Every gold standard has a **2-line header comment** explaining what it demonstrates
- Anti-patterns always show **BAD → GOOD** comparison
- Checks use **regex patterns** where possible for automated verification
- Do NOT invent patterns — only document what actually exists in the codebase
- If the codebase is inconsistent (50/50 split), pick the better pattern and note the inconsistency in an anti-pattern file
- Skip categories that don't apply (no DB? skip DB gold standard)

## Reference Files

- **`references/examples.md`** — Example convention files showing the expected format and quality level for gold standards, anti-patterns, and checks. Read this before generating convention files to ensure consistent quality and format.
