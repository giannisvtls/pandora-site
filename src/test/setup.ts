import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/preact';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Preact Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
});

// jsdom 30 has <dialog> and its `open` attribute, but no showModal() or close() (docs/gotchas.md).
// A stand-in with what the island tests use: showModal() opens the dialog, and Escape anywhere in
// the document then does what a browser's close request does (a cancelable `cancel`, then
// close()); close() closes it and fires `close` in a later task, as browsers do. What only a
// browser does (the page inert, the top layer) is the e2e's to check.
if ('HTMLDialogElement' in globalThis && !('showModal' in HTMLDialogElement.prototype)) {
  const closeRequests = new WeakMap<HTMLDialogElement, (event: KeyboardEvent) => void>();

  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value(this: HTMLDialogElement) {
        if (this.open) return;
        this.open = true;
        const onKeyDown = (event: KeyboardEvent) => {
          if (event.key !== 'Escape') return;
          if (this.dispatchEvent(new Event('cancel', { cancelable: true }))) this.close();
        };
        closeRequests.set(this, onKeyDown);
        this.ownerDocument.addEventListener('keydown', onKeyDown);
      },
    },
    close: {
      configurable: true,
      value(this: HTMLDialogElement) {
        if (!this.open) return;
        this.open = false;
        const onKeyDown = closeRequests.get(this);
        if (onKeyDown !== undefined) this.ownerDocument.removeEventListener('keydown', onKeyDown);
        setTimeout(() => {
          this.dispatchEvent(new Event('close'));
        }, 0);
      },
    },
  });
}
