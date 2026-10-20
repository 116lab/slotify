# Site search
format: 1
subject: static/js/composables/useSearch.js
subject: static/js/utils/highlight.js
subject: static/js/components/SearchField.js
subject: tests/search.spec.js
subject: tests/smoke.spec.js

## Commitments
- Whitespace-only input and a cleared value are an empty query: the search shows its
  prompt instead of results.
  - `whitespace-only search query stays in the search prompt state`
- Highlighting matches against raw text and escapes every segment it emits, so neither
  the query nor post text can inject markup into the results (rendered with `v-html`)
  and HTML entities are not corrupted.
  - `the search highlighter escapes markup around and inside matches`

## Judgment
- Search filters locally while typing without rewriting `?q=` on every change; a direct
  `?q=` link still initializes the search, and clearing it removes the stale `q`.
  - `typing a search filters locally without rewriting ?q=`
  - `search keyword highlighting wraps query terms in search-highlight marks`
  - `clearing search field resets query and raises no console errors`
