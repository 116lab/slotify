/**
 * themes.js
 * Builds the Vuetify themes object from the color palette.
 *
 * The palette lives in `data/theme-palette.json` (the only hand-edited color
 * table). Hugo injects it verbatim as `window.__SLOTIFY_THEMES__` in
 * layouts/_default/baseof.html. This file only shapes that palette for Vuetify and derives
 * the mesh tokens; it never hardcodes colors. The small fallback below is for
 * dev/tests when Hugo has not injected the global.
 *
 * Mesh is derived, not stored: mesh1 = primary, mesh2 = secondary.
 */

/** Minimal dev/test fallback (vibrant only); the full set comes from Hugo. */
const FALLBACK_PALETTE = {
  vibrant: {
    light: { background: '#F8FAFC', surface: '#FFFFFF', primary: '#7C3AED', secondary: '#0B825B' },
    dark:  { background: '#0F172A', surface: '#1E293B', primary: '#A78BFA', secondary: '#34D399' }
  }
};

const palette = (typeof window !== 'undefined' && window.__SLOTIFY_THEMES__) || FALLBACK_PALETTE;

/**
 * The ordered set of personalities. The SET is the palette's keys, so adding a
 * personality to data/theme-palette.json surfaces it everywhere: the theme
 * switcher (useTheme) consumes this list and only decorates each id with an
 * icon/name. The ORDER is Hugo's resolved `[params] personalityOrder`
 * (window.__SLOTIFY_PERSONALITIES__): the injected palette object cannot carry
 * it, because jsonify emits its keys alphabetically.
 */
const injectedOrder = (typeof window !== 'undefined' && Array.isArray(window.__SLOTIFY_PERSONALITIES__))
  ? window.__SLOTIFY_PERSONALITIES__.filter((id) => Object.prototype.hasOwnProperty.call(palette, id))
  : [];
export const personalityIds = injectedOrder.length ? injectedOrder : Object.keys(palette);

/**
 * The default personality: the first id of the personality order. A site changes
 * it with `[params] personalityOrder`, with no code edits, and a site that curates
 * its palette down to N personalities still gets a valid default.
 */
export const defaultPersonality = personalityIds[0];

/**
 * The colour mode for a visitor with no stored choice: the site's
 * `[params] defaultColorMode` (injected as window.__SLOTIFY_DEFAULT_MODE__),
 * where "auto" follows the OS via prefers-color-scheme. Resolved with the SAME
 * matchMedia query the pre-paint splash (baseof.html) uses, so the booted theme
 * and the pre-paint class agree. Defaults to "light".
 */
export function defaultColorMode() {
  const configured = (typeof window !== 'undefined' && window.__SLOTIFY_DEFAULT_MODE__) || 'light';
  if (configured === 'auto') {
    return (typeof window !== 'undefined' && window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  }
  return configured === 'dark' ? 'dark' : 'light';
}

/**
 * Resolve a stored `${personality}-${mode}` theme name against the LIVE themes,
 * falling back to the default personality when the stored one no longer exists
 * (e.g. a personality the site removed/curated out of its palette). The active
 * theme is therefore always a real entry in `themeConfig` (= the palette set),
 * so Vuetify never boots with an unknown defaultTheme and the switcher always
 * has a matching option. Mode (light/dark) is preserved across the fallback.
 */
export function resolveThemeName(name) {
  if (name && Object.prototype.hasOwnProperty.call(themeConfig, name)) return name;
  // A stored name carrying a mode suffix keeps that mode (only its personality
  // fell back); a missing/blank name — a first visit — uses the site default.
  const mode = (typeof name === 'string' && /-(?:light|dark)$/.test(name))
    ? (name.endsWith('-dark') ? 'dark' : 'light')
    : defaultColorMode();
  return `${defaultPersonality}-${mode}`;
}

/** Expand one { background, surface, primary, secondary } role set into a
 *  Vuetify theme entry, deriving the mesh tokens from primary/secondary. */
function toVuetifyTheme(roles, dark) {
  return {
    dark,
    colors: {
      background: roles.background,
      surface: roles.surface,
      primary: roles.primary,
      secondary: roles.secondary,
      mesh1: roles.primary,
      mesh2: roles.secondary
    }
  };
}

/** Vuetify `themes` map: `${personality}-${mode}` -> theme entry. */
export const themeConfig = Object.entries(palette).reduce((config, [name, modes]) => {
  if (modes.light) config[`${name}-light`] = toVuetifyTheme(modes.light, false);
  if (modes.dark) config[`${name}-dark`] = toVuetifyTheme(modes.dark, true);
  return config;
}, {});
