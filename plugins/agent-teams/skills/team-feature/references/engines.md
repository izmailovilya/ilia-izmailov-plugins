# Engines — Pluggable Backends per Role

Every role in the pipeline is backed by an **engine**. The default engine for every role is
`claude` (a normal Claude Code subagent / teammate). A user MAY reassign individual roles to an
external CLI agent (Codex, Kimi, Grok) in their config file.

**Default behavior with no config file: everything runs on Claude, exactly as before.** This file
only matters when `~/.claude/agent-teams.json` exists and assigns a non-claude engine.

## Why offload at all

External CLIs bill against a different subscription (ChatGPT / Moonshot / xAI), so work moved there
does not consume Claude context or rate limit. Codex in particular over-reports issues — valuable
for review and risk work, provided every finding is triaged before it reaches a coder.

---

## Role Registry

Canonical role IDs. These are the keys usable in the config `roles` block.

| Role ID | Kind | Spawned at | Engine options |
|---------|------|-----------|----------------|
| `lead` | orchestrator | skill entry | **claude only** (owns team, tasks, user dialogue) |
| `codebase-researcher` | one-shot | Phase 1 Step 2 | claude, codex, kimi, grok |
| `reference-researcher` | one-shot | Phase 1 Step 2 | claude, codex, kimi, grok |
| `web-researcher` | one-shot | Phase 1 Step 2 | claude, grok (live search) |
| `risk-tester` | one-shot | Phase 1 Step 4b | claude, codex |
| `ci-verifier` | one-shot | Phase 3 Step 5c | claude, codex |
| `spec-verifier` | one-shot | Phase 3 Step 5c | claude, codex |
| `browser-verifier` | one-shot | Phase 3 Step 5c | **claude only** (needs Chrome MCP) |
| `legacy-scanner` | one-shot | Phase 3 Step 6 | claude, codex |
| `tech-lead` | teammate | Phase 1 Step 4b (MEDIUM) | claude, codex, kimi, grok |
| `architect` | teammate | Phase 1 Step 4c (COMPLEX) | claude, codex, kimi, grok |
| `architect-frontend` / `architect-backend` / `architect-systems` | teammate | Phase 1 Step 4c | per-persona override of `architect` |
| `security-reviewer` | teammate | Phase 1 Step 5 | claude, codex, kimi, grok |
| `logic-reviewer` | teammate | Phase 1 Step 5 | claude, codex, kimi, grok |
| `quality-reviewer` | teammate | Phase 1 Step 5 | claude, codex |
| `unified-reviewer` | teammate | Phase 1 Step 5 (SIMPLE) | claude, codex, kimi |
| `coder` | teammate | Phase 1 Step 5, Phase 2 | claude, codex **(experimental)** |

**Kind determines the mechanic:**

- **one-shot** → engine `claude` spawns a `Task()` subagent; a non-claude engine means **no Claude
  agent is created at all** — the spawner runs the CLI via Bash and reads the report.
- **teammate** → engine `claude` spawns the normal teammate; a non-claude engine spawns
  `agent-teams:proxy-teammate` under the same role name, which joins the team, speaks the team
  protocol, and delegates the thinking to the external CLI session.

`lead` and `browser-verifier` ignore any assignment other than `claude` — warn once and continue.

---

## Config File

Single user-level file: **`~/.claude/agent-teams.json`**. There is no project-level file.
If it does not exist, is unreadable, or is invalid JSON → all roles = `claude`, print nothing
except (on invalid JSON) one warning line.

### Minimal form

```json
{
  "roles": {
    "security-reviewer": "codex",
    "logic-reviewer": "codex",
    "risk-tester": "codex"
  }
}
```

Any role not listed = `claude`.

### Full form

```json
{
  "enabled": true,
  "fallback": "claude",
  "roles": {
    "security-reviewer": "codex",
    "risk-tester": { "engine": "codex", "effort": "xhigh" },
    "architect": "claude",
    "architect-backend": "codex",
    "web-researcher": "grok",
    "coder": "claude"
  },
  "engines": {
    "codex": { "model": "gpt-5.6-sol", "effort": "xhigh" }
  }
}
```

| Key | Meaning | Default |
|-----|---------|---------|
| `enabled` | Global kill switch. `false` → everything on Claude regardless of `roles`. | `true` |
| `fallback` | What happens when an assigned CLI is missing or fails: `"claude"` (silent fallback) or `"fail"` (stop the run). | `"claude"` |
| `roles.<id>` | Engine name string, or object `{ engine, model?, effort?, sandbox? }`. | `"claude"` |
| `engines.<name>` | Override the built-in preset (model, effort, or the full `cmd`/`resume` templates). | built-in presets below |

**CLI flag `--engines=off`** on the skill invocation forces every role to `claude` for that run
(same as `enabled: false`). Use it to reproduce a bug without external variables.

---

## Built-in Engine Presets

These ship with the plugin. Users only override them when a CLI changes its flags.

Flags, models and session mechanics below were smoke-tested against codex-cli 0.146.0, kimi-code/k3
and grok-4.6 (2026-08-17): each engine answered a prompt and correctly recalled it after a resume.
**Re-verify after CLI upgrades** — model names and resume flags do change.

**Judging success:** use the process exit code and whether a model reply is present. Do NOT treat
stderr noise as failure — Codex routinely prints
`ERROR codex_models_manager::cache: failed to load models cache: missing field base_instructions`
on a completely successful run.

### codex

```
cmd:     codex exec --skip-git-repo-check --sandbox {sandbox} -m {model} -c model_reasoning_effort="{effort}" "{prompt}" < /dev/null
resume:  codex exec resume {session} "{prompt}" < /dev/null
model:   gpt-5.6-sol
effort:  xhigh
sandbox: read → read-only, write → workspace-write
session: extract from output line matching `session id: <uuid>`
```

`< /dev/null` is MANDATORY — without it `codex exec` can hang on "Reading additional input from
stdin". Only `gpt-5.6-sol` works on a ChatGPT subscription; plain `gpt-5.6` requires a paid API key.

### kimi

```
cmd:     kimi -m {model} -p "{prompt}"
resume:  kimi -r {session} -p "{prompt}"
model:   kimi-code/k3
session: extract from the trailing line `To resume this session: kimi -r (session_[0-9a-f-]+)`
```

`--auto` / `--yolo` are incompatible with `-p`. Kimi has no sandbox flag — do not assign it
write-capable roles (`coder`, `risk-tester`). `-S` is accepted as an alias for `-r`, but `-r` is
what Kimi itself prints, so use `-r`.

### grok

```
cmd:     grok --sandbox {sandbox} --always-approve -m {model} --effort {effort} --session-id {session} -p "{prompt}"
resume:  grok --sandbox {sandbox} --always-approve --effort {effort} -r {session} -p "{prompt}"
model:   grok-4.6
effort:  high
sandbox: read → read-only, write → workspace-write
session: NOT printed by Grok — you mint it yourself. MUST be a real UUID (`uuidgen`)
```

`--always-approve` is MANDATORY — without it Grok silently exits in batch mode waiting for tool
approval.

**Grok sessions must be given an explicit `--session-id`, and it must be a real UUID.** Unlike
Codex and Kimi, Grok prints no session id in `-p` mode, and a bare `grok -r` resumes *the most
recent session in the current directory* — so two Grok-backed roles running in the same project
would silently share one conversation.

Mint one id per role before the first call and reuse it on every resume:

```bash
uuidgen   # e.g. 7C9E4A2B-1F03-4D8A-9B21-6E5F0C3D8A47
```

**A readable name like `grok-myteam-coder` is rejected — Grok fails to start.** (Observed in a live
run on 2026-08-17.) Save the generated UUID to the role's `session.txt` immediately; regenerating it
later loses the conversation.

---

## Step 0b: Resolve Engines (Lead, once per run)

Run this before Phase 1 Step 1. It is cheap and must not be skipped when the config exists.

1. **Read config.** `Read ~/.claude/agent-teams.json`. Missing → engine table is all-`claude`,
   **skip the rest of Step 0b entirely** (zero cost for default users). Invalid JSON → all-`claude`
   plus one warning line to the user.
2. **Honor kill switches.** `--engines=off` or `"enabled": false` → all-`claude`, skip the rest.
3. **Probe the CLIs actually referenced.** One Bash call:
   `command -v codex kimi grok` (only the names that appear in `roles`).
   Any missing name → those roles fall back per `fallback`.
4. **Build the engine table** — role ID → engine — and keep it for the whole run. Write it into
   `.claude/teams/{team-name}/state.md` under `## Engines` so it survives compaction.
5. 📢 **Print one line** only if at least one role is non-claude:
   `⚙️ Движки: {role} → {engine}, {role} → {engine} (остальные — Claude)`
   And if anything fell back: `⚙️ {engine} не найден — {role} работает на Claude.`

---

## Mechanic A: Delegated One-Shot

Replaces a `Task()` spawn for one-shot roles. The spawner (usually Lead) does this instead:

1. **Write the prompt to a file** — never inline a long prompt in the shell command; quoting breaks.
   Path: `.claude/teams/{team-name}/engine/{role}-{n}.prompt.md`.
   Content: the exact same prompt the Claude agent would have received, plus the Output Contract
   below.
2. **Run the CLI** via Bash with `run_in_background: true` when several are launched at once
   (researchers, verifiers), or foreground with `timeout: 600000` for a single call.
   Substitute `{prompt}` with `$(cat <path>)` and `{sandbox}` with the role's need
   (`risk-tester` → write, everything else → read).
3. **Read the report** from the command output. Treat it exactly as the Claude agent's return value.
4. **On failure** (non-zero exit, empty output, auth error, CLI missing) → apply `fallback`:
   `claude` = spawn the normal Claude agent for this role and print
   `⚙️ {engine} не ответил на {role} — переключаю на Claude.`; `fail` = stop and report.

### Output Contract (append to every external one-shot prompt)

```
Ты работаешь как модуль пайплайна, а не как ассистент в чате. Твой ответ — это данные для
оркестратора, а не сообщение человеку.

- Не изменяй файлы. {для risk-tester: временные скрипты складывай только в .claude/teams/<team>/tmp/}
- Отвечай строго в формате, заданном выше. Без вступлений, без "надеюсь, это поможет".
- Каждое утверждение подкрепляй ссылкой файл:строка. Без ссылки — помечай как предположение.
- Не хватает контекста — не выдумывай, заверши ответ строкой `ВОПРОС ОРКЕСТРАТОРУ: <вопрос>`.
```

If the report ends with `ВОПРОС ОРКЕСТРАТОРУ:`, answer it from Lead's context and resume the
session with the engine's `resume` command rather than starting over.

---

## Mechanic B: Proxy Teammate

For conversational roles. The team keeps its shape: the coder still sends
`SendMessage(recipient="security-reviewer", ...)` and gets a normal review back.

Spawn `agent-teams:proxy-teammate` with the same `name` the Claude teammate would have had, and a
prompt containing:

- `ROLE: <role id>` and the **full role brief** — see "Preparing the Role Brief" below
  (`agents/security-reviewer.md` etc.) so the external engine inherits identical instructions.
- `ENGINE: <name>` plus the resolved `cmd` / `resume` / `sandbox` / session-extraction pattern.
- The same context block the Claude teammate would receive (feature summary, DoD, gold standards,
  confirmed risks, team roster).

The proxy's contract is defined in `agents/proxy-teammate.md`. Two rules matter most:

- **Session continuity** — the proxy opens ONE external session per role and `resume`s it for every
  later message, so round 2 of a review remembers round 1.
- **Triage before relay** — external engines over-report. The proxy verifies each finding against
  the cited lines and relays only what it can confirm. Details in the agent file.

### When the proxy cannot start

If the first CLI call fails (missing binary, auth error, empty output), the proxy reports
`ENGINE_DOWN: <role>. <reason>` to Lead and shuts down. Lead applies `fallback`: spawns the normal
Claude teammate under the same name, sends a `ROSTER UPDATE` to affected coders, and prints
`⚙️ {engine} недоступен — {role} работает на Claude.`

---

---

## Preparing the Role Brief

An external engine must receive **the same instructions the Claude agent would have received** —
never a summary, never a rewritten "short version". The role brief is the agent file itself, with
three mechanical adjustments for things that only exist inside Claude Code.

**Keep, verbatim:**

- The entire body of `agents/{role}.md` — role definition, methodology, boundaries, checklists,
  output formats, rules. This is the whole point; a paraphrase loses the calibration.
- The `<example>` / `<example type="negative">` blocks from the frontmatter `description`. They are
  the role's few-shot examples and matter *more* for an external engine than for Claude, because the
  engine has no other calibration for what counts as in-scope.

**Drop:**

- The YAML keys `name`, `model`, `color`, `tools` — meaningless outside Claude Code. The engine has
  its own toolset, and its permission boundary is the `--sandbox` flag, not a tools list.

**Translate — the only place where wording changes:**

| Agent file says | Rewrite as |
|-----------------|------------|
| "send findings to the coder via SendMessage" | "return findings as your reply — the orchestrator relays them" |
| "message tech-lead / Lead / another teammate" | "end your reply with `ESCALATE TO {recipient}: <message>`" |
| "you are READ-ONLY, never use Write or Edit" | keep the sentence AND enforce it with `--sandbox read-only` — instructions alone are not a boundary |
| references to `TaskUpdate` / `TaskList` / team roster mechanics | drop; the proxy owns task state |

State this translation explicitly at the top of the brief so the engine knows why messaging verbs
are absent:

```
Ты работаешь через оркестратор: у тебя нет прямой связи с другими участниками команды.
Всё, что роль предписывает "отправить" кому-либо, ты возвращаешь в своём ответе —
оркестратор доставит это адресату.
```

**Same rule applies to Mechanic A.** A one-shot external role gets the same prompt text the Claude
one-shot agent would have received (the prompt printed in the phase document), plus the Output
Contract. Do not shorten it because "the engine is smart enough".

### Which roles transfer well

Not every role survives the move equally. Prefer to offload roles whose job is *read → produce a
list*, and keep protocol-heavy roles on Claude:

| Transfers well | Why |
|----------------|-----|
| `security-reviewer`, `logic-reviewer`, `unified-reviewer` | Self-contained: read code, output findings with citations. The proxy's triage catches over-reporting. |
| `risk-tester` | Self-contained: write a script, run it, report numbers. Evidence is checkable. |
| `codebase-researcher`, `reference-researcher`, `web-researcher` | Pure read-and-summarize, no team interaction at all. |
| `ci-verifier`, `spec-verifier`, `legacy-scanner` | Mechanical checks with quotable output. |

| Transfers poorly | Why |
|------------------|-----|
| `tech-lead`, `architect` | Their value is judgment, cross-task memory, and multi-party debate — the parts hardest to carry across a CLI boundary, and the parts whose output nobody downstream re-verifies. |
| `quality-reviewer` | Judges against project conventions and gold standards; Claude reads `.conventions/` natively and already holds them. |
| `coder` | Writes to the shared working tree; every safeguard has to be reconstructed by the proxy after the fact. Experimental for a reason. |

This is guidance, not enforcement — the config allows any assignment in the registry. But when a run
produces confusing results, this table is the first thing to check.

---

## Rules

- **Default is Claude.** Never assume a config exists. Never require one.
- **Never summarize a role brief or a prompt for an external engine.** Same text, minus the
  Claude-Code-only mechanics listed above.
- **Never route a decision to an external engine.** Engines produce findings, reports, and drafts.
  Approving a deviation, resolving a review loop, choosing between design options, and deleting
  legacy stay with Claude roles (`lead`, and whichever of `tech-lead` / `architect` is on Claude).
  If `tech-lead` is external, its `DECISION:` lines still go through the proxy, which is
  responsible for sanity-checking them against DECISIONS.md before writing.
- **Never assign a write-capable role to an engine without a write sandbox** (`kimi`). Warn and
  fall back.
- **One external session per role, not per message.** Starting fresh each time loses review memory
  and costs more.
- **Everything an external engine says is unverified until checked.** This applies to reports too,
  not just review findings — a risk-tester report claiming "the API caps at 3 QPS" must cite the
  script and its output.
- **Timeouts:** external calls take 2–10 minutes. Use `run_in_background: true` for parallel
  one-shots, `timeout: 600000` for foreground calls. Do not poll in a tight loop.
- **Artifacts:** prompts and raw outputs live in `.claude/teams/{team-name}/engine/`. Keep them —
  they are the audit trail when an external finding turns out to be wrong.
