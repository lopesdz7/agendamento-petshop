import { prefersReducedMotion } from "./utils.js";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

const CLOSE_FALLBACK_MS = 400;

export function createModal(dialog, { initialFocus, onClose } = {}) {
  let trigger = null;
  let isClosing = false;
  let pointerDownOnBackdrop = false;

  const getFocusable = () =>
    [...dialog.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null);

  function open() {
    if (dialog.open) return;

    trigger = document.activeElement;
    dialog.showModal(); // overlay + conteúdo de trás inerte
    document.body.classList.add("is-scroll-locked");

    const target = (initialFocus && dialog.querySelector(initialFocus)) ?? getFocusable()[0];
    target?.focus();
  }

  function finishClose() {
    isClosing = false;
    dialog.classList.remove("is-closing");
    if (dialog.open) dialog.close();
  }

  function close() {
    if (!dialog.open || isClosing) return;

    if (prefersReducedMotion()) {
      finishClose();
      return;
    }

    isClosing = true;
    const fallback = setTimeout(finishClose, CLOSE_FALLBACK_MS);
    const handleAnimationEnd = (event) => {
      if (event.target !== dialog || event.pseudoElement) return;
      dialog.removeEventListener("animationend", handleAnimationEnd);
      clearTimeout(fallback);
      finishClose();
    };
    dialog.addEventListener("animationend", handleAnimationEnd);
    dialog.classList.add("is-closing");
  }

  // Focus trap: Tab e Shift+Tab circulam apenas entre os elementos do modal.
  function trapFocus(event) {
    if (event.key !== "Tab") return;

    const focusable = getFocusable();
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialog.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  }

  // ESC dispara "cancel": seguramos o fechamento nativo para animar a saída.
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });

  // O <dialog> não tem padding, então um clique nele mesmo só acontece no overlay.
  dialog.addEventListener("pointerdown", (event) => {
    pointerDownOnBackdrop = event.target === dialog;
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog && pointerDownOnBackdrop) close();
    pointerDownOnBackdrop = false;
  });

  dialog.addEventListener("keydown", trapFocus);

  dialog.querySelectorAll("[data-modal-close]").forEach((button) => {
    button.addEventListener("click", close);
  });

  // "close" cobre todos os caminhos de fechamento (inclusive o nativo).
  dialog.addEventListener("close", () => {
    isClosing = false;
    dialog.classList.remove("is-closing");
    document.body.classList.remove("is-scroll-locked");
    onClose?.();

    if (trigger?.isConnected) trigger.focus();
    trigger = null;
  });

  return { open, close };
}
