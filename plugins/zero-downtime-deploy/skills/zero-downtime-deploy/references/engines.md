# Engines — Another Model as the Critic

Every role runs on Claude by default. **With no `~/.claude/agent-teams.json`, nothing in this file
applies** — the skill runs exactly as `SKILL.md` describes.

The config file is shared with the `agent-teams` plugin: one user-level file names an engine per role,
and each plugin reads only the role IDs it owns. IDs this plugin does not know belong to other
plugins — skip them silently.

**Why bother.** `SKILL.md` already says it: the one who built the scheme is the worst judge of it. A
critic on the same model as the builder shares its assumptions. A critic on a different model attacks
the scheme from places the builder did not think to defend.

---

## Role Registry

| Role ID | Spawned at | Engine options | Why |
|---------|-----------|----------------|-----|
| `infra-scout` | Phase A | claude, codex, kimi, grok, cursor | reads repository files only; every finding cites a file |
| `live-drift-checker` | Phase A | **claude only** | reaches production through the user's ssh alias or platform CLI — that route and those credentials are never handed to another vendor's agent |
| `rollback-critic` | Phase C | claude, codex, kimi, grok, cursor | adversarial reading of the finished scheme and its evidence — the best fit for a different model |

Any other assignment for `live-drift-checker` is ignored with one warning line. Both external roles are
**read-only**; neither may be given a write mode.

---

## Config

```json
{
  "roles": {
    "rollback-critic": { "engine": "cursor", "model": "cursor-grok-4.6-xhigh" }
  }
}
```

| Key | Meaning | Default |
|-----|---------|---------|
| `enabled` | `false` → every role on Claude | `true` |
| `fallback` | CLI missing or failed: `"claude"` (silent fallback) or `"fail"` (stop the run) | `"claude"` |
| `roles.<id>` | engine name, or `{ engine, model?, effort? }` | `"claude"` |
| `engines.<name>` | overrides of the presets below (`model`, `effort`, or full `cmd` / `resume`) | presets below |

---

## Resolve Engines (once, before Phase A)

1. **Read the config.** Missing → all Claude, **stop here**. Invalid JSON → all Claude plus one warning
   line.
2. **Kill switch.** `"enabled": false`, or `--engines=off` in the user's invocation → all Claude,
   stop here.
3. **Probe only the CLIs this plugin's roles reference** — one Bash call, e.g.
   `command -v cursor-agent codex` (the `cursor` engine's binary is `cursor-agent`, never `agent` — see
   its preset; add `PATH="$HOME/.local/bin:$PATH"` if it is not found).
   Missing binary → that role falls back per `fallback`.
4. **Keep the table** — role ID → engine and model — for the whole run.
5. 📢 **Print one line** only if a role is non-Claude:
   `⚙️ Движки: rollback-critic → cursor/cursor-grok-4.6-xhigh (остальные — Claude)`
   If any role resolved to `kimi`, append its disclosure to the same line:
   `⚙️ kimi без sandbox-флага — граница «только чтение» держится инструкцией.`

---

## Delegated One-Shot

At the spawn point of an external role, **do not call `Task()`**. Instead:

1. **Write the prompt to a file first.** `mkdir -p` the directory before the first write — nothing
   else creates it. Path: `.claude/zero-downtime-deploy/engine/<role>-<n>.prompt.md`.
   Content, in order:
   - the orchestrator line from "Role Brief" below;
   - the role brief — the body of `agents/<role>.md`, prepared as described below;
   - **the exact prompt `SKILL.md` shows for this `Task()`**, with the placeholders filled — for the
     critic that means the scheme as built and every check with its status (`PASS` / `FAIL` /
     `SKIP` / `NOT-RUN`) and source, because that evidence exists only in your context;
   - the Output Contract below.

   Pass paths for repository files — the engine runs in the project directory and reads them itself.
2. **Run the CLI** with the preset below, output redirected to
   `.claude/zero-downtime-deploy/engine/<role>-<n>.out.txt`. The Bash tool stops a foreground call at
   10 minutes and the result is lost even when the engine finished, so the critic — the heavier role,
   with the whole scheme and its evidence pasted in — runs with `run_in_background: true`; read its out
   file when the run completes. `infra-scout` runs foreground with `timeout: 600000`.
3. **Read the report from the output file** and treat it as that agent's return value. Record where
   the engine keeps the conversation: append a `launch` line when the session id is known and a
   `done` / `failed` line at the end to `.claude/zero-downtime-deploy/ledger.jsonl`, in the ledger
   format of `agent-teams` (`references/engines.md`, "The Ledger"). If the ledger is lost,
   `agent-teams/scripts/engine-sessions.py <project>` rebuilds the map from the engines' own stores.
4. **Check citations, not conclusions.**
   - `infra-scout`: a fact whose cited file or line does not exist is dropped. Everything else keeps
     "репозиторий" as its source, exactly as from the Claude scout.
   - `rollback-critic`: an objection whose citation does not exist is dropped and counted as noise.
     An objection that cites real lines goes into the report's open risks **even if you disagree with
     it** — `SKILL.md` forbids arguing them away, and the engine does not change that.
5. **On failure** (non-zero exit, empty result, auth error) → per `fallback`: `claude` = spawn the
   normal `Task()` with the same prompt and print `⚙️ {engine} не ответил на {role} — переключаю на
   Claude.`; `fail` = stop and report.

In Phase D, name the engine and model the critic ran on next to "Open risks the critic raised".

---

## Role Brief

The engine gets **the same instructions the Claude agent would have** — never a summary.

- **Keep verbatim:** the whole body of `agents/<role>.md`, including its Report Format and
  `<output_rules>`, and the `<example>` blocks from the frontmatter `description`.
- **Drop:** the frontmatter keys `name`, `model`, `color`, `tools`.
- **Translate:** nothing else — both roles already return a report rather than messaging anyone.

Start the file with:

```
Ты работаешь через оркестратор: твой отчёт — возвращаемое значение для ведущего, а не сообщение
человеку. Прямой связи с пользователем и с рабочей машиной у тебя нет.
```

## Output Contract (append to every prompt)

```
Ты работаешь как модуль пайплайна, а не как ассистент в чате. Твой ответ — данные для ведущего.

- Не изменяй файлы и не запускай команды, которые что-то пишут. Никаких обращений к боевым серверам.
- Отвечай строго в формате отчёта, заданном ролью выше. Без вступлений.
- Каждое утверждение подкрепляй ссылкой файл:строка или цитатой из переданных доказательств.
- Значения секретов не читай и не пересказывай — только где они берутся.
- Не хватает контекста — не выдумывай, заверши ответ строкой `ВОПРОС ВЕДУЩЕМУ: <вопрос>`.
```

If the report ends with `ВОПРОС ВЕДУЩЕМУ:`, answer it and `resume` the session.

---

## Built-in Presets (read-only form)

The same presets as `agent-teams/skills/team-feature/references/engines.md` (its `cursor` preset
arrives with agent-teams 0.10.0), reduced to the read-only mode — both external roles here read. `{prompt}` is always `"$(cat <prompt file>)"`. **Re-verify after
CLI upgrades**; judge success by the exit code and a present reply, not by stderr noise.

### codex

```
cmd:     codex exec --skip-git-repo-check --sandbox read-only -m {model} -c model_reasoning_effort="{effort}" {prompt} < /dev/null
resume:  codex exec resume {session} {prompt} < /dev/null
model:   gpt-6-sol
effort:  xhigh
session: output line matching `session id: <uuid>`
```

`< /dev/null` is mandatory — without it `codex exec` can hang waiting for stdin.

### kimi

```
cmd:     kimi -m {model} -p {prompt}
resume:  kimi -r {session} -p {prompt}
model:   kimi-code/k3
session: trailing line `To resume this session: kimi -r (session_[0-9a-f-]+)`
```

Kimi has no sandbox flag, and instructions alone are not a boundary — the same rule `agent-teams`
applies. Every external role here only reads, so prefer another engine whenever the repository might
hold plain-text secrets; if `kimi` is chosen anyway, the 📢 line says so.

### grok

```
cmd:     grok --sandbox read-only --always-approve -m {model} --effort {effort} --session-id {session} -p {prompt}
resume:  grok --sandbox read-only --always-approve --effort {effort} -r {session} -p {prompt}
model:   grok-4.6
effort:  high
session: NOT printed — mint a real UUID (`uuidgen`) per role before the first call and reuse it
```

`--always-approve` is mandatory — without it Grok silently exits in batch mode.

### cursor

```
cmd:     cursor-agent -p --trust --output-format json --model {model} --mode ask {prompt}
resume:  cursor-agent -p --trust --output-format json --model {model} --mode ask --resume {session} {prompt}
model:   cursor-grok-4.6-xhigh
session: the `session_id` field of the JSON reply — the last line of the out file that parses as JSON
result:  the `result` field of the same JSON
```

Cursor Agent CLI, called as **`cursor-agent`** — not `agent`: the Grok installer symlinks `agent` to
Grok's own binary, and on a machine with both CLIs that name launches Grok with Cursor's flags.
`--trust` is mandatory — without it the CLI stops on the folder-trust question and does nothing.

`--mode ask` is a real read-only boundary, verified against 2026.09.10 (2026-09-15): it refuses to
create a file, refuses a shell command that would write one, still runs read-only commands, and its
sandbox denies reading secret files such as `.env`.

Do not route roles to Claude models through Cursor — the point is a *different* model. Useful picks:
`cursor-grok-4.6-xhigh` for the critic, `gemini-3.7-flash-high` for a cheap repository scout.
