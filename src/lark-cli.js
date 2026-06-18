import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function ensureLarkCliAvailable() {
  try {
    await execFileAsync("lark-cli", ["auth", "--help"], {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024
    });
  } catch (error) {
    if (error?.code === "ENOENT") {
      throw new Error(
        [
          "未检测到 lark-cli，请先安装并配置飞书 CLI。",
          "GitHub: https://github.com/larksuite/cli",
          "安装命令: npm install -g @larksuite/cli",
          "配置命令: lark-cli config init",
          "授权命令: lark-cli auth login --domain calendar"
        ].join("\n")
      );
    }
    throw error;
  }
}

export async function runLarkCli(args, { input } = {}) {
  const { stdout, stderr } = await execFileAsync("lark-cli", args, {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    input
  });
  if (stderr?.trim()) {
    process.stderr.write(stderr);
  }
  return stdout.trim() ? JSON.parse(stdout) : {};
}

function unwrapData(result) {
  if (result && typeof result === "object" && result.data && typeof result.data === "object") {
    return result.data;
  }
  return result;
}

export async function authStatus() {
  return runLarkCli(["auth", "status"]);
}

export async function searchCalendars(query) {
  const result = await runLarkCli(
    ["calendar", "calendars", "search", "--as", "user", "--json", "--data", JSON.stringify({ query })]
  );
  return unwrapData(result);
}

export async function createCalendar({ summary, description, permissions }) {
  const result = await runLarkCli([
    "calendar",
    "calendars",
    "create",
    "--as",
    "user",
    "--json",
    "--data",
    JSON.stringify({ summary, description, permissions })
  ]);
  return unwrapData(result);
}

export async function deleteCalendar(calendarId) {
  const result = await runLarkCli([
    "calendar",
    "calendars",
    "delete",
    "--as",
    "user",
    "--json",
    "--calendar-id",
    calendarId,
    "--yes"
  ]);
  return unwrapData(result);
}

export async function createEvent(calendarId, event) {
  const result = await runLarkCli([
    "calendar",
    "events",
    "create",
    "--as",
    "user",
    "--json",
    "--calendar-id",
    calendarId,
    "--data",
    JSON.stringify({
      summary: event.summary,
      description: event.description,
      location: { name: event.location },
      start_time: event.startTime,
      end_time: event.endTime,
      free_busy_status: "busy",
      visibility: "default"
    })
  ]);
  return unwrapData(result);
}
