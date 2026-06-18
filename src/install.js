import { authStatus, createCalendar, createEvent, deleteCalendar, searchCalendars } from "./lark-cli.js";
import { extractMatches } from "./parser.js";
import { fetchTournamentPages } from "./wikitext.js";

export async function installCalendar(options) {
  const progress = options.onProgress ?? (() => {});
  await ensureUserCalendarScopes();

  progress({ type: "status", message: "正在抓取最新世界杯赛程..." });
  const pages = await fetchTournamentPages();
  const matches = Object.values(pages)
    .flatMap((page) => extractMatches(page.key, page.text))
    .sort((a, b) => Number(a.startTime.timestamp) - Number(b.startTime.timestamp));

  if (options.dryRun) {
    progress({ type: "status", message: `抓取完成，预览 ${matches.length} 场比赛。` });
    return {
      matchesCount: matches.length,
      sample: matches.slice(0, 5)
    };
  }

  const existingCalendarId = await findExistingCalendar(options.calendarName);
  if (existingCalendarId && options.replaceExisting) {
    if (!options.yes) {
      throw new Error("Deleting an existing calendar requires --yes together with --replace-existing.");
    }
    await deleteCalendar(existingCalendarId);
  } else if (existingCalendarId) {
    throw new Error(
      `A calendar named "${options.calendarName}" already exists. Re-run with --replace-existing --yes to recreate it.`
    );
  }

  const created = await createCalendar({
    summary: options.calendarName,
    description: "由 fifa2026calendar-larkcli 实时导入；每次运行都会重新查询线上赛程和比分。",
    permissions: options.permissions
  });
  const calendarId = created.calendar?.calendar_id;
  if (!calendarId) {
    throw new Error("Failed to create calendar: missing calendar_id in lark-cli response.");
  }
  progress({
    type: "calendar_created",
    calendarId,
    calendarName: options.calendarName,
    total: matches.length
  });

  for (let index = 0; index < matches.length; index += 1) {
    const match = matches[index];
    await createEvent(calendarId, match);
    progress({
      type: "event_progress",
      current: index + 1,
      total: matches.length,
      summary: match.summary
    });
  }

  return {
    calendarId,
    matchesCount: matches.length
  };
}

async function ensureUserCalendarScopes() {
  const status = await authStatus();
  const userIdentity = status.identities?.user;
  if (!userIdentity?.available) {
    throw new Error("lark-cli user identity is not available. Run `lark-cli auth login` first.");
  }

  const scopeString = userIdentity.scope ?? "";
  for (const requiredScope of ["calendar:calendar:create", "calendar:calendar:read", "calendar:calendar.event:create"]) {
    if (!scopeString.includes(requiredScope)) {
      throw new Error(`Missing required user scope: ${requiredScope}`);
    }
  }
}

async function findExistingCalendar(calendarName) {
  const result = await searchCalendars(calendarName);
  const exact = (result.items ?? []).find(
    (item) => item.summary === calendarName && item.type === "shared" && item.role === "owner" && !item.is_deleted
  );
  return exact?.calendar_id ?? null;
}
