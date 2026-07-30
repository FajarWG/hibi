export type TimerStatus = "RUNNING" | "PAUSED" | "ENDED";

export type TimerRecord = {
  id: string;
  status: string;
  context: string | null;
  accumulatedSeconds: number;
  lastStartedAt: Date | null;
  startedAt: Date;
  endedAt: Date | null;
};

export type TimerView = {
  id: string;
  status: TimerStatus;
  context: string | null;
  elapsedSeconds: number;
  startedAt: string;
};

function normalizeStatus(value: string): TimerStatus {
  return value === "PAUSED" || value === "ENDED" ? value : "RUNNING";
}

export function elapsedSeconds(record: TimerRecord, now: Date = new Date()): number {
  const base = Math.max(0, record.accumulatedSeconds);
  if (normalizeStatus(record.status) !== "RUNNING" || !record.lastStartedAt) {
    return base;
  }
  const running = Math.floor(
    (now.getTime() - record.lastStartedAt.getTime()) / 1000,
  );
  return base + Math.max(0, running);
}

export function toTimerView(record: TimerRecord, now: Date = new Date()): TimerView {
  return {
    id: record.id,
    status: normalizeStatus(record.status),
    context: record.context,
    elapsedSeconds: elapsedSeconds(record, now),
    startedAt: record.startedAt.toISOString(),
  };
}

/** Return local midnight in a named timezone as a UTC instant. */
export function startOfDayInZone(reference: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(reference);

  const get = (type: Intl.DateTimeFormatPartTypes): number =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  const offsetMs = asUtc - Math.floor(reference.getTime() / 1000) * 1000;
  const midnightWall = Date.UTC(get("year"), get("month") - 1, get("day"));
  return new Date(midnightWall - offsetMs);
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}
