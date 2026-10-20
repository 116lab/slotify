---
name: Slotify Route SSOT
description: Mandatory rules for SPA routing, URL construction, and the route Single Source of Truth (static/js/config/routes.js).
---

# Slotify Route SSOT & URL Construction 🧭

**CRITICAL MANDATE**: All SPA routing and URL construction MUST flow through the
route Single Source of Truth at `static/js/config/routes.js`. This SKILL extends
the "NO Path Hacking" prohibition in `slotify-architecture-standards` from JSON
endpoints to *all* route strings. Changes to the SPA router are a major
architectural shift and require explicit user approval (see the KIs).

## 1. The Single Source of Truth
`static/js/config/routes.js` owns every routing concern:
*   `routeTable` — the ordered Vue Router route definitions (catch-all Post LAST).
*   `paths.*` — URL builders for route navigation (`paths.home()`, `paths.search()`,
    `paths.about()`, `paths.post(slug)`, `paths.<taxonomy>(term?)`).
*   `toJsonEndpoint(routePath)` / `withBase(resource)` — the only functions allowed
    to assemble Hugo JSON endpoints or apply the deployment base path.
*   `anchors.*` — in-page anchor navigation (hash scroll), kept DISTINCT from route
    navigation because it never changes the route or refetches data.

## 2. Hard Prohibitions (Zero Tolerance)
*   **NO route string literals** outside `routes.js`. Components, composables, views,
    and `router.js` MUST consume `paths.*` / `routeTable` — never `"/tags/"`,
    `"/about/"`, `"/search"`, etc.
*   **NO manual endpoint assembly**. `services/api.js` MUST use `toJsonEndpoint` /
    `withBase`; no `split('/')`, `${path}/index.json`, or base-joining elsewhere.
*   **NO hardcoded taxonomy keys in JS**. Taxonomy names come from Hugo
    (`.Site.Taxonomies`) via `window.__SLOTIFY_CONFIG__.taxonomies`, injected by
    `layouts/index.html`. Hugo (`hugo.toml [taxonomies]`) remains the SSOT.
*   **NO conflating route vs anchor**. Use `paths.*` for navigation that changes the
    route (and refetches); use `anchors.*` for hash scroll within the current page.

## 3. Deployment Base Path
*   `window.__SLOTIFY_BASE__` (Hugo `baseURL` pathname, injected by `index.html`) is
    the SSOT for the base. `routes.js` exposes it as `basePath` (for the router) and
    folds it into `withBase` / `toJsonEndpoint`. Vue Router strips the base from
    `route.path`, so the API layer re-adds it — this is why endpoints MUST go through
    `toJsonEndpoint`. Asset URLs in `index.html` MUST use Hugo `relURL`.

## 4. Adding or Changing Routes
1.  Edit `routeTable` and add a matching `paths.*` builder in `routes.js`.
2.  Bind the route name to its view component in `router.js` (`viewByName`).
3.  Keep the catch-all Post route (`/:slug(.*)`) LAST.
4.  Update `README.md` (and related KIs) per the Documentation
    Obligation. A commit without docs is incomplete.
