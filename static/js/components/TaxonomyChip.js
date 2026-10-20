import BaseChip from './BaseChip.js';

/**
 * TaxonomyChip.js
 * Atomic component for rendering a taxonomy term with a count badge.
 * 
 * Responsibilities:
 * 1. Displays term title and count.
 * 2. Proxies configuration to BaseChip.
 */
export default {
  name: 'TaxonomyChip',
  components: {
    BaseChip
  },
  props: {
    item: { type: Object, required: true },
    type: { type: String, required: true },
    icon: { type: String, default: null }
  },
  template: `
    <div class="taxonomy-chip-wrapper rounded-pill" style="display: inline-block">
      <base-chip 
        :type="type" 
        :title="item.title" 
        :to="item.url"
        :icon="icon"
        class="premium-extended-chip"
      >
        <template v-slot:append>
          <v-avatar color="surface" class="ml-2 font-weight-black elevation-1" size="20" flat>
            <span style="font-size: 10px;">{{ item.count || 0 }}</span>
          </v-avatar>
        </template>
      </base-chip>
    </div>
  `
};
