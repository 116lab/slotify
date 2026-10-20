/**
 * utils/themeName.js
 * Pure helper: split a Vuetify theme name into Slotify's semantic parts.
 *
 * The applied Vuetify theme name is `<personality>-<mode>` (e.g. 'vibrant-dark').
 * Slots and the slot bridge consume the semantic parts ({ personality, mode })
 * — never the raw `v-theme--*` class or the Vuetify theme object — so the slot
 * contract stays stable if the framework changes.
 */
export const parseThemeName = (name) => {
  const value = String(name == null ? '' : name);
  const i = value.lastIndexOf('-');
  if (i < 0) return { name: value, personality: value, mode: 'light' };
  return { name: value, personality: value.slice(0, i), mode: value.slice(i + 1) };
};
