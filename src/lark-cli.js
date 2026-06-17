import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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

export async function authStatus() {
  return runLarkCli(["auth", "status"]);
}

export async function searchCalendars(query) {
  return runLarkCli(
    ["calendar", "calendars", "search", "--as", "user", "--json", "--data", JSON.stringify({ query })]
  );
}

export async function createCalendar({ summary, description, permissions }) {
  return runLarkCli([
    "calendar",
    "calendars",
    "create",
    "--as",
    "user",
    "--json",
    "--data",
    JSON.stringify({ summary, description, permissions })
  ]);
}

export async function deleteCalendar(calendarId) {
  return runLarkCli([
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
}

export async function createEvent(calendarId, event) {
  return runLarkCli([
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
}
