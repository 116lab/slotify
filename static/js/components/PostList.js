/**
 * PostList.js
 * One feed section: an AnimatedList of PostCards + optional pagination. Shared by
 * HomeView (feed variant), TaxonomyView term mode, and SearchView (list variant)
 * so stagger timing and pagination wiring stay identical across all three.
 *
 * The list spans the full reading column; the cards are BaseSurfaces that carry
 * their own internal padding, so there is no extra horizontal inset here.
 *
 * The parent owns the page state (v-model:page) and the post-pagination scroll
 * (via @change), which live in each view's composable.
 */
import AnimatedList from './AnimatedList.js';
import PostCard from './PostCard.js';
import PaginationControl from './PaginationControl.js';

export default {
  name: 'PostList',
  components: { AnimatedList, PostCard, PaginationControl },
  props: {
    items: { type: Array, required: true },
    // Passed through to PostCard: 'feed' (home vertical card) | 'list' (compact row).
    variant: { type: String, default: 'feed' },
    // Highlights the matching chip when viewing a taxonomy term ('list' variant).
    activeTaxonomy: { type: Object, default: null },
    // Per-item fade-in stagger (seconds).
    delayStep: { type: Number, default: 0.1 },
    // Pagination is opt-in; when enabled the parent supplies page + totalPages.
    paginate: { type: Boolean, default: false },
    page: { type: Number, default: 1 },
    totalPages: { type: Number, default: 1 },
    // null = responsive: PaginationControl picks the count per breakpoint.
    // A number pins it. Passed straight through.
    totalVisible: { type: Number, default: null },
    // Search keyword passed through to PostCard.
    highlightQuery: { type: String, default: '' }
  },
  emits: ['update:page', 'change'],
  template: `
    <animated-list :items="items" :delay-step="delayStep">
      <template #default="{ item, index }">
        <post-card
          :item="item"
          :variant="variant"
          :active-taxonomy="activeTaxonomy"
          :highlight-query="highlightQuery"
        ></post-card>
      </template>
    </animated-list>

    <pagination-control
      v-if="paginate"
      :model-value="page"
      :total-pages="totalPages"
      :total-visible="totalVisible"
      @update:model-value="$emit('update:page', $event)"
      @change="$emit('change', $event)"
    ></pagination-control>
  `
};
