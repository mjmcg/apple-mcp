import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// Full path required when running under launchd (minimal PATH).
// Set ACCLI_PATH in the LaunchAgent EnvironmentVariables if needed.
const ACCLI = process.env.ACCLI_PATH ?? "accli";

interface CalendarInfo {
    name: string;
    source: string;
    id: string;
    writable: boolean;
}

interface CalendarEvent {
    id: string;
    title: string;
    location: string | null;
    notes: string | null;
    startDate: string | null;
    endDate: string | null;
    calendarName: string;
    isAllDay: boolean;
    url: string | null;
}

async function runAccli(...args: string[]): Promise<any> {
    let stdout = "";
    let stderr = "";
    try {
        const result = await execFileAsync(ACCLI, [...args, "--json"], { timeout: 15000 });
        stdout = result.stdout;
        stderr = result.stderr;
    } catch (err: any) {
        stdout = err.stdout ?? "";
        stderr = err.stderr ?? "";
        if (!stdout) {
            throw new Error(stderr.trim() || err.message || "accli exited with error");
        }
    }

    const trimmed = stdout.trim();
    if (!trimmed) {
        throw new Error(`accli produced no output${stderr.trim() ? `: ${stderr.trim()}` : ""}`);
    }

    return JSON.parse(trimmed);
}

function mapEvent(e: any): CalendarEvent {
    return {
        id: e.id ?? "",
        title: e.summary ?? "Untitled",
        location: e.location || null,
        notes: e.description || null,
        startDate: e.start ? new Date(e.start).toISOString() : null,
        endDate: e.end ? new Date(e.end).toISOString() : null,
        calendarName: e.calendar ?? "Unknown",
        isAllDay: e.allDay ?? false,
        url: null,
    };
}

async function listCalendars(): Promise<CalendarInfo[]> {
    const data = await runAccli("calendars");
    const list: any[] = data?.calendars ?? [];
    return list.map((c: any) => ({
        name: c.name ?? "",
        source: c.source ?? "",
        id: c.id ?? "",
        writable: c.writable ?? false,
    }));
}

async function getCalendarNames(): Promise<string[]> {
    const calendars = await listCalendars();
    return calendars.map((c) => c.name).filter(Boolean);
}

async function getEvents(
    limit = 10,
    fromDate?: string,
    toDate?: string,
): Promise<CalendarEvent[]> {
    const effectiveLimit = limit > 0 ? limit : 10;

    const today = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(today.getDate() + 7);

    const from = (fromDate ?? today.toISOString()).split("T")[0];
    const to = (toDate ?? defaultEnd.toISOString()).split("T")[0];

    const calNames = await getCalendarNames();

    const results = await Promise.allSettled(
        calNames.map((name) =>
            runAccli("events", name, "--from", from, "--to", to, "--max", String(effectiveLimit))
        )
    );

    const events: CalendarEvent[] = [];
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        if (r.status === "fulfilled") {
            const list: any[] = r.value?.events ?? [];
            events.push(...list.map(mapEvent));
        } else {
            console.error(`Calendar "${calNames[i]}" query failed: ${r.reason}`);
        }
    }

    return events
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
        .slice(0, effectiveLimit);
}

async function searchEvents(
    searchText: string,
    limit = 10,
    fromDate?: string,
    toDate?: string,
): Promise<CalendarEvent[]> {
    const effectiveLimit = limit > 0 ? limit : 10;

    const today = new Date();
    const defaultEnd = new Date();
    defaultEnd.setDate(today.getDate() + 30);

    const from = (fromDate ?? today.toISOString()).split("T")[0];
    const to = (toDate ?? defaultEnd.toISOString()).split("T")[0];

    const calNames = await getCalendarNames();

    const results = await Promise.allSettled(
        calNames.map((name) =>
            runAccli("events", name, "--from", from, "--to", to, "--query", searchText, "--max", String(effectiveLimit))
        )
    );

    const events: CalendarEvent[] = [];
    for (const r of results) {
        if (r.status === "fulfilled") {
            const list: any[] = r.value?.events ?? [];
            events.push(...list.map(mapEvent));
        }
    }

    return events
        .sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""))
        .slice(0, effectiveLimit);
}

async function createEvent(
    title: string,
    startDate: string,
    endDate: string,
    location?: string,
    notes?: string,
    isAllDay = false,
    calendarName?: string,
): Promise<{ success: boolean; message: string; eventId?: string }> {
    try {
        const target = calendarName ?? "Calendar";
        // accli all-day dates must be YYYY-MM-DD; timed events use YYYY-MM-DDTHH:mm
        const start = isAllDay ? startDate.split("T")[0] : startDate.slice(0, 16);
        const end = isAllDay ? endDate.split("T")[0] : endDate.slice(0, 16);

        const args = ["create", target, "--summary", title, "--start", start, "--end", end];
        if (location) args.push("--location", location);
        if (notes) args.push("--description", notes);
        if (isAllDay) args.push("--all-day");

        const data = await runAccli(...args);
        const eventId = data?.event?.id ?? data?.id;

        return {
            success: true,
            message: `Event "${title}" created successfully.`,
            eventId,
        };
    } catch (error) {
        return {
            success: false,
            message: `Error creating event: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

async function getEvent(
    eventId: string,
    calendarName?: string,
): Promise<CalendarEvent> {
    if (calendarName) {
        const data = await runAccli("event", calendarName, eventId);
        return mapEvent(data?.event ?? data);
    }

    // No calendar specified — try each calendar until found
    const calNames = await getCalendarNames();
    for (const name of calNames) {
        try {
            const data = await runAccli("event", name, eventId);
            return mapEvent(data?.event ?? data);
        } catch {
            // event not in this calendar, try next
        }
    }
    throw new Error(`Event with ID "${eventId}" not found in any calendar`);
}

async function updateEvent(
    eventId: string,
    calendarName: string,
    title?: string,
    startDate?: string,
    endDate?: string,
    location?: string,
    notes?: string,
    isAllDay?: boolean,
): Promise<{ success: boolean; message: string }> {
    try {
        const args = ["update", calendarName, eventId];
        if (title) args.push("--summary", title);
        if (startDate) args.push("--start", startDate.slice(0, 16));
        if (endDate) args.push("--end", endDate.slice(0, 16));
        if (location) args.push("--location", location);
        if (notes) args.push("--description", notes);
        if (isAllDay === true) args.push("--all-day");
        if (isAllDay === false) args.push("--no-all-day");

        await runAccli(...args);
        return { success: true, message: `Event "${eventId}" updated successfully.` };
    } catch (error) {
        return {
            success: false,
            message: `Error updating event: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

async function deleteEvent(
    eventId: string,
    calendarName: string,
): Promise<{ success: boolean; message: string }> {
    try {
        await runAccli("delete", calendarName, eventId);
        return { success: true, message: `Event "${eventId}" deleted successfully.` };
    } catch (error) {
        return {
            success: false,
            message: `Error deleting event: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

interface BusySlot {
    start: string;
    end: string;
    calendar: string;
}

async function getFreeBusy(
    fromDate: string,
    toDate: string,
    calendarNames?: string[],
): Promise<BusySlot[]> {
    const from = fromDate.slice(0, 16);
    const to = toDate.slice(0, 16);

    const names = calendarNames?.length ? calendarNames : await getCalendarNames();
    const args = ["freebusy", "--from", from, "--to", to];
    for (const name of names) {
        args.push("--calendar", name);
    }

    const data = await runAccli(...args);
    const slots: any[] = data?.busy ?? data?.slots ?? [];
    return slots.map((s: any) => ({
        start: s.start ? new Date(s.start).toISOString() : "",
        end: s.end ? new Date(s.end).toISOString() : "",
        calendar: s.calendar ?? "",
    }));
}

async function requestCalendarAccess(): Promise<{ hasAccess: boolean; message: string }> {
    try {
        await runAccli("calendars");
        return { hasAccess: true, message: "Calendar access granted." };
    } catch (error) {
        return {
            hasAccess: false,
            message: `Calendar access error: ${error instanceof Error ? error.message : String(error)}`,
        };
    }
}

export default {
    listCalendars,
    getEvents,
    getEvent,
    updateEvent,
    deleteEvent,
    getFreeBusy,
    searchEvents,
    createEvent,
    requestCalendarAccess,
};
