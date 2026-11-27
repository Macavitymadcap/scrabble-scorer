import { css } from 'lit';

/** Hides content visually but keeps it available to screen readers. */
export const visuallyHiddenStyles = css`
  .visually-hidden {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    margin: -1px;
    padding: 0;
    border: 0;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
`;
