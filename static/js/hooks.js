/**
 * hooks.js — Slotify Slots registration.
 *
 * Registry-driven: the slot set is the manifest `data/slots.json`, injected by
 * Hugo as `window.__SLOTIFY_SLOTS__` (the same pipeline that feeds
 * __SLOTIFY_THEMES__/__SLOTIFY_CONFIG__). For each `<view>/<position>` key this:
 *   1. registers the `<slotify-slot>` mount primitive (once);
 *   2. registers a `slot-<view>-<position>` component bound to its Hugo-injected
 *      x-template `#slot-<view>-<position>-template`, if present;
 *   3. parses an optional embedded namespaced i18n table and registers it under
 *      `Slotify.slots.<view>.<position>` (so a slot's strings live WITH the slot).
 *
 * The raw `<head>` injection slot (slots/head.html) is NOT a Vue component and is
 * handled entirely by Hugo in index.html — it never appears here or in the manifest.
 */
import { registerNamespace } from './i18n.js';
import SlotifySlot from './components/Slot.js';
import SeriesNavigator from './components/SeriesNavigator.js';
import TableOfContents from './components/TableOfContents.js';
import AppHeader from './components/AppHeader.js';
import AppDrawer from './components/AppDrawer.js';

const SLOTS = (typeof window !== 'undefined' && window.__SLOTIFY_SLOTS__) || {};

// A slot component: bound to an in-DOM x-template, receiving a single `ctx` prop.
const slotComponent = (templateId) => ({
  template: `#${templateId}`,
  props: { ctx: { type: Object, default: () => ({}) } }
});

// Register a slot's namespaced i18n from an embedded JSON block, if the slot
// (or a site override) declared one in its partial.
const registerSlotI18n = (id) => {
  const el = document.querySelector(
    `script[type="application/json"][data-slotify-i18n="${id}"]`
  );
  if (!el) return;
  try {
    registerNamespace(id, JSON.parse(el.textContent || '{}'));
  } catch (e) {
    console.error(`[slots] invalid i18n JSON for ${id}`);
  }
};

/** Register the slot primitive and every manifest slot on the app instance. */
export function registerSlots(app) {
  app.component('slotify-slot', SlotifySlot);

  // Components used as slot DEFAULTS inside Hugo-injected x-templates must be
  // globally available (e.g. <series-navigator> / <table-of-contents> in the
  // postView left/right slots). They are presentational — their strings come
  // from the slot's namespaced i18n via ctx.t.
  app.component('series-navigator', SeriesNavigator);
  app.component('table-of-contents', TableOfContents);
  app.component('app-header', AppHeader);
  app.component('app-drawer', AppDrawer);

  Object.keys(SLOTS).forEach((key) => {
    const dashed = key.split('/').join('-');
    const id = `Slotify.slots.${key.split('/').join('.')}`;
    const templateId = `slot-${dashed}-template`;
    if (document.getElementById(templateId)) {
      app.component(`slot-${dashed}`, slotComponent(templateId));
    }
    registerSlotI18n(id);
  });
}
