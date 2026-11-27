import { css, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { PageElement } from './page-element.ts';

/** Device settings: for now, keeping the screen on during games. */
@customElement('ss-page-settings')
export class SsPageSettings extends PageElement {
  static override styles = [
    ...PageElement.styles,
    css`
      .setting {
        display: flex;
        flex-direction: column;
        gap: var(--size-1);
      }

      .choice {
        display: flex;
        align-items: center;
        gap: var(--size-2);
        min-block-size: 48px;
        font-weight: var(--font-weight-6);
      }

      .choice input {
        inline-size: 1.25rem;
        block-size: 1.25rem;
      }

      .hint {
        margin: 0;
        color: var(--ss-text-muted);
        font-size: var(--font-size-1);
      }
    `,
  ];

  #onKeepScreenOn = (event: Event): void => {
    const input = event.target as HTMLInputElement;
    this.store?.setKeepScreenOn(input.checked);
    // The checkbox always shows the saved setting, even if it didn't change.
    input.checked = this.state.settings.keepScreenOn;
  };

  override render() {
    const { keepScreenOn } = this.state.settings;
    return html`
      <div class="stack">
        <h1 tabindex="-1">Settings</h1>
        <p class="lead">These settings are saved on this device.</p>
        <div class="setting">
          <label class="choice">
            <input
              type="checkbox"
              .checked=${keepScreenOn}
              aria-describedby="keep-screen-on-hint"
              @change=${this.#onKeepScreenOn}
            />
            Keep the screen on during games
          </label>
          <p class="hint" id="keep-screen-on-hint">
            Stops your phone or tablet going to sleep between turns while a game is in progress.
            Some browsers don't support this.
          </p>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-page-settings': SsPageSettings;
  }
}
