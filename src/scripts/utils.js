// Horários atendidos (de hora em hora) e períodos do dia.
export const AVAILABLE_HOURS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

export const PERIODS = [
  { id: "morning", label: "Manhã", startHour: 9, endHour: 12 },
  { id: "afternoon", label: "Tarde", startHour: 13, endHour: 18 },
  { id: "night", label: "Noite", startHour: 19, endHour: 21 },
];

const pad = (value) => String(value).padStart(2, "0");

/* ---------------------------------- Datas ---------------------------------- */
// Todas as datas trafegam como "YYYY-MM-DD" no fuso local. Nunca usamos
// new Date("YYYY-MM-DD"), que é interpretado em UTC e pode cair no dia anterior.

export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getTodayISO() {
  return toISODate(new Date());
}

export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
  if (!match) return null;

  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;

  return isRealDate ? date : null;
}

export function isValidISODate(value) {
  return parseISODate(value) !== null;
}

// Strings "YYYY-MM-DD" válidas podem ser comparadas lexicograficamente.
export function isPastDate(isoDate) {
  return isoDate < getTodayISO();
}

export function formatLongDate(isoDate) {
  const date = parseISODate(isoDate);
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

/* --------------------------------- Horários -------------------------------- */

export function hourToTime(hour) {
  return `${pad(hour)}:00`;
}

export function timeToHour(time) {
  const match = /^(\d{2}):00$/.exec(String(time));
  return match ? Number(match[1]) : NaN;
}

export function isAllowedTime(time) {
  return AVAILABLE_HOURS.includes(timeToHour(time));
}

// Na data de hoje, o horário cheio que já começou (ou passou) não pode ser agendado.
export function isPastTime(isoDate, time) {
  const today = getTodayISO();
  if (isoDate < today) return true;
  if (isoDate > today) return false;
  return timeToHour(time) <= new Date().getHours();
}

export function getPeriodByTime(time) {
  const hour = timeToHour(time);
  return PERIODS.find((period) => hour >= period.startHour && hour <= period.endHour) ?? null;
}

/* --------------------------------- Telefone -------------------------------- */

export function onlyDigits(value) {
  return String(value).replace(/\D/g, "");
}

// Até 10 dígitos: (00) 0000-0000 · 11 dígitos: (00) 0 0000-0000
export function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11);
  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${ddd}`;
  if (digits.length <= 6) return `(${ddd}) ${rest}`;
  if (digits.length <= 10) return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  return `(${ddd}) ${rest.slice(0, 1)} ${rest.slice(1, 5)}-${rest.slice(5)}`;
}

export function isValidPhone(value) {
  const length = onlyDigits(value).length;
  return length === 10 || length === 11;
}

/* ---------------------------------- Texto ---------------------------------- */

export function normalizeText(value) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

export function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
