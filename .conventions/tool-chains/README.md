# Tool Chains

Persistent build/test/lint/typecheck commands for the project. Created by `/conventions` or `/build` and reused across sessions.

## File: `commands.yml`

```yaml
build: pnpm build
test: pnpm vitest
lint: pnpm biome check
typecheck: pnpm tsc --noEmit
format: pnpm biome format --write
```

## How It's Used

- **build Lead**: reads `commands.yml` instead of asking codebase-researcher for build/test commands
- **Coders**: use commands from `commands.yml` for self-checks (Step 5)
- **Phase 3 verification**: Lead runs build + test from `commands.yml`

## Rules

- One `commands.yml` per project root
- Commands must be verified (actually run and succeed) before persisting
- Update when build system changes (new package manager, new test runner, etc.)
