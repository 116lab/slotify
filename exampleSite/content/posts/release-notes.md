+++
title = 'Release Notes 1.0'
date = 2025-08-15T10:00:00+08:00
draft = false
tags = ['guide', 'changelog']
+++

A standalone post (no series) — handy for confirming the feed mixes series and
one-off articles correctly across pages. Its headings below also double as a live
demo of the navigation behaviors they describe: open the Table of Contents, or
share a link ending in `#scroll-position-is-remembered`, and watch where you land.

## Navigation feels native

Slotify is a Single Page Application, so moving between pages never reloads the
browser. Several details make that feel deliberate rather than abrupt:

- The previous page stays on screen until the next page's data is ready, then a
  short fade-and-rise swaps them — no flash of an empty shell.
- The page only scrolls **after** the incoming content is in place, so the page
  you are leaving never jumps before it fades out.
- Prefer a snappier or calmer feel? The transition speed is two CSS variables
  (`--transition-page-in` / `--transition-page-out`); override them in your own
  `customCSS`.

## Deep links land on the right heading

Share a URL ending in `#a-heading-slug` and the page scrolls straight to that
section, clearing the top bar instead of hiding behind it. Heading anchors are
generated automatically, so any heading in your Markdown is linkable — and the
Table of Contents in the side rail uses the same mechanism.

## Scroll position is remembered

Read halfway down a long list, open an article, then press the browser **Back**
button: you return to exactly where you were, not the top of the list. Forward
navigation restores its position too.

## Motion preferences are respected

If your operating system is set to **reduce motion**, the fade transitions and the
smooth anchor/Back scrolling collapse to instant jumps automatically — the
destination is identical, only the animation is dropped.

## Pagination, your way

The home feed and tag/series lists paginate in one of two modes (`paginationMode`):
`client` slices the whole feed in memory for instant, fetch-free page changes,
while `static` serves a real, crawlable, deep-linkable document per page. Either
way, changing pages returns you to the top of the list.
