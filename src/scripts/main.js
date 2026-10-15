import { createAppointmentForm } from "./form.js";
import { createModal } from "./modal.js";
import { addAppointment, removeAppointment, seedAppointments } from "./storage.js";
import { animateRemoval, renderSchedule } from "./schedule.js";
import { formatLongDate, getTodayISO, isValidISODate } from "./utils.js";

const scheduleContainer = document.querySelector("#schedule");
const scheduleDateInput = document.querySelector("#schedule-date");
const scheduleSubtitle = document.querySelector("#schedule-subtitle");
const announcer = document.querySelector("#announcer");
const openModalButton = document.querySelector("#open-modal");
const modalElement = document.querySelector("#appointment-modal");
const formElement = document.querySelector("#appointment-form");

const state = { date: getTodayISO() };

function createSampleAppointments() {
  const date = getTodayISO();
  return [
    { tutor: "Helena Souza", pet: "Thor", phone: "(11) 9 8765-4321", service: "Banho e tosa completa", date, time: "09:00" },
    { tutor: "Rafael Lima", pet: "Mel", phone: "(21) 9 9123-4567", service: "Consulta de rotina e vacina V10", date, time: "11:00" },
    { tutor: "Camila Rocha", pet: "Pipoca", phone: "(31) 3245-6789", service: "Corte de unhas e limpeza de ouvidos", date, time: "14:00" },
    { tutor: "Bruno Martins", pet: "Luna", phone: "(41) 9 8877-6655", service: "Banho com hidratação", date, time: "16:00" },
    { tutor: "Juliana Alves", pet: "Bolinha", phone: "(51) 9 9988-7766", service: "Tosa higiênica", date, time: "19:00" },
  ];
}

function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

function updateSubtitle() {
  const isToday = state.date === getTodayISO();
  scheduleSubtitle.textContent = isToday
    ? "Aqui você pode ver todos os clientes e serviços agendados para hoje."
    : `Aqui você pode ver todos os clientes e serviços agendados para ${formatLongDate(state.date)}.`;
}

function setScheduleDate(date, options) {
  state.date = date;
  scheduleDateInput.value = date;
  updateSubtitle();
  renderSchedule(scheduleContainer, state.date, options);
}

/* ------------------------------ Data do topo ------------------------------ */
scheduleDateInput.addEventListener("change", () => {
  const { value } = scheduleDateInput;
  // Campo apagado ou inválido: volta para a data que estava sendo exibida.
  setScheduleDate(isValidISODate(value) ? value : state.date);
});

/* -------------------------------- Remoção --------------------------------- */
scheduleContainer.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="remove"]');
  if (!button) return;

  const item = button.closest(".appointment");
  const section = item.closest(".period");
  const index = [...item.parentElement.children].indexOf(item);

  removeAppointment(item.dataset.id);
  await animateRemoval(item);
  renderSchedule(scheduleContainer, state.date);
  announce("Agendamento removido.");

  // Mantém o foco por perto: próximo item, anterior ou o título da seção.
  const buttons = section.querySelectorAll('[data-action="remove"]');
  const nextFocus = buttons[index] ?? buttons[index - 1] ?? section.querySelector(".period__title");
  nextFocus.focus();
});

/* ---------------------------- Modal e formulário --------------------------- */
const modal = createModal(modalElement, {
  initialFocus: "#tutor",
  onClose: () => appointmentForm.clearErrors(),
});

const appointmentForm = createAppointmentForm(formElement, {
  onSubmit(values) {
    const result = addAppointment(values);
    if (!result.ok) return result;

    modal.close();
    appointmentForm.reset();
    setScheduleDate(values.date, { highlightId: result.appointment.id });
    announce(`Agendamento de ${values.pet} às ${values.time} criado.`);
    return result;
  },
});

openModalButton.addEventListener("click", () => {
  appointmentForm.prepare(state.date);
  modal.open();
});

/* ---------------------------------- Início --------------------------------- */
seedAppointments(createSampleAppointments);
setScheduleDate(state.date);
