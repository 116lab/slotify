/**
 * useTableOfContents.js
 * Owns all DOM work for the article outline: parsing h2/h3 headings, assigning
 * stable ids, tracking the reading position via IntersectionObserver, and the
 * smooth-scroll + history.replaceState on click. Keeping it here leaves the
 * TableOfContents component a thin presentational shell (DOM / observer / event
 * logic belongs in a composable, not a component body).
 *
 * Registers its own watch / onMounted / onUnmounted; the component invokes this
 * at the top of its (synchronous) setup().
 *
 * @param {string} containerId - id of the rendered-content container to scan.
 * @param {() => string} getContent - reactive source of the article HTML; a
 *        change re-parses (the content was replaced by a new post).
 * @returns {{ headings, activeId, scrollToHeading }}
 */
const { ref, watch, nextTick, onMounted, onUnmounted } = Vue;
import { anchors } from '../config/routes.js';
import { scrollBehavior } from '../utils/motion.js';

export function useTableOfContents(containerId, getContent) {
  const headings = ref([]);
  const activeId = ref('');
  const visibleIds = ref([]);
  let observer = null;
  let isClickScrolling = false;

  const createHeadingId = (text, index) => {
    const normalized = text.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, '-')
      .replace(/^-+|-+$/g, '');

    return normalized || `heading-${index + 1}`;
  };

  const getUniqueHeadingId = (baseId, usedIds) => {
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id) || document.getElementById(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    return id;
  };

  const parseHeadings = () => {
    nextTick(() => {
      // Re-parsing means the content (and its heading nodes) changed; drop any
      // observer/highlight state from the previous content so a stale heading
      // can't stay highlighted and visibleIds can't accumulate dead ids.
      visibleIds.value = [];
      activeId.value = '';

      const container = document.getElementById(containerId);
      if (!container) {
        headings.value = [];
        return;
      }

      const headingElements = container.querySelectorAll('.markdown-body h2, .markdown-body h3');
      const parsed = [];
      const usedIds = new Set();

      headingElements.forEach((el, idx) => {
        if (!el.id) {
          el.id = getUniqueHeadingId(createHeadingId(el.textContent, idx), usedIds);
        } else {
          usedIds.add(el.id);
        }

        parsed.push({
          id: el.id,
          text: el.textContent.trim(),
          level: el.tagName // 'H2' or 'H3'
        });
      });

      headings.value = parsed;
      setupObserver();
    });
  };

  const setupObserver = () => {
    if (observer) {
      observer.disconnect();
    }

    const container = document.getElementById(containerId);
    if (!container || headings.value.length === 0) return;

    const headingElements = container.querySelectorAll('.markdown-body h2, .markdown-body h3');

    observer = new IntersectionObserver((entries) => {
      if (isClickScrolling) return;

      entries.forEach(entry => {
        const id = entry.target.id;
        if (entry.isIntersecting) {
          if (!visibleIds.value.includes(id)) {
            visibleIds.value.push(id);
          }
        } else {
          visibleIds.value = visibleIds.value.filter(x => x !== id);
        }
      });

      // Stable selection: find the first heading in DOM order that is currently visible
      if (visibleIds.value.length > 0) {
        const firstVisible = headings.value.find(h => visibleIds.value.includes(h.id));
        if (firstVisible) {
          activeId.value = firstVisible.id;
        }
      }
    }, {
      root: null,
      rootMargin: '-12% 0px -70% 0px' // Slightly adjusted for better visual trigger area
    });

    headingElements.forEach(el => observer.observe(el));
  };

  const scrollToHeading = (id) => {
    const el = document.getElementById(id);
    if (el) {
      // Lock observer updates during smooth scrolling to prevent jitter
      isClickScrolling = true;
      activeId.value = id;

      el.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
      history.replaceState(null, '', anchors.hash(id));

      // Release lock after smooth scroll animation completes
      setTimeout(() => {
        isClickScrolling = false;
      }, 800);
    }
  };

  watch(getContent, () => {
    parseHeadings();
  });

  onMounted(() => {
    parseHeadings();
  });

  onUnmounted(() => {
    if (observer) {
      observer.disconnect();
    }
  });

  return { headings, activeId, scrollToHeading };
}
