import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Full path required when running under launchd (minimal PATH).
// Set REMINDCTL_PATH in the LaunchAgent EnvironmentVariables if needed.
const REMINDCTL = process.env.REMINDCTL_PATH ?? "remindctl";

export type ShowFilter =
  | "today"
  | "tomorrow"
  | "week"
  | "overdue"
  | "upcoming"
  | "completed"
  | "all";

interface ReminderList {
  id: string;
  title: string;
  overdueCount: number;
  reminderCount: number;
}

interface Reminder {
  id: string;
  title: string;
  notes: string | null;
  isCompleted: boolean;
  completionDate: string | null;
  dueDate: string | null;
  listID: string;
  listName: string;
  priority: string;
}

async function runRemindctl(...args: string[]): Promise<any> {
  let stdout = "";
  let stderr = "";
  try {
    // --no-input prevents interactive prompts when running under launchd
    const result = await execFileAsync(REMINDCTL, [...args, "--json", "--no-input"], {
      timeout: 15000,
      maxBuffer: 50 * 1024 * 1024, // 50 MB — default 1 MB is too small for large reminder libraries
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

function mapReminder(r: any): Reminder {
  return {
    id: r.id ?? "",
    title: r.title ?? "Untitled",
    notes: r.notes ?? null,
    isCompleted: r.isCompleted ?? false,
    completionDate: r.completionDate ?? null,
    dueDate: r.dueDate ?? null,
    listID: r.listID ?? "",
    listName: r.listName ?? "",
    priority: r.priority ?? "none",
  };
}

async function getLists(): Promise<ReminderList[]> {
  const data = await runRemindctl("list");
  const items: any[] = Array.isArray(data) ? data : [];
  return items.map((l: any) => ({
    id: l.id ?? "",
    title: l.title ?? "",
    overdueCount: l.overdueCount ?? 0,
    reminderCount: l.reminderCount ?? 0,
  }));
}

async function showReminders(filter: ShowFilter | string = "all", listName?: string): Promise<Reminder[]> {
  const args = ["show", filter];
  if (listName) args.push("--list", listName);
  const data = await runRemindctl(...args);
  const items: any[] = Array.isArray(data) ? data : [];
  return items.map(mapReminder);
}

async function searchReminders(searchText: string): Promise<Reminder[]> {
  if (!searchText || searchText.trim() === "") return [];
  const all = await showReminders("all");
  const lower = searchText.toLowerCase();
  return all.filter(
    (r) =>
      r.title.toLowerCase().includes(lower) ||
      (r.notes && r.notes.toLowerCase().includes(lower)),
  );
}

async function createReminder(
  title: string,
  listName = "Reminders",
  notes?: string,
  dueDate?: string,
  priority?: "none" | "low" | "medium" | "high",
): Promise<Reminder> {
  if (!title || title.trim() === "") throw new Error("Reminder title cannot be empty");

  const args = ["add", "--title", title, "--list", listName];
  if (notes) args.push("--notes", notes);
  if (dueDate) args.push("--due", dueDate);
  if (priority) args.push("--priority", priority);

  const data = await runRemindctl(...args);
  return mapReminder(data);
}

interface EditOptions {
  title?: string;
  listName?: string;
  dueDate?: string;
  notes?: string;
  priority?: "none" | "low" | "medium" | "high";
  clearDue?: boolean;
}

async function editReminder(id: string, options: EditOptions): Promise<Reminder> {
  const args = ["edit", id];
  if (options.title) args.push("--title", options.title);
  if (options.listName) args.push("--list", options.listName);
  if (options.dueDate) args.push("--due", options.dueDate);
  if (options.notes !== undefined) args.push("--notes", options.notes);
  if (options.priority) args.push("--priority", options.priority);
  if (options.clearDue) args.push("--clear-due");

  const data = await runRemindctl(...args);
  return mapReminder(data);
}

async function completeReminder(id: string): Promise<{ success: boolean; message: string; reminder?: Reminder }> {
  try {
    const data = await runRemindctl("complete", id);
    const items: any[] = Array.isArray(data) ? data : [];
    const reminder = items.length > 0 ? mapReminder(items[0]) : undefined;
    return { success: true, message: "Reminder marked as complete.", reminder };
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

// Compatibility aliases used by index.ts
async function getAllLists() { return getLists(); }
async function getAllReminders(listName?: string) { return showReminders("all", listName); }

async function requestRemindersAccess(): Promise<{ hasAccess: boolean; status: string; message: string }> {
  try {
    const data = await runRemindctl("status");
    const authorized: boolean = data?.authorized === true;
    const status: string = data?.status ?? "unknown";
    if (authorized) {
      return { hasAccess: true, status, message: "Reminders access granted." };
    }
    return {
      hasAccess: false,
      status,
      message: "Reminders access not granted. Run 'remindctl authorize' to request access.",
    };
  } catch (error) {
    return {
      hasAccess: false,
      status: "error",
      message: `Reminders access error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export default {
  getLists,
  showReminders,
  getAllLists,
  getAllReminders,
  searchReminders,
  createReminder,
  editReminder,
  completeReminder,
  deleteReminder,
  openReminder,
  requestRemindersAccess,
};
