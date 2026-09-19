# Ilia Izmailov's Claude Code Plugins

A collection of plugins for [Claude Code](https://claude.ai/code).

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

### agent-teams

Launch a team of AI agents to implement features with built-in code review gates.

> **Requires:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json or environment. [See setup →](./plugins/agent-teams/README.md#prerequisites)

```bash
/plugin install agent-teams@ilia-izmailov-plugins
```

**Usage:**
```
/interviewed-team-feature "Add user settings page"
/team-feature docs/plan.md --coders=2
/conventions
```

The main workflow is `/interviewed-team-feature` — a short adaptive interview (2-6 questions) to understand your intent, then automatic launch of the full implementation pipeline. Spawns researchers, coders, and specialized reviewers (security, logic, quality) with automatic team scaling based on complexity (SIMPLE/MEDIUM/COMPLEX).

[Read more →](./plugins/agent-teams/README.md)

---

### team-research

Deep parallel codebase research — causal understanding, not just coverage.

> **Requires:** Enable `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` in settings.json or environment.

```bash
/plugin install team-research@ilia-izmailov-plugins
```

**Usage:**
```
/team-research "How does authentication work in this project?"
/team-research "Full architecture review"
```

Spawns a scout to map the landscape, then 2-7 investigators explore independent angles in parallel, followed by an adversarial challenger who stress-tests the findings. Produces a research report with causal understanding, source confidence tags, and cross-cutting insights.

---

### repo-scout

Scout open-source repos for patterns and ideas to improve your own product.

```bash
/plugin install repo-scout@ilia-izmailov-plugins
```

**Usage:**
```
/repo-scout https://github.com/anomalyco/opencode
/repo-scout https://github.com/vercel/ai "how they handle streaming"
```

Two-phase approach: first understands YOUR project (2 scouts), then explores the external repo with your context (2 scouts), then adversarial challenge (2 challengers verify patterns are real and worth adopting). Only recommendations that survive the challenge make it into the final report.

---

### zero-downtime-deploy

Set up, harden, or audit deployment so releases don't interrupt service — with a rollback that has actually been rehearsed.

```bash
/plugin install zero-downtime-deploy@ilia-izmailov-plugins
```

**Usage:**
```
/zero-downtime-deploy
/zero-downtime-deploy "у нас 502 при выкатке"
/zero-downtime-deploy "безопасно ли выкатывать эту миграцию"
```

Two scouts map the deploy in parallel — one reads the repository, one looks at the live system read-only — and drift between them is the first finding. Then a hard gate: the plan as a "now → after" table, nothing changed until you say go. Verification runs real commands only, smoke tests address the new version directly, and the rollback is rehearsed with a measured time before anything is called ready. An adversarial critic then attacks the finished scheme. Keeps your current platform; never introduces Kubernetes or a new cloud.

[Read more →](./plugins/zero-downtime-deploy/README.md)

Codex users can install the standalone
[`zero-downtime-deploy` skill](./codex-skills/zero-downtime-deploy) without the Claude plugin runtime.

---

### vibe-audit

Interactive feature audit for vibe-coded projects. Finds dead code, unused features, and experiments through conversation.

```bash
/plugin install vibe-audit@ilia-izmailov-plugins
```

**Usage:**
```
/vibe-audit              # Full codebase scan
/vibe-audit features     # src/features/ deep audit
/vibe-audit server       # src/server/ routers & services
/vibe-audit ui           # src/design-system/ components
/vibe-audit stores       # src/stores/ Zustand state
```

Scans your codebase for suspicious areas (orphan routes, dead UI, stale code), asks if you need them, and safely removes what you don't — with git backup.

[Read more →](./plugins/vibe-audit/README.md)

---

## License

MIT
