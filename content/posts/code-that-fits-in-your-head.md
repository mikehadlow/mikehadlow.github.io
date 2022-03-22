---
title: "Book Review: Code That Fits In Your Head by Mark Seeman"
date: 2022-03-22
draft: false
author: Mike Hadlow
---
This is my review of [Mark Seemann's](https://blog.ploeh.dk/) new book, [Code That Fits In Your Head - Heuristics for Software Engineering](https://www.amazon.co.uk/Code-That-Fits-Your-Head/dp/0137464401) . 
<!--more-->
Mark is a leading figure in the world of .NET software development. He wrote _the_ book on dependency injection and more recently he's been an advocate of F# and functional programming. His blog is essential reading for anyone interested in the art of programming.

I had the pleasure of working with Mark a few years ago. He was the development lead and architect for a rewrite of a music streaming platform.  It was a wonderful learning experience. Every code review was a lesson in writing better software. The heuristics presented in this book were really used and Mark has a huge reference library of books, articles, and blog posts that were regularly referenced to back up a point he was making. He's put an enormous, deliberate, and sustained effort into improving his practice as a software developer over decades. If you have the opportunity to hire Mark as a consultant I'd very much recommend it, but unfortunately he doesn't scale, so for most this book is the next best thing.

The goal of the book is to give you a list of heuristics, processes, and tools that an experienced software developer would use. It is a "tour d'horizon" of current enterprise development best practices especially in the world of Microsoft .NET. Although having said that, it's general enough to apply to anyone programming in a C-style language doing back-end development.

Who is the book for? Not a complete beginner for sure, it makes too many assumptions about prior knowledge. Probably the best audience is a mid-level developer with a couple of years experience who wants a guide to take them to the next level. More senior developers will find it useful as well, as a reminder of the scope of the subject, and perhaps point out some holes in their mental models and practices. I certainly found quite a few ideas for further investigation. It was also weirdly affirming for me. After more than a quarter century (about the same as Mark) of building software it's hard to appreciate the breadth of one's knowledge. Certainly I've often doubted my own abilities in a field where new techniques and tools arrive at such a pace that it's beyond any single human's ability to keep abreast of everything. So it's rather satisfying to read an overview like this and realize that I do indeed know quite a lot of useful stuff! I don't think there was anything in the book that I disagreed with. It's all very sound advice.

I very much like Mark's writing style; short direct sentences, very simple, very easy to read. It has something of the children's book about it in style, and I mean that as a good thing. I think it's probably one of the easiest to read technical books I've read in a long time. Mark's personality comes through in his slightly grumpy and amusing anecdotes about dysfunctional teams and practices he's experienced throughout the years. We've all had similar experiences, so it raised a wry smile with me more than a few times.

The book is an appeal to make the "art" of software development more like engineering:

> "Engineering, broadly speaking, is to use all the heuristics and deterministic machinery you can to improve the chance of ultimate success." 

Some of the topics covered include: Leveraging deterministic tools, leaning on the compiler, enabling static code analysis, writing unit and integration tests and having them run on an automated build and deployment pipeline. When you can't automate use heuristics, assisted by checklists. Getting to working software quickly by implementing a vertical slice. Handling complexity with encapsulation and decomposition. "Fractal Architecture". Designing APIs with affordances that encourage correct use. Poka Yoka - "mistake proofing". Team practices, especially good source control practice and code review. Techniques for growing software and changing legacy code (the Strangler Pattern). Troubleshooting and defects. Keeping it simple, with notable targets for not doing so being ORMs, mocking libraries, complex build systems, and IoC containers.

All the discussion is supported by a sample application that's available on GitHub. Browsing the code is lesson in excellent software design and makes for an excellent addendum to the book.

If I have any criticism it's that in some ways the book is overly ambitious and tries to cover too many aspects of software engineering in too brief a volume. Some chapters touch very lightly on subjects that could easily be a whole book in their own right. Chapter 13 which covers composition and is one of Mark's main interests really only skims the subject. Indeed, as I mentioned above, Mark has written a whole book on it. So it should be seen as more of a guide to further reading and investigation rather than a definitive textbook. The Bibliography alone is probably worth the price of the book; over 100 books and articles are referenced that cover the full gamut of software engineering.

So very much recommended as a mid-career checklist for anyone building enterprise software.