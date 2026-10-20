const { ref, computed } = Vue;
import { t } from '../i18n.js';
import TaxonomyChip from './TaxonomyChip.js';
import SearchField from './SearchField.js';
import EmptyState from './EmptyState.js';

/**
 * TaxonomyList.js
 * A generic component for displaying a collection of taxonomy terms (Tags, Series, etc.).
 * 
 * Responsibilities:
 * 1. Provides a filterable list of taxonomy items.
 * 2. Renders items using TaxonomyChip.
 * 3. Handles sorting and filtering logic.
 */
export default {
  name: 'TaxonomyList',
  components: {
    TaxonomyChip,
    SearchField,
    EmptyState
  },
  props: {
    items: { type: Array, default: () => [] },
    type: { type: String, required: true }, // 'tag' or 'series'
    chipIcon: { type: String, default: null }
  },
  template: `
    <div class="taxonomy-list-container">
      <!-- Filter Bar -->
      <search-field
        v-if="items.length > 0"
        v-model="searchQuery"
        class="mb-8 rounded-xl"
        density="comfortable"
      ></search-field>

      <!-- Filtered Content -->
      <v-fade-transition hide-on-leave>
        <div v-if="filteredItems.length > 0" class="d-flex flex-wrap justify-center" key="results">
          <div
            v-for="(item, index) in filteredItems"
            :key="item.url || item.title || index"
            class="fade-up ma-2"
            :style="{ animationDelay: (index * 0.03) + 's' }"
          >
            <taxonomy-chip 
              :item="item" 
              :type="type" 
              :icon="chipIcon"
            ></taxonomy-chip>
          </div>
        </div>

        <!-- Empty State (bare: it already sits inside the cloud's BaseSurface) -->
        <empty-state
          v-else-if="searchQuery"
          key="empty"
          class="py-12"
          icon="mdi-filter-variant-remove"
          :icon-size="64"
          :message="t('ui.noResults')"
          :query="searchQuery"
        ></empty-state>
      </v-fade-transition>
    </div>
  `,
  setup(props) {
    const searchQuery = ref('');

    const filteredItems = computed(() => {
      const query = searchQuery.value?.toLowerCase().trim();
      const items = Array.isArray(props.items) ? props.items : [];

      const sorted = [...items].sort((a, b) => (b.count || 0) - (a.count || 0));

      if (!query) return sorted;

      return sorted.filter(item =>
        item.title?.toLowerCase().includes(query)
      );
    });

    return { searchQuery, filteredItems, t };
  }
};
