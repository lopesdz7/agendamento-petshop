import { isAllowedTime, isValidISODate } from "./utils.js";

const STORAGE_KEY = "mundo-pet:appointments";
const SEEDED_KEY = "mundo-pet:seeded";

function isAppointment(item) {
  return (
    item !== null &&
    typeof item === "object" &&
    typeof item.id === "string" &&
    typeof item.tutor === "string" &&
    typeof item.pet === "string" &&
    typeof item.phone === "string" &&
    typeof item.service === "string" &&
    isValidISODate(item.date) &&
    isAllowedTime(item.time)
  );
}

export function getAppointments() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isAppointment) : [];
  } catch {
    return [];
  }
}

function saveAppointments(appointments) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(appointments));
    return true;
  } catch {
    return false;
  }
}

export function isSlotTaken(date, time, appointments = getAppointments()) {
  return appointments.some((item) => item.date === date && item.time === time);
}

// Última barreira contra conflito: mesmo que a UI falhe, o mesmo horário não é gravado duas vezes.
export function addAppointment(data) {
  const appointments = getAppointments();

  if (isSlotTaken(data.date, data.time, appointments)) {
    return { ok: false, reason: "conflict" };
  }

  const appointment = { id: crypto.randomUUID(), ...data };
  if (!saveAppointments([...appointments, appointment])) {
    return { ok: false, reason: "storage" };
  }

  return { ok: true, appointment };
}

export function removeAppointment(id) {
  const appointments = getAppointments();
  return saveAppointments(appointments.filter((item) => item.id !== id));
}

// Popula exemplos apenas na primeira execução (controlado por uma flag).
export function seedAppointments(createSamples) {
  try {
    if (localStorage.getItem(SEEDED_KEY)) return;

    if (getAppointments().length === 0) {
      const samples = createSamples().map((sample) => ({ id: crypto.randomUUID(), ...sample }));
      saveAppointments(samples);
    }

    localStorage.setItem(SEEDED_KEY, "true");
  } catch {
    // localStorage indisponível (ex.: modo privado restrito): a agenda apenas começa vazia.
  }
}
