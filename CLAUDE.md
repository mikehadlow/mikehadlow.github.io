# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is Mike Hadlow's personal blog at mikehadlow.com, built with Hugo static site generator and Bulma CSS framework.

## Commands

**Local development server:**
```
hugo server
```
Runs at http://localhost:1313/

**Production build:**
```
hugo --minify
```
Output goes to `./public/`

**Create new post:**
```
hugo new posts/YYYY-MM-DD-post-title.md
```

## Architecture

- **Static Site Generator:** Hugo
- **CSS Framework:** Bulma (loaded via CDN in layouts)
- **Deployment:** GitHub Actions builds on push to master, deploys to GitHub Pages

## Content Structure

- `content/posts/` - Blog posts (naming: `YYYY-MM-DD-title.md`)
- `content/top/` - Top-level pages (about, contact)
- `layouts/` - Custom Hugo templates that override the theme
- `themes/mhblog/` - Custom theme (minimal, mostly uses layouts/)
- `static/img/` - Images referenced in posts
- `static/js/` - Client side Javascript should go here

## Post Front Matter

```yaml
---
title: "Post Title"
date: YYYY-MM-DD
draft: false
author: Mike Hadlow
---
```

Use `<!--more-->` to mark the excerpt boundary for list pages.

## BlueSky Comments

Blog posts can display replies from a linked BlueSky post as comments. To enable:

1. Create a post on BlueSky about your blog article
2. Get the AT URI of the post (format: `at://did:plc:xxx/app.bsky.feed.post/yyy`)
3. Add `at_post_uri` to the post's front matter:

```yaml
---
title: "Post Title"
date: YYYY-MM-DD
author: Mike Hadlow
at_post_uri: "at://did:plc:xxx/app.bsky.feed.post/yyy"
---
```

**How it works:**
- `layouts/_default/single.html` adds a comments container when `at_post_uri` is present
- `layouts/_default/baseof.html` conditionally loads the script (similar to Mermaid)
- `static/js/bluesky-comments.js` fetches replies from the public BlueSky API (`app.bsky.feed.getPostThread`) and renders them with Bulma styling
- Nested replies are supported with indentation (up to 2 levels deep)
- All user content is escaped to prevent XSS

## Automatic BlueSky Posting

New blog posts can be automatically posted to BlueSky when published. To enable for a post, set `at_post_uri` to an empty string:

```yaml
---
title: "Post Title"
date: YYYY-MM-DD
author: Mike Hadlow
at_post_uri: ""
---
```

**Behavior:**
- `at_post_uri: ""` (empty string) - Create BlueSky post automatically
- `at_post_uri` missing - No BlueSky integration
- `at_post_uri` populated - Already posted, do nothing

**Workflow sequence:**
1. Push post with `at_post_uri: ""`
2. `gh-pages.yml` builds and deploys site
3. `bluesky-post.yml` triggers on completion
4. Script creates BlueSky post with title and link
5. Script updates markdown frontmatter with the AT URI
6. Script commits with `[skip ci]` and explicitly triggers `gh-pages`
7. Site rebuilds with populated `at_post_uri`, enabling comments section

**Files involved:**
- `.github/workflows/bluesky-post.yml` - Workflow triggered after gh-pages completes
- `.github/scripts/bluesky-post.mjs` - Node.js script that posts to BlueSky and updates frontmatter
- `.github/scripts/package.json` - Dependencies (@atproto/api, gray-matter, glob)

**Required secrets** (Settings > Secrets and variables > Actions):
- `BLUESKY_IDENTIFIER` - BlueSky handle (e.g., `mikehadlow.bsky.social`)
- `BLUESKY_APP_PASSWORD` - App password from BlueSky Settings > App Passwords

## Instructions for making any changes

Always use Bulma CSS styles for formatting/styling. The Bulma documentation is [here](https://bulma.io/documentation/)
