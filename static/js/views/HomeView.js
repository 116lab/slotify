/**
 * HomeView.js
 * The Landing/Home view component.
 *
 * Responsibilities:
 * 1. Fetches the latest articles list (/index.json) in async setup, so the
 *    page is held by <Suspense> until its data is ready (no loading state).
 * 2. Renders article cards with pagination after data is retrieved.
 * 3. Ensures all links use <router-link> for SPA behavior.
 */
import { t } from '../i18n.js';
import StateFeedback from '../components/StateFeedback.js';
import PageHeader from '../components/PageHeader.js';
import PostList from '../components/PostList.js';
import ContentShell from '../components/ContentShell.js';
import { useHome } from '../composables/useHome.js';

export default {
  components: {
    StateFeedback,
    PageHeader,
    PostList,
    ContentShell
  },
  template: `
    <content-shell>
      <!-- Header region: an optional hero (Slotify.slots.home.banner; siteConfig
           auto-injected into ctx) above the section title. The title is the same
           page-header every other list route uses, so emptying the banner override
           collapses Home into a standard list page with no Home-specific layout. -->
      <template #header>
        <slotify-slot name="home/banner"></slotify-slot>
        <page-header
          v-if="!error"
          icon="mdi-newspaper-variant-outline"
          :title="t('home.latestArticles')"
        ></page-header>
      </template>

      <state-feedback :error="error"></state-feedback>

      <!-- Articles list (data is ready before render via async setup) -->
      <template v-if="!error">
        <post-list
          :items="paginatedPosts"
          variant="feed"
          paginate
          v-model:page="currentPage"
          :total-pages="totalPages"
          @change="scrollToTop"
        ></post-list>
      </template>

      <!-- Side rails: mounted unconditionally; the shell always reserves the
           gutter, and an unoverridden slot simply renders empty (whitespace). -->
      <template #aside-left>
        <slotify-slot name="homeView/left"></slotify-slot>
      </template>
      <template #aside>
        <slotify-slot name="homeView/right"></slotify-slot>
      </template>

    </content-shell>
  `,
  async setup() {
    const home = useHome();
    // Fetch before render so the page appears only once data is ready (held by
    // <Suspense>); no loading state is shown during the route transition.
    await home.fetchData();
    const {
      paginatedPosts,
      error,
      currentPage,
      totalPages,
      scrollToTop,
      siteConfig
    } = home;

    return {
      paginatedPosts, error, currentPage, totalPages, scrollToTop, t,
      siteConfig
    };
  }
};
