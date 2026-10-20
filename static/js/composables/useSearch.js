/**
 * useSearch.js
 * Composable for managing Fuse.js search logic and index loading.
 */
const { computed, ref, watch } = Vue;
const { useRoute, useRouter } = VueRouter;
// `fuse` resolves via the import map in baseof.html (data/vendor.json -> the
// Fuse entry's `specifier`), so the vendored file is swappable without editing
// this import. The map is emitted before any module script loads.
import Fuse from 'fuse';
import { fetchSearchIndex } from '../services/api.js';
import { useApi } from './useApi.js';
import { usePageTitle } from './usePageTitle.js';
import { t } from '../i18n.js';

/** Normalizes a route query parameter into a single string (handling repeated array params). */
const readQuery = (q) => {
  if (typeof q === 'string') return q;
  if (Array.isArray(q) && typeof q[0] === 'string') return q[0];
  return '';
};

export function useSearch() {
  const route = useRoute();
  const router = useRouter();
  const initialQuery = readQuery(route.query.q);
  const searchQuery = ref(initialQuery);
  const normalizedQuery = computed(() => (
    typeof searchQuery.value === 'string' ? searchQuery.value.trim() : ''
  ));
  const hasQuery = computed(() => Boolean(normalizedQuery.value));
  const results = ref([]);
  // The Search page identity is a static chrome label. Bind it declaratively at
  // mount (a getter so it follows a UI-language switch) — independent of whether
  // the index loads, so a failed fetch never leaves the previous route's title.
  usePageTitle(() => t('menu.search'));
  let fuse = null;

  // 1. Initialize API Composable
  const { loading: loadingIndex, error, execute: fetchIndex } = useApi(fetchSearchIndex);

  const initFuse = (items) => {
    fuse = new Fuse(items, {
      keys: [
        { name: 'title', weight: 0.7 },
        { name: 'series', weight: 0.6 },
        { name: 'tags', weight: 0.5 },
        { name: 'summary', weight: 0.3 }
      ],
      includeScore: true,
      threshold: 0.4,
      ignoreLocation: true
    });
  };

  const runSearch = () => {
    if (!fuse || !hasQuery.value) {
      results.value = [];
      return;
    }
    results.value = fuse.search(normalizedQuery.value);
  };

  const loadSearchIndex = async () => {
    const { data, error } = await fetchIndex();
    if (!error && data) {
      initFuse(data);
      runSearch();
    }
  };

  // Synchronize route query changes (e.g. back/forward navigation or link transitions)
  watch(() => route.query.q, (newQ) => {
    const q = readQuery(newQ);
    // Compare normalized values so clearing q cannot erase whitespace just typed.
    if (q.trim() !== normalizedQuery.value) {
      searchQuery.value = q;
    }
  });

  // Filter locally while typing. Direct links initialize the field, and
  // clearing one removes its stale query parameter without navigating per key.
  watch(searchQuery, () => {
    runSearch();

    if (!hasQuery.value && route.query.q !== undefined) {
      const query = { ...route.query };
      delete query.q;
      router.replace({ path: route.path, query, hash: route.hash });
    }
  });

  return {
    searchQuery,
    hasQuery,
    results,
    loadingIndex,
    error,
    loadSearchIndex
  };
}
