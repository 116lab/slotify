import router from './router.js';
import { currentLocale, setLocale } from './i18n.js';
import { useTheme } from './composables/useTheme.js';
import { useSlotBridge } from './composables/useSlotBridge.js';
import { useRouteScroll } from './composables/useRouteScroll.js';

const { ref, inject, onMounted } = Vue;
const { useRoute } = VueRouter;

/**
 * App.js
 * Root Component of the Vue application.
 *
 * Responsibilities:
 * 1. Orchestrates the global layout (header/footer slots, drawer, router view).
 * 2. Owns root-level theme/drawer state and forwards it to the header slot.
 *
 * The header (appHeader) and footer are Slotify Slots with complete defaults —
 * AppHeader is mounted by the appHeader slot (hooks.js registers it globally),
 * and the footer content lives in the footer slot. App forwards the header's
 * interactive state + setters through the slot ctx.
 */
export default {
  setup() {
    const {
      currentPersonality, isDark, personalities
    } = useTheme();

    // Relayer: re-broadcast theme/locale/route changes as stable `slotify:*`
    // window events so slots react to ambient state without touching Vue/Vuetify
    // internals. Registered synchronously here.
    useSlotBridge();

    // Single scroll owner for route navigation. Resolves a #hash to its element
    // when present, restores a remembered position on back/forward, else scrolls
    // to the top.
    const route = useRoute();
    const { scrollForRoute } = useRouteScroll();

    // Global Site Configuration (Injected from main.js)
    const siteConfig = inject('siteConfig', ref({ title: '', social: {}, menu: [] }));

    const drawer = ref(false);
    const routeLoading = ref(false);

    // Setters forwarded to the header slot so a custom header override can drive
    // theme/drawer just like the default <app-header> does.
    const setPersonality = (id) => { currentPersonality.value = id; };
    const setDark = (value) => { isDark.value = value; };
    const toggleDrawer = () => { drawer.value = !drawer.value; };
    const setDrawer = (value) => { drawer.value = value; };

    // Splash dismissal. The #loading-guide overlay (baseof.html) covers the boot;
    // dismiss it the moment the FIRST view's data resolves — the accurate
    // "content is visible" signal (siteConfig is now synchronous, so there is no
    // fetch to gate on). Idempotent: later resolves and the safety timeout no-op.
    let splashDismissed = false;
    const dismissSplash = () => {
      if (splashDismissed) return;
      splashDismissed = true;
      const guide = document.getElementById('loading-guide');
      if (guide) {
        guide.classList.add('loading-guide-hidden');
        setTimeout(() => guide.remove(), 800);
      }
    };
    // The scroll for a route change is applied in onPageEnter (the transition's
    // before-enter), NOT here. At resolve time the OUTGOING page is still on
    // screen under <transition mode="out-in">, so scrolling now would visibly
    // snap it to the top/restore point before it fades — the flicker. before-enter
    // fires once the outgoing page has left and the incoming one is inserted but
    // still invisible (opacity 0), so route + layout + scroll settle together with
    // nothing to jump. The first paint is the exception: it has no enter
    // transition, so the initial scroll (e.g. a direct deep-link #hash) is done
    // here, once, behind the splash.
    let firstResolve = true;
    const onRouteResolve = () => {
      routeLoading.value = false;
      if (firstResolve) {
        firstResolve = false;
        scrollForRoute(route);
      }
      dismissSplash();
    };
    // Scroll the incoming view while it is inserted but not yet painted (the
    // .page-enter-from state is opacity 0), so the outgoing page never snaps.
    // Top by default, a #hash target when the URL carries one, or the remembered
    // position on a back/forward. Client-mode pagination has no route change, so
    // no transition fires here; it scrolls synchronously via the view's @change.
    const onPageEnter = () => { scrollForRoute(route); };
    // Safety net: never let the splash stick forever if the first view's data
    // never resolves (e.g. a hung endpoint) — hardens the boot path.
    onMounted(() => { setTimeout(dismissSplash, 10000); });

    return {
      currentPersonality, isDark, personalities,
      currentLocale, setLocale,
      siteConfig, drawer, routeLoading,
      setPersonality, setDark, toggleDrawer, setDrawer,
      onRouteResolve, onPageEnter
    };
  },
  template: `
    <v-app>
      <!-- Navigation chrome slot (Slotify.slots.appHeader); complete default =
           the theme's <app-header> + <app-drawer>, driven via the forwarded ctx -->
      <slotify-slot
        name="appHeader"
        :ctx="{ currentPersonality, isDark, personalities, currentLocale, drawer, setPersonality, setDark, setLocale, toggleDrawer, setDrawer }"
      ></slotify-slot>

      <!-- Thin top progress bar shown only while the next route's data loads
           (Suspense pending); the current page stays visible until then. -->
      <v-progress-linear
        v-if="routeLoading"
        indeterminate
        color="primary"
        height="3"
        style="position: fixed; top: 0; left: 0; z-index: 10000;"
      ></v-progress-linear>

      <!-- Main Content Area. <Suspense> holds the current page until the next
           route's async setup (data fetch) resolves, so no loading/empty state
           is shown mid-transition; the page transition then plays between two
           fully-ready pages. -->
      <v-main>
        <router-view v-slot="{ Component, route }">
          <transition name="page" mode="out-in" @before-enter="onPageEnter">
            <suspense
              @pending="routeLoading = true"
              @resolve="onRouteResolve"
            >
              <component :is="Component" :key="route.path"></component>
            </suspense>
          </transition>
        </router-view>
      </v-main>

      <!-- Footer slot (Slotify.slots.footer); complete default = title + copyright -->
      <v-footer class="footer-main glass-panel text-center d-flex flex-column py-10 mt-10 fade-up">
        <slotify-slot name="footer"></slotify-slot>
      </v-footer>
    </v-app>
  `
};
