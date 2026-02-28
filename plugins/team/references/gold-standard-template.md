# Gold Standard Block Template

> Gold standards are the #1 lever for code quality (+15-40% accuracy vs instructions alone).
> Coders MUST receive canonical examples as few-shot context.

## Format

Lead compiles this block from researcher findings + `.conventions/` (if exists):

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

## Rules

- 3-5 examples, ~100-150 lines total
- Prioritize by relevance to the feature
- Include FULL file content (not summaries) — coders need to see the actual pattern
- Add notes pointing to specific patterns to match (naming, error handling, imports)

## In Coder Spawn Prompt

Gold standards go in the coder's spawn prompt (task-specific context):

```
Task(
  subagent_type="team:coder",
  team_name="feature-<name>",
  name="coder-<N>",
  prompt="You are Coder #{N}. Team: feature-<name>.

--- GOLD STANDARD EXAMPLES ---
{GOLD STANDARD BLOCK compiled by Lead}
--- END GOLD STANDARDS ---

Claim your first task from the task list and start working."
)
```

## Task Description First

When providing context to coders, put the task description FIRST, then gold standards:

```
prompt="You are Coder #{N}. Team: feature-<name>.

YOUR TASK CONTEXT:
{Brief summary of what this coder will work on}

--- GOLD STANDARD EXAMPLES ---
{GOLD STANDARD BLOCK}
--- END GOLD STANDARDS ---

Claim your first task from the task list and start working."
```

This ensures the coder reads what they need to DO before seeing examples of HOW.
