+++
title = 'Quick Start'
date = 2024-09-01T10:00:00+08:00
draft = false
tags = ['guide', 'setup']
image = 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=2000'
+++

Get a **Slotify** site running in a few minutes. This single post is the
standalone getting-started guide (it belongs to no series — note the absence of
the Series Navigator rail).

## 1. Add the theme

Add Slotify as a Hugo module or theme and enable it in your `hugo.toml`:

```toml
theme = 'slotify'

[taxonomies]
  tag = 'tags'
  series = 'series'

[params]
  pagerSize = 5   # SPA feed page size (default 10); client-side pagination
```

## 2. Set your identity

```toml
[params]
  author = "Your Name"
  description = "A short tagline for your site."
  [params.social]
    github = "https://github.com/you"
```

## 3. Write a post

Drop a Markdown file in `content/posts/`. Front matter drives the cards and the
post page:

```toml
+++
title = 'Hello World'
date = 2024-09-01T10:00:00+08:00
tags = ['intro']
series = ['My Series']        # optional — enables the Series Navigator
image = '/images/hero.jpg'    # optional — featured image
+++
```

## 4. Customize with Slots — no fork required

Every region of the theme is an overridable **slot**. To customize one, drop a
file at the same path in *your* site's `layouts/partials/slots/` — you never edit
the theme. For example, a disclaimer above any article:

```html
<!-- layouts/partials/slots/postView/contentTop.html -->
<script type="text/x-template" id="slot-postView-contentTop-template">
  <v-alert type="info" variant="tonal" class="mb-6"
           text="These notes are a work in progress."></v-alert>
</script>
```

That's it — see the **Showcase** post for the full feature tour.
