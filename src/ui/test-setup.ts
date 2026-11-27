import { afterEach } from 'vite-plus/test';

// Each browser test mounts into document.body; start every test from empty.
afterEach(() => {
  document.body.replaceChildren();
  window.location.hash = '';
});
