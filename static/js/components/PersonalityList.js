/**
 * PersonalityList.js
 * Shared list of theme-personality options, rendered identically in the desktop
 * header menu (AppHeader) and the mobile drawer group (AppDrawer). Emits the
 * chosen personality id so each parent decides what to do (switch theme, and in
 * the drawer's case also close itself).
 *
 * Presentation is OWNED BY THE appHeader SLOT, not theme core: the slot's
 * namespaced i18n table (Slotify.slots.appHeader.styles.<id> = { name, icon })
 * supplies each personality's display name and icon. Resolved here via t(), so
 * names follow client-side language switches reactively. Any palette id the slot
 * did not decorate degrades safely to a capitalized id + a default icon — the
 * switcher can never break on a new / renamed / curated-out personality.
 */
import { t } from '../i18n.js';

const META_NS = 'Slotify.slots.appHeader.styles';
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export default {
  name: 'PersonalityList',
  props: {
    personalities: { type: Array, required: true },
    currentPersonality: { type: String, required: true }
  },
  emits: ['select'],
  methods: {
    // Reactive: t() reads currentLocale, so this re-resolves on language switch.
    meta(id) {
      const m = t(`${META_NS}.${id}`);
      const o = (m && typeof m === 'object') ? m : {};
      return { name: o.name || capitalize(id), icon: o.icon || 'mdi-palette' };
    }
  },
  template: `
    <v-list-item
      v-for="p in personalities"
      :key="p.id"
      @click="$emit('select', p.id)"
      :active="currentPersonality === p.id"
      color="primary"
    >
      <template v-slot:prepend>
        <v-icon :icon="meta(p.id).icon"></v-icon>
      </template>
      <v-list-item-title class="font-weight-medium">{{ meta(p.id).name }}</v-list-item-title>
    </v-list-item>
  `
};
