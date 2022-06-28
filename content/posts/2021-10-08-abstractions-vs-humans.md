---
title: "Abstractions vs Humans"
date: 2021-10-08
draft: true
author: Mike Hadlow
---

My premise: That with each new layer (or level) of abstraction (what do I mean by this?) a programming language provides means you will lose a percentage of people who can use it (an arbitrary guess is 80% for example).

Simple model of an 'abstraction' is where a concrete value is replaced by a variable. The age 11 move from arithmetic to algebra.

so variables `var x = 10;`

generics `List<T>`

type classes `M<T>` (need to re-read Haskell sources to make sure I get this right)

Possibly also include recursion?

[Dom Syme's GitHub comment on Type Classes](https://github.com/fsharp/fslang-suggestions/issues/243#issuecomment-916079347)
I think Dom misunderstands his core audience for F#, and that he should introduce type classes.

[Joël Quenneville blog post on Dom's comment](https://thoughtbot.com/blog/who-is-empowered-by-your-design)
Very good model of skill floor and ceiling skill levels.

[Study shows that Rust's type based memory management 'harder' then using a GC](https://arxiv.org/abs/2110.01098)
Specific study of a language feature tradeoffs. Discussed on Hacker News [here](https://news.ycombinator.com/item?id=29659689)