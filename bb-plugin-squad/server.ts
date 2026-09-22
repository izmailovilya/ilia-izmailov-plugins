// bb-plugin-squad — кнопки запуска мультимодельных систем на BB.
//
// Три субкоманды: bb squad council | arena | team "<задача>". Каждая спавнит
// видимый тред-оркестратор с инструкцией выполнить соответствующий скилл
// (bb-council / bb-arena / bb-team из skills/ этого плагина). Участники
// запускаются оркестратором как его субтреды — дерево видно в BB.
import { defineRpcContract, type BbPluginApi } from "@get-bb/plugin-sdk";

export const rpcContract = defineRpcContract({});

type LauncherKey = "council" | "arena" | "team";

const LAUNCHERS: Record<LauncherKey, { skill: string; emoji: string; label: string; what: string }> = {
  council: {
    skill: "bb-council",
    emoji: "⚖️",
    label: "Совет",
    what: "совет пяти агентов (анализ и мнения, без изменения кода)",
  },
  arena: {
    skill: "bb-arena",
    emoji: "🏟️",
    label: "Арена",
    what: "арена пяти агентов (соревновательное создание прототипов)",
  },
  team: {
    skill: "bb-team",
    emoji: "🛠",
    label: "Команда",
    what: "команда агентов с ролями (реализация фичи под ключ)",
  },
};

const USAGE = [
  "Usage:",
  "  bb squad council <задача> [--provider id] [--model model] [--reasoning low|medium|high|xhigh|max]",
  "  bb squad arena   <бриф>   [--provider id] [--model model] [--reasoning ...]",
  "  bb squad team    <фича>   [--provider id] [--model model] [--reasoning ...]",
  "  bb squad help",
  "",
  "Каждая команда создаёт тред-оркестратор, который выполняет соответствующий",
  "скилл (bb-council / bb-arena / bb-team) и порождает участников субтредами.",
  "--provider/--model задают движок оркестатора (по умолчанию — дефолт проекта).",
].join("\n");

interface ParsedArgs {
  sub: LauncherKey | "help" | undefined;
  task: string;
  providerId?: string;
  model?: string;
  reasoningLevel?: "low" | "medium" | "high" | "xhigh" | "max";
}

function parseArgv(argv: string[]): ParsedArgs {
  const result: ParsedArgs = { sub: undefined, task: "" };
  const rest: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--provider" || arg === "--model" || arg === "--reasoning") {
      const value = argv[++i];
      if (value === undefined) continue;
      if (arg === "--provider") result.providerId = value;
      else if (arg === "--model") result.model = value;
      else result.reasoningLevel = value as ParsedArgs["reasoningLevel"];
    } else {
      rest.push(arg);
    }
  }
  const [sub, ...taskParts] = rest;
  result.sub = sub as ParsedArgs["sub"];
  result.task = taskParts.join(" ").trim();
  return result;
}

export default async function plugin(bb: BbPluginApi) {
  bb.log.info("loaded");

  bb.cli.register({
    name: "squad",
    summary: "Мультимодельные системы BB: совет, арена, команда — одной командой",
    commands: [
      {
        name: "council",
        summary: "Совет пяти агентов — параллельный анализ вопроса, отчёт со сравнением",
        usage: "bb squad council <задача> [--provider id] [--model model] [--reasoning level]",
      },
      {
        name: "arena",
        summary: "Арена пяти агентов — соревновательное создание прототипов, галерея",
        usage: "bb squad arena <бриф> [--provider id] [--model model] [--reasoning level]",
      },
      {
        name: "team",
        summary: "Команда агентов с ролями — реализация фичи под ключ с ревью",
        usage: "bb squad team <фича> [--provider id] [--model model] [--reasoning level]",
      },
      { name: "help", summary: "Справка", usage: "bb squad help" },
    ],
    async run(argv, ctx) {
      const parsed = parseArgv(argv);

      if (parsed.sub === undefined || parsed.sub === "help") {
        return { exitCode: 0, stdout: USAGE };
      }
      if (!(parsed.sub in LAUNCHERS)) {
        return { exitCode: 1, stderr: `Неизвестная субкоманда «${parsed.sub}».\n\n${USAGE}` };
      }
      if (parsed.task === "") {
        return {
          exitCode: 1,
          stderr: `Задача пуста. Опиши, что нужно: bb squad ${parsed.sub} <задача>\n\n${USAGE}`,
        };
      }
      const projectId = ctx.projectId;
      if (projectId === undefined || projectId === null) {
        return {
          exitCode: 1,
          stderr:
            "Не удалось определить проект. Запусти команду из папки проекта BB или из треда " +
            "(cwd внутри проекта).",
        };
      }

      const launcher = LAUNCHERS[parsed.sub as LauncherKey];
      const prompt = [
        `Ты — ведущий (оркестратор) скилла «${launcher.skill}» в BB. Твоя задача:`,
        `1. Найди в своём каталоге скилл ${launcher.skill} (команда /${launcher.skill}) и загрузи его целиком.`,
        `2. Выполни этот скилл применительно к задаче ниже. Следуй ему буквально, не изобретай свой порядок.`,
        `3. Если скилла ${launcher.skill} в каталоге нет — ответь ровно этим и закончи: «Скилл ${launcher.skill} не найден: включи плагин squad».`,
        "",
        `ЗАДАЧА ИЛЬИ:`,
        parsed.task,
      ].join("\n");

      const shortTask = parsed.task.length > 60 ? `${parsed.task.slice(0, 57)}…` : parsed.task;
      try {
        const thread = await bb.sdk.threads.spawn({
          projectId,
          environment: { type: "project-default" },
          title: `${launcher.emoji} ${launcher.label}: ${shortTask}`,
          prompt,
          ...(parsed.providerId ? { providerId: parsed.providerId } : {}),
          ...(parsed.model ? { model: parsed.model } : {}),
          ...(parsed.reasoningLevel ? { reasoningLevel: parsed.reasoningLevel } : {}),
        });
        return {
          exitCode: 0,
          stdout: [
            `Запущено: ${launcher.emoji} ${launcher.label} — ${launcher.what}.`,
            `Тред-оркестратор: ${thread.title} (id: ${thread.id})`,
            `Оркестратор выполнит скилл ${launcher.skill} и породит участников субтредами.`,
            `Следи за деревом тредов; итог появится в треде оркестратора.`,
          ].join("\n"),
        };
      } catch (error) {
        return {
          exitCode: 1,
          stderr: `Не удалось создать тред-оркестратор: ${String(error)}`,
        };
      }
    },
  });

  bb.onDispose(() => {
    bb.log.info("disposed");
  });
}
