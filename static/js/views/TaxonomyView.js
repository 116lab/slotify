/**
 * TaxonomyView.js
 * Unified view for displaying Tag/Series indices or filtered article lists.
 */
const { computed } = Vue;
const { useRoute } = VueRouter;
import { t } from '../i18n.js';
import { taxonomyTermSlug, isTaxonomyIndexPath } from '../config/routes.js';
import { useTaxonomy } from '../composables/useTaxonomy.js';
import TaxonomyList from '../components/TaxonomyList.js';
import StateFeedback from '../components/StateFeedback.js';
import BaseSurface from '../components/BaseSurface.js';
import PageHeader from '../components/PageHeader.js';
import PostList from '../components/PostList.js';
import ContentShell from '../components/ContentShell.js';

export default {
  components: {
    TaxonomyList,
    StateFeedback,
    BaseSurface,
    PageHeader,
    PostList,
    ContentShell
  },
  props: {
    taxonomy: { type: String, required: true }
  },
  template: `
    <content-shell>
      <template #header>
        <page-header v-if="!error" :icon="headerIcon" :title="pageTitle"></page-header>
      </template>

      <state-feedback :error="error"></state-feedback>

      <template v-if="!error">
        <!-- Index Mode (Cloud) -->
        <base-surface v-if="isIndexMode && pageData.list" :hover-lift="false">
          <div class="pa-8">
            <taxonomy-list 
              :items="pageData.list" 
              :type="normalizedType"
              :chip-icon="null"
            ></taxonomy-list>
          </div>
        </base-surface>

        <!-- Term Mode (Post List) -->
        <post-list
          v-else-if="pageData.list && pageData.list.length"
          :items="paginatedList"
          variant="list"
          :active-taxonomy="activeTaxonomy"
          paginate
          v-model:page="currentPage"
          :total-pages="totalPages"
          @change="scrollToTop"
        ></post-list>
      </template>

      <!-- Side rails: mounted unconditionally; the shell always reserves the
           gutter, and an unoverridden slot simply renders empty (whitespace).
           ctx.taxonomy ('tag'|'series') lets an override differ Tags vs Series. -->
      <template #aside-left>
        <slotify-slot name="taxonomyView/left" :ctx="{ pageData, taxonomy: normalizedType }"></slotify-slot>
      </template>
      <template #aside>
        <slotify-slot name="taxonomyView/right" :ctx="{ pageData, taxonomy: normalizedType }"></slotify-slot>
      </template>

    </content-shell>
  `,
  async setup(props) {
    const route = useRoute();

    const taxonomyKey = computed(() => props.taxonomy.toLowerCase());
    const normalizedType = computed(() => taxonomyKey.value === 'series' ? 'series' : 'tag');

    const {
      pageData, pageTitle, error, currentPage, totalPages, paginatedList, isIndexMode, fetchData, scrollToTop
    } = useTaxonomy(
      // Title source, shared by the tab title and the page header. The term-cloud
      // index is UI chrome — the translated menu label (t() re-resolves it on a
      // language switch, since useContentResource derives the title as a computed)
      // — while a single term shows its own (content) name. isTaxonomyIndexPath is
      // depth-based, so the branch is decided from the path before pageData arrives.
      (data) => isTaxonomyIndexPath(route.path)
        ? (normalizedType.value === 'series' ? t('menu.series') : t('menu.tags'))
        : data?.title
    );

    await fetchData(route.path);

    const headerIcon = computed(() => {
      return taxonomyKey.value === 'series' ? 'mdi-bookshelf' : 'mdi-tag';
    });

    // The term currently being viewed (Hugo's own slug), resolved by the route
    // module rather than hand-parsed here. Passed to each list-variant PostCard so
    // the matching chip in a post's tag/series row renders selected and non-clickable.
    const activeTaxonomy = computed(() => ({
      type: normalizedType.value,
      slug: taxonomyTermSlug(route.path)
    }));

    return {
      pageData, error, currentPage, totalPages, paginatedList, isIndexMode, headerIcon, normalizedType, pageTitle, scrollToTop, activeTaxonomy
    };
  }
};
