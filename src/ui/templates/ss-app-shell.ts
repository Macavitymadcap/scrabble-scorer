import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { baseStyles } from '../styles/base.ts';

/** Page layout: header, main content and a footer for actions. */
@customElement('ss-app-shell')
export class SsAppShell extends LitElement {
  static override styles = [
    baseStyles,
    css`
      :host {
        display: grid;
        grid-template-rows: auto 1fr auto;
        min-block-size: 100dvh;
      }

      header,
      footer {
        padding: var(--size-3) var(--size-4);
      }

      main {
        padding: var(--size-4);
      }

      h1 {
        margin: 0;
        font-size: var(--font-size-4);
      }
    `,
  ];

  @property() heading = 'Scrabble Scorer';

  override render() {
    return html`
      <header><h1>${this.heading}</h1></header>
      <main><slot></slot></main>
      <footer><slot name="actions"></slot></footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ss-app-shell': SsAppShell;
  }
}
