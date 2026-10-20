/**
 * utils/slotCtx.js
 * The one place that defines the shape of a slot's `ctx`.
 *
 * `ctx` is the ambient context every Slotify Slot receives — and the same object
 * rides on `slotify:slot` event detail. This module is the no-build "interface":
 * a JSDoc @typedef other files annotate against (IDE intellisense, optional
 * `tsc --checkJs`, zero runtime cost) PLUS the one function that assembles it, so
 * the reserved keys can never be silently shadowed by a mount site's local ctx.
 *
 * Consuming sites annotate their own slot overrides against `SlotifySlotCtx` (the
 * reserved/ambient half) and `SlotifySlotEventDetail`, so treat these as a stable
 * API: add fields additively; renaming or removing one breaks those sites.
 *
 * @typedef {{ name: string, personality: string, mode: ('light'|'dark') }} SlotifySlotTheme
 *
 * @typedef {Object} SlotifySlotCtx
 * @property {Object} siteConfig  Site-wide data (title, social, menu); injected synchronously, complete at first mount.
 * @property {Object} route       The current Vue Router route (path, name, params…).
 * @property {SlotifySlotTheme} theme  Active personality + light/dark mode (semantic).
 * @property {(key: string, params?: Object) => string} t  Namespace-scoped translator.
 * // …plus local keys merged in by the mount site (e.g. pageData, pageIdentifier,
 * //   error). These vary per slot position and must not reuse a reserved key above.
 *
 * @typedef {Object} SlotifySlotEventDetail
 * @property {string} id        Slot namespace, e.g. 'Slotify.slots.postView.bottom'.
 * @property {('mount'|'update'|'unmount')} phase
 * @property {SlotifySlotCtx} ctx
 * @property {HTMLElement|null} el  The slot's root element (null before/after mount).
 */

/**
 * Reserved ambient keys owned by the theme; a mount site's local ctx must not
 * reuse these.
 * @type {string[]}
 */
export const RESERVED_CTX_KEYS = ['siteConfig', 'route', 'theme', 't'];

import { parseThemeName } from './themeName.js';

/**
 * Assemble a slot's full ctx. The local ctx is spread first and the reserved
 * ambient keys last, so the theme-owned fields are authoritative and a mount
 * site can never (accidentally or otherwise) shadow `siteConfig`/`route`/`theme`/`t`.
 *
 * @param {{ siteConfig: Object, route: Object, themeName: string, t: Function }} ambient
 * @param {Object} [local]  Mount-site ctx (pageData, pageIdentifier, …).
 * @returns {SlotifySlotCtx}
 */
export function buildSlotCtx(ambient, local) {
  return {
    ...(local || {}),
    siteConfig: ambient.siteConfig,
    route: ambient.route,
    theme: parseThemeName(ambient.themeName),
    t: ambient.t
  };
}
