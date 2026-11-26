import { css } from 'lit';

/** Base styles shared by every component's shadow root. */
export const baseStyles = css`
  :host {
    box-sizing: border-box;
    font-family: var(--font-sans);
  }

  *,
  *::before,
  *::after {
    box-sizing: inherit;
  }

  /* Form controls take font from the UA stylesheet, which doesn't inherit
     across the shadow boundary. */
  button,
  input,
  select,
  textarea {
    font: inherit;
    color: inherit;
  }

  :focus-visible {
    outline: var(--border-size-2) solid var(--link);
    outline-offset: var(--size-1);
  }
`;
