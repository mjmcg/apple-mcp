import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Full path required when running under launchd (minimal PATH).
// Set REMINDCTL_PATH in the LaunchAgent EnvironmentVariables if needed.
const REMINDCTL = process.env.REMINDCTL_PATH ?? "remindctl";

interface ReminderList {
  name: string;
  id: string;
}

interface Reminder {
  name: string;
  id: string;
  body: string;
  completed: boolean;
  dueDate: string | null;
  listName: string;
  priority?: number;
}

async function runRemindctl(...args: string[]): Promise<any> {
  let stdout = "";
  let stderr = "";
  try {
    // --no-input prevents interactive prompts when running under launchd
    const result = await execFileAsync(REMINDCTL, [...args, "--json", "--no-input"], {
      timeout: 15000,
    });
    stdout = result.stdout;
    stderr = result.stderr;
  } catch (err: any) {
    stdout = err.stdout ?? "";
    stderr = err.stderr ?? "";
    if (!stdout) {
      throw new Error(stderr.trim() || err.message || "remindctl exited with error");
    }
  }

  const trimmed = stdout.trim();
  if (!trimmed) {
    throw new Error(`remindctl produced no output${stderr.trim() ? `: ${stderr.trim()}` : ""}`);
  }

  return JSON.parse(trimmed);
}

function mapReminder(r: any, listName = ""): Reminder {
  return {
    id: r.id ?? "",
    name: r.title ?? "Untitled",
    body: r.notes ?? "",
    completed: r.isCompleted ?? false,
    dueDate: r.dueDate ?? r.due ?? null,
    listName: r.listName ?? listName,
    priority: r.priority,
  };
}

async function getAllLists(): Promise<ReminderList[]> {
  const data = await runRemindctl("list");
  const lists: any[] = Array.isArray(data) ? data : data?.lists ?? [];
  return lists.map((l: any) => ({ name: l.name ?? "", id: l.id ?? l.name ?? "" }));
}

async function getAllReminders(listName?: string): Promise<Reminder[]> {
  const args = ["show", "all"];
  if (listName) args.push("--list", listName);
  const data = await runRemindctl(...args);
  const items: any[] = Array.isArray(data) ? data : data?.reminders ?? [];
  return items.map((r) => mapReminder(r, listName ?? ""));
}

async function searchReminders(searchText: string): Promise<Reminder[]> {
  if (!searchText || searchText.trim() === "") return [];
  const all = await getAllReminders();
  const lower = searchText.toLowerCase();
  return all.filter(
    (r) =>
      r.name.toLowerCase().includes(lower) ||
      (r.body && r.body.toLowerCase().includes(lower)),
  );
}

async function createReminder(
  name: string,
  listName = "Reminders",
  notes?: string,
  dueDate?: string,
): Promise<Reminder> {
  if (!name || name.trim() === "") throw new Error("Reminder name cannot be empty");

  const args = ["add", "--title", name, "--list", listName];
  if (notes) args.push("--notes", notes);
  if (dueDate) args.push("--due", dueDate);

  const data = await runRemindctl(...args);
  const r = data?.reminder ?? data;
  return mapReminder(r, listName);
}

async function completeReminder(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await runRemindctl("complete", id);
    return { success: true, message: "Reminder marked as complete." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function deleteReminder(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await runRemindctl("delete", id, "--force");
    return { success: true, message: "Reminder deleted." };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function openReminder(
  searchText: string,
): Promise<{ success: boolean; message: string; reminder?: Reminder }> {
  const matches = searchText ? await searchReminders(searchText) : [];
  execFile("open", ["-a", "Reminders"]);
  if (matches.length === 0) {
    return { success: true, message: "Reminders app opened." };
  }
  return { success: true, message: "Reminders app opened.", reminder: matches[0] };
}

async function requestRemindersAccess(): Promise<{ hasAccess: boolean; message: string }> {
  try {
    const data = await runRemindctl("status");
    const authorized = data?.authorized ?? data?.status === "authorized";
    if (authorized) {
      return { hasAccess: true, message: "Reminders access granted." };
    }
    return {
      hasAccess: false,
      message: "Reminders access not granted. Run 'remindctl authorize' to request access.",
    };
  } catch (error) {
    return {
      hasAccess: false,
      message: `Reminders access error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  getAllLists,
  getAllReminders,
  searchReminders,
  createReminder,
  completeReminder,
  deleteReminder,
  openReminder,
  requestRemindersAccess,
};
