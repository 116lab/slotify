/**
 * usePagination.js
 * Vue Composable to manage pagination state and logic, in one of two modes
 * (see config/routes.js PAGINATION_MODE):
 *
 * - client (default): slice `itemsRef` in memory. `currentPage` is local state;
 *   changing it is instant, with no navigation or fetch. This is the only mode
 *   site search (Fuse results) uses.
 *
 * - static (opt-in via options.static): the items are ALREADY this page's slice,
 *   delivered by Hugo's build-time paginator at /page/N/. `currentPage` is
 *   derived from the route and is write-as-navigation — setting it pushes the
 *   pager URL, which (because App.js keys the view on route.path) remounts the
 *   view and refetches the next page's JSON. `totalPages` comes from the payload
 *   (options.total).
 *
 * The view/component contract — `v-model:page` + `:total-pages` — is IDENTICAL
 * across modes, so HomeView / TaxonomyView / PostList / PaginationControl never
 * branch on the mode.
 */
const { ref, computed, unref } = Vue;
const { useRoute, useRouter } = VueRouter;
import { useScroll } from './useScroll.js';
import { PAGINATION_MODE, splitPagePath, pagePath } from '../config/routes.js';

/**
 * @param {Ref<Array>} itemsRef - client: the full feed; static: this page's slice.
 * @param {number|Ref|Function} perPageConfig - client page size (ignored in static).
 * @param {Object} [options]
 * @param {boolean} [options.static] - opt into static mode WHEN the site is in it
 *        (a list that maps to a Hugo-paginated endpoint: home feed, taxonomy term).
 * @param {Function} [options.baseHref] - getter returning the list's base route
 *        path (e.g. '/' or '/tags/hugo/'), used to build pager URLs.
 * @param {Function} [options.total] - getter returning the total page count,
 *        read from the fetched payload (pagerTotal).
 */
export function usePagination(itemsRef, perPageConfig = 5, options = {}) {
  if (PAGINATION_MODE === 'static' && options.static) {
    return useStaticPagination(itemsRef, options);
  }
  return useClientPagination(itemsRef, perPageConfig);
}

// --- Client mode: in-memory slicing -------------------------------------------
function useClientPagination(itemsRef, perPageConfig) {
  const currentPage = ref(1);
  // perPageConfig may be a plain number, a ref, or a getter. Normalize to a
  // reactive read so a getter (e.g. `() => pageData.value?.config?.paginate`,
  // read from the fetched list JSON) is re-evaluated once that data arrives.
  const perPage = computed(() => {
    const raw = typeof perPageConfig === 'function' ? perPageConfig() : unref(perPageConfig);
    const n = Number(raw);
    return n > 0 ? n : 5;
  });
  const { scrollToTop } = useScroll();

  // Compute items for the current page
  const paginatedList = computed(() => {
    const items = itemsRef.value || [];
    const start = (currentPage.value - 1) * perPage.value;
    const end = start + perPage.value;
    return items.slice(start, end);
  });

  // Compute total pages
  const totalPages = computed(() => {
    const items = itemsRef.value || [];
    return Math.ceil(items.length / perPage.value);
  });

  const resetPagination = () => {
    currentPage.value = 1;
  };

  return {
    currentPage,
    perPage,
    paginatedList,
    totalPages,
    scrollToTop,
    resetPagination
  };
}

// --- Static mode: the URL is the page state -----------------------------------
function useStaticPagination(itemsRef, { baseHref, total } = {}) {
  const route = useRoute();
  const router = useRouter();
  // A static page change is a route navigation, so scroll-to-top is owned by the
  // route-resolve path (App.js onRouteResolve) and fires when the next page's data
  // is ready. The view's @change="scrollToTop" must therefore be INERT here: a real
  // scroll would jump the stale list on click, before the fetch resolves. The no-op
  // keeps the v-model:page + @change contract identical to client mode, so the view
  // never branches on the pagination mode.
  const scrollToTop = () => {};

  const base = () => {
    const raw = typeof baseHref === 'function' ? baseHref() : '/';
    return raw || '/';
  };

  const totalPages = computed(() => {
    const n = Number(typeof total === 'function' ? total() : total);
    return n > 0 ? n : 1;
  });

  // Write-as-navigation. The getter reflects the URL — the source of truth for
  // which page's JSON was fetched — so the pager highlights the right page on a
  // deep link too. The setter clamps to range and pushes the pager URL (a no-op
  // when already there), letting the keyed remount drive the refetch.
  const currentPage = computed({
    get: () => splitPagePath(route.path).page,
    set: (n) => {
      const target = Math.min(Math.max(1, Number(n) || 1), totalPages.value);
      if (target === splitPagePath(route.path).page) return;
      router.push(pagePath(base(), target));
    }
  });

  // Items arrive already sliced by Hugo, so the page's list IS the items.
  const paginatedList = computed(() => itemsRef.value || []);
  const perPage = computed(() => (itemsRef.value || []).length);

  // Page state lives in the URL; there is nothing local to reset.
  const resetPagination = () => {};

  return {
    currentPage,
    perPage,
    paginatedList,
    totalPages,
    scrollToTop,
    resetPagination
  };
}
