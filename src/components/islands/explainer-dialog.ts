// What the explainer does once it is live (Explainer.tsx renders its views; this wires the dialog
// with native listeners): one document-level click listener opens it from any explainer button on
// the page (`data-fx`, `data-lvl`, spec §8), buttons added later included; the close button, a
// click on the backdrop, a followed link and Escape (the browser's close request) close it; Tab
// and Shift+Tab wrap at the ends (dialog-focus.ts). Every way out ends in the dialog's `close`
// event, which gives focus back to the button that opened it or, when that button has gone or is
// hidden, to <main>.
import { isShown, wrapFocus } from './dialog-focus';

// The explainer buttons (FeatureButton.astro, LevelButton.astro).
const OPENERS = '[data-fx], [data-lvl]';

export interface ExplainerWiring<View> {
  // The view a button opens; undefined when the island has none for it (an unknown key).
  readonly viewFor: (opener: HTMLElement) => View | undefined;
  // Shows a view (the island renders it, then calls `openDialog`); undefined once closed.
  readonly show: (view: View | undefined) => void;
}

// Opens the dialog on the view just rendered, from its top, with focus on the close button.
export function openDialog(dialog: HTMLDialogElement): void {
  if (!dialog.open) dialog.showModal();
  const panel = dialog.querySelector<HTMLElement>(':scope .fx-body');
  if (panel !== null) panel.scrollTop = 0;
  dialog.querySelector<HTMLElement>(':scope .fx-close')?.focus();
}

// Where focus goes once the dialog has closed: back to the button that opened it while it is
// shown; else to <main> (the page's own focus target), without scrolling the page.
export function returnFocus(opener: HTMLElement | undefined, page: Document): void {
  if (opener !== undefined && isShown(opener)) {
    opener.focus();
    return;
  }
  page.querySelector<HTMLElement>('main')?.focus({ preventScroll: true });
}

// Wires the dialog; returns what undoes it.
export function wireExplainer<View>(
  dialog: HTMLDialogElement,
  { viewFor, show }: ExplainerWiring<View>,
): () => void {
  const page = dialog.ownerDocument;
  let opener: HTMLElement | undefined;
  const onPageClick = (event: MouseEvent) => {
    if (dialog.open || !(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>(OPENERS);
    const view = button === null ? undefined : viewFor(button);
    if (button === null || view === undefined) return;
    opener = button;
    show(view);
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    // The panel fills the dialog's box, so a click on the dialog itself is on its backdrop.
    if (target === dialog || target?.closest('a[href], .fx-close') != null) dialog.close();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    wrapFocus(dialog, event);
  };
  const onClose = () => {
    // A `close` event that comes after the dialog was opened again belongs to the session before.
    if (dialog.open) return;
    returnFocus(opener, page);
    show(undefined);
  };
  page.addEventListener('click', onPageClick);
  dialog.addEventListener('click', onClick);
  dialog.addEventListener('keydown', onKeyDown);
  dialog.addEventListener('close', onClose);
  return () => {
    page.removeEventListener('click', onPageClick);
    dialog.removeEventListener('click', onClick);
    dialog.removeEventListener('keydown', onKeyDown);
    dialog.removeEventListener('close', onClose);
  };
}
