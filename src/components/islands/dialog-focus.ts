// What the islands' modal dialogs (the mobile menu, menu-dialog.ts; the explainer,
// explainer-dialog.ts) do about focus that the browser leaves to them: keeping Tab inside, and
// telling whether an element can take focus back once the dialog has closed.

// What takes focus in the dialogs: their buttons and links, in document order.
const CONTROLS = 'button, a[href]';

// Tab past the last control goes to the first, Shift+Tab before the first to the last. Focus on
// the dialog itself (a click on its background) or anywhere else counts as an end too: Chromium
// lets Tab leave a native modal dialog for the browser's own UI.
export function wrapFocus(dialog: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const controls = [...dialog.querySelectorAll<HTMLElement>(CONTROLS)];
  const { activeElement } = dialog.ownerDocument;
  // Where focus is among the controls; -1 when it is on none of them.
  const position = activeElement instanceof HTMLElement ? controls.indexOf(activeElement) : -1;
  const edge = event.shiftKey ? 0 : controls.length - 1;
  const target = controls.at(event.shiftKey ? -1 : 0);
  if (target === undefined || (position !== -1 && position !== edge)) return;
  event.preventDefault();
  target.focus();
}

// Whether `element` is in the document and drawn: neither it nor any ancestor is
// `display: none` (read from computed styles, which jsdom has too; it has no layout boxes).
export function isShown(element: Element): boolean {
  if (!element.isConnected) return false;
  for (let node: Element | null = element; node !== null; node = node.parentElement) {
    if (getComputedStyle(node).display === 'none') return false;
  }
  return true;
}
