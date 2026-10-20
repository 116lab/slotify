/**
 * i18n.js
 * Lightweight, reactive UI-language module (Vue Composition API).
 *
 * Scope: UI chrome only (menu/buttons/labels). This is intentionally decoupled
 * from content and from Hugo's multilingual system — switching language never
 * changes the route or refetches content; it only swaps the chrome strings.
 *
 * The translation tables live in per-locale JSON files (static/js/i18n/<code>.json),
 * not inline here, so: (a) translators edit plain JSON, (b) adding a language is
 * one JSON file + one LOCALES entry, and (c) every locale is expected to define
 * the same key set, so a missing key can never ship silently. loadLocales() is
 * awaited in main.js before mount (behind the splash), so t() always has data at
 * first render.
 */
const { ref } = window.Vue || Vue;
import { withBase } from './config/routes.js';
import { storageGet, storageSet, STORAGE_KEYS } from './utils/storage.js';

/**
 * The locale registry — the one place that defines "which languages exist".
 * It is owned by data, not this file: Hugo injects `data/locales.json` (or a site
 * `[[params.locales]]` override) as `window.__SLOTIFY_LOCALES__` — the same
 * inject-and-consume pipeline as `__SLOTIFY_THEMES__`. Each entry is `{ code,
 * label }`: `code` matches the JSON filename (static/js/i18n/<code>.json) and is
 * the persisted identity (`user-locale`); `label` is the switcher button text.
 * Order is the cycle order, and the first entry is the default/fallback — mirrors
 * the palette's first key, so there is no `default: true` flag and no hardcoded
 * locale name. A consuming site adds/reorders/relabels languages via
 * `[[params.locales]]` plus a matching `<code>.json` — no fork. The small fallback
 * below is for dev/tests when Hugo has not injected the global.
 */
export const LOCALES =
  (typeof window !== 'undefined' && window.__SLOTIFY_LOCALES__) || [{ code: 'en', label: 'EN' }];

const codes = LOCALES.map((l) => l.code);
const DEFAULT_LOCALE = (LOCALES[0] || { code: 'en' }).code;

/** Loaded translation tables, keyed by locale code; populated by loadLocales(). */
const dictionaries = {};

/** Pick the initial locale: a valid stored choice wins, else the browser's
 *  language if we ship it, else the default. */
const detectLocale = () => {
  const saved = storageGet(STORAGE_KEYS.userLocale);
  if (saved && codes.includes(saved)) return saved;
  const nav = (navigator.language || '').toLowerCase();
  return codes.find((c) => nav.startsWith(c)) || DEFAULT_LOCALE;
};

export const currentLocale = ref(detectLocale());

/** Fetch every locale's JSON in parallel. Awaited before mount so the first
 *  render already has strings and switching is instant (no per-locale fetch). */
export async function loadLocales() {
  const loaded = await Promise.all(codes.map(async (code) => {
    try {
      const res = await fetch(withBase(`js/i18n/${code}.json`));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return [code, await res.json()];
    } catch (err) {
      console.error(`[i18n] failed to load ${code}.json:`, err.message);
      return [code, {}];
    }
  }));
  // Merge (not assign) so any namespace branch registered earlier — e.g. a
  // slot's i18n via registerNamespace(), which runs before loadLocales() — is
  // preserved. Base keys (menu/ui/home) and namespace keys (Slotify.*) never
  // collide at the top level, so a shallow merge is sufficient and safe.
  loaded.forEach(([code, dict]) => {
    dictionaries[code] = Object.assign(dictionaries[code] || {}, dict);
  });
}

/** Write `value` at the dotted path (array of keys) inside `obj`, creating
 *  intermediate objects as needed. */
const setDeep = (obj, pathKeys, value) => {
  let node = obj;
  for (let i = 0; i < pathKeys.length - 1; i++) {
    const k = pathKeys[i];
    if (node[k] == null || typeof node[k] !== 'object') node[k] = {};
    node = node[k];
  }
  node[pathKeys[pathKeys.length - 1]] = value;
};

/**
 * Register a namespaced string table (used by Slot extensions). `ns` is the
 * dotted namespace (e.g. 'Slotify.slots.postView.left'); `tables` is
 * `{ <code>: { ...keys } }`. The tables are merged into the same dictionary
 * tree t() walks, so t('<ns>.<key>') resolves them. A locale missing from
 * `tables` falls back to the default locale's table, then {}.
 */
export function registerNamespace(ns, tables) {
  const nsKeys = ns.split('.');
  codes.forEach((code) => {
    const table = (tables && tables[code]) || (tables && tables[DEFAULT_LOCALE]) || {};
    if (!dictionaries[code]) dictionaries[code] = {};
    setDeep(dictionaries[code], nsKeys, table);
  });
}

/** A t() bound to a namespace: scopedT(ns)('key') === t(`${ns}.key`).
 *  Slots receive one of these in their ctx so their templates stay terse. */
export const scopedT = (ns) => (key, params) => t(`${ns}.${key}`, params);

/** Switch to a specific locale by code — the canonical mutation, mirroring
 *  setPersonality(id) for themes. Unknown codes are ignored so a stale stored
 *  value or bad input can't desync the UI. Persists the choice; the reactive
 *  currentLocale fans out to t() (declarative re-render) and to the
 *  `slotify:locale` window event for imperative widgets — broadcast by the slot
 *  bridge (composables/useSlotBridge.js), which watches currentLocale, so the
 *  event is state-driven and fires no matter how the locale changed. "Cycling"
 *  is a UI concern built on this (the switcher computes the next code), not a
 *  core primitive — symmetric with the theme switcher. */
export const setLocale = (code) => {
  if (!codes.includes(code)) return;
  currentLocale.value = code;
  storageSet(STORAGE_KEYS.userLocale, code);
};

/** Display label for a locale code (for the switcher). */
export const localeLabel = (code) =>
  (LOCALES.find((l) => l.code === code) || {}).label || code;

const lookup = (dict, keys) =>
  keys.reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), dict);

export const t = (key, params = {}) => {
  const keys = key.split('.');

  let result = lookup(dictionaries[currentLocale.value], keys);
  if (result === undefined) result = lookup(dictionaries[DEFAULT_LOCALE], keys);
  if (result === undefined) return key;

  if (typeof result === 'string' && Object.keys(params).length > 0) {
    let str = result;
    for (const [pKey, pVal] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), () => String(pVal));
    }
    return str;
  }

  return result;
};
