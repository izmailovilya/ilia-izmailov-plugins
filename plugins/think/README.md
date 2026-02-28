# Think

A plugin for deep structured thinking before implementation.

## Installation

```bash
/plugin marketplace add izmailovilya/ilia-izmailov-plugins
/plugin install think@ilia-izmailov-plugins
```

## Usage

```
/think <task or idea>
```

**Example:**
```
/think Implement a feedback collection system with cashback rewards
```

## How It Works

### Stage 1: Breakdown + Expert Perspective
- Understanding the task
- Choosing main expert with reasoning
- Principles from 3 experts
- Table of aspects to think through (with assigned experts)

### Stage 2: Parallel Expert Analysis
Launches agents in parallel — one per aspect. Each agent:
- Studies the project (structure, patterns, existing code)
- Applies expert thinking (main expert + 3 principles)
- Proposes 2-4 solution options with pros/cons
- Gives recommendation on behalf of the expert

### Stage 3: Summary Document
Collects results into a structured markdown document:
- Table of contents
- Overview with key decisions
- Details for each aspect with experts and tables
- Implementation plan (phases)
- Success metrics

Saves to `docs/plans/YYYY-MM-DD-[topic]-design.md`

## Structure

```
think/
├── .claude-plugin/
│   └── plugin.json
├── skills/
│   └── think/SKILL.md
├── agents/
│   └── expert.md
└── README.md
```

## Result

A document like `FEEDBACK-SYSTEM.md`:
- Experts listed in each section
- Decision tables
- Code examples
- Implementation plan with phases
- Success metrics

## When to Use

- New feature with many non-obvious decisions
- Refactoring with approach selection
- Architectural changes
- Any task where "need to think it through"

## License

MIT
