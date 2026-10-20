/**
 * router.js
 * Handles SPA routing and view switching (based on Vue Router).
 *
 * Uses createWebHistory for History API based navigation. Route definitions
 * (paths, names, taxonomy generation, deployment base) come from
 * static/js/config/routes.js. This file only binds each named route to its view
 * component; the catch-all Post route is kept last.
 */
const { createRouter, createWebHistory } = VueRouter;

import HomeView from './views/HomeView.js';
import PostView from './views/PostView.js';
import SearchView from './views/SearchView.js';
import TaxonomyView from './views/TaxonomyView.js';
import AboutView from './views/AboutView.js';
import { routeTable, basePath, PAGINATION_MODE, splitPagePath, pagePath } from './config/routes.js';

// Route definitions come from config/routes.js. Here we only bind each named
// route to its view component; the catch-all Post route stays last.
const viewByName = { Home: HomeView, Search: SearchView, About: AboutView, Post: PostView };

const routes = routeTable.map((route) => {
  if (route.taxonomy) {
    return { path: route.path, name: route.name, component: TaxonomyView, props: { taxonomy: route.taxonomy } };
  }
  // `view` lets an aliased route (e.g. HomePaged in static mode) reuse another
  // route's component while keeping a unique name; defaults to the route name.
  return { path: route.path, name: route.name, component: viewByName[route.view || route.name] };
});

const router = createRouter({
  // HTML5 History mode (no '#'); base path comes from config/routes.js so the
  // SPA also works under sub-directory deployments.
  history: createWebHistory(basePath),
  routes
});

// Pager-URL handling, mode-dependent.
if (PAGINATION_MODE === 'client') {
  // Client mode ships the full feed and slices it in-memory, so there are no
  // /page/N/ endpoints. A `…/page/N` URL (stale bookmark, external link, or a
  // future template that reintroduces `.Paginate`) is meaningless here: strip
  // the pager segment and land on the base list, instead of letting the catch-all
  // Post / taxonomy-term routes mis-fetch a paginator shape. splitPagePath is the
  // shared path parser (a pager URL has base !== path); prefix-agnostic, so it
  // covers home, sections, and every taxonomy, every page number included.
  router.beforeEach((to) => {
    const { base } = splitPagePath(to.path);
    if (base !== to.path) return { path: base, query: to.query, hash: to.hash };
  });
} else {
  // Static mode: /page/N is a real route. Hugo also emits a /page/1/ alias of
  // the base, but the base ('/', '/tags/x/') is the canonical page-1 URL — so
  // redirect any `…/page/1` to its base to keep one URL per page and avoid a
  // duplicate-content page-1 endpoint surfacing in navigation/history.
  router.beforeEach((to) => {
    const { base, page } = splitPagePath(to.path);
    if (page === 1 && to.path !== base) {
      return { path: pagePath(base, 1), query: to.query, hash: to.hash };
    }
  });
}

// Scroll is owned by App.js (useRouteScroll, applied on the page transition's
// before-enter so the incoming view positions while still invisible); the router
// only canonicalizes pager URLs above. Page titles are managed per-view via
// usePageTitle().

export default router;
