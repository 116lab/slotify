/**
 * SearchView.js
 * Independent search view component.
 *
 * Responsibilities:
 * 1. Loads the static search index from `/search-index.json` on initialization.
 * 2. Instantiates Fuse.js for high-speed fuzzy searching.
 * 3. Binds a Vuetify v-text-field for keyword input and real-time filtering.
 * 4. Displays filtered results in a clickable list.
 */
const { onMounted, computed } = Vue;
import { t } from '../i18n.js';
import StateFeedback from '../components/StateFeedback.js';
import BaseSurface from '../components/BaseSurface.js';
import PageHeader from '../components/PageHeader.js';
import PostList from '../components/PostList.js';
import EmptyState from '../components/EmptyState.js';
import ContentShell from '../components/ContentShell.js';
import SearchField from '../components/SearchField.js';
import { useSearch } from '../composables/useSearch.js';

export default {
  components: {
    StateFeedback,
    BaseSurface,
    PageHeader,
    PostList,
    EmptyState,
    ContentShell,
    SearchField
  },
  template: `
    <content-shell>
      <template #header>
        <page-header icon="mdi-magnify" :title="t('menu.search')"></page-header>
      </template>

      <!-- Search Input Field -->
      <search-field
        v-model="searchQuery"
        :loading="loadingIndex"
        class="mb-6 rounded-xl"
      ></search-field>

      <!-- Index load failure (e.g. search-index.json fetch failed) -->
      <state-feedback :error="error"></state-feedback>

      <template v-if="!error">
        <!-- Search Results Area -->
        <template v-if="hasQuery && !loadingIndex">

          <!-- No matching results -->
          <base-surface v-if="flatResults.length === 0" class="pa-8" :hover-lift="false">
            <empty-state
              icon="mdi-flask-empty-outline"
              :message="t('ui.noResults')"
              :query="searchQuery"
            ></empty-state>
          </base-surface>

          <!-- Matching results found: Display list -->
          <post-list
            v-else
            :items="flatResults"
            variant="list"
            :delay-step="0.05"
            :highlight-query="searchQuery"
          ></post-list>
        </template>

        <!-- Search Hint -->
        <v-alert
          v-if="!hasQuery && !loadingIndex"
          icon="mdi-information"
          :text="t('ui.searchPrompt')"
          variant="tonal"
          color="info"
        ></v-alert>
      </template>

      <!-- Side rails: mounted unconditionally; the shell always reserves the
           gutter, and an unoverridden slot simply renders empty (whitespace). -->
      <template #aside-left>
        <slotify-slot name="searchView/left" :ctx="{ searchQuery }"></slotify-slot>
      </template>
      <template #aside>
        <slotify-slot name="searchView/right" :ctx="{ searchQuery }"></slotify-slot>
      </template>

    </content-shell>
  `,
  setup() {
    const { searchQuery, hasQuery, results, loadingIndex, error, loadSearchIndex } = useSearch();

    // Unwrap Fuse.js { item, score } wrapper objects into plain post objects
    const flatResults = computed(() => results.value.map(r => r.item));

    onMounted(() => {
      loadSearchIndex();
      // document.title is handled by useSearch composable
    });

    return { searchQuery, hasQuery, flatResults, loadingIndex, error, t };
  }
};
