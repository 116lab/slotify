/**
 * useContentError.js
 * Centralized helper to render an accessible, non-destructive fallback for failed content elements.
 *
 * Accessibility & Security Rationale:
 * - role="alert" is placed on a dedicated notice element carrying the localized error message,
 *   ensuring assistive technologies announce the failure rather than speaking raw syntax.
 * - Source text is written strictly via `textContent` to avoid interpreting untrusted content as HTML (XSS mitigation).
 * - Sets data-processed="error" and a class modifier (.<prefix>--error) to mark the node as
 *   processed-but-failed, preventing redundant re-render loops while supporting error styling.
 */
import { t } from '../i18n.js';

export function renderContentError(el, source, err, { messageKey, label = 'Content', isDisplay = false, classPrefix = 'content' } = {}) {
  el.setAttribute('data-processed', 'error');
  el.classList.add(`${classPrefix}--error`);
  el.textContent = '';

  const notice = document.createElement(isDisplay ? 'p' : 'span');
  notice.className = `${classPrefix}-error__title`;
  notice.setAttribute('role', 'alert');
  notice.textContent = t(messageKey);

  const code = document.createElement(isDisplay ? 'pre' : 'code');
  code.className = `${classPrefix}-error__source`;
  code.textContent = source;

  el.appendChild(notice);
  el.appendChild(code);

  console.warn(`[Slotify] ${label} render failed:`, (err && err.message) || err);
}
