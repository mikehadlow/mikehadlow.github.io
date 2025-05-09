---
title: "Syncing a Google Docs Spreadsheet to a GitHub Hosted Blog"
date: 2025-05-09
draft: false
author: Mike Hadlow
---
Blah

```javascript
// A Google Apps Script to sync book reviews stored in a Google Docs spreadsheet
// with a Hugo/Markdown based review blog

// GitHub PAT for API access to the repo
const GITHUB_TOKEN = "the-github-pat";

// Path to the repo in GitHub
const REPO_PATH = "joeblogs/bookreviews";

// Name of the sheet
const SHEET_NAME = "Sheet1";

// The ID of the folder containing book images
const FOLDER_ID = "the-spreadsheet-id";

const MAIN_BRANCH = "main";

// The column layout in the spreadsheet
const col = {
  category: 0,
  slug: 1,
  author: 2,
  title: 3,
  subtitle: 4,
  started: 5,
  completed: 6,
  review: 7,
};

// The template for the review front-matter
const template = `+++
title = "{{title}}"
description = "{{subtitle}}"
date = {{completed}}
author = "Mike Hadlow"
[params]
    image = "{{image}}"
    category = "{{category}}"
    book-author = "{{author}}"
    started = "{{started}}"
    completed = "{{completed}}"
    tags = ["book"]
+++
{{review}}
`;

function main() {
  console.log("Starting sync!");
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    Logger.log("Sheet not found: " + SHEET_NAME);
    return;
  }
  const data = sheet.getDataRange().getValues();
  console.log("data.length", data.length);

  // iterate through the rows (reviews) in the sheet looking for any
  // that have a 'slug' set.
  for(item of data) {
    const slug = item[col.slug];
    if(slug && slug !== "Slug") {
      const started = new Date(item[col.started]);
      const completed = new Date(item[col.completed]);
      const image = `/img/${slug}.jpg`
      const title = item[col.title]

      // populate the template
      const markdown = template
        .replaceAll("{{image}}", image)
        .replaceAll("{{category}}", item[col.category])
        .replaceAll("{{slug}}", slug)
        .replaceAll("{{author}}", item[col.author])
        .replaceAll("{{title}}", title)
        .replaceAll("{{subtitle}}", item[col.subtitle])
        .replaceAll("{{started}}", started.toISOString().substring(0, 10))
        .replaceAll("{{completed}}", completed.toISOString().substring(0, 10))
        .replaceAll("{{review}}", item[col.review]);
      console.log(markdown);

      pushPostToGitHub(slug, completed, markdown);
      pushPhotoToGithub(slug)
    }
  }
}

function pushPostToGitHub(slug, completed, markdown) {
  const filename = `${completed.toISOString().substring(0, 10)}-${slug}.md`;
  const message = `Add new book review: ${slug}`;
  const content = Utilities.base64Encode(markdown, Utilities.Charset.UTF_8);
  pushToGitHub(filename, content, message, "post");
}

function pushPhotoToGithub(slug) {
  const filename = `${slug}.jpg`;
  const folder = DriveApp.getFolderById(FOLDER_ID);
  const files = folder.getFilesByName(filename);
  if (files.hasNext()) {
    const file = files.next();
    const fileBlob = file.getBlob();
    console.log(`Found file: ${filename} (ID: ${file.getId()})`);
    const content = Utilities.base64Encode(fileBlob.getBytes());
    const message = `Add img for book review: ${filename}`;
    pushToGitHub(filename, content, message, "img");
  }
  else {
    console.log(`Photo not found: ${filename}`)
  }
}

function pushToGitHub(filename, content, message, type) {
  const path = (type === "post") ? "content/posts"
    : (type === "img") ? "static/img"
    : null;
  if(!path) {
    throw new Error(`Unknown pushToGithub type: ${type}`);
  }
  const apiUrl = `https://api.github.com/repos/${REPO_PATH}/contents/${path}/${filename}`;
  const payload = JSON.stringify({
    message,
    content,
    branch: MAIN_BRANCH,
  });

  const headers = {
    "Authorization": `token ${GITHUB_TOKEN}`,
    "Content-Type": "application/json"
  };

  const putOptions = {
    method: "put",
    headers,
    payload,
  };

  const getOptions = {
    method: "get",
    headers,
  }

  try {
    // Return if the file exists
    try {
      const getResponse = UrlFetchApp.fetch(apiUrl, getOptions);
      const status = getResponse.getResponseCode()
      if(status !== 404) {
        console.log(`File already exists: ${status} ${filename}`);
        return;
      }
    } catch (error) {
      console.log(`File ${filename}, not found, safe to proceed with push.`)
    }

    // add the file to the repository
    const response = UrlFetchApp.fetch(apiUrl, putOptions);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      Logger.log(`Successfully pushed file: ${filename}`);
    } else {
      Logger.log(`Error pushing file (${filename}): ${responseCode} - ${responseText}`);
    }
  } catch (error) {
    Logger.log("Error pushing to GitHub: " + error);
  }
}
```
