/**
 * usePageTitle.js
 * Keeps document.title in sync with a reactive page-title source.
 */
const { inject, watch } = Vue;

/**
 * Bind document.title to a reactive title source.
 *
 * @param {import('vue').Ref<string|null>|(() => string|null)} source - The page
 *   title as a ref or getter; null/undefined (or the site title itself) yields
 *   the bare site title. Because the source is watched, the title tracks all of
 *   its reactive dependencies for free — fetched data arriving, the UI language
 *   switching (a source that reads t()), or an error clearing the title — so
 *   there is no imperative per-branch setter to keep in sync.
 *
 *   MUST be called synchronously in setup() (before any await): the watch has to
 *   register against the live component instance — see Architecture §10.
 */
export function usePageTitle(source) {
  const siteConfig = inject('siteConfig');

  watch(source, (pageTitle) => {
    const siteTitle = siteConfig?.value?.title || '';
    document.title = (pageTitle && pageTitle !== siteTitle)
      ? `${pageTitle} | ${siteTitle}`
      : siteTitle;
  }, { immediate: true });
}
