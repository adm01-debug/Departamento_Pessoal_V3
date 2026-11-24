export type ReportSchedule = {
  frequencia: "diario" | "semanal" | "mensal";
  hora_envio: string;
  dia_semana?: number | null;
  dia_mes?: number | null;
  proximo_envio?: string | Date | null;
};

export type ScheduleResult = { status: "processado" | "skipped" | "erro" };

const BUSINESS_TIME_ZONE = "America/Sao_Paulo";
const DUE_WINDOW_MS = 30 * 60 * 1000;
const MAX_CATCH_UP_DELAY_MS = 24 * 60 * 60 * 1000;

type LocalParts = { year: number; month: number; day: number; hour: number; minute: number };

function localParts(date: Date): LocalParts {
  const values = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, item) => {
    if (item.type !== "literal") result[item.type] = item.value;
    return result;
  }, {});
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute),
  };
}

function parseTime(value: string): { hour: number; minute: number } | null {
  const match = /^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d+)?)?$/.exec(value);
  return match ? { hour: Number(match[0].slice(0, 2)), minute: Number(match[0].slice(3, 5)) } : null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function weekday(year: number, month: number, day: number): number {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDays(parts: LocalParts, days: number): LocalParts {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return { ...parts, year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function asBusinessInstant(parts: LocalParts): Date {
  // Convert a wall-clock time in São Paulo to UTC without depending on the
  // Edge runtime timezone. A second pass also handles offset transitions.
  const expected = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute);
  let epoch = expected;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const actual = localParts(new Date(epoch));
    const rendered = Date.UTC(actual.year, actual.month - 1, actual.day, actual.hour, actual.minute);
    epoch += expected - rendered;
  }
  return new Date(epoch);
}

function isCalendarDay(schedule: ReportSchedule, current: LocalParts): boolean {
  switch (schedule.frequencia) {
    case "diario": return true;
    case "semanal": return Number.isInteger(schedule.dia_semana) && schedule.dia_semana! >= 0 && schedule.dia_semana! <= 6 && weekday(current.year, current.month, current.day) === schedule.dia_semana;
    case "mensal": {
      const requested = schedule.dia_mes;
      return Number.isInteger(requested) && requested! >= 1 && requested! <= 31 && current.day === Math.min(requested!, daysInMonth(current.year, current.month));
    }
  }
}

/** Returns the deterministic occurrence inside the active 30-minute window. */
export function scheduleOccurrenceInWindow(schedule: ReportSchedule, now: Date): Date | null {
  const current = localParts(now);
  const time = parseTime(schedule.hora_envio);
  if (!time) return null;

  // A janela pode atravessar a meia-noite (ex.: 23:50 → 00:20). Avaliar só
  // o dia civil atual perde a execução diária e também a semanal/mensal do
  // dia anterior. As duas ocorrências possíveis são atual e D-1; nenhuma
  // ocorrência mais antiga cabe numa janela de 30 minutos.
  for (const candidate of [current, addDays(current, -1)]) {
    if (!isCalendarDay(schedule, candidate)) continue;
    const scheduledAt = asBusinessInstant({ ...candidate, ...time });
    const elapsed = now.getTime() - scheduledAt.getTime();
    if (elapsed >= 0 && elapsed < DUE_WINDOW_MS) return scheduledAt;
  }
  return null;
}

/** Returns true only after the scheduled instant and during its 30-minute window. */
export function shouldRunSchedule(schedule: ReportSchedule, now: Date): boolean {
  return scheduleOccurrenceInWindow(schedule, now) !== null;
}

/**
 * Resolves the occurrence owned by a database claim.
 *
 * `proximo_envio` is the durable cursor and therefore wins over a recomputed
 * calendar window. This permits bounded recovery after a scheduler outage.
 * Very old cursors are deliberately not delivered: the caller advances them
 * and records a skipped occurrence instead of sending stale payroll data.
 */
export function claimedScheduleOccurrence(
  schedule: ReportSchedule,
  now: Date,
  maxCatchUpDelayMs = MAX_CATCH_UP_DELAY_MS,
): Date | null {
  if (schedule.proximo_envio) {
    const due = schedule.proximo_envio instanceof Date
      ? schedule.proximo_envio
      : new Date(schedule.proximo_envio);
    const delay = now.getTime() - due.getTime();
    if (!Number.isFinite(due.getTime()) || delay < 0) return null;
    return delay <= maxCatchUpDelayMs ? due : null;
  }
  return scheduleOccurrenceInWindow(schedule, now);
}

/** Computes the next occurrence, clamping day 29–31 to the month's final day. */
export function nextScheduleOccurrence(schedule: ReportSchedule, now: Date): Date {
  const current = localParts(now);
  const time = parseTime(schedule.hora_envio);
  if (!time) throw new Error("hora_envio inválida");
  let target = { ...current, ...time };
  switch (schedule.frequencia) {
    case "diario": {
      if (asBusinessInstant(target).getTime() <= now.getTime()) {
        target = { ...addDays(target, 1), ...time };
      }
      break;
    }
    case "semanal": {
      if (!Number.isInteger(schedule.dia_semana) || schedule.dia_semana! < 0 || schedule.dia_semana! > 6) throw new Error("dia_semana inválido");
      let days = (schedule.dia_semana! - weekday(current.year, current.month, current.day) + 7) % 7;
      if (days === 0 && asBusinessInstant(target).getTime() <= now.getTime()) days = 7;
      target = { ...addDays(target, days), ...time };
      break;
    }
    case "mensal": {
      if (!Number.isInteger(schedule.dia_mes) || schedule.dia_mes! < 1 || schedule.dia_mes! > 31) throw new Error("dia_mes inválido");
      target = {
        ...current,
        day: Math.min(schedule.dia_mes!, daysInMonth(current.year, current.month)),
        ...time,
      };
      if (asBusinessInstant(target).getTime() <= now.getTime()) {
        const nextMonth = current.month === 12 ? 1 : current.month + 1;
        const nextYear = current.month === 12 ? current.year + 1 : current.year;
        target = { year: nextYear, month: nextMonth, day: Math.min(schedule.dia_mes!, daysInMonth(nextYear, nextMonth)), ...time };
      }
      break;
    }
  }
  return asBusinessInstant(target);
}

export function summarizeScheduleResults(results: ScheduleResult[]) {
  const processados = results.filter((result) => result.status === "processado").length;
  const falhas = results.filter((result) => result.status === "erro").length;
  const pulados = results.filter((result) => result.status === "skipped").length;
  return { success: falhas === 0, processados, falhas, pulados };
}
