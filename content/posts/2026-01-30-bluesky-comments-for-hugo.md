---
title: "Vibe-Coding BlueSky Comments"
date: 2026-01-30
draft: false
author: Mike Hadlow
at_post_uri: ""
---

I've vibe-coded a new commenting system for this blog using BlueSky as the backend. At the bottom of the page
you'll see a call to action to "Join the conversation on BlueSky" which takes you to
a BlueSky post. Any replies to that post will also appear at the bottom of the page, there
might even be some there now.

<!--more-->

This blog is a static site built from Markdown using the Hugo static site
engine. You can read more about it in this post: [Welcome to My New
Blog](/posts/2021-07-06-welcome-to-my-new-blog/). I didn't want to hand-craft
commenting infrastructure and be bothered with maintaining an auth-system,
database, and server-side platform to support it. Since my social media platform
of choice is BlueSky, and because BlueSky is built around the open and
extensible [AT Protocol](https://atproto.com/) it seemed a good choice to
support a commenting system. I've also been interested in the AT Protocol for a
while now and it gave me an excuse for a deeper dive. The major downside is, of
course, that anyone who wishes to comment needs to have a BlueSky account. But
on the other hand any commenting system would have a similar account creation requirement,
and BlueSky accounts are easy to set up.
Another, perhaps minor, downside is that I'll get a BlueSky post on my timeline
every time I push a new blog post. That's somewhat of a concern if I want to
frame it in a particular way, but maybe that's just an excuse for me to add the
first comment if I want to add more context?

I'm very much excited by the huge productivity gains offered by AI coding assistants.
I've been using Claude Code for the last few months. Particularly since the release
of Opus 4.5 towards the end of last year, it's become a game-changer in my opinion.
Claude Code built this entire feature with just broad architectural guidance from me.
So as well as explaining how the feature works, I'll also make some comments here 
about how well Claude did with its implementation.

## How It Works

The system has two main components: 
1. A CI build process based on GitHub Actions that detects when a new post has been published and automatically posts a new message on BlueSky linking back to the blog post. It captures the BlueSky post's URI and updates the blog post's frontmatter with it and then republishes the post.
2. A small client-side Javascript function that retrieves the post and all its replies and renders them at the bottom of the blog post's page.

__Note__: The explanation below was written with the help of Claude. I've mostly rewritten it, but you can look in the Git commits to
compare the original Claude attempt with my final version if you are interested.

## Automatic BlueSky Posting with GitHub Actions

The key integration point between the CI process and the client-side JS that renders the comments is the `at_post_uri` in the post's frontmatter.
For example, here's the frontmatter in the markdown for this post:

```markdown
---
title: "Vibe-Coding BlueSky Comments"
date: 2026-01-30
draft: false
author: Mike Hadlow
at_post_uri: ""
---
```

Note that as I'm writing this I haven't yet pushed this post to GitHub so the `at_post_uri` is an empty string. The logic goes something like this:

1. If `at_post_uri` is missing then do nothing. I don't want comment posts randomly appearing for my older posts. The ship has sailed for them.
2. If `at_post_uri` is present but is not an empty string then do nothing. The post already has a BlueSky comment post.
3. If `at_post_uri` is an empty string (like the example above) then we need to kick off the process of creating a new BlueSky post.

The workflow in `.github/workflows/bluesky-post.yml` runs after the site deployment completes. It runs the logic above to identify any recently published post(s).

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

After posting, the script writes the returned AT URI back to the markdown file:

```javascript
frontmatter.at_post_uri = response.uri;
const updatedContent = matter.stringify(content, frontmatter);
fs.writeFileSync(filePath, updatedContent);
```

The `gray-matter` library handles YAML parsing and serialization.

Here's where it gets interesting and where Claude struggled at first and took a
few iterations to create a workable solution. After updating the frontmatter, we
rebuild the site so the comments section appears. But commits made with
`GITHUB_TOKEN` don't trigger other workflows (a GitHub security feature to
prevent infinite loops), so we need to explicitly trigger the deployment workflow:

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

## Displaying BlueSky Comments

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
This was something new that Claude taught me. I wasn't aware of the `dataset` property on HTML elements before.

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

The `app.bsky.feed.getPostThread` endpoint returns the original post and its
entire reply tree which is very convenient, just one API call to get everything
we need. No authentication is required for public posts, which keeps the
client-side code super simple.

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

If you want to implement this on your own Hugo blog:

1. Copy the `static/js/bluesky-comments.js` file
2. Add the template logic to conditionally load it and render the container
3. Copy the GitHub Actions workflow from `.github/workflows/bluesky-post.yml`
4. Add `BLUESKY_IDENTIFIER` and `BLUESKY_APP_PASSWORD` secrets to your repository. You'll need to create a BlueSky App Password, but it's very easy to do.
5. Start adding `at_post_uri: ""` to new posts

## Conclusion

Working with Claude Code took me just a couple of hours to get this all working,
less time than it took me to write this blog post. I imagine if I'd been coding
it by hand I would have taken a day or two depending on how many rabbit holes I
encountered. To be fair the credit must also go to the BlueSky team for making
their APIs super easy to work with. The main gotcha was getting the GitHub
Actions to trigger each other correctly.

The source code for this blog, including all the files mentioned here, is
available on [GitHub](https://github.com/mikehadlow/mikehadlow.github.io).
