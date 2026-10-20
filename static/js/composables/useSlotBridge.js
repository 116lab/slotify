/**
 * useSlotBridge.js — the relayer between Vue/Vuetify state and slots.
 *
 * Slotify Slots are authored from the site root as plain HTML + <script>, with no
 * Vue/Vuetify access. For a slot to react to ambient app state (theme/personality,
 * UI language, route) it would otherwise have to reach into framework internals —
 * e.g. read Vuetify's `v-theme--dark` class — coupling every override to an
 * implementation detail. This composable watches the reactive sources once and
 * re-broadcasts each change as a stable, semantic `slotify:*` window event, so
 * slots depend on those events rather than the framework internals.
 *
 * The event family (change notifications; a slot reads its initial state from the
 * `ctx` it receives — `ctx.theme`, `ctx.route`, `ctx.t`):
 *   - `slotify:theme`  detail = { name, personality, mode }   // mode = 'light'|'dark'
 *   - `slotify:locale` detail = { locale }
 *   - `slotify:route`  detail = { path, name }                // for global slots that don't remount
 *
 * Emit sites live only here (the one place that broadcasts ambient state) —
 * never scattered across setters. Call this from a synchronous setup() before
 * any await so its watches register against the live instance; App.js does so.
 */
import { currentLocale } from '../i18n.js';
import { parseThemeName } from '../utils/themeName.js';

const { watch } = Vue;
const { useRoute } = VueRouter;

const emit = (type, detail) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(type, { detail }));
};

export function useSlotBridge() {
  const theme = Vuetify.useTheme();
  const route = useRoute();

  // Theme + personality. The applied Vuetify theme name is the authoritative,
  // shared source ('vibrant-dark'); useTheme() would mint independent refs.
  watch(
    () => theme.global.name.value,
    (name) => emit('slotify:theme', parseThemeName(name))
  );

  // UI language. Emission is state-driven here (watches currentLocale), so any
  // path that changes the locale after boot — setLocale(code), the switcher's
  // cycle, or a direct write to currentLocale — broadcasts, without coupling to a
  // specific setter. The boot locale (stored choice or browser language) is not a
  // change: slots read it from ctx.t, and no event fires for it.
  watch(currentLocale, (locale) => emit('slotify:locale', { locale }));

  // Route. Per-route slots already remount (a fresh `slotify:slot` mount), so
  // this is primarily for global slots (header/footer/head) that persist across
  // navigation and need SPA pageview-style hooks.
  watch(
    () => route.path,
    (path) => emit('slotify:route', { path, name: route.name })
  );
}
