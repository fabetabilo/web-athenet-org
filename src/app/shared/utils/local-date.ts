/** Fechas y horas sin zona horaria: `yyyy-MM-dd` y `HH:mm`. Ya que backend usa LocalDate, LocalTime */
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIME = /^(\d{2}):(\d{2})$/;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function toLocalIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Rechaza fechas que JS corrige solo, como el 31 de febrero. */
export function parseLocalIsoDate(s: string | null | undefined): Date | null {
  const match = ISO_DATE.exec(s ?? '');
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function toLocalTime(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** `HH:mm` → `Date` de hoy a esa hora (lo que espera `mat-timepicker`). */
export function parseLocalTime(s: string | null | undefined): Date | null {
  const match = ISO_TIME.exec(s ?? '');
  if (!match) return null;
  const [, h, min] = match.map(Number);
  if (h > 23 || min > 59) return null;
  const date = new Date();
  date.setHours(h, min, 0, 0);
  return date;
}

/** Acepta un `Date` del picker o un string ya serializado. */
export function asLocalIsoDate(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : toLocalIsoDate(value);
  return parseLocalIsoDate(value) ? (value as string) : null;
}

export function asLocalTime(value: Date | string | null | undefined): string | null {
  if (value instanceof Date) return isNaN(value.getTime()) ? null : toLocalTime(value);
  return parseLocalTime(value) ? (value as string) : null;
}

/**
 * Campo culpable si el término no es posterior al inicio, o `null`. Compara
 * strings ISO (sin `Date`, inmune al cambio de horario); con datos faltantes no opina.
 */
export function endBeforeStartField(
  startDate: string | null,
  startTime: string | null,
  endDate: string | null,
  endTime: string | null,
): 'endDate' | 'endTime' | null {
  if (!startDate || !startTime || !endDate || !endTime) return null;
  if (endDate < startDate) return 'endDate';
  if (endDate === startDate && endTime <= startTime) return 'endTime';
  return null;
}
