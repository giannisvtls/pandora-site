// The mobile menu (spec §8), a Preact island hydrated only below 1120px
// (`client:media="(max-width: 1119px)"`, SiteHeader.astro's breakpoint). The burger opens a native
// modal <dialog> (A10) over the whole screen with the nav links and the language switcher: the
// browser makes the rest of the page inert, and the dialog's own close button sits where the
// burger was (the header is inert under it). Focus goes to the first link; Tab and Shift+Tab wrap
// at the ends, because a native modal dialog lets focus leave the page for the browser's own UI;
// Escape (the browser's close request), the close button and following a link close it, and every
// way out ends in the dialog's `close` event, which gives focus back to the burger (a dialog opened
// from code would leave it on <body>). The page under it does not scroll while it is open
// (MobileMenu.css). Without JavaScript the header keeps its inline nav and hides the burger (A11).
//
// Everything it shows comes in as props from the header (layouts/shell.ts); it imports types only,
// so no content module (zod, the media glob) reaches the browser.
import { useEffect, useRef } from 'preact/hooks';

import type { Locale } from '../../content/contract';
import './MobileMenu.css';

export interface MenuLink {
  readonly label: string;
  readonly href: string;
  // The section the page belongs to (`aria-current="page"`).
  readonly isCurrent: boolean;
}

export interface MenuLanguage {
  readonly locale: Locale;
  // The language's own name (LANGUAGE_NAMES), read after the visible code.
  readonly name: string;
  readonly path: string;
  readonly isCurrent: boolean;
}

export interface MobileMenuProps {
  // Site copy `header.openMenu`, `closeMenu`, `mobileNavLabel` (the nav's and the dialog's name)
  // and `languageLabel`.
  readonly labels: {
    readonly open: string;
    readonly close: string;
    readonly nav: string;
    readonly language: string;
  };
  readonly links: readonly MenuLink[];
  readonly languages: readonly MenuLanguage[];
}

// The dialog, and its nav, whose label names the dialog too.
const DIALOG_ID = 'm-nav';
const NAV_ID = 'm-nav-links';

// What takes focus in the menu, in order: the close button, the links.
const FOCUSABLE = 'button, a[href]';

// Tab past the last control goes to the first, Shift+Tab before the first to the last.
function wrapFocus(menu: HTMLDialogElement, event: KeyboardEvent): void {
  if (event.key !== 'Tab') return;
  const controls = [...menu.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const edge = event.shiftKey ? controls[0] : controls.at(-1);
  const target = event.shiftKey ? controls.at(-1) : controls[0];
  const isAtEdge = edge !== undefined && edge === menu.ownerDocument.activeElement;
  if (target === undefined || !isAtEdge) return;
  event.preventDefault();
  target.focus();
}

// The language switcher in the menu, as LanguageSwitcher.astro draws it in the header (P1-5): the
// current language as text, every other one a link to this page there; the visible code, then the
// language's own name for screen readers (WCAG 2.5.3).
function Languages({
  label,
  languages,
  onFollow,
}: {
  readonly label: string;
  readonly languages: readonly MenuLanguage[];
  readonly onFollow: () => void;
}) {
  return (
    <ul class="lang" aria-label={label}>
      {languages.map(({ locale, name, path, isCurrent }) => (
        <li key={locale}>
          {isCurrent ? (
            <span aria-current="true">
              {locale.toUpperCase()} <span class="sr">{name}</span>
            </span>
          ) : (
            <a href={path} hreflang={locale} lang={locale} onClick={onFollow}>
              {locale.toUpperCase()} <span class="sr">{name}</span>
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function MobileMenu({ labels, links, languages }: MobileMenuProps) {
  const burger = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const menu = dialog.current;
    if (menu === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      wrapFocus(menu, event);
    };
    // Every way out: Escape, the close button, a link.
    const onClose = () => {
      burger.current?.focus();
    };
    menu.addEventListener('keydown', onKeyDown);
    menu.addEventListener('close', onClose);
    return () => {
      menu.removeEventListener('keydown', onKeyDown);
      menu.removeEventListener('close', onClose);
    };
  }, []);

  const open = () => {
    const menu = dialog.current;
    const opener = burger.current;
    if (menu === null || opener === null || menu.open) return;
    // The close button takes the burger's place on the screen.
    const box = opener.getBoundingClientRect();
    menu.style.setProperty('--burger-top', `${String(Math.max(box.top, 0))}px`);
    menu.style.setProperty('--burger-left', `${String(box.left)}px`);
    menu.showModal();
    menu.querySelector<HTMLElement>(`#${NAV_ID} a`)?.focus();
  };

  const close = () => {
    dialog.current?.close();
  };

  return (
    <>
      <button
        ref={burger}
        class="menu-btn menu-open"
        type="button"
        aria-label={labels.open}
        aria-haspopup="dialog"
        aria-controls={DIALOG_ID}
        onClick={open}
      >
        <span />
        <span />
      </button>
      <dialog ref={dialog} id={DIALOG_ID} class="m-nav" aria-labelledby={NAV_ID}>
        <button class="menu-btn menu-close" type="button" aria-label={labels.close} onClick={close}>
          <span />
          <span />
        </button>
        <div class="m-nav-body">
          <nav id={NAV_ID} aria-label={labels.nav}>
            {links.map(({ label, href, isCurrent }) => (
              <a
                key={href}
                href={href}
                aria-current={isCurrent ? 'page' : undefined}
                onClick={close}
              >
                {label}
              </a>
            ))}
          </nav>
          <Languages label={labels.language} languages={languages} onFollow={close} />
        </div>
      </dialog>
    </>
  );
}
