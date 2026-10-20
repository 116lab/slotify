# Routing and deep links
format: 1
subject: hugo.toml
subject: static/js/config/routes.js
subject: static/js/composables/useRouteScroll.js
subject: static/js/composables/useTableOfContents.js
subject: layouts/partials/func/route-path.html
subject: tests/routing.spec.js
subject: tests/subpath.spec.js
subject: tests/smoke.spec.js

## Commitments
- Every known route is a real per-URL HTML document, so static hosts serve a deep link
  directly with a 200 instead of relying on the 404 to `?p=` redirect.
  - `deep-linking directly to a post resolves (SEO/200, not a redirect)`
  - `a deep link under a subpath loads the post`
- Templates emit base-less route targets and the router and `withBase` re-add the
  deployment base, so under a subpath deployment links and fetches carry the base exactly
  once; feeding a base-carrying permalink straight through would double it
  (`/slotify/slotify/...`).
  - `links and navigation under a subpath carry the base exactly once`

## Judgment
- In-page anchor navigation (the Table of Contents) is kept distinct from route
  navigation: it moves the viewport and updates only the hash, without changing the
  route or refetching data.
  - `a Table of Contents click changes only the hash, with no route change or refetch`
- Back/forward navigation restores the saved scroll position, so returning to a long
  feed lands where the reader left off.
  - `back navigation restores the previous scroll position`
- A `#hash` deep link aligns its heading below the fixed app bar instead of hidden
  behind it.
  - `deep-linking to a #hash scrolls to that heading, not the top`
