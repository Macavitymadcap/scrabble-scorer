import { css } from 'lit';

/**
 * Text field atom: a visible <label> above a native <input>, with an
 * optional error message linked by aria-describedby. Errors use a text
 * message as well as colour.
 */
export const fieldStyles = css`
  .field {
    display: flex;
    flex-direction: column;
    gap: var(--size-1);
  }

  .field input {
    min-block-size: 48px;
    padding: var(--size-2) var(--size-3);
    border: var(--border-size-1) solid var(--ss-border);
    border-radius: var(--radius-2);
    background: var(--ss-surface-raised);
    /* At least 16px, so iOS doesn't zoom in on focus. */
    font-size: max(1rem, 1em);
  }

  .field input[aria-invalid='true'] {
    border-color: var(--ss-danger);
    border-width: var(--border-size-2);
  }

  .error {
    margin: 0;
    color: var(--ss-danger);
    font-size: var(--font-size-1);
  }
`;
