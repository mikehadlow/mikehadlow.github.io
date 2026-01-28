import { BskyAgent, RichText } from '@atproto/api';
import matter from 'gray-matter';
import { glob } from 'glob';
import fs from 'fs';
import path from 'path';

const SITE_URL = 'https://mikehadlow.com';

async function main() {
  const identifier = process.env.BLUESKY_IDENTIFIER;
  const password = process.env.BLUESKY_APP_PASSWORD;

  if (!identifier || !password) {
    console.error('Missing BLUESKY_IDENTIFIER or BLUESKY_APP_PASSWORD environment variables');
    process.exit(1);
  }

  // Authenticate with BlueSky
  const agent = new BskyAgent({ service: 'https://bsky.social' });
  await agent.login({ identifier, password });
  console.log('Authenticated with BlueSky');

  // Find all posts
  const postFiles = await glob('content/posts/*.md');

  for (const filePath of postFiles) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    // Skip drafts
    if (frontmatter.draft === true) {
      continue;
    }

    // Only process if at_post_uri exists AND is empty string
    if (!('at_post_uri' in frontmatter) || frontmatter.at_post_uri !== '') {
      continue;
    }

    console.log(`Processing: ${filePath}`);

    // Derive URL from filename
    const filename = path.basename(filePath, '.md');
    const postUrl = `${SITE_URL}/posts/${filename}/`;

    // Create post text
    const title = frontmatter.title || 'New blog post';
    const postText = `New blog post: ${title}\n\n${postUrl}`;

    // Create rich text with link facet
    const rt = new RichText({ text: postText });
    await rt.detectFacets(agent);

    // Create the BlueSky post
    const response = await agent.post({
      text: rt.text,
      facets: rt.facets,
      createdAt: new Date().toISOString(),
    });

    console.log(`Created BlueSky post: ${response.uri}`);

    // Update the frontmatter with the AT URI
    frontmatter.at_post_uri = response.uri;
    const updatedContent = matter.stringify(content, frontmatter);
    fs.writeFileSync(filePath, updatedContent);

    console.log(`Updated ${filePath} with at_post_uri`);
  }

  console.log('Done');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
