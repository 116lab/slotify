+++
title = 'Your Post Title'
date = 2023-10-27T10:00:00+08:00
draft = false
tags = ['Tag1', 'Tag2']
series = ['Series Name']
# Featured Image (Optional): Displayed on the homepage card and as a hero image in the post
image = 'https://example.com/cover.jpg'
+++

<!-- 
Slotify Theme Writing Template & Code-as-Doc
Copy this file into your `content/posts/` directory to start writing.

> [!IMPORTANT]
> This theme's homepage list is hardcoded to display articles from the `posts` section. 
> To ensure your content appears on the front page, place this file in:
> `content/posts/your-article-name/index.md`

This document serves as both a template and a visual reference for supported Markdown features.
-->

## Introduction

Write your introduction here. Slotify theme uses **Inter** for body text to ensure maximum readability.

## Typography and Highlights

Use **bold text** to emphasize keywords, *italic text* for nuances, and `inline code` for technical terms.

> **MANDATORY**: Use blockquotes for important callouts. Slotify automatically applies a left border with your primary theme color and a subtle background for premium aesthetics.

## Embedded Media & Image Management

Slotify supports Hugo's recommended **Page Bundles** approach for organizing post-specific images. Instead of a single Markdown file, site owners MUST create a directory for your post:

```text
content/
└── posts/
    └── my-awesome-post/
        ├── index.md       <-- Your post content (copy this template here)
        ├── cover.jpg      <-- Referenced in front matter: image = "cover.jpg"
        └── diagram.png    <-- Referenced in body: ![Diagram](diagram.png)
```

To embed an image within the body, utilize standard Markdown syntax referencing the relative filename. Slotify MUST automatically apply responsive scaling, 16px rounded corners, and a depth shadow.

![Describe your image for SEO](diagram.png)

## Code Blocks

Use fenced code blocks for technical demonstrations:

```javascript
const slotify = {
  theme: "Premium SPA",
  status: "Active"
};
console.log(slotify);
```

## Tables

| Feature | Supported | 
| :--- | :---: | 
| SPA Routing | ✅ | 
| Featured Images | ✅ | 
| i18n Translation | ✅ | 

---
*Happy writing!*
