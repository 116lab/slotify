/**
 * PostCard.js
 * Single component for a post summary, rendered in two contexts via `variant`:
 *   - 'feed' (default): the spacious vertical card with a featured image, used by
 *     HomeView. Date + series sit by the title; tags sit in their own footer row.
 *   - 'list': the compact result row used by SearchView and TaxonomyView (term
 *     mode). Date + series + tags share one inline meta row, and chips can render
 *     selected/non-clickable when they match the taxonomy term being viewed
 *     (via `activeTaxonomy`).
 * Both variants read the same canonical card fields (func/card-data.html). No DOM.
 */
import BaseChip from './BaseChip.js';
import BaseSurface from './BaseSurface.js';
import { t } from '../i18n.js';
import { slugify } from '../utils/slugify.js';
import { hasDisplayDate, cardSummaryText, hasSeries, hasTags } from '../utils/contentFields.js';
import { highlightText } from '../utils/highlight.js';

const { computed } = Vue;

export default {
  name: 'PostCard',
  components: {
    BaseChip,
    BaseSurface
  },
  props: {
    item: { type: Object, required: true },
    // 'feed' (home vertical card) | 'list' (compact search/taxonomy result row).
    variant: { type: String, default: 'feed' },
    // When rendered inside a taxonomy term list ('list' variant), identifies the
    // active term so its matching chip renders selected and non-clickable.
    // Shape: { type: 'tag'|'series', slug: string }.
    activeTaxonomy: { type: Object, default: null },
    // Search keyword to highlight in result title and summary ('list' variant).
    highlightQuery: { type: String, default: '' }
  },
  template: `
    <base-surface
      class="post-list-item"
      :to="item.url"
      :link-label="item.title"
    >
      <!-- FEED: spacious vertical card with optional featured thumbnail. -->
      <div v-if="variant === 'feed'" class="post-card-inner">
        <!-- Featured Thumbnail: Force high-quality aspect ratio for vertical order -->
        <v-img
          v-if="item.image"
          :src="item.image"
          :alt="item.title"
          cover
          class="flex-shrink-0 post-card-featured"
        ></v-img>

        <div class="d-flex flex-column flex-grow-1 min-width-0">
          <v-card-item class="pa-8 pb-0">
            <v-card-title
              class="font-weight-black text-primary mb-1 post-card-title"
            >
              {{ item.title }}
            </v-card-title>

            <div class="d-flex align-center flex-wrap mb-2">
              <v-card-subtitle class="pa-0 d-flex align-center mr-4">
                <span v-if="hasDisplayDate(item)" class="d-flex align-center text-caption font-weight-bold">
                  <v-icon size="small" color="primary" class="mr-1">mdi-calendar-blank</v-icon>
                  {{ item.date }}
                </span>
              </v-card-subtitle>
              <!-- Chips sit above the card's stretched link (lifted by
                   .base-surface--link .v-chip), so they navigate on their own. -->
              <base-chip
                v-if="hasSeries(item)"
                type="series"
                :title="item.series[0]"
              ></base-chip>
            </div>
          </v-card-item>

          <v-card-text class="pa-8 pt-2 pb-6 flex-grow-1 text-body-1 text-medium-emphasis">
            {{ cardSummaryText(item, t('ui.readMore')) }}
          </v-card-text>

          <div class="pa-8 pt-0 d-flex flex-wrap align-center" v-if="hasTags(item)">
            <!-- Tags (Small & Subtle) -->
            <base-chip
              v-for="tag in item.tags.slice(0, 5)"
              :key="tag"
              type="tag"
              :title="tag"
              size="small"
            ></base-chip>
          </div>
        </div>
      </div>

      <!-- LIST: compact result row; chips can highlight the active taxonomy term. -->
      <v-card-item v-else class="pa-6">
        <!-- Result Title -->
        <v-card-title class="text-h6 text-primary font-weight-bold mb-1">
          <span v-if="highlightQuery" v-html="highlightedTitle"></span>
          <template v-else>{{ item.title }}</template>
        </v-card-title>

        <!-- Result Summary (summary is the canonical card field from
             func/card-data.html; description is an optional fallback) -->
        <v-card-text class="pa-0 mb-3 text-body-2 text-medium-emphasis">
          <span v-if="highlightQuery" v-html="highlightedSummary"></span>
          <template v-else>{{ cardSummaryText(item, t('ui.readMore')) }}</template>
        </v-card-text>

        <!-- Result Meta. Chips sit above the card's stretched link (lifted by
             .base-surface--link .v-chip), so they navigate on their own; the
             chip matching the current term is selected and non-clickable. -->
        <div class="d-flex align-center flex-wrap pt-1">
          <v-card-subtitle class="pa-0 mr-4 d-flex align-center">
            <span v-if="hasDisplayDate(item)" class="text-caption font-weight-bold d-flex align-center">
              <v-icon size="x-small" color="primary" class="mr-1">mdi-calendar-blank</v-icon>{{ item.date }}
            </span>
          </v-card-subtitle>
          <base-chip
            v-if="hasSeries(item)"
            type="series"
            :title="item.series[0]"
            size="small"
            :active="isActiveTerm('series', item.series[0])"
          ></base-chip>
          <base-chip
            v-for="tag in (item.tags || []).slice(0, 5)"
            :key="tag"
            type="tag"
            :title="tag"
            size="small"
            :active="isActiveTerm('tag', tag)"
          ></base-chip>
        </div>
      </v-card-item>
    </base-surface>
  `,
  setup(props) {
    // A chip is the active term when its taxonomy type and slug match the list
    // currently being viewed. Slug comparison mirrors BaseChip's own URL
    // construction, so it stays consistent with the chip's link target.
    const isActiveTerm = (type, value) => {
      const a = props.activeTaxonomy;
      return !!a && a.type === type && slugify(value) === a.slug;
    };

    const highlightedTitle = computed(() => highlightText(props.item.title, props.highlightQuery));
    const highlightedSummary = computed(() => {
      const summary = cardSummaryText(props.item, t('ui.readMore'));
      return highlightText(summary, props.highlightQuery);
    });

    return {
      t,
      isActiveTerm,
      hasDisplayDate,
      cardSummaryText,
      hasSeries,
      hasTags,
      highlightedTitle,
      highlightedSummary
    };
  }
};
