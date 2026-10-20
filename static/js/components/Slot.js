/**
 * Slot.js — the <slotify-slot> mount primitive for the Slotify Slots system.
 *
 * Named `slotify-slot` (NOT `slot`, which collides with Vue's built-in slot
 * element). A slot is addressed by its path `name` ("<view>/<position>", e.g.
 * "postView/left", or a global "footer" / "home/banner"). The wrapper:
 *   1. resolves the registered slot component `slot-<view>-<position>` (built
 *      from the Hugo-injected x-template) and renders it, or nothing if absent;
 *   2. augments `ctx` with site data every slot can rely on — `siteConfig`
 *      (app-provided), the current `route`, and a namespace-scoped `t` —
 *      merged with the local ctx passed by the mount site;
 *   3. dispatches a `slotify:slot` window CustomEvent on mount / ctx-update /
 *      unmount (`detail = { id, phase, ctx, el }`) so imperative third-party
 *      widgets (Disqus, analytics) can (re)initialize across SPA navigation.
 *
 * Visibility is the slot's own concern: the (overridable) slot template decides
 * what to render from `ctx`; an empty default renders nothing.
 *
 * Lifecycle hooks are registered synchronously here.
 */
const { computed, inject, ref, onMounted, onUnmounted, watch, nextTick, getCurrentInstance } = Vue;
const { useRoute } = VueRouter;
import { scopedT } from '../i18n.js';
import { buildSlotCtx } from '../utils/slotCtx.js';

const toNs = (name) => `Slotify.slots.${name.split('/').join('.')}`;
const toComp = (name) => `slot-${name.split('/').join('-')}`;

export default {
  name: 'SlotifySlot',
  props: {
    name: { type: String, required: true },
    ctx: { type: Object, default: () => ({}) }
  },
  setup(props) {
    const route = useRoute();
    const siteConfig = inject('siteConfig', ref({}));
    const theme = Vuetify.useTheme();
    const instance = getCurrentInstance();

    const ns = computed(() => toNs(props.name));
    const componentName = computed(() => toComp(props.name));

    // A slot component exists only if its x-template was injected by Hugo and
    // registered (hooks.js). If not, render nothing and stay silent.
    const hasSlot = computed(() => Boolean(
      instance && instance.appContext.components[componentName.value]
    ));

    // ctx exposes ambient state as a stable, semantic contract (SlotifySlotCtx in
    // utils/slotCtx.js) — `theme` is { name, personality, mode }, never the
    // `v-theme--*` class or Vuetify object. buildSlotCtx merges the mount site's
    // local ctx under the reserved ambient keys so they can't be shadowed.
    // Declarative slots read it reactively (fullCtx is a computed prop, so the
    // child re-renders on change); imperative widgets get change pushes via the
    // `slotify:theme` / `slotify:locale` events (useSlotBridge).
    const fullCtx = computed(() => buildSlotCtx({
      siteConfig: siteConfig.value,
      route,
      themeName: theme.global.name.value,
      t: scopedT(ns.value)
    }, props.ctx));

    const child = ref(null);
    const dispatch = (phase) => {
      nextTick(() => {
        const el = (child.value && child.value.$el) || null;
        window.dispatchEvent(new CustomEvent('slotify:slot', {
          detail: { id: ns.value, phase, ctx: fullCtx.value, el }
        }));
      });
    };

    // siteConfig is injected synchronously (window.__SLOTIFY_SITE__), so ctx is
    // fully populated at the FIRST mount — no async hydrate to re-dispatch for, and
    // no boot-vs-nav distinction to flag. Ambient CHANGES (theme/locale/route) ride
    // their own slotify:* events; this event only fires on the slot's own lifecycle.
    onMounted(() => { if (hasSlot.value) dispatch('mount'); });
    watch(() => props.ctx, () => { if (hasSlot.value) dispatch('update'); }, { deep: true });
    onUnmounted(() => { if (hasSlot.value) dispatch('unmount'); });

    return { componentName, fullCtx, hasSlot, child };
  },
  template: `
    <component
      v-if="hasSlot"
      :is="componentName"
      :ctx="fullCtx"
      ref="child"
    ></component>
  `
};
