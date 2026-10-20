/**
 * useRouteScroll.js
 * Owns the "where do we scroll when a route resolves" decision, plus scroll-
 * position memory for back/forward navigation. Instantiated once, in App.js, and
 * its scrollForRoute() is called from onPageEnter (the page transition's
 * before-enter, so the incoming view positions while still invisible), and from
 * onRouteResolve only for the first paint, which has no enter transition.
 *
 * Three outcomes, in priority order:
 *   1. Back/forward (pop) to a route we have a saved position for -> RESTORE it,
 *      so returning to a long feed lands where the reader left off.
 *   2. A #hash in the URL -> smooth-scroll to that element (deep-link anchors,
 *      cross-page anchor links).
 *   3. Otherwise -> scroll to the TOP (articles, lists, pager pages).
 *
 * Mechanics dictated by the architecture:
 *   - The scroller is .v-application, not window (Fixed-Viewport, §8), so the
 *     browser's native anchor jump and its history scroll-restoration are inert.
 *     We manage the container ourselves and set history.scrollRestoration =
 *     'manual' so the browser doesn't fight us with a window-scroll restore.
 *   - App.js wraps the router-view in <transition mode="out-in">, so the incoming
 *     content is NOT in the DOM at resolve time. Both the hash scroll and the
 *     position restore therefore poll across a bounded number of animation frames
 *     until the target element (hash) or the needed content height (restore)
 *     exists. This also covers a direct deep link, where there is no enter
 *     transition at all. Standard h2/h3 ids come from Hugo's autoHeadingID, so
 *     they exist as soon as the content renders.
 *   - Pop vs push is detected with a one-shot flag set by a popstate listener
 *     (capture phase, so it is set before the navigation it triggers resolves).
 *     Positions are captured in a router.beforeEach for the OUTGOING route, while
 *     its content + scroll are still on screen.
 *
 * In-page TOC clicks do NOT come through here: useTableOfContents scrolls and
 * updates the hash via history.replaceState WITHOUT a route change, so no route
 * resolves and this decision never runs for them.
 */
const { onMounted, onUnmounted } = Vue;
import { useScroll } from './useScroll.js';
import { scrollBehavior } from '../utils/motion.js';
import router from '../router.js';

// ~1s at 60fps: long enough to outlast the page enter transition, short enough
// that a genuinely missing target (stale hash, shorter page) fails fast.
const MAX_FRAMES = 60;
// Cap the position map so a long browsing session can't grow it unbounded.
const MAX_REMEMBERED = 50;

export function useRouteScroll() {
  const { scrollToTop, getScrollContainer } = useScroll();

  // Saved .v-application scrollTop keyed by route fullPath (insertion-ordered).
  const positions = new Map();
  // Set by the popstate listener; consumed once per resolve to learn whether the
  // current navigation is a back/forward.
  let pendingPop = false;

  const savePosition = (fullPath) => {
    const c = getScrollContainer();
    if (!c || !fullPath) return;
    // Refresh insertion order so the most-recently-left routes are the ones kept.
    if (positions.has(fullPath)) positions.delete(fullPath);
    positions.set(fullPath, c.scrollTop);
    if (positions.size > MAX_REMEMBERED) {
      positions.delete(positions.keys().next().value);
    }
  };

  // Bounded rAF poll shared by the hash and restore paths. `ready(container)`
  // decides when the target is reachable; `apply(container)` performs the scroll;
  // `onGiveUp` runs if the target never became ready within MAX_FRAMES.
  const pollScroll = (ready, apply, onGiveUp) => {
    let frames = 0;
    const tick = () => {
      const c = getScrollContainer();
      if (c && ready(c)) {
        apply(c);
        return;
      }
      if (frames < MAX_FRAMES) {
        frames += 1;
        requestAnimationFrame(tick);
      } else if (onGiveUp) {
        onGiveUp();
      }
    };
    requestAnimationFrame(tick);
  };

  const scrollToAnchor = (id) => {
    const found = () => {
      const el = id ? document.getElementById(id) : null;
      return !!(el && el.isConnected);
    };
    pollScroll(
      found,
      () => document.getElementById(id).scrollIntoView({ behavior: scrollBehavior(), block: 'start' }),
      () => scrollToTop()
    );
  };

  const restorePosition = (top) => {
    if (top <= 0) {
      scrollToTop();
      return;
    }
    pollScroll(
      // Reachable once the painted content is tall enough to scroll to `top`.
      (c) => (c.scrollHeight - c.clientHeight) >= top,
      (c) => c.scrollTo({ top, behavior: 'auto' }),
      // Content never grew that tall (e.g. a now-shorter page): go as far as we
      // can — the container clamps an over-large top to its own maximum.
      () => { const c = getScrollContainer(); if (c) c.scrollTo({ top, behavior: 'auto' }); }
    );
  };

  /**
   * Decide and perform the scroll for a freshly resolved route.
   * @param {{ fullPath?: string, hash?: string }} route - the incoming route.
   */
  const scrollForRoute = (route) => {
    const wasPop = pendingPop;
    pendingPop = false;

    if (wasPop && route && positions.has(route.fullPath)) {
      restorePosition(positions.get(route.fullPath));
      return;
    }

    const rawHash = route && route.hash ? route.hash.slice(1) : '';
    if (rawHash) {
      let id = rawHash;
      // Hugo's autoHeadingID slugs are plain ASCII, but a non-Latin heading can
      // yield a percent-encoded hash in the URL; decode so getElementById matches.
      try { id = decodeURIComponent(rawHash); } catch (e) { id = rawHash; }
      scrollToAnchor(id);
      return;
    }

    scrollToTop();
  };

  const onPopState = () => { pendingPop = true; };

  // Save the outgoing route's position before its content leaves the screen.
  // Query/hash-only changes keep the same route view mounted, so there is no
  // outgoing page position to preserve for those updates.
  // Returns undefined so it never blocks or redirects the navigation.
  const stopGuard = router.beforeEach((to, from) => {
    if (from && from.fullPath && to.path !== from.path) {
      savePosition(from.fullPath);
    }
  });

  onMounted(() => {
    // Manual restoration: the browser would otherwise try to restore the WINDOW
    // scroll (always 0 in the Fixed-Viewport model) on back/forward and flash.
    // We own restoration on .v-application instead.
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.addEventListener('popstate', onPopState, true);
  });

  onUnmounted(() => {
    window.removeEventListener('popstate', onPopState, true);
    stopGuard();
  });

  return { scrollForRoute };
}
