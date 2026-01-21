# Ilia Izmailov's Claude Code Plugins

A collection of plugins for [Claude Code](https://claude.ai/code).

## Installation

Add this marketplace to Claude Code:

```bash
/plugin marketplace add ilia-izmailov/ilia-izmailov-plugins
```

Then install any plugin:

```bash
/plugin install <plugin-name>@ilia-izmailov-plugins
```

## Available Plugins

### think-through

Deep structured thinking with parallel expert analysis before implementation.

```bash
/plugin install think-through@ilia-izmailov-plugins
```

**Usage:**
```
/deep-thinking <task or idea>
```

Breaks down your task into aspects, launches expert agents in parallel (🐙), and produces a comprehensive design document with decisions, trade-offs, and implementation plan.

[Read more →](./plugins/think-through/README.md)

---

## License

MIT
