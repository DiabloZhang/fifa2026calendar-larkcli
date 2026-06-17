#!/usr/bin/env node

import { installCalendar } from "./install.js";

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (command !== "install") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const result = await installCalendar(options);
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
    calendarName: "世界杯2026赛程",
    permissions: "private",
    dryRun: false,
    replaceExisting: false,
    yes: false
  };

  const [command, ...rest] = argv;
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

  return { command, options };
}

function printUsage() {
  process.stdout.write(`Usage:
  fifa2026calendar-larkcli install [options]

Options:
  --calendar-name <name>     Default: 世界杯2026赛程
  --permissions <value>      private | show_only_free_busy | public
  --dry-run                  Fetch and parse only, do not write to Feishu
  --replace-existing         Delete the same-named calendar before import
  --yes                      Required with --replace-existing
`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
