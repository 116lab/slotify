# Pagination
format: 1
subject: static/js/composables/usePagination.js
subject: static/js/router.js
subject: layouts/partials/func/feed-pages.html
subject: layouts/partials/func/pagination-config.html
subject: tests/pagination.spec.js
subject: tests/pagination-client.spec.js

## Commitments
- In static mode every `/page/N/` is a real HTML+JSON document that a deep link loads
  directly, so pager pages stay crawlable and deep-linkable.
  - `deep-linking /page/3/ resolves (200) and highlights page 3`
- A static pager page's crawlable HTML body and its JSON list the same posts in the same
  order; any drift would make `/page/N/index.html` and `/page/N/index.json` disagree
  about what is on that page.
  - `a pager page lists the same posts in its HTML body and its JSON`

## Judgment
- In static mode the URL, not local state, is the page state: the pager navigates to
  `/page/N/`, and the current page is read from the URL that chose which page's JSON was
  fetched, so a deep link highlights the right page too.
  - `clicking the pager navigates to /page/N and swaps the cards`
  - `deep-linking /page/3/ resolves (200) and highlights page 3`
- In static mode `…/page/1/` redirects to its base list: the base is the canonical page-1
  URL, keeping one URL per page and no duplicate-content page-1 endpoint.
  - `/page/1/ canonicalizes to the bare home URL`
- In client mode a `…/page/N` URL is stripped to its base list, because client mode has no
  pager endpoints and the catch-all Post and taxonomy-term routes would otherwise
  mis-fetch a paginator shape.
  - `client mode strips a /page/N pager URL to its base list`
