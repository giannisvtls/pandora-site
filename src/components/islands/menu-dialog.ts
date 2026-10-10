// What the mobile menu does once it is live (MobileMenu.tsx renders the markup; this wires it with
// native listeners): the burger opens the modal dialog; the close button, a followed link and
// Escape (the browser's close request) close it; Tab and Shift+Tab wrap at the ends. While the
// menu is open, the close button stays over the burger through every resize (rotation, zoom), and
// when the burger is gone (the screen has grown past the header's breakpoint) the menu closes.
// Every way out ends in the dialog's `close` event, which ends the resize watch and puts focus
// somewhere visible.

// What takes focus in the menu, in order: the close button, the links.
const FOCUSABLE = 'button, a[href]';

// `value`, kept between 0 and `room`.
const clamp = (value: number, room: number) => Math.max(0, Math.min(value, room));

// Whether the burger shows: CSS hides it (`display: none`) from the header's breakpoint up.
const isBurgerShown = (opener: HTMLElement) => getComputedStyle(opener).display !== 'none';

// Tab past the last control goes to the first, Shift+Tab before the first to the last. Focus on
// the dialog itself (a click on its background) or anywhere else counts as an end too: a native
// modal dialog would otherwise let focus leave the page for the browser's own UI.
export function wrapFocus(menu: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const controls = [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const { activeElement } = menu.ownerDocument;
  // Where focus is among the controls; -1 when it is on none of them.
  const position = activeElement instanceof HTMLElement ? controls.indexOf(activeElement) : -1;
  const edge = event.shiftKey ? 0 : controls.length - 1;
  const target = controls.at(event.shiftKey ? -1 : 0);
  if (target === undefined || (position !== -1 && position !== edge)) return;
  event.preventDefault();
  target.focus();
}

// Puts the close button over the burger (spec §8), kept on the screen: its place as CSS variables
// on the dialog, read by MobileMenu.css (the button is fixed to the screen).
export function placeCloseButton(menu: HTMLDialogElement, opener: HTMLElement): void {
  const box = opener.getBoundingClientRect();
  const top = clamp(box.top, globalThis.innerHeight - box.height);
  const left = clamp(box.left, globalThis.innerWidth - box.width);
  menu.style.setProperty('--burger-top', `${String(top)}px`);
  menu.style.setProperty('--burger-left', `${String(left)}px`);
}

// Where focus goes once the menu has closed: back to the burger; when the burger is gone, to the
// header's own link to where focus was in the menu (the same page), else to its first nav link,
// else to its first link.
export function returnFocus(opener: HTMLElement, from: Element | null): void {
  if (isBurgerShown(opener)) {
    opener.focus();
    return;
  }
  const header = opener.closest('header');
  if (header === null) return;
  const href = from?.getAttribute('href');
  const links = [...header.querySelectorAll<HTMLElement>('a[href]')].filter(
    (link) => link.getClientRects().length > 0,
  );
  const target =
    links.find((link) => href !== undefined && link.getAttribute('href') === href) ??
    links.find((link) => link.closest('nav') !== null) ??
    links[0];
  target?.focus();
}

// Wires the menu; returns what undoes it.
export function wireMenu(menu: HTMLDialogElement, opener: HTMLElement): () => void {
  let lastFocused: Element | null = null;
  const onResize = () => {
    if (isBurgerShown(opener)) placeCloseButton(menu, opener);
    else menu.close();
  };
  const open = () => {
    if (menu.open) return;
    menu.showModal();
    // Measured once open: the scroll lock takes the page's scrollbar away, which can move the burger.
    placeCloseButton(menu, opener);
    globalThis.addEventListener('resize', onResize);
    menu.querySelector<HTMLElement>(':scope nav a')?.focus();
  };
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('a[href], .menu-close') != null) menu.close();
  };
  const onFocusIn = (event: FocusEvent) => {
    lastFocused = event.target instanceof Element ? event.target : null;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    wrapFocus(menu, event);
  };
  const onClose = () => {
    // The `close` event comes a task after close(): when the menu was opened again in between,
    // this event belongs to the session before, and the open menu keeps its resize watch and focus.
    if (menu.open) return;
    globalThis.removeEventListener('resize', onResize);
    returnFocus(opener, lastFocused);
  };
  opener.addEventListener('click', open);
  menu.addEventListener('click', onClick);
  menu.addEventListener('focusin', onFocusIn);
  menu.addEventListener('keydown', onKeyDown);
  menu.addEventListener('close', onClose);
  return () => {
    opener.removeEventListener('click', open);
    menu.removeEventListener('click', onClick);
    menu.removeEventListener('focusin', onFocusIn);
    menu.removeEventListener('keydown', onKeyDown);
    menu.removeEventListener('close', onClose);
    globalThis.removeEventListener('resize', onResize);
  };
}
