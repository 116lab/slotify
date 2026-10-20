/**
 * config/routes.js
 * Central place for SPA route definitions and URL construction, so the rest of
 * the app never hardcodes route strings or assembles JSON endpoints by hand.
 *
 * - Route definitions (consumed by router.js) and URL builders live together.
 * - Taxonomy keys are sourced from Hugo at build time via window.__SLOTIFY_CONFIG__
 *   (injected by layouts/index.html), with a deterministic fallback for dev/tests.
 * - Route navigation (paths.*) is kept distinct from in-page anchor navigation
 *   (anchors.*, e.g. the Table of Contents hash scroll), which moves the viewport
 *   without changing the route or refetching data.
 */

const runtimeConfig = (typeof window !== 'undefined' && window.__SLOTIFY_CONFIG__) || {};
const BASE = (typeof window !== 'undefined' && window.__SLOTIFY_BASE__) || '/';

/** Deployment base path (e.g. '/' or '/my-project/'), exposed for the router. */
export const basePath = BASE;

/**
 * Pagination mode, sourced from Hugo (`[params] paginationMode`) via the
 * synchronous __SLOTIFY_CONFIG__ inject — known at import time, BEFORE any fetch,
 * because the router uses it to decide whether to register the /page/N routes
 * (below) and whether to strip /page/N URLs (router.js).
 *   'client' (default) — full feed in one payload, sliced client-side.
 *   'static'           — Hugo build-time paginator; each /page/N/ is a real page.
 */
export const PAGINATION_MODE = runtimeConfig.paginationMode === 'static' ? 'static' : 'client';

/** Taxonomy keys, sourced from Hugo (.Site.Taxonomies); fallback for dev/tests. */
export const TAXONOMIES = Array.isArray(runtimeConfig.taxonomies) && runtimeConfig.taxonomies.length
  ? runtimeConfig.taxonomies
  : ['tags', 'series'];

/** SPA-only route slugs; their content pages must exist. */
export const SLUGS = { search: 'search', about: 'about' };

// --- Path normalization: the single place allowed to manipulate slashes ---
const trimSlashes = (value) => String(value == null ? '' : value).replace(/^\/+|\/+$/g, '');

const dirPath = (...parts) => {
  const body = parts.map(trimSlashes).filter(Boolean).join('/');
  return body ? `/${body}/` : '/';
};

/** Join the deployment base with a root-relative resource path. */
export function withBase(resource) {
  return `${BASE.replace(/\/+$/, '')}/${trimSlashes(resource)}`;
}

/**
 * Map a router path to its Hugo JSON endpoint (base-aware). This is the only
 * function that knows the "{path}/index.json" convention.
 */
export function toJsonEndpoint(routePath) {
  const clean = trimSlashes(routePath);
  return withBase(clean ? `${clean}/index.json` : 'index.json');
}

// --- Static-mode pager paths -------------------------------------------------
// A list base + a trailing "/page/N/" segment, matching Hugo's canonical pager
// URLs (page 1 has NO /page/1/ — it is the bare base). These helpers are the one
// place that knows that convention, so views/composables never hand-assemble it.

const PAGE_SEGMENT = /\/page\/(\d+)\/?$/;

/**
 * Split a list route path into its base and 1-based page number.
 *   '/'                  -> { base: '/',          page: 1 }
 *   '/page/3'            -> { base: '/',          page: 3 }
 *   '/tags/hugo/page/2'  -> { base: '/tags/hugo/', page: 2 }
 * A path without a pager segment is page 1, base = the path itself.
 */
export function splitPagePath(routePath) {
  const path = String(routePath == null ? '' : routePath);
  const m = path.match(PAGE_SEGMENT);
  if (!m) return { base: path, page: 1 };
  const head = path.slice(0, m.index);
  const base = head ? (head.endsWith('/') ? head : `${head}/`) : '/';
  return { base, page: Number(m[1]) };
}

/**
 * The route path for page `n` of a list `base` ('/' or '/tags/hugo/'). Page 1 is
 * the bare base (no /page/1/) so it matches Hugo's canonical pager URL.
 */
export function pagePath(base, n) {
  const dir = dirPath(base);
  return n > 1 ? `${dir}page/${n}/` : dir;
}

/**
 * True when a taxonomy route path is the index (the term cloud, e.g. /tags/)
 * rather than a single term (e.g. /tags/hugo/). Decided by URL depth so it is
 * independent of the page title's locale or customization. The pager segment is
 * stripped first so a paginated term (e.g. /tags/hugo/page/2) still reads as a
 * single term, not the index.
 */
export function isTaxonomyIndexPath(routePath) {
  return trimSlashes(splitPagePath(routePath).base).split('/').filter(Boolean).length <= 1;
}

/**
 * The term slug currently being viewed within a taxonomy route — Hugo's own
 * slug, taken as the last path segment (e.g. '/tags/hugo/' -> 'hugo'). Returns
 * '' for a taxonomy index path (e.g. '/tags/'). The pager segment is stripped
 * first so '/tags/hugo/page/2' still resolves to 'hugo', not '2'. Centralized
 * here so views never hand-parse route segments.
 */
export function taxonomyTermSlug(routePath) {
  const { base } = splitPagePath(routePath);
  if (isTaxonomyIndexPath(base)) return '';
  return trimSlashes(base).split('/').filter(Boolean).pop() || '';
}

/** URL builders for route navigation (router.push / <router-link :to>). */
export const paths = {
  home: () => '/',
  search: () => dirPath(SLUGS.search),
  about: () => dirPath(SLUGS.about),
  taxonomy: (name, term) => dirPath(name, term),
  /** Page `n` of a list base (static mode). Page 1 collapses to the bare base. */
  page: (base, n) => pagePath(base, n),
};

/**
 * Primary app navigation, shared by header and drawer. The 'series'/'tags'
 * literals here are a curated menu, not the taxonomy list: the taxonomies still
 * come from Hugo (TAXONOMIES, above); this list only chooses which of them get a
 * top-level nav entry, and in what order and icon. Adding a taxonomy to hugo.toml
 * does not auto-surface it in the menu.
 */
export const navigationItems = [
  { key: 'menu.home', icon: 'mdi-home', path: paths.home, exact: true },
  { key: 'menu.series', icon: 'mdi-bookshelf', path: () => paths.taxonomy('series') },
  { key: 'menu.tags', icon: 'mdi-tag-multiple', path: () => paths.taxonomy('tags') },
  { key: 'menu.about', icon: 'mdi-information-outline', path: paths.about },
];

/** In-page anchor navigation, distinct from route navigation (no refetch). */
export const anchors = {
  hash: (id) => `#${id}`,
};

const capitalize = (value) => value.charAt(0).toUpperCase() + value.slice(1);

/**
 * Vue Router route table (paths + names only; components are wired in
 * router.js). Order matters: the catch-all Post route stays last.
 *
 * In static mode the home feed's pager pages (/page/N) need an explicit route —
 * otherwise they'd fall through to the catch-all Post route. It carries a `view`
 * hint ('Home') so router.js binds it to HomeView while keeping a unique name.
 * Taxonomy term pagers (/tags/x/page/N) need no extra entry: the existing
 * `/{taxonomy}/:slug*` already matches them, and taxonomyTermSlug strips the
 * pager segment. Client mode omits the home pager route entirely.
 */
export const routeTable = [
  { path: paths.home(), name: 'Home' },
  ...(PAGINATION_MODE === 'static'
    ? [{ path: '/page/:pageNum(\\d+)', name: 'HomePaged', view: 'Home' }]
    : []),
  { path: `/${SLUGS.search}`, name: 'Search' },
  ...TAXONOMIES.map((name) => ({ path: `/${name}/:slug*`, name: capitalize(name), taxonomy: name })),
  { path: `/${SLUGS.about}/:path*`, name: 'About' },
  { path: '/:slug(.*)', name: 'Post' },
];
