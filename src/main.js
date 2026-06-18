import { installCalendar } from "./install.js";
import { ensureLarkCliAvailable } from "./lark-cli.js";

export async function main(argv = process.argv.slice(2)) {
  const { command, options, exitCode } = parseArgs(argv);
  if (exitCode !== null) {
    process.exitCode = exitCode;
    return;
  }

  if (command !== "install") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  await ensureLarkCliAvailable();

  const result = await installCalendar({
    ...options,
    onProgress: createConsoleProgress(options)
  });
  if (options.dryRun) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        ok: true,
        calendarName: options.calendarName,
        calendarId: result.calendarId,
        matchesCount: result.matchesCount
      },
      null,
      2
    )}\n`
  );
}

function parseArgs(argv) {
  const options = {
    calendarName: "世界杯2026赛程 ⚽️",
    permissions: "private",
    dryRun: false,
    replaceExisting: false,
    yes: false
  };

  const [command, ...rest] = argv;
  if (!command) {
    printUsage();
    return { command: null, options, exitCode: 1 };
  }

  if (command === "--help" || command === "-h") {
    printUsage();
    return { command: null, options, exitCode: 0 };
  }

  for (let i = 0; i < rest.length; i += 1) {
    const arg = rest[i];
    if (arg === "--calendar-name") {
      options.calendarName = rest[++i];
    } else if (arg === "--permissions") {
      options.permissions = rest[++i];
    } else if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--replace-existing") {
      options.replaceExisting = true;
    } else if (arg === "--yes") {
      options.yes = true;
    } else if (arg === "--help" || arg === "-h") {
      printUsage();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { command, options, exitCode: null };
}

function printUsage() {
  process.stdout.write(`Usage:
  fifa2026calendar-larkcli install [options]

Options:
  --calendar-name <name>     Default: 世界杯2026赛程 ⚽️
  --permissions <value>      private | show_only_free_busy | public
  --dry-run                  Fetch and parse only, do not write to Feishu
  --replace-existing         Delete the same-named calendar before import
  --yes                      Required with --replace-existing
`);
}

function createConsoleProgress(options) {
  if (options.dryRun) {
    return (event) => {
      if (event.type === "status") {
        process.stderr.write(`${event.message}\n`);
      }
    };
  }

  let lastLineLength = 0;
  return (event) => {
    if (event.type === "status") {
      process.stderr.write(`${event.message}\n`);
      return;
    }

    if (event.type === "calendar_created") {
      process.stderr.write(
        `日历创建成功：${event.calendarName} (${event.calendarId})，准备导入 ${event.total} 场比赛。\n`
      );
      return;
    }

    if (event.type === "event_progress") {
      const line = `已导入「${options.calendarName}」${event.current}/${event.total}：${event.summary}`;
      const padded = line.padEnd(lastLineLength, " ");
      lastLineLength = line.length;
      process.stderr.write(`\r${padded}`);
      if (event.current === event.total) {
        process.stderr.write("\n");
      }
    }
  };
}
