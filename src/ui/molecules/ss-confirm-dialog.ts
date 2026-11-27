import { LitElement, css, html } from 'lit';
import { customElement, query, state } from 'lit/decorators.js';
import { buttonStyles } from '../atoms/button-styles.ts';
import { baseStyles } from '../styles/base.ts';

export interface ConfirmOptions {
  heading: string;
  message: string;
  /** Text for the confirming button, e.g. "Undo turn". */
  confirmLabel: string;
  /** "danger" for destructive actions. */
  tone?: 'primary' | 'danger';
}

const CONFIRM = 'confirm';

/**
 * A modal confirmation built on the native <dialog>. The browser provides
 * focus containment, Esc to close, an inert page behind it and focus return
 * to the button that opened it.
 *
 * Usage: `if (await dialog.ask({ ... })) { ... }`.
 */
@customElement('ss-confirm-dialog')
export class SsConfirmDialog extends LitElement {
  static override styles = [
    baseStyles,
    buttonStyles,
    css`
      dialog {
        max-inline-size: min(90vw, 28rem);
        padding: var(--size-5);
        border: none;
        border-radius: var(--radius-3);
        background: var(--ss-surface-raised);
        color: var(--ss-text);
        box-shadow: var(--shadow-4);
      }

      /* Keep scroll gestures inside the dialog from scrolling the page. */
      dialog:modal {
        overscroll-behavior: contain;
      }

      dialog::backdrop {
        overflow: hidden;
        overscroll-behavior: contain;
        background: rgb(0 0 0 / 50%);
      }

      h1 {
        margin: 0 0 var(--size-3);
        font-size: var(--font-size-4);
      }

      p {
        margin: 0 0 var(--size-5);
      }

      form {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: var(--size-3);
      }
    `,
  ];

  @state() options: ConfirmOptions = { heading: '', message: '', confirmLabel: '' };

  @query('dialog') dialog!: HTMLDialogElement;

  #resolve: ((confirmed: boolean) => void) | undefined;

  /**
   * Opens the dialog and resolves with whether the player confirmed. Esc,
   * the back gesture and Cancel all resolve false.
   */
  ask = async (options: ConfirmOptions): Promise<boolean> => {
    this.#resolve?.(false);
    this.options = options;
    await this.updateComplete;
    this.dialog.returnValue = '';
    this.dialog.showModal();
    return new Promise((resolve) => {
      this.#resolve = resolve;
    });
  };

  #onClose = (): void => {
    const confirmed = this.dialog.returnValue === CONFIRM;
    // Esc sets no return value and browsers differ on clearing the old one.
    this.dialog.returnValue = '';
    this.#resolve?.(confirmed);
    this.#resolve = undefined;
  };

  override render() {
    const { heading, message, confirmLabel, tone = 'primary' } = this.options;
    return html`
      <dialog aria-labelledby="heading" aria-describedby="message" @close=${this.#onClose}>
        <h1 id="heading">${heading}</h1>
        <p id="message">${message}</p>
        <form method="dialog">
          <button class="button" value="cancel" autofocus>Cancel</button>
          <button class="button ${tone}" value=${CONFIRM}>${confirmLabel}</button>
        </form>
      </dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-confirm-dialog': SsConfirmDialog;
  }
}
