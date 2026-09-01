import { Availability, WEEKDAY_KEYS, TimeSlot } from "../types";

const DEFAULT_WEEKDAY_HOURS: TimeSlot[] = [{ start: "09:00", end: "17:00" }];
const DAYS_AHEAD = 14;

function parseTime(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map(Number);
  return { hours, minutes };
}

function atTime(date: Date, time: string): Date {
  const { hours, minutes } = parseTime(time);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

export interface DayOption {
  date: Date;
  dateKey: string; // YYYY-MM-DD
  label: string; // "Mon 4"
}

export interface TimeOption {
  label: string; // "09:00"
  iso: string;
}

export function getNextDays(count: number = DAYS_AHEAD): DayOption[] {
  const days: DayOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < count; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    days.push({
      date,
      dateKey: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
    });
  }
  return days;
}

export function getTimeOptionsForDay(
  date: Date,
  availability: Availability | undefined,
  durationMins: number
): TimeOption[] {
  const dayKey = WEEKDAY_KEYS[date.getDay()];
  const isWeekend = dayKey === "saturday" || dayKey === "sunday";

  const windows = availability
    ? availability[dayKey] ?? []
    : isWeekend
    ? []
    : DEFAULT_WEEKDAY_HOURS;

  const step = Math.max(durationMins, 15);
  const now = new Date();
  const options: TimeOption[] = [];

  for (const window of windows) {
    let cursor = atTime(date, window.start);
    const end = atTime(date, window.end);

    while (cursor.getTime() + durationMins * 60000 <= end.getTime()) {
      if (cursor.getTime() > now.getTime()) {
        options.push({
          label: cursor.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          iso: cursor.toISOString(),
        });
      }
      cursor = new Date(cursor.getTime() + step * 60000);
    }
  }

  return options;
}
