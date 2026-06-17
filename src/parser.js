import { getTeamMeta } from "./team-data.js";

const MATCH_DURATION_MINUTES = 165;

const STADIUM_TIMEZONES = {
  "AT&T Stadium": "America/Chicago",
  "Arrowhead Stadium": "America/Chicago",
  "BC Place": "America/Vancouver",
  "BMO Field": "America/Toronto",
  "Boston Stadium": "America/New_York",
  "Dallas Stadium": "America/Chicago",
  "Estadio Akron": "America/Mexico_City",
  "Estadio Azteca": "America/Mexico_City",
  "Estadio BBVA": "America/Monterrey",
  "Houston Stadium": "America/Chicago",
  "Gillette Stadium": "America/New_York",
  "Hard Rock Stadium": "America/New_York",
  "Kansas City Stadium": "America/Chicago",
  "Levi's Stadium": "America/Los_Angeles",
  "Lincoln Financial Field": "America/New_York",
  "Lumen Field": "America/Los_Angeles",
  "Mercedes-Benz Stadium": "America/New_York",
  "MetLife Stadium": "America/New_York",
  "Mexico City Stadium": "America/Mexico_City",
  "Miami Stadium": "America/New_York",
  "NRG Stadium": "America/Chicago",
  "New York New Jersey Stadium": "America/New_York",
  "Philadelphia Stadium": "America/New_York",
  "San Francisco Bay Area Stadium": "America/Los_Angeles",
  "Seattle Stadium": "America/Los_Angeles",
  "SoFi Stadium": "America/Los_Angeles",
  "Toronto Stadium": "America/Toronto",
  "Vancouver Stadium": "America/Vancouver"
};

export function extractMatches(pageKey, pageText) {
  const matches = [];
  const regex =
    /<section begin="?([^"\s]+)"? \/>{{#invoke:football box\|main([\s\S]*?)}}<section end="?([^"\s]+)"? \/>/g;
  for (const match of pageText.matchAll(regex)) {
    const sectionKey = match[1];
    const fields = parseFields(match[2]);
    matches.push(normalizeMatch(pageKey, sectionKey, fields));
  }
  return matches.filter(Boolean);
}

function parseFields(block) {
  const fields = {};
  let currentKey = null;
  for (const rawLine of block.split("\n")) {
    const line = rawLine.trimEnd();
    const fieldMatch = line.match(/^\|([^=]+)=(.*)$/);
    if (fieldMatch) {
      currentKey = fieldMatch[1].trim();
      fields[currentKey] = fieldMatch[2].trim();
      continue;
    }
    if (currentKey) {
      fields[currentKey] += `\n${line}`;
    }
  }
  return fields;
}

function normalizeMatch(pageKey, sectionKey, fields) {
  const startInfo = buildKickoff(fields.date, fields.time, fields.stadium);
  if (!startInfo) {
    return null;
  }

  const team1 = parseTeam(fields.team1);
  const team2 = parseTeam(fields.team2);
  const score = parseScore(fields.score);
  const stadium = plainText(fields.stadium);
  const location = stadium.includes(",") ? stadium.split(",").slice(1).join(",").trim() : "";

  return {
    pageKey,
    sectionKey,
    summary: buildSummary(team1, score, team2),
    description: buildDescription(pageKey, stadium, sectionKey),
    location: location || stadium,
    sourceUrl: sourceUrlFor(pageKey),
    startTime: {
      timestamp: String(startInfo.startEpochSeconds),
      timezone: startInfo.timezone
    },
    endTime: {
      timestamp: String(startInfo.startEpochSeconds + MATCH_DURATION_MINUTES * 60),
      timezone: startInfo.timezone
    }
  };
}

function buildDescription(pageKey, stadium, sectionKey) {
  const stage = pageKey.startsWith("group-")
    ? `${pageKey.replace("group-", "")} 组`
    : knockoutStageLabel(sectionKey);
  return [
    `阶段：${stage}`,
    `场馆：${stadium}`,
    `来源：${sourceUrlFor(pageKey)}`,
    `抓取节：${sectionKey}`
  ].join("\n");
}

function sourceUrlFor(pageKey) {
  if (pageKey.startsWith("group-")) {
    return `https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_Group_${pageKey.replace("group-", "")}`;
  }
  if (pageKey === "final") {
    return "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_final";
  }
  return "https://en.wikipedia.org/wiki/2026_FIFA_World_Cup_knockout_stage";
}

function parseTeam(value) {
  if (!value) {
    return { display: "未知", code: null };
  }
  const codeMatch = value.match(/\{\{#invoke:flag\|fb(?:-rt)?\|([A-Z]{3})/);
  if (codeMatch) {
    const meta = getTeamMeta(codeMatch[1]);
    return meta
      ? { display: `${meta.flag}${meta.nameZh}`, code: codeMatch[1] }
      : { display: codeMatch[1], code: codeMatch[1] };
  }
  return { display: translatePlaceholder(plainText(value)), code: null };
}

function parseScore(value) {
  if (!value) {
    return null;
  }
  const match = value.match(/\{\{score link\|[^|]+\|([^}]+)}}/);
  const display = match ? match[1].trim() : value.trim();
  if (!/\d+\s*[–-]\s*\d+/.test(display)) {
    return null;
  }
  return display.replaceAll("–", "-").replace(/\s+/g, " ").trim();
}

function buildSummary(team1, score, team2) {
  const left = formatTeamForTitle(team1, "left");
  const right = formatTeamForTitle(team2, "right");
  if (score) {
    return `${left} ${score} ${right}`;
  }
  return `${left} vs ${right}`;
}

function formatTeamForTitle(team, side) {
  if (!team.code) {
    return team.display;
  }
  const meta = getTeamMeta(team.code);
  if (!meta) {
    return team.display;
  }
  return side === "left" ? `${meta.flag}${meta.nameZh}` : `${meta.nameZh}${meta.flag}`;
}

function buildKickoff(dateValue, timeValue, stadiumValue) {
  const dateMatch = dateValue?.match(/\{\{Start date\|(\d{4})\|(\d{1,2})\|(\d{1,2})/);
  const normalizedTime = plainText(timeValue);
  const timeMatch = normalizedTime.match(/(\d{1,2}):(\d{2})\s+([ap])\.m\.\s+UTC([+\-−]\d{1,2})(?::(\d{2}))?/);
  if (!dateMatch || !timeMatch) {
    return null;
  }

  const [, year, month, day] = dateMatch;
  let hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const meridiem = timeMatch[3];
  if (meridiem === "p" && hour !== 12) {
    hour += 12;
  }
  if (meridiem === "a" && hour === 12) {
    hour = 0;
  }

  const offsetHours = Number(timeMatch[4].replace("−", "-"));
  const offsetMinutes = Number(timeMatch[5] ?? "0");
  const offsetSign = timeMatch[4].includes("-") || timeMatch[4].includes("−") ? -1 : 1;
  const offsetTotalMinutes = offsetHours * 60 + offsetSign * offsetMinutes;
  const utcMillis =
    Date.UTC(Number(year), Number(month) - 1, Number(day), hour, minute) - offsetTotalMinutes * 60 * 1000;

  return {
    startEpochSeconds: Math.floor(utcMillis / 1000),
    timezone: timezoneForStadium(plainText(stadiumValue))
  };
}

function timezoneForStadium(stadium) {
  const baseName = stadium.split(",")[0].trim();
  return STADIUM_TIMEZONES[baseName] ?? "UTC";
}

export function plainText(value) {
  return (value ?? "")
    .replace(/\[\[[^|\]]+\|([^\]]+)]]/g, "$1")
    .replace(/\[\[([^\]]+)]]/g, "$1")
    .replace(/{{[^{}]*\|([^{}|]+)}}/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/'''/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function translatePlaceholder(label) {
  const normalized = label.replace(/\s+/g, " ").trim();
  let result = normalized
    .replace(/^Winner Group ([A-L])$/, "$1组第1")
    .replace(/^Runner-up Group ([A-L])$/, "$1组第2")
    .replace(/^3rd Group ([A-L/]+)$/, (_, groups) => `${groups.split("/").join("/")}组第3`)
    .replace(/^Winner Match (\d+)$/, "胜者（第$1场）")
    .replace(/^Loser Match (\d+)$/, "负者（第$1场）");
  if (result === normalized) {
    result = normalized.replaceAll("Group", "组").replaceAll("Runner-up", "第2").replaceAll("Winner", "第1");
  }
  return result;
}

function knockoutStageLabel(sectionKey) {
  if (sectionKey.startsWith("R32")) {
    return "淘汰赛 32 强";
  }
  if (sectionKey.startsWith("R16")) {
    return "淘汰赛 16 强";
  }
  if (sectionKey.startsWith("QF")) {
    return "四分之一决赛";
  }
  if (sectionKey.startsWith("SF")) {
    return "半决赛";
  }
  if (sectionKey === "Third-place") {
    return "三四名决赛";
  }
  if (sectionKey === "Final") {
    return "决赛";
  }
  return "淘汰赛";
}
