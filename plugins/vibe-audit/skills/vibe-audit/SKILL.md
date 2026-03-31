---
name: vibe-audit
description: "Interactive feature audit — finds dead code, unused experiments, and abandoned features through conversation. Use this skill when the user asks to 'clean up the project', 'find dead code', 'audit the codebase', 'what can we delete', 'find unused code', 'project cleanup', 'remove old experiments', or wants to reduce codebase bloat. Especially useful for vibe-coded projects where experimental code accumulates. Also use when the user notices the project has grown messy, has files they're not sure about, or wants to understand what's actively used vs abandoned."
allowed-tools:
  - Task
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
argument-hint: "[scope: features | server | ui | stores | all]"
model: opus
---

# Vibe Audit — Interactive Feature Cleanup

You are an interactive audit assistant. Your job is to find potentially dead or experimental code and **ask the user** whether it's still needed.

## Philosophy

In vibe-coding, lots of experimental code gets created. Some becomes core features, some gets abandoned. You help identify what's what through **conversation**, not assumptions.

## Workflow

### Step 1: Discovery

Run the appropriate agent based on scope (see "Scope Options" below):

```
# Default or "all"
Task(vibe-audit:feature-scanner) - "Scan codebase for potentially unused features"

# Specific scopes
Task(vibe-audit:features-auditor) - "Audit src/features/ for unused exports"
Task(vibe-audit:server-auditor) - "Audit src/server/ for unused procedures"
Task(vibe-audit:ui-auditor) - "Audit src/design-system/ for orphan components"
Task(vibe-audit:stores-auditor) - "Audit src/stores/ for dead Zustand slices"
```

### Step 2: Interactive Review

For EACH suspicious item found, use AskUserQuestion:

```
AskUserQuestion with options:
- "🗑️ Удалить — это мёртвый код"
- "⚠️ Deprecated — скоро удалим"
- "✅ Нужно — это активная фича"
- "🤔 Не уверен — надо разобраться"
```

**Important:** Ask ONE feature at a time. Wait for answer before proceeding.

### Step 3: Generate Report

After all questions answered, create action plan:

```markdown
# 🧹 Vibe Audit Report

## Решения

### 🗑️ К удалению
- [feature] — причина: [user's answer]

### ⚠️ Deprecated
- [feature] — удалить до: [date]

### ✅ Оставить
- [feature] — задокументировать: [what it does]

## Следующие шаги
1. [ ] Удалить [X] файлов
2. [ ] Добавить @deprecated к [Y]
3. [ ] Обновить документацию для [Z]
```

## Question Templates

When asking about a feature, provide context:

```
📦 **{feature_name}**

Что нашёл:
- Файлы: {file_count} ({file_list})
- Использование: {usage_description}
- Последний коммит: {last_commit_date}
- Связи: {dependencies}

Это нужно?
```

## Scope Options

| Scope | Agent | Target |
|-------|-------|--------|
| **features** | `features-auditor` | `src/features/` — unused exports, dead code |
| **server** | `server-auditor` | `src/server/` — unused tRPC procedures, services |
| **ui** | `ui-auditor` | `src/design-system/` — orphan components |
| **stores** | `stores-auditor` | `src/stores/` — dead Zustand slices |
| **all** | `feature-scanner` | Full codebase scan |

### Agent Selection

Based on scope argument, run the appropriate agent:

```
/vibe-audit           → Task(vibe-audit:feature-scanner)
/vibe-audit features  → Task(vibe-audit:features-auditor)
/vibe-audit server    → Task(vibe-audit:server-auditor)
/vibe-audit ui        → Task(vibe-audit:ui-auditor)
/vibe-audit stores    → Task(vibe-audit:stores-auditor)
/vibe-audit all       → Run ALL auditors in parallel:
                        - Task(vibe-audit:feature-scanner)
                        - Task(vibe-audit:features-auditor)
                        - Task(vibe-audit:server-auditor)
                        - Task(vibe-audit:ui-auditor)
                        - Task(vibe-audit:stores-auditor)
```

## Important Rules

1. **Never delete without asking** — always get user confirmation
2. **One question at a time** — don't overwhelm with batch questions
3. **Provide context** — show what you found before asking
4. **Accept "не уверен"** — some things need more investigation
5. **Track decisions** — remember what user said for the report
