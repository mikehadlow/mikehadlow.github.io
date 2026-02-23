---
title: 'Book Review: Vibe Coding by Gene Kim and Steve Yegge'
date: 2026-02-23T00:00:00.000Z
draft: false
author: Mike Hadlow
at_post_uri: 'at://did:plc:ept4l4zcjaajxvi5gtb6wnhr/app.bsky.feed.post/3mfjsgfuzkj2c'
---
For myself and many others, everything changed around November last year. I'd just started to use Codex and Claude Code when Anthropic's Opus 4.5 was released. It was immediately apparent that this was a step change, both in the capabilities of the models themselves and the tooling that enabled a deep interaction with the CLI. I'd experimented with IDE plugin chatbots and code completion previously, but found it little better than simply asking questions in the web UI. The code completion was too annoying, too often wrong, and interfered with the language-server completions, so I turned it off. The genius of Claude Code was that it meets engineers where they are happiest and most productive, in the CLI. It also seems to play off the strengths of LLMs, in that they are fundamentally text-engines, and what could be more text based than a CLI?

I'd long been a fan of [Gene Kim](http://www.realgenekim.me/). His work on The State of DevOps reports, and his various books have hugely influenced the way the industry thinks about process and organization of software engineering. Nobody is better placed to speculate on how "vibe coding" will change software development. [Steve Yegge](https://steve-yegge.medium.com/) worked for both Amazon and Google. His writing on software engineering has been hugely influential. His famous [Google platform rant](https://gist.github.com/kislayverma/d48b84db1ac5d737715e8319bd4dd368) being a case in point. When I heard that the two of them had written a book about "Vibe Coding" I had to read it.

Interestingly, the very title of the book has caused a little controversy. [Simon Willison](https://simonwillison.net/) insists that the term "Vibe Coding" as originally coined by [Andrej Karpathy](https://karpathy.ai/) is the act of [building software with an AI agent without reviewing the code it writes](https://simonwillison.net/2025/Mar/19/vibe-coding/), but this book is about AI assisted coding with the human engineer very much in the loop. Willison would call this "agentic coding". Simply for consistency I'm going to stick with the "vibe coding" term for the rest of this review.

The book is split into four parts, each with a number of chapters. I'll review each part in turn and then sum up with my thoughts on the book and vibe coding in general.

## Part 1, Why Vibe Code?

A quick scan of software engineering social media will reveal a wide distribution of conflicting opinions about vibe coding. Many are incredibly cynical, arguing that it's responsible for churning out thousands of lines of unmaintainable and unreliable slop, while others say that it's going to fundamentally change software engineering. Kim and Yegge are very much in the latter group and they spend much of part one putting forward their arguments for why you should be too. They claim it can yield 10x productivity improvements and at the same time make the job of software engineer that much more rewarding and fun.

They introduce their FAAFO framework, a mnemonic for the benefits of vibe coding. I don't need to tell you that this is a play on the meme "Fuck Around And Find Out", which is ironic since it implies that playing around with vibe coding will have unfortunate consequences. It also implies a learning process, so apt in that way I guess. 

They reuse the acronym to stand for:

  * Fast: vibe coding will make writing code much faster, which...
  * Ambitious: allows you to be more ambitious...
  * Autonomous: and autonomous...
  * Fun: and have more fun while you're doing it.
  * Optionality: Because it's so much faster, you can try out different options with far less cost.

They also introduce their big metaphor - every big idea needs a big metaphor - and theirs is software engineering as a commercial kitchen. Rather than being a sous chef, responsible for your individual work, you are now a head chef managing a team of chef robots. This is all well and good, but I've never worked in a commercial kitchen and I had to look up "sous chef" to understand the metaphor. It kinda works though once you get up to speed with large scale cooking. I actually enjoyed the section about Escoffier’s kitchen brigade and the revolution in kitchen management in the 19th century.

There's a brief discussion of the question du-jour: will vibe coding tools make software engineers redundant? They cite previous technological innovations that have tended to create new jobs as well as making old ones obsolete. They think that the nature of our work as software engineers will change significantly and that you can either adapt or die.

Part 1 wraps up with some case studies and cautionary tales. The cautionary tales are interesting, but all to do with small personal projects, and possibly now out of date with current models. The two large scale case studies they give are far too early to really say anything conclusive about the impact of vibe coding on a software organisation as a whole. All they can do is give statistics for developer engagement and satisfaction, but not for any actual change in productivity. It was simply too early to tell in late 2024.

## Part 2: The theory and practice of vibe coding

Parts 2 and 3 are where they introduce practical hands-on skills. They feature a few gentle exercises in chat-bot vibe-coding which were interesting. I hadn't used Claude's artefacts widget before and it was cool to see simple JS games render. Also cool to see Claude fetch data from public APIs and render graphs and other visualisations. It's interesting that chatbots now often use tool-building strategies to answer questions rather than attempting to directly create the requested output.

There was a very good discussion about why overthinking "prompt-engineering" is probably a waste of time. Far better to enter into a trial and error session with a CLI coding agent than attempt to engineer a one-shot perfect prompt. It begs the question of how deeply one can engineer automated repetitive coding actions. This has implications for automating repetitive, but not-quite deterministic tasks. For example, could I engineer a prompt to introduce a new company's API into my (imaginary) API aggregation SaaS to the point where human interaction is no longer needed?

There is an excellent introduction to context window management, a key skill for effective agent usage. They discuss various strategies for avoiding exhausting the context window, such as limiting output token usage and avoiding CLI tools which produce excessive stdout responses. Here I learnt something genuinely new: that token usage grows quadratically with with the number of turns, because each turn in the conversation re-sends the entire context to the server. Obvious when one considers the stateless nature of LLM APIs. 

Also useful was a discussion on "hijacking the reward function", how coding agents can cut corners to achieve "success". They detail some common behaviours:

  * Deleting non-passing tests
  * Hard coding return values to match tests
  * Poor quality coding standards
  * Spaghetti code
  * Poor design / lack of refactoring

I've seen all these behaviours while using Claude. But one can use the reward function to one's advantage as well. Separating out sessions on the same feature, giving different aims to the agent each time, can be a very effective strategy. For example, start with red/green TDD. The first session designing function signatures and APIs, the second writing tests against these, the third writing the implementation, the fourth a refactoring, maybe a fifth taking in coding standards, or security reviews. Each one has a different aim, reward, and will yield different layered outcomes.

Another common anti-pattern is a kind of single-mindedness that doesn't mind blowing up bits of a codebase in order to fix one specific bug or issue. Understanding how reward functions work helps mitigate this. The training set is all the code on the internet. As Sturgeon's Law states: "90% of everything is crap"", and that's certainly true of human written code. It's not surprising that coding assistants sometimes reproduce it.

They wrap up with a discussion on good task decomposition and modularity. Aim to deliver working vertical slices of functionality. Here we see an ongoing theme in the book: that existing good software engineering practice becomes even more essential when vibe-coding.

## Part 3: The tools and techniques of vibe coding

Part 3 is somewhat of a continuation of Part 2, but now looking at various techniques in the framework of inner, middle, and outer development loops:

  * Inner loop: each individual (seconds to minutes) interaction with the coding assistant.
  * Middle loop: the loop of individual agent sessions. Tactical planning. Particularly the issue of how to manage context and "memory".
  * Outer loop: (weeks to months) strategic planning. Architecture, workflows, infrastructure.

Before they dive into the chapters on the different temporal loops, there's a brief discussion on MCP, IDEs and the different modalities for interacting with AI. Unfortunately it's all rather out of date now, but that's the risk of writing a book about such a rapidly changing field. Especially in the case of MCP, it's now clear that CLI tools and skills are often a better choice.

The chapters on the inner, middle, and outer loops are probably the best parts of the book. Here we get real practical guidance on effectively working with AI. Unsurprisingly much of the advice is simply reiterating good software development practice: TDD, good Git discipline, task decomposition, writing single-responsibility decoupled modules, delivering working slices of software. In many ways it becomes even more important to follow good practice with AI coding because with the fire-hose of code the feedback loop has to be automated and effective.

Our entire industry is rapidly evolving best practice for AI assisted coding, so this book is no more than a very early first draft, but much of the advice is good basic practice:

  * Plan first. Get your AI assistant to write an .md file with a plan. Break it down into smaller specific files as needed.
  * Document your rules and practices in a shared CLAUDE.md file (or whatever your agent of choice uses).
  * Do multiple pass sessions. Tests first, then implementation. Follow up with readability, refactoring, security, style sessions. These follow-on sessions are ideal background tasks for idle agents.
  * Use AI as a "rubber duck" to brainstorm different possible approaches.
  * Learn by watching AI work. A much overlooked benefit of agentic coding.

The outer loop discussion focusses on the bigger planning/architecture/infrastructure/process picture. Here Gene Kim's long experience shines through. Again, much of the advice is good practice even without an AI agent in sight:

  * Enforced modularity via APIs/interfaces. "Decoupled teams building decoupled software."
  * Agents auditing and integration testing in the CI pipeline.
  * Assessing risk; when it's OK to just let agents rip, vs a locked down heavily audited process.

## Part 4: Going Big: Beyond individual developer productivity

Part 4 is a discussion on how entire organisations can adopt and benefit from the AI revolution. Again we're firmly in "Gene Kim land" here and much of the advice is simply recycled from his previous work. No criticism implied, it's excellent work that anyone running a software development organisation should heed, it's simply that it's too early for any deep AI-specific lessons to have been learnt yet.

There's an important point made: that AI coding assistants are little help in a dysfunctional organisation. If your software is a legacy tangled mess, then AI is unlikely to help much. There's already some evidence, which they discuss, that AI productivity benefits are low for legacy systems. I learnt about Eliyahu Goldratt and his theory of constraints: "Any improvement not made at the constraint is an illusion." If AI is not addressing your constraints then it's of little value to you. Indeed, the code fire-hose will probably make things worse.

I liked the discussion on how leaders can encourage AI adoption by example and adding new KPIs such as token use. Identifying early AI adopters, "mavens", and setting them to work on a pilot project is one suggestion. Kim also suggests that a demonstration of AI skills should be incorporated into hiring decisions, as well as raising the importance of communication skills. We will no doubt see the emergence of new, unexpected, skills related to AI wrangling. Leaders should be on the lookout for these and be ready to identify and reward these new niche roles as they emerge.

## Thoughts.

This book was mostly written in 2024 and published in the spring of 2025. For that reason alone I probably wouldn't recommend it. The field is moving too fast. Too much is changing rapidly to make it worth your time to read several hundred pages of mostly out of date information. Indeed Steve Yegge himself is now saying that coding agents like Claude Code are very much an intermediate step and will soon be replaced by agent orchestration frameworks, such as his own [Gas Town](https://steve-yegge.medium.com/welcome-to-gas-town-4f25ee16dd04). Oddly the book reads more as an overview of pre-AI good software engineering practices; TDD, decomposition, single-responsibility, DevOps, etc. The most useful sections relevant to AI are on context management and iteration with different reward metrics; testing, implementing, refactoring, etc. But all these practices have evolved since the book was written, so you'd probably be better off reading the Claude Code documentation and following the leading AI bloggers. Having said that, it's a good foundation for the state of the art a year ago, so perhaps a good starting point. It is engaging, well written, and nicely structured, and I very much enjoyed reading it.

The book is somewhat schizophrenic about its readership. This is possibly because it's been authored by Gene Kim, a consultant, used to talking to a C-suite, engineering-adjacent audience, and Steve Yegge, an experienced engineer who has mostly written for other engineers. They both assume a professional knowledge of engineering tooling and practice, but at the same time miss opportunities to give useful hands-on practical details. The section on MCP is a good example, where a technical description of the protocol would have been very useful. Also a deeper technical discussion on model training vs context would have helped the reader build a mental model of how an LLM knows what it knows and produces what it does. I agree that I'm rather contradicting my earlier point about the book being out of date; technical details of protocols and model building are likely to age even more quickly than general recommendations, but if you're going to get a slightly historical foundation, then why not get it in a little more depth?

Now for some of my own reflections on vibe coding. As I write this in late February 2026, it feels as though we are in the knee of the curve, the inflection point. I've been using AI chat interfaces since the launch of ChatGPT, and a code agent (Codex, then Claude Code) for the last three or four months. I'm feeling a productivity boost, especially at small self-contained tasks, but I'm constrained by a lack of trust in the abilities of current agents. They still feel like a "leaky abstraction". I'm happy to use a compiler without checking the machine code it generates, but I'm not happy shipping code generated by Claude without properly reviewing it. I'm also not comfortable with giving a very high level broad goal and leaving the agent to plan and execute without supervision. My current practice is to break down work into small tasks via a planning session and then TDD my way to implementation, reviewing the work as it's generated. This is usually faster than typing the code myself, but not that much faster (I can type quite fast). Because current agents are leaky abstractions I am still the bottleneck, mostly because of the time it takes me to review and edit plans, and to read and comment on the generated code. I'll often hand code interfaces myself, simply to be clear on the module boundaries. 

There's also a clear issue of cognitive overload, or "cognitive debt" as coined by [Margaret-Anne Storey](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/), where the fire-hose of code overwhelms our human capability to understand it. Steve Yegge also writes about this in his [AI Vampire](https://steve-yegge.medium.com/the-ai-vampire-eda6e4f07163) post. The answer is obvious: we must stop reviewing AI code and build alternative ways of ensuring correctness. True "Vibe Coding", at least according to the Karpathy/Willison definition. It has to be done, but how soon I personally would feel comfortable doing this is the moot point. The skills required then become purely architectural and conceptual and require a massive industry-wide reorientation. Our value of existing software will inevitably change. I found [Dave Farley's developer survey](https://www.youtube.com/watch?v=b9EbCb5A408&sttick=0) very interesting on this point. It's clear that AI productivity is almost non-existent in large high-technical-debt legacy systems. This has two clear implications. First that there's a huge potential for poorly designed AI generated software systems to code themselves into a technical-debt black hole, and indeed there's plenty of anecdotal evidence that this is already happening. But secondly, it might now be cheaper to simply replace legacy systems with a rapidly generated, better-factored alternative. The possibilities for disruption are immense. Cheap software is "throw away" software.

On a more philosophical note, it's clear that we don't yet have good mental models for LLMs. We have two entities that we're familiar with and mostly understand: computers and humans. We're now very used to the deterministic nature of computers; what they are good at, what they can't do. We're also very good at reading and understanding other humans. But an LLM is something different. We mostly use our existing computer or human intuition to try to understand them, but neither model is a good match. If we apply computer expectations, we're constantly frustrated by their non-deterministic, random, behaviour. People complain endlessly about LLMs being "wrong" or inconsistent. It's a computer, how can it be bad at this deterministic task? On the other hand, it is tempting to treat LLMs as humans, especially since they often display very human-like behaviour; but again that's a mistake and soon leads to frustration. Far better to keep an open mind; treat the AI as something entirely new and as yet poorly understood. We need to learn their behaviour, in the same way that we've been learning over the last half-century how computing systems behave. Although I admit that this is not an easy task when the thing we're trying to understand is evolving so rapidly. 

Kim and Yegge mostly seem to use the "human" mental model for agentic coding tools. They describe the reader as "Head Chef", supervising a team of AI sous chefs. They think we will all migrate to being project managers and software architects. Perhaps this is a useful metaphor. I'm not entirely convinced.

It's an incredibly exciting time to be working in software. Everything is up for grabs, and nobody knows where this is all going. My take is that you'll only survive by diving into the whirlpool and enjoying the ride.
