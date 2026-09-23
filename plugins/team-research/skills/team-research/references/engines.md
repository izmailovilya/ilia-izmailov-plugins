# Engines — Another Model in the Adversarial Seat

Every role runs on Claude by default. **With no `~/.claude/agent-teams.json`, nothing in this file
applies** — the research runs exactly as `SKILL.md` describes.

The config file is shared with the `agent-teams` plugin: one user-level file names an engine per role,
and each plugin reads only the role IDs it owns. IDs this plugin does not know belong to other
plugins — skip them silently.

Because the file is shared, the IDs a user can route carry this plugin's prefix — `research-scout`,
`research-critic`, `research-specialist` — so `"research-critic": "codex"` cannot also aim at a role
called `critic` in some other plugin. The brief still comes from the agent file without the prefix
(`research-critic` → `agents/critic.md`). `lead` and `investigator` keep plain IDs: both are Claude-only
here, so an assignment to them changes nothing whichever plugin reads it.

**Why bother.** Not the other subscription — the other model's blind spots. A challenger on the same
model as the investigators tends to accept the same shaky inferences they made. An adversarial reader
on a different model disagrees in different places, and those places are exactly what Phase 3 exists
to find.

---

## Role Registry

| Role ID | Spawned at | Engine options | Why |
|---------|-----------|----------------|-----|
| `lead` | skill entry | **claude only** | owns the team, the synthesis and the dialogue with the user |
| `research-scout` | Phase 1 | claude, codex, kimi, grok, cursor | one-shot, read-only landscape scan (`agents/scout.md`) |
| `investigator` | Phase 2 | **claude only** | long multi-turn investigation that Lead messages mid-run (hints, redirects, forwarded cross-angle findings) — that exchange does not cross a CLI boundary |
| `research-challenger` | Phase 3 | claude, codex, kimi, grok, cursor | adversarial reading of the pasted findings — the best fit for a different model |
| `research-critic` | Phase 3, on demand | claude, codex, kimi, grok, cursor | failure-mode analysis of the flagged areas (`agents/critic.md`) |
| `research-specialist` | Phase 3, on demand | claude, codex, kimi, grok, cursor | deep dive into one flagged area (`agents/specialist.md`) |

Deepening agents in Phase 2.5 are investigators and stay on Claude. Any other assignment for `lead` or
`investigator` is ignored with one warning line.

Every external role here is **read-only**. None of them may be given a write mode.

---

## Config

```json
{
  "roles": {
    "research-challenger": { "engine": "cursor", "model": "cursor-grok-4.6-xhigh" },
    "research-critic": "codex"
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

## Resolve Engines (Lead, once, before Phase 1)

1. **Read the config.** Missing → all Claude, **stop here** (zero cost for default users). Invalid JSON
   → all Claude plus one warning line.
2. **Kill switch.** `"enabled": false`, or `--engines=off` in the user's invocation → all Claude,
   stop here.
3. **Probe only the CLIs this plugin's roles reference** — one Bash call, e.g.
   `command -v codex cursor-agent` (the `cursor` engine's binary is `cursor-agent`, never `agent` — see
   its preset; add `PATH="$HOME/.local/bin:$PATH"` if it is not found).
   Missing binary → that role falls back per `fallback`.
4. **Keep the table** — role ID → engine and model — in your context for the whole run.
5. 📢 **Print one line** only if a role is non-Claude:
   `⚙️ Движки: research-challenger → cursor/cursor-grok-4.6-xhigh (остальные — Claude)`
   If any role resolved to `kimi`, append its disclosure to the same line:
   `⚙️ kimi без sandbox-флага — граница «только чтение» держится инструкцией.`

---

## Delegated One-Shot

At the spawn point of an external role, **do not call `Task()`**. Instead:

1. **Write the prompt to a file first** — with Bash (`cat > … <<'EOF'`), so the directory can be
   created in the same call. **`mkdir -p` the directory in the same Bash call** — the heredoc does not create it, and the
   scout runs before anything has been written into the run directory, so it may not exist yet.
   Path: `.claude/teams/research-<topic-slug>/engine/<role>-<n>.prompt.md`. Content, in order:
   - the orchestrator line from "Role Brief" below;
   - the role brief — the body of `agents/<role>.md`, prepared as described below;
   - **the exact prompt `SKILL.md` shows for this `Task()`**, with the placeholders filled — for the
     challenger that means all investigators' findings, pasted in full, because they exist only in
     your context;
   - the Output Contract below.

   Pass paths for anything that lives in the repository — the engine runs in the project directory
   and reads files itself. Paste only what exists nowhere else (findings, flagged areas).
2. **Run the CLI** with the preset below, output redirected to
   `.claude/teams/research-<topic-slug>/engine/<role>-<n>.out.txt`. The Bash tool stops a foreground
   call at 10 minutes and the result is lost even when the engine finished, so the challenger — the
   heaviest role, with every investigator's findings pasted in — runs with `run_in_background: true`;
   read its out file when the run completes. The scout, critic and specialist run foreground with
   `timeout: 600000`.
3. **Read the report from the output file** and treat it as that agent's message to you. Keep the
   session id from the output — if you need to ask the same role a follow-up, `resume` it instead of
   starting over. Record where it is: append a `launch` line when the id is known and a `done` /
   `failed` line at the end to `.claude/teams/research-<topic-slug>/ledger.jsonl`, in the ledger format
   of `agent-teams` (`references/engines.md`, "The Ledger"). If the ledger is lost,
   `agent-teams/scripts/engine-sessions.py <project>` rebuilds the map from the engines' own stores.
4. **Check before you use it.** Open the cited `file:line` for every claim you rely on. A citation
   that does not exist → drop the claim and count it. A claim without a citation → treat it as
   `Hypothesized`, never as `Observed`.
5. **On failure** (non-zero exit, empty result, auth error) → per `fallback`: `claude` = spawn the
   normal `Task()` with the same prompt and print `⚙️ {engine} не ответил на {role} — переключаю на
   Claude.`; `fail` = stop and report.

In the final report, add one line under **Team:** — which roles ran on which engine and model.

---

## Role Brief

The engine gets **the same instructions the Claude agent would have** — never a summary.

- **Keep verbatim:** the whole body of `agents/<role>.md`, and the `<example>` blocks from the
  frontmatter `description` — they are the role's calibration.
- **Drop:** the frontmatter keys `name`, `model`, `color`, `tools`.
- **Translate:** "send findings to lead" / "end your turn with the findings as your final reply" →
  "return your findings as the reply"; drop any `SendMessage` / `TO:` / `FROM:` mechanics.

Start the file with:

```
Ты работаешь через оркестратор: у тебя нет прямой связи с другими участниками команды и нет
списка задач. Всё, что роль предписывает "отправить" ведущему, ты возвращаешь своим ответом.
```

## Output Contract (append to every prompt)

```
Ты работаешь как модуль пайплайна, а не как ассистент в чате. Твой ответ — данные для ведущего.

- Не изменяй файлы и не запускай команды, которые что-то пишут.
- Отвечай строго в формате, заданном ролью выше. Без вступлений.
- Каждое утверждение о коде подкрепляй ссылкой файл:строка. Без ссылки — помечай как Hypothesized.
- Не хватает контекста — не выдумывай, заверши ответ строкой `ВОПРОС ВЕДУЩЕМУ: <вопрос>`.
```

If the report ends with `ВОПРОС ВЕДУЩЕМУ:`, answer it and `resume` the session.

---

## Built-in Presets (read-only form)

The same presets as `agent-teams/skills/team-feature/references/engines.md` (its `cursor` preset
arrives with agent-teams 0.10.0), reduced to the read-only mode — every external role in this plugin
reads. `{prompt}` is always `"$(cat <prompt file>)"`.
**Re-verify after CLI upgrades**; judge success by the exit code and a present reply, not by stderr
noise.

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
`cursor-grok-4.6-xhigh` for the challenger and critic (adversarial reading), `gpt-6-sol-xhigh` for a
specialist that must hold a long flagged area, `gemini-3.7-flash-high` for a cheap scout.
