import { css } from 'lit';

/**
 * Button atom: styles for native <button> and <a> elements with class
 * "button". Native elements are used rather than a wrapper component so
 * buttons keep their form behaviour and accessibility.
 *
 * Variants: "primary", "secondary" (default), "danger". "icon" for compact
 * buttons that still meet the minimum touch target.
 */
export const buttonStyles = css`
  .button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-2);
    min-block-size: 48px;
    min-inline-size: 48px;
    padding: var(--size-2) var(--size-4);
    border: var(--border-size-2) solid var(--ss-accent);
    border-radius: var(--radius-2);
    background: transparent;
    color: var(--ss-accent);
    font-weight: var(--font-weight-6);
    text-decoration: none;
    cursor: pointer;
  }

  .button.primary {
    background: var(--ss-accent);
    color: var(--ss-accent-text);
  }

  .button.danger {
    border-color: var(--ss-danger);
    background: var(--ss-danger);
    color: var(--ss-danger-text);
  }

  .button.icon {
    padding: var(--size-2);
  }

  .button:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
