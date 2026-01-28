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

## Instructions for making any changes

Always use Bulma CSS styles for formatting/styling. The Bulma documentation is [here](https://bulma.io/documentation/)
