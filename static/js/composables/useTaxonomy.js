/**
 * useTaxonomy.js
 * Composable for managing taxonomy state and logic (Tags/Series).
 */
const { ref, computed } = Vue;
import { useContentResource } from './useContentResource.js';
import { usePagination } from './usePagination.js';
import { isTaxonomyIndexPath, splitPagePath } from '../config/routes.js';

export function useTaxonomy(titleFrom) {
  const lastPath = ref('');

  // 1. Base content resource (fetch + title). The view supplies titleFrom so the
  //    term-cloud index can title from the translated chrome label while a single
  //    term keeps its (content) name; omitted falls back to useContentResource's
  //    default (data.title). pageTitle is re-exposed so the view's header and the
  //    tab title share one source.
  const { pageData, pageTitle, loading, error, fetchData: load } = useContentResource(titleFrom);

  // 2. Integration with Pagination. A single term's posts map to Hugo's pager
  //    pages (/tags/x/page/N) in static mode, so opt in — `list` is then this
  //    page's slice, total comes from the payload, and changing page navigates.
  //    The base for those pager URLs is the term path (the route minus any pager
  //    segment). In client mode the options are ignored. The term-cloud index is
  //    never paginated (no pagerTotal -> totalPages 1 -> the pager hides itself).
  const listData = computed(() => pageData.value?.list || []);
  const { currentPage, totalPages, paginatedList, scrollToTop, resetPagination } =
    usePagination(listData, () => pageData.value?.paginate, {
      static: true,
      baseHref: () => splitPagePath(lastPath.value).base,
      total: () => pageData.value?.pagerTotal
    });

  const fetchData = async (currentPath) => {
    lastPath.value = currentPath || '';
    const result = await load(currentPath);
    // Reset to the first page only when a fresh list actually arrived. In static
    // mode this is a no-op (the URL owns the page); in client mode it rewinds to
    // page 1 so switching terms doesn't strand you on a now-out-of-range page.
    if (!result.error && result.data) {
      resetPagination();
    }
    return result;
  };

  // "Index Mode" = the term cloud at /tags/ or /series/; "Term Mode" = a
  // single term's posts at /tags/<term>/. Path-depth logic lives in the
  // route module so slash manipulation stays in one place.
  const isIndexMode = computed(() => isTaxonomyIndexPath(lastPath.value));

  return {
    pageData,
    pageTitle,
    loading,
    error,
    currentPage,
    totalPages,
    paginatedList,
    scrollToTop,
    isIndexMode,
    fetchData
  };
}
