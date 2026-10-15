import { isSlotTaken } from "./storage.js";
import {
  AVAILABLE_HOURS,
  formatPhone,
  getTodayISO,
  hourToTime,
  isAllowedTime,
  isPastDate,
  isPastTime,
  isValidISODate,
  isValidPhone,
  normalizeText,
} from "./utils.js";

const FIELD_NAMES = ["tutor", "pet", "phone", "service", "date", "time"];

const MESSAGES = {
  tutorRequired: "Informe o nome do tutor",
  tutorShort: "O nome do tutor precisa ter pelo menos 3 caracteres",
  petRequired: "Informe o nome do pet",
  petShort: "O nome do pet precisa ter pelo menos 2 caracteres",
  phoneInvalid: "Telefone inválido. Use o formato (00) 0 0000-0000",
  serviceRequired: "Descreva o serviço",
  serviceShort: "Descreva o serviço com pelo menos 3 caracteres",
  dateInvalid: "Escolha uma data a partir de hoje",
  timeRequired: "Escolha um horário",
  timeOutOfRange: "Escolha um horário entre 09h e 21h",
  timeTaken: "Este horário já está ocupado",
  timePast: "Este horário já passou. Escolha outro",
  saveFailed: "Não foi possível salvar o agendamento. Tente novamente",
};

// Cada validador recebe os valores do formulário e devolve a mensagem de erro (ou "").
const validators = {
  tutor: ({ tutor }) => {
    if (!tutor) return MESSAGES.tutorRequired;
    return tutor.length < 3 ? MESSAGES.tutorShort : "";
  },
  pet: ({ pet }) => {
    if (!pet) return MESSAGES.petRequired;
    return pet.length < 2 ? MESSAGES.petShort : "";
  },
  phone: ({ phone }) => (isValidPhone(phone) ? "" : MESSAGES.phoneInvalid),
  service: ({ service }) => {
    if (!service) return MESSAGES.serviceRequired;
    return service.length < 3 ? MESSAGES.serviceShort : "";
  },
  date: ({ date }) => (isValidISODate(date) && !isPastDate(date) ? "" : MESSAGES.dateInvalid),
  // A janela de horários é validada aqui também, mesmo que alguém altere o <select> pelo DevTools.
  time: ({ date, time }) => {
    if (!time) return MESSAGES.timeRequired;
    if (!isAllowedTime(time)) return MESSAGES.timeOutOfRange;
    if (!isValidISODate(date)) return "";
    if (isSlotTaken(date, time)) return MESSAGES.timeTaken;
    if (isPastTime(date, time)) return MESSAGES.timePast;
    return "";
  },
};

export function createAppointmentForm(form, { onSubmit }) {
  const fields = Object.fromEntries(FIELD_NAMES.map((name) => [name, form.elements[name]]));

  function getValues() {
    return {
      tutor: normalizeText(fields.tutor.value),
      pet: normalizeText(fields.pet.value),
      phone: formatPhone(fields.phone.value),
      service: normalizeText(fields.service.value),
      date: fields.date.value,
      time: fields.time.value,
    };
  }

  function setError(name, message) {
    const field = fields[name];
    const errorId = `${name}-error`;
    document.getElementById(errorId).textContent = message;

    if (message) {
      field.setAttribute("aria-invalid", "true");
      field.setAttribute("aria-describedby", errorId);
    } else {
      field.removeAttribute("aria-invalid");
      field.removeAttribute("aria-describedby");
    }
  }

  function validateField(name, values = getValues()) {
    const message = validators[name](values);
    setError(name, message);
    return !message;
  }

  function hasError(name) {
    return fields[name].getAttribute("aria-invalid") === "true";
  }

  function clearErrors() {
    FIELD_NAMES.forEach((name) => setError(name, ""));
  }

  // Monta o <select> só com horários válidos, desabilitando os ocupados e os que já passaram.
  function renderTimeOptions() {
    const date = fields.date.value;
    const previous = fields.time.value;
    const canSchedule = isValidISODate(date) && !isPastDate(date);

    const options = AVAILABLE_HOURS.map((hour) => {
      const time = hourToTime(hour);
      const option = new Option(time, time);

      if (!canSchedule) {
        option.disabled = true;
      } else if (isSlotTaken(date, time)) {
        option.disabled = true;
        option.textContent = `${time} · ocupado`;
      } else if (isPastTime(date, time)) {
        option.disabled = true;
        option.textContent = `${time} · encerrado`;
      }
      return option;
    });

    const hasFreeSlot = options.some((option) => !option.disabled);
    const placeholder = new Option(hasFreeSlot || !canSchedule ? "Selecione" : "Sem horários livres", "");
    fields.time.replaceChildren(placeholder, ...options);

    const previousOption = options.find((option) => option.value === previous);
    fields.time.value = previousOption && !previousOption.disabled ? previous : "";
  }

  // Prepara o formulário a cada abertura do modal.
  function prepare(date) {
    const today = getTodayISO();
    fields.date.min = today;
    fields.date.value = isValidISODate(date) && date >= today ? date : today;
    renderTimeOptions();
  }

  function reset() {
    form.reset();
    clearErrors();
  }

  fields.phone.addEventListener("input", () => {
    const formatted = formatPhone(fields.phone.value);
    if (fields.phone.value !== formatted) fields.phone.value = formatted;
  });

  fields.date.addEventListener("change", () => {
    renderTimeOptions();
    if (hasError("date")) validateField("date");
    if (hasError("time")) validateField("time");
  });

  // O erro some assim que o usuário corrige o campo.
  ["tutor", "pet", "phone", "service", "time"].forEach((name) => {
    const eventName = name === "time" ? "change" : "input";
    fields[name].addEventListener(eventName, () => {
      if (hasError(name)) validateField(name);
    });
  });

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const values = getValues();
    const invalidFields = FIELD_NAMES.filter((name) => !validateField(name, values));

    if (invalidFields.length > 0) {
      fields[invalidFields[0]].focus();
      return;
    }

    // Dupla checagem de conflito no momento de salvar.
    const result = onSubmit(values);
    if (result?.ok) return;

    renderTimeOptions();
    setError("time", result?.reason === "conflict" ? MESSAGES.timeTaken : MESSAGES.saveFailed);
    fields.time.focus();
  });

  return { prepare, reset, clearErrors };
}
