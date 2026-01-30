---
title: "BlueSky Comments for Hugo: A Complete Integration Guide"
date: 2026-01-30
draft: false
author: Mike Hadlow
at_post_uri: ""
---

I recently added BlueSky integration to this blog. Now when I publish a new post, it's automatically announced on BlueSky, and replies to that announcement appear as comments on the blog post. This article explains how it all works.

<!--more-->

## The Problem with Blog Comments

Traditional comment systems like Disqus have fallen out of favour. They're slow, privacy-invasive, and often filled with spam. Self-hosted solutions require database management and moderation tools. What I wanted was something simpler: leverage an existing social platform where conversations already happen naturally.

BlueSky's open API and AT Protocol make it an excellent choice. Comments live where people already discuss content, moderation is handled by the platform, and the API is straightforward to use.

## How It Works

The system has two parts:

1. **Displaying comments**: JavaScript fetches replies to a linked BlueSky post and renders them on the blog page
2. **Automatic posting**: A GitHub Action creates the BlueSky announcement when a new post is published

Let's look at each in detail.

## Displaying BlueSky Comments

### Hugo Template Integration

When a blog post includes an `at_post_uri` in its frontmatter, Hugo renders a comments container:

```yaml
---
title: "My Post"
date: 2026-01-30
at_post_uri: "at://did:plc:xxx/app.bsky.feed.post/yyy"
---
```

The template in `layouts/_default/single.html` checks for this parameter:

```html
{{ with .Params.at_post_uri }}
    {{ $.Page.Store.Set "hasBskyComments" true }}
    <div id="bluesky-comments" class="mt-6"></div>
    <script>
        document.getElementById('bluesky-comments').dataset.postUri = {{ . }};
    </script>
{{ end }}
```

The `hasBskyComments` flag tells the base template to load the JavaScript file only when needed, keeping other pages lightweight.

### Fetching Replies from the BlueSky API

The JavaScript in `static/js/bluesky-comments.js` calls BlueSky's public API:

```javascript
const BSKY_API = 'https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread';

async function loadComments(container, postUri) {
    const response = await fetch(
        `${BSKY_API}?uri=${encodeURIComponent(postUri)}`
    );
    const data = await response.json();
    const replies = data.thread?.replies || [];
    // ... render the replies
}
```

The `app.bsky.feed.getPostThread` endpoint returns the original post and its entire reply tree. No authentication is required for public posts, which keeps the client-side code simple.

### Rendering the Comment Thread

Replies can be nested, so the code flattens them into a linear list while tracking depth:

```javascript
function flattenReplies(replies, depth) {
    const result = [];
    for (const reply of replies) {
        if (reply.$type !== 'app.bsky.feed.defs#threadViewPost') {
            continue;
        }
        result.push({ reply: reply.post, depth: Math.min(depth, 2) });
        if (reply.replies?.length > 0) {
            result.push(...flattenReplies(reply.replies, depth + 1));
        }
    }
    return result;
}
```

Depth is capped at 2 levels to keep the visual hierarchy manageable. Each comment displays the author's name, handle, timestamp, and text, all styled with Bulma CSS classes.

### Security Considerations

All user-generated content is escaped before rendering:

```javascript
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
```

This prevents XSS attacks from malicious BlueSky users. The browser's built-in text node encoding handles all edge cases.

### AT URI to Web URL Conversion

BlueSky uses AT Protocol URIs internally (`at://did:plc:xxx/app.bsky.feed.post/yyy`), but we need web URLs for links:

```javascript
function atUriToWebUrl(atUri) {
    if (!atUri?.startsWith('at://')) return '';
    const parts = atUri.slice(5).split('/');
    const did = parts[0];
    const postId = parts[2];
    return `https://bsky.app/profile/${did}/post/${postId}`;
}
```

## Automatic BlueSky Posting with GitHub Actions

Manually creating a BlueSky post and copying the URI for every blog article would be tedious. Instead, a GitHub Actions workflow automates this.

### Triggering the Workflow

The workflow in `.github/workflows/bluesky-post.yml` runs after the site deployment completes:

```yaml
on:
  workflow_run:
    workflows: ["github pages"]
    types:
      - completed

jobs:
  post-to-bluesky:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
```

Using `workflow_run` ensures the blog post is live before we announce it.

### Identifying New Posts

The Node.js script in `.github/scripts/bluesky-post.mjs` scans all markdown files for posts that need announcing. The convention is simple:

- `at_post_uri: ""` (empty string) means "create a BlueSky post for this"
- Missing `at_post_uri` means "no BlueSky integration"
- Populated `at_post_uri` means "already posted"

```javascript
const postFiles = await glob('content/posts/*.md');

for (const filePath of postFiles) {
    const { data: frontmatter, content } = matter(fileContent);

    // Skip drafts
    if (frontmatter.draft === true) continue;

    // Only process if at_post_uri exists AND is empty string
    if (!('at_post_uri' in frontmatter) || frontmatter.at_post_uri !== '') {
        continue;
    }

    // ... create the post
}
```

### Creating the BlueSky Post

The script uses the official `@atproto/api` package to authenticate and post:

```javascript
import { BskyAgent, RichText } from '@atproto/api';

const agent = new BskyAgent({ service: 'https://bsky.social' });
await agent.login({ identifier, password });

const postText = `New blog post: ${title}\n\n${postUrl}`;

// RichText automatically detects and creates link facets
const rt = new RichText({ text: postText });
await rt.detectFacets(agent);

const response = await agent.post({
    text: rt.text,
    facets: rt.facets,
    createdAt: new Date().toISOString(),
});
```

The `RichText` class handles link detection, creating the proper "facets" that make URLs clickable in BlueSky clients.

### Updating the Frontmatter

After posting, the script writes the returned AT URI back to the markdown file:

```javascript
frontmatter.at_post_uri = response.uri;
const updatedContent = matter.stringify(content, frontmatter);
fs.writeFileSync(filePath, updatedContent);
```

The `gray-matter` library handles YAML parsing and serialization.

### Triggering a Rebuild

Here's where it gets interesting. After updating the frontmatter, we need to rebuild the site so the comments section appears. But commits made with `GITHUB_TOKEN` don't trigger other workflows (a GitHub security feature to prevent infinite loops).

The solution is to explicitly trigger the deployment workflow:

```yaml
- name: Commit and push changes
  id: commit
  run: |
    if git diff --quiet; then
      echo "changes=false" >> $GITHUB_OUTPUT
    else
      git add content/posts/*.md
      git commit -m "Update at_post_uri for new BlueSky posts [skip ci]"
      git push
      echo "changes=true" >> $GITHUB_OUTPUT
    fi

- name: Trigger site rebuild
  if: steps.commit.outputs.changes == 'true'
  env:
    GH_TOKEN: ${{ github.token }}
  run: gh workflow run "github pages" --ref master
```

The `[skip ci]` in the commit message prevents the push from triggering workflows, then we manually trigger just the deployment. This gives us precise control over the workflow chain.

### The Complete Flow

1. I push a new post with `at_post_uri: ""`
2. GitHub Pages workflow builds and deploys the site
3. BlueSky Post workflow triggers on completion
4. Script creates BlueSky post, gets back the AT URI
5. Script updates the markdown file and commits
6. Script explicitly triggers GitHub Pages rebuild
7. Site rebuilds with the populated `at_post_uri`
8. Comments section now appears on the post
9. BlueSky Post workflow runs again but finds nothing to do

The workflow is idempotent - running it multiple times has no effect once all posts have their URIs populated.

## Setting It Up

If you want to implement this on your own Hugo blog:

1. Copy the `static/js/bluesky-comments.js` file
2. Add the template logic to conditionally load it and render the container
3. Create the GitHub Actions workflow and script
4. Add `BLUESKY_IDENTIFIER` and `BLUESKY_APP_PASSWORD` secrets to your repository
5. Start adding `at_post_uri: ""` to new posts

The app password can be created in BlueSky under Settings > App Passwords. Use a dedicated password for this integration rather than your main account password.

## Conclusion

This integration gives me the best of both worlds: comments that live in a real social network where discussions happen naturally, with automatic cross-posting that requires no manual intervention. The entire system is built on public APIs and standard GitHub Actions, with no external services or databases required.

The source code for this blog, including all the files mentioned here, is available on [GitHub](https://github.com/mikehadlow/mikehadlow.github.io).
