import "server-only";

/**
 * Default bookable availability: Monday–Friday, 16:00–21:00 UK time (BST/GMT
 * handled automatically), in 30-minute steps. Slots are generated on the fly —
 * every default time is open until a booking takes it.
 */
export const AVAILABILITY = {
  weekdays: [1, 2, 3, 4, 5], // Mon–Fri (JS getDay: 0=Sun)
  startHour: 16,
  endHourExclusive: 21, // last start at 20:30
  stepMin: 30,
  tz: "Europe/London",
  weeksAhead: 3,
  leadMs: 3 * 60 * 60 * 1000, // don't offer times starting within 3 hours
} as const;

/** Minutes to ADD to UTC to get London local time at instant `at` (60 in BST, 0 in GMT). */
function londonOffsetMin(at: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: AVAILABILITY.tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  const asUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +(m.hour === "24" ? "00" : m.hour), +m.minute, +m.second);
  return Math.round((asUTC - at.getTime()) / 60000);
}

/** The UTC instant whose London wall-clock time is the given Y/M/D H:M. */
function londonWallToUtc(y: number, monthIdx: number, d: number, h: number, min: number): Date {
  const naive = Date.UTC(y, monthIdx, d, h, min);
  const off = londonOffsetMin(new Date(naive));
  return new Date(naive - off * 60000);
}

/** London calendar parts (year, 0-based month, day, weekday 0–6) for an instant. */
function londonParts(at: Date): { y: number; m: number; d: number; dow: number } {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: AVAILABILITY.tz, weekday: "short", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const m: Record<string, string> = {};
  for (const p of dtf.formatToParts(at)) m[p.type] = p.value;
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return { y: +m.year, m: +m.month - 1, d: +m.day, dow: dowMap[m.weekday] ?? 0 };
}

/**
 * Generate open start times (ISO/UTC) for the default rule over the next
 * `weeksAhead` weeks, excluding past/near times and any already-booked ISO.
 */
export function generateOpenStarts(bookedIso: Set<string>): string[] {
  const now = Date.now();
  const out: string[] = [];
  for (let i = 0; i <= AVAILABILITY.weeksAhead * 7; i++) {
    const day = londonParts(new Date(now + i * 86400000));
    if (!AVAILABILITY.weekdays.includes(day.dow)) continue;
    for (let h = AVAILABILITY.startHour; h < AVAILABILITY.endHourExclusive; h++) {
      for (let min = 0; min < 60; min += AVAILABILITY.stepMin) {
        const utc = londonWallToUtc(day.y, day.m, day.d, h, min);
        if (utc.getTime() <= now + AVAILABILITY.leadMs) continue;
        const iso = utc.toISOString();
        if (bookedIso.has(iso)) continue;
        out.push(iso);
      }
    }
  }
  return out;
}

/** Server-side re-validation: is this ISO a legitimate, in-window, future default start? */
export function isValidStart(iso: string): boolean {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  if (d.getTime() <= Date.now() + AVAILABILITY.leadMs) return false;
  const p = londonParts(d);
  if (!AVAILABILITY.weekdays.includes(p.dow)) return false;
  // Recompute the canonical UTC for that London wall time and compare to the minute.
  const off = londonOffsetMin(d);
  const localMs = d.getTime() + off * 60000;
  const local = new Date(localMs);
  const h = local.getUTCHours();
  const min = local.getUTCMinutes();
  if (h < AVAILABILITY.startHour || h >= AVAILABILITY.endHourExclusive) return false;
  if (min % AVAILABILITY.stepMin !== 0) return false;
  return true;
}
