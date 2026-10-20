/**
 * utils/storage.js
 * Safe localStorage access. Reading/writing localStorage can throw
 * (SecurityError) in private-browsing modes, sandboxed/third-party iframes, or
 * when the user has blocked site storage. Several call sites run at module
 * top-level (main.js, i18n.js) — an unguarded throw there aborts app boot
 * before mount, leaving the splash on screen. These helpers degrade to a
 * fallback instead, so storage being unavailable never breaks the app; it just
 * means preferences aren't persisted that session.
 */

/** Centralized localStorage / sessionStorage keys — defined here once so a key
 *  can never drift between its reader and writer across files (theme, locale,
 *  search index). */
export const STORAGE_KEYS = {
  userTheme: 'user-theme',
  userLocale: 'user-locale',
  searchIndex: 'hugo-search-index'
};

/** Read a key, returning `fallback` if storage is unavailable or the key is unset. */
export const storageGet = (key, fallback = null) => {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch (e) {
    return fallback;
  }
};

/** Write a key. Returns true on success, false if storage is unavailable. */
export const storageSet = (key, value) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    return false;
  }
};
