import { getAppointments } from "./storage.js";
import { PERIODS, getPeriodByTime, prefersReducedMotion } from "./utils.js";

const EMPTY_MESSAGE = "Nenhum agendamento neste período";

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function createEmptyState() {
  const item = createElement("li", "period__empty", EMPTY_MESSAGE);
  return item;
}

// Todo dado do usuário entra no DOM via textContent — nunca via innerHTML.
function createAppointmentItem(appointment) {
  const item = createElement("li", "appointment");
  item.dataset.id = appointment.id;

  const time = createElement("time", "appointment__time", appointment.time);
  time.dateTime = appointment.time;

  const client = createElement("p", "appointment__client");
  client.append(
    createElement("strong", "appointment__pet", appointment.pet),
    createElement("span", "appointment__separator", " / "),
    createElement("span", "appointment__tutor", appointment.tutor),
  );

  const service = createElement("p", "appointment__service", appointment.service);

  const removeButton = createElement("button", "appointment__remove");
  removeButton.type = "button";
  removeButton.dataset.action = "remove";
  removeButton.setAttribute(
    "aria-label",
    `Remover agendamento de ${appointment.pet} às ${appointment.time}`,
  );
  const icon = createElement("span", "icon icon--trash");
  icon.setAttribute("aria-hidden", "true");
  removeButton.append(icon, createElement("span", "appointment__remove-label", "Remover agendamento"));

  item.append(time, client, service, removeButton);
  return item;
}

export function groupByPeriod(appointments) {
  const groups = Object.fromEntries(PERIODS.map((period) => [period.id, []]));

  appointments.forEach((appointment) => {
    const period = getPeriodByTime(appointment.time);
    if (period) groups[period.id].push(appointment);
  });

  Object.values(groups).forEach((list) => list.sort((a, b) => a.time.localeCompare(b.time)));
  return groups;
}

export function renderSchedule(container, date, { highlightId } = {}) {
  const appointments = getAppointments().filter((item) => item.date === date);
  const groups = groupByPeriod(appointments);

  PERIODS.forEach((period) => {
    const list = container.querySelector(`[data-period-list="${period.id}"]`);
    const items = groups[period.id];

    list.replaceChildren(...(items.length ? items.map(createAppointmentItem) : [createEmptyState()]));

    const count = container.querySelector(`[data-period="${period.id}"] .period__count`);
    if (count) count.textContent = items.length ? String(items.length) : "";
  });

  if (highlightId) {
    container.querySelector(`[data-id="${highlightId}"]`)?.classList.add("is-entering");
  }
}

// Anima a saída da linha; com movimento reduzido, resolve imediatamente.
export function animateRemoval(item) {
  return new Promise((resolve) => {
    if (!item || prefersReducedMotion()) return resolve();

    const fallback = setTimeout(resolve, 400);
    item.addEventListener(
      "animationend",
      () => {
        clearTimeout(fallback);
        resolve();
      },
      { once: true },
    );
    item.classList.add("is-leaving");
  });
}
