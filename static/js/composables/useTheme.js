/**
 * useTheme.js
 * Composable for managing theme personality, mode (light/dark),
 * and global interactive state (blob cursor, scroll).
 */
import { useMermaid } from './useMermaid.js';
import { personalityIds, defaultPersonality } from '../config/themes.js';
import { parseThemeName } from '../utils/themeName.js';
import { storageSet, STORAGE_KEYS } from '../utils/storage.js';

const { ref, watch, nextTick } = Vue;

// The personality set and its order are owned by the palette
// (data/theme-palette.json, surfaced as personalityIds). This composable owns
// only the active selection + mode. Presentation (display name + icon) is not
// here: it is decorated downstream by the appHeader slot — its namespaced i18n
// supplies the name (reactive to language) and the icon — so a site can localize
// names, swap icons, or change the count entirely from its slot override with no
// core fork. We expose the raw ids; PersonalityList resolves name/icon with safe
// fallbacks (capitalized id + mdi-palette) for any id the slot didn't decorate.
const personalities = personalityIds.map((id) => ({ id }));

export function useTheme() {
  const theme = Vuetify.useTheme();
  const { renderDiagrams } = useMermaid();

  // Resolve initial state from the current global theme name (e.g. 'vibrant-light').
  // Mode by suffix; personality by stripping the suffix (robust to any id, the
  // same parse the pre-paint splash uses). Reconcile against the live set: an
  // active personality not in the palette (removed/curated out) coerces to the
  // default personality, keeping the active theme inside the presented set.
  // parseThemeName is the one helper for splitting '<personality>-<mode>' (shared
  // with the slot bridge), so this composable doesn't re-implement the suffix parse.
  const { personality: rawPersonality, mode: initialMode } = parseThemeName(theme.global.name.value);
  const startPersonality = personalityIds.includes(rawPersonality)
    ? rawPersonality
    : defaultPersonality;

  const currentPersonality = ref(startPersonality);
  const isDark = ref(initialMode === 'dark');

  // Watch for personality or mode changes to update Vuetify theme and sync to localStorage
  watch([currentPersonality, isDark], () => {
    const modeSuffix = isDark.value ? 'dark' : 'light';
    const newThemeName = `${currentPersonality.value}-${modeSuffix}`;

    theme.global.name.value = newThemeName;
    storageSet(STORAGE_KEYS.userTheme, newThemeName);

    // Sync HTML class for CSS overrides
    const root = document.documentElement;
    root.classList.remove('v-theme--light', 'v-theme--dark');
    root.classList.add(`v-theme--${modeSuffix}`);

    // Sync Dynamic Mesh Colors to CSS Variables
    nextTick(() => {
      const themeObj = theme.themes.value[newThemeName];
      if (themeObj && themeObj.colors) {
        const { mesh1, mesh2 } = themeObj.colors;
        // Only the mesh tokens are owned by Slotify. --v-theme-primary /
        // --v-theme-secondary are owned by Vuetify (as RGB triplets, e.g.
        // "124,58,237") and consumed via rgb(var(--v-theme-primary)); we
        // must not overwrite them with hex here (see layouts/_default/baseof.html).
        document.documentElement.style.setProperty('--mesh-c1', mesh1);
        document.documentElement.style.setProperty('--mesh-c2', mesh2);

        // Re-theme already-rendered Mermaid diagrams on theme switch.
        renderDiagrams(themeObj, isDark.value);
      }
    });
  }, { immediate: true });

  return {
    currentPersonality,
    isDark,
    personalities
  };
}
