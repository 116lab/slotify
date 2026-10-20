/**
 * main.js
 * Application bootstrap: create the Vue app, register plugins + slots, mount.
 * Component/slot registration lives in hooks.js; this file stays a thin entry point.
 */
const { createApp } = Vue;
const { createVuetify } = Vuetify;

import router from './router.js';
import App from './App.js';
import { themeConfig, resolveThemeName } from './config/themes.js';
import { loadLocales } from './i18n.js';
import { registerSlots } from './hooks.js';
import { storageGet, STORAGE_KEYS } from './utils/storage.js';

// Read the stored theme and resolve it against the live palette: an absent or
// curated-out personality falls back to the palette's first key, so defaultTheme
// is ALWAYS a real themeConfig entry (never an invalid name). Guarded: a storage
// SecurityError here is module top-level and would abort boot.
const savedTheme = resolveThemeName(storageGet(STORAGE_KEYS.userTheme, null));

// Initialize Vuetify with every personality x light/dark (built from the palette)
const vuetify = createVuetify({
  theme: {
    defaultTheme: savedTheme,
    themes: themeConfig
  }
});

// Create Vue application instance
const app = createApp({
  setup() {
    // siteConfig is BUILD-TIME data injected synchronously by Hugo
    // (baseof.html → window.__SLOTIFY_SITE__), the same inject-and-consume path as
    // window.__SLOTIFY_THEMES__. It is NOT fetched at runtime, so ctx.siteConfig is
    // fully populated before first paint and never empty on a direct deep-link. The
    // {} fallback only matters in a non-browser/test context.
    const siteConfig = Vue.ref(
      (typeof window !== 'undefined' && window.__SLOTIFY_SITE__) ||
      { title: '', social: {}, menu: [] }
    );
    Vue.provide('siteConfig', siteConfig);
  },
  render: () => Vue.h(App)
});

// Register customization hook/slot components (hooks.js)
registerSlots(app);

// Register plugin dependencies
app.use(router);
app.use(vuetify);

// Load UI-language tables before the first render (top-level await, behind the
// splash) so t() always has strings and language switching is instant. A failed
// fetch degrades to the key/English fallback rather than blocking the mount.
await loadLocales();

// Mount to the #app node in the DOM
app.mount('#app');

// Remove the server-rendered crawler/no-JS body (baseof.html #seo-content) now
// that the SPA owns the DOM. The fixed splash overlay has covered it for the
// whole boot, so this is invisible to users; it only ever served search engines
// and JavaScript-disabled clients.
document.getElementById('seo-content')?.remove();

// SPA is now mounted and owns the DOM, and siteConfig was injected synchronously,
// so the app is interactive with no network wait. Fire an IDEMPOTENT readiness
// anchor — `slotify:ready` + window.__SLOTIFY_READY__ — the stable hook for
// user / secondary-development widgets that must run once the SPA has taken over.
// A late subscriber that missed the event still proceeds:
//   if (window.__SLOTIFY_READY__) init(); else addEventListener('slotify:ready', init, { once: true });
// (The splash overlay is dismissed separately by App.js when the FIRST view's
// data resolves, so users never see an empty shell.)
window.__SLOTIFY_READY__ = true;
window.dispatchEvent(new CustomEvent('slotify:ready'));
