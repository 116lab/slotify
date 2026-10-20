# Content rendering and layout
format: 1
subject: static/js/composables/useContentHydration.js
subject: static/js/components/ContentShell.js
subject: layouts/_default/single.html
subject: tests/content.spec.js
subject: tests/smoke.spec.js

## Commitments
- Each route has exactly one `<main>`, and the complementary landmark belongs only to the
  labelled sidebar widgets, never to empty rails.
  - `landmarks: one <main>, and no empty rail landmarks`
- A post ships its article in the server-rendered HTML, because search engines, social
  crawlers and no-JS clients do not execute the SPA.
  - `a post ships its article as server-rendered HTML for crawlers`

## Judgment
- Mermaid and KaTeX stay out of the eager payload and are downloaded only on a page that
  contains a diagram or math.
  - `KaTeX and Mermaid are not downloaded on pages without math or diagrams`
  - `KaTeX is downloaded and renders once a page contains math`
- Every route renders the same 2/8/2 shell with the side rails reserved even when empty,
  so the reading column keeps the same width and position on list and article routes.
  - `the reading column has the same geometry on list and article routes`
