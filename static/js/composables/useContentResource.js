/**
 * useContentResource.js
 * Base composable for views backed by a single Hugo JSON endpoint. Bundles the
 * always-paired wiring (useApi(fetchContentData) + document title) so the
 * page-specific composables (home, post, taxonomy, about) only express what
 * differs: the title source, pagination, and any extra on-success side effects.
 */
const { computed } = Vue;
import { fetchContentData } from '../services/api.js';
import { useApi } from './useApi.js';
import { usePageTitle } from './usePageTitle.js';

/**
 * @param {(data: Object) => (string|undefined)} [titleFrom] - Resolves the page
 *        title from the fetched data. Returning undefined falls back to the site
 *        title. Defaults to data.title. May read t() — the title is derived as a
 *        computed, so it re-resolves on a UI-language switch with no extra work.
 * @returns {{ pageData, pageTitle, loading, error, fetchData }}
 */
export function useContentResource(titleFrom = (data) => data?.title) {
  const { data: pageData, loading, error, execute: fetchData } = useApi(fetchContentData);

  // The page title is a pure function of the fetched data (and, through any t()
  // the resolver calls, the UI locale). Deriving it as a computed — rather than
  // setting it imperatively per fetch branch — means document.title follows data
  // arrival, language switches, and error-clearing for free. It is exposed so a
  // view's <page-header> can reuse the exact same value (no header-vs-tab drift).
  // On error the title collapses to null so the tab shows the bare site title.
  // A superseded fetch never mutates pageData/error (useApi guards stale
  // responses), so the title simply holds.
  const pageTitle = computed(() => (error.value ? null : titleFrom(pageData.value)));
  usePageTitle(pageTitle);

  return { pageData, pageTitle, loading, error, fetchData };
}
