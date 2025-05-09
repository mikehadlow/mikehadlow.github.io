---
title: "Emojis As Favicons"
date: 2024-05-09
draft: false
author: Mike Hadlow
---
I'm no designer, and I like to keep things simple and easy to configure. So for the various websites I create I like to have an easy way to create a favicon icon. To do this I use a reusable snippet of SVG that I can customize to have a different color and characters for each site. Here is the SVG for the favicon for this site:

```html
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="none" rx="15" />
  <g transform="translate(0, 30)" fill="white" font-size="60" font-family="sans-serif">
    <text x="0" y="40">✅</text>
  </g>
</svg>
```

You can customize it for your own site by just replacing the tokens below:

```html
<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="{{ back color here }}" rx="15" />
  <g transform="translate(0, 30)" fill="{{ front color here }}" font-size="60" font-family="sans-serif">
    <text x="0" y="40">{{ one or two chars here }}</text>
  </g>
</svg>
```

And of course those characters can be emojis 👍🏻

Don't forget the `<link>` element in your `<header>`:

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
```
