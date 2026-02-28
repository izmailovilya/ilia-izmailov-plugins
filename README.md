# izteam — AI Agent Team for Claude Code

A team of AI agents you can assemble in [Claude Code](https://claude.ai/code).

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add izmailovilya/ilia-izmailov-plugins
```

Then install any plugin:

```bash
/plugin install <plugin-name>@ilia-izmailov-plugins
```

**Important:** Restart Claude Code after installing plugins to load them.

## Available Plugins

### team

Launch a team of AI agents to implement features with built-in code review gates.

> **Requires:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json or environment. [See setup →](./plugins/team/README.md#prerequisites)

```bash
/plugin install team@ilia-izmailov-plugins
```

**Usage:**
```
/build "Add user settings page"
/build docs/plan.md --coders=2
/brief "Add notifications" — interview first, then build
/conventions
```

Spawns a full team — researchers explore your codebase, coders implement with gold standard examples, 3 specialized reviewers (security, logic, quality) check every change, and a Tech Lead validates architecture. Supports SIMPLE/MEDIUM/COMPLEX complexity with automatic team scaling.

[Read more →](./plugins/team/README.md)

---

### think

Deep structured thinking with parallel expert analysis before implementation.

```bash
/plugin install think@ilia-izmailov-plugins
```

**Usage:**
```
/think <task or idea>
```

Breaks down your task into aspects, launches expert agents in parallel, and produces a comprehensive design document with decisions, trade-offs, and implementation plan.

[Read more →](./plugins/think/README.md)

---

### arena

Expert debate arena — real experts argue organically and converge on optimal solutions for any domain.

> **Requires:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json or environment. [See setup →](./plugins/team/README.md#prerequisites)

```bash
/plugin install arena@ilia-izmailov-plugins
```

**Usage:**
```
/arena "Should we use microservices or monolith?"
/arena "Best pricing strategy for a developer tool?"
```

Selects 3-5 real experts with opposing viewpoints, gathers context via researchers, launches organic peer-to-peer debates with live commentary, and synthesizes results into a structured document with verdict and recommendations.

[Read more →](./plugins/arena/README.md)

---

### audit

Interactive feature audit for vibe-coded projects. Finds dead code, unused features, and experiments through conversation.

```bash
/plugin install audit@ilia-izmailov-plugins
```

**Usage:**
```
/audit              # Full codebase scan
/audit features     # src/features/ deep audit
/audit server       # src/server/ routers & services
/audit ui           # src/design-system/ components
/audit stores       # src/stores/ Zustand state
```

Scans your codebase for suspicious areas (orphan routes, dead UI, stale code), asks if you need them, and safely removes what you don't — with git backup.

[Read more →](./plugins/audit/README.md)

---

## License

MIT
