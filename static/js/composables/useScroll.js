/**
 * useScroll.js
 * Vue Composable for managing scroll behavior within the Fixed-Viewport Architecture.
 * Targets the .v-application container for all scroll operations.
 */
export function useScroll() {
  /**
   * The scrollable root in the Fixed-Viewport Model (§8): body is locked, so all
   * vertical overflow lives on .v-application (the Vuetify root), not window.
   * Exposed so callers that need to read scroll geometry (scrollHeight, scrollTop)
   * or set an arbitrary position share this one selector.
   * @returns {HTMLElement|null}
   */
  const getScrollContainer = () => document.querySelector('.v-application');

  /**
   * Scrolls the main application container to the top.
   * @param {Object} options - Scroll options (e.g., { behavior: 'smooth' }).
   */
  const scrollToTop = (options = { top: 0, behavior: 'auto' }) => {
    // Guard against being wired directly to an event handler (e.g. a
    // @change that emits a page number): only a real options object is
    // forwarded to scrollTo, otherwise fall back to a top jump.
    const opts = (options && typeof options === 'object') ? options : { top: 0, behavior: 'auto' };
    const scrollContainer = getScrollContainer();
    if (scrollContainer) {
      scrollContainer.scrollTo(opts);
    } else {
      // Fallback if searched before Vuetify mount
      window.scrollTo(opts);
    }
  };

  return {
    scrollToTop,
    getScrollContainer
  };
}
