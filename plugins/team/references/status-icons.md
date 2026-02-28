# Status Icons — единый визуальный язык команды

> Все агенты команды используют эти emoji-константы для статусных сообщений, activeForm и tree-output. Единообразие повышает читаемость и позволяет быстро парсить состояние команды.

## Состояния агента

| Icon | Состояние | Когда использовать |
|------|-----------|-------------------|
| 🔍 | Исследование | Поиск файлов, Glob/Grep, чтение кода |
| 🔨 | Реализация | Написание/редактирование кода |
| 📝 | Ревью | Проверка чужого кода |
| ⏳ | Ожидание | Ожидание ответа от другого агента |
| 🚀 | Старт | Claim задачи, начало работы |
| ✅ | Готово | Задача/проверка завершена |
| ❌ | Блокер | STUCK, IMPOSSIBLE_WAIT, ошибка |
| 🔄 | Повтор | Retry, повторная проверка, fix после review |
| 💬 | Эскалация | Вопрос Lead/Tech Lead, ESCALATION |
| 😴 | Idle | Агент спит, ждёт задачу |
| 👁 | Мониторинг | Supervisor следит за командой |

## Роли (prefix в review)

| Icon | Роль |
|------|------|
| 🔒 | Security Review |
| 🧠 | Logic Review |
| 📐 | Quality Review |
| 🔍 | Unified Review |

## Формат статусных сообщений

Каждый агент при смене состояния пишет:

```
{icon} [{ROLE}] {действие} — {контекст}
```

Примеры:
```
🚀 [CODER-1] Claiming task #3 «Add settings endpoint»
🔍 [CODER-1] Reading gold standards — src/server/routers/profile.ts
🔨 [CODER-1] Implementing — src/server/routers/settings.ts
✅ [CODER-1] Self-check passed — lint ✅ types ✅ tests ✅
⏳ [CODER-1] Requesting review — waiting for 3 reviewers
🔄 [CODER-1] Fixing CRITICAL — src/server/routers/settings.ts:42
✅ [CODER-1] Done — task #3 committed (abc1234)

📝 [SECURITY] Reviewing task #3 — 2 files
✅ [SECURITY] No security issues

❌ [CODER-2] Stuck — task #5, Prisma schema migration fails
💬 [CODER-2] Escalation to tech-lead — pattern doesn't fit

👁 [SUPERVISOR] All healthy — 2 coders active, 3 reviewers idle
```

## activeForm для TaskCreate/TaskUpdate

Используй emoji из этой таблицы для `activeForm` спиннера:

```
TaskUpdate(taskId="3", status="in_progress", activeForm="🔨 Implementing settings endpoint")
TaskUpdate(taskId="3", activeForm="⏳ Waiting for review")
TaskUpdate(taskId="3", status="completed", activeForm="✅ Done")
```

## Tree-output для Lead (Monitor Mode)

Lead периодически выводит дерево состояния команды:

```
📋 TEAM STATUS
├── 🔨 coder-1: task #3 «Add settings endpoint» (IN_PROGRESS)
├── ⏳ coder-2: task #4 «Update user model» (IN_REVIEW)
├── 😴 security-reviewer: idle
├── 📝 logic-reviewer: reviewing task #4
├── 😴 quality-reviewer: idle
├── 👁 supervisor: monitoring
└── ✅ tech-lead: plan validated

Progress: ████░░░░░░ 2/5 tasks
```
