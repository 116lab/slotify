/**
 * useHome.js
 * Composable for managing landing page data and state.
 */
const { ref, inject, computed } = Vue;
const { useRoute } = VueRouter;
import { useContentResource } from './useContentResource.js';
import { usePagination } from './usePagination.js';
import { paths, PAGINATION_MODE } from '../config/routes.js';

export function useHome() {
  const siteConfig = inject('siteConfig', ref({}));
  const route = useRoute();

  // Home uses the site title (no per-page title), so resolve to undefined.
  const { pageData, loading, error, fetchData: load } = useContentResource(() => undefined);

  // Derive posts from content data
  const posts = computed(() => pageData.value?.posts || []);

  // Integration with Pagination. In static mode the home feed maps to Hugo's
  // pager pages (/page/N), so opt in: `posts` is then already this page's slice,
  // the total comes from the payload, and changing page navigates. In client
  // mode the options are ignored and the full feed is sliced off config.paginate.
  const {
    currentPage,
    totalPages,
    paginatedList: paginatedPosts,
    scrollToTop
  } = usePagination(posts, () => pageData.value?.config?.paginate, {
    static: true,
    baseHref: () => paths.home(),
    total: () => pageData.value?.config?.pagerTotal
  });

  // Static mode fetches the CURRENT pager page's JSON (the route may be /page/N);
  // client mode always loads the single home feed. App.js keys the view on
  // route.path, so a page change remounts HomeView and re-runs this fetch — no
  // watcher needed.
  const fetchData = () => load(PAGINATION_MODE === 'static' ? route.path : paths.home());

  return {
    posts,
    fetchData,
    paginatedPosts,
    loading,
    error,
    currentPage,
    totalPages,
    scrollToTop,
    siteConfig
  };
}
