---
title: "Book Review: Team Topologies by Skelton and Pais"
date: 2022-04-29
draft: false
author: Mike Hadlow
---
This is my book review of [Team Topologies](https://teamtopologies.com/) by Matthew Skelton and Manuel Pais. 

[Conway's Law](https://en.wikipedia.org/wiki/Conway%27s_law), coined by computer scientist Melvin Conway states:

> Any organization that designs a system (defined broadly) will produce a design whose structure is a copy of the organization's communication structure.

This book is a distillation of Skelton and Pais's experiences helping teams execute the "reverse Conway maneuver"; using the insight of Conway's law to structure teams more effectively for software delivery. They present a framework and taxonomy for thinking about teams and their interactions that is immensely helpful for anyone tasked with creating a software organization.
<!--more-->
I have a background in social science with an undergraduate degree in development studies. I've been interested in the sociology and anthropology of software development for a while now, and wrote about team structure in [Decoupled Software And Teams](http://mikehadlow.blogspot.com/2018/11/decoupling-architecture-and-teams.html) back in 2018. We as technologists tend to focus solely on our tools, but as important as they are, it's the interaction between us humans, the tools, and our social context that come together to produce software systems. I like Skelton and Pais's description of this fusion as "sociotechnical". This book puts the human at the heart of the software development effort.

The book kicks off with a discussion of how traditional org-charts often don't capture the reality of communication patterns within an organization. It describes Conway's law and some of the pathologies of traditional IT organization, especially the tendency to structure by technical function, such as having separate DB, front-end, back-end, QA, support, and operations groups, and how that means that a single business requirement or stream of work requires extensive and inefficient communication between teams. This is aggravated by teams having misaligned incentives: The back-end team wants to ship features, the QA team wants to find bugs, and the support team wants to avoid any changes that impact stability. One core takeaway from this discussion is that more communication is not necessarily a good thing. Good team organization creates decoupled teams that need to communicate less.

There's a good deal of team sociology discussed, especially around [Dunbar's number](https://en.wikipedia.org/wiki/Dunbar%27s_number). Teams should be long-lived and have around 5 people. Frequently moving people between teams, or continually breaking up and reforming teams is counter productive. They also introduce the concept of team cognitive load. Teams should not be overloaded, and especially not with multiple unrelated tasks. Maintaining one complex subsystem is a good task for a single team.

The meat of the book, and it's greatest value to anyone creating organizations to build software, is their taxonomy of team types, "topologies", and their interaction modes. Skelton and Pais describe four fundamental team topologies:

1. Stream-aligned team.
2. Enabling team.
3. Complicated-subsystem team.
4. Platform team.

They discuss how any team can be described as one of these four types. Stream-aligned teams are focused on business delivery. Enabling teams support technical architecture, tools and technologies and are servants of the stream-aligned teams. Complicated-subsystem teams encapsulate hard to acquire knowledge (such as a mathematical model for example). Platform teams provide a self-service infrastructure to support the stream-aligned teams. Ideally 90% of teams should be stream-aligned. Enabling and complicated subsystems teams are optional. 

There is much discussion of how to migrate traditional team types to the four-topologies model, for example:

* Infrastructure teams to platform teams.
* Technical layer (e.g. DBA) teams to stream-aligned or enabling teams.
* Support teams to stream-aligned teams embedded with developers.
* Architecture teams better organized as a part-time guild of stream-aligned team developers.

Any reverse Conway maneuver by definition is a combination of team reorganization and software architecture migration. They devote a chapter to identifying monolithic software and finding seams, or "fracture planes" to break it up. Again they emphasize that the resulting pieces should be "team sized".

As important as the four team topologies themselves is the taxonomy of three distinct team interaction modes:

1. X-As-A-Service. One team provides a service to another team. Long lived. Decoupled.
2. Collaboration. Two teams work together for innovation and rapid discovery. Short lived. Highly coupled.
3. Facilitating. One team trains/mentors another team to adopt a new technology or technique. Short lived. Highly coupled.

Each of the fundamental team types described above: stream-aligned, enabling, complicated-subsystem, and platform, has typical interaction modes described in the following table:

| Team Type | Collaboration | X-as-a-service | Facilitating |
|---|---|---|---|
| Stream Aligned | Typical | Typical | Occasional |
| Enabling | Occasional | | Typical |
| Complicated Subsystem | Occasional | Typical | |
| Platform | Occasional | Typical | |

Having this clearly articulated taxonomy of team types and interaction modes is hugely useful to anyone thinking about software organization structure and it is what makes this book such an essential read.

The final chapter discusses various techniques to discover and evolve teams and their  interaction modes. The greatest wisdom here is that this should not be static and imposed from above, but organic, evolutionary, and driven by "organizational sensing". The "meta organization", which I guess normally falls under the heading of "culture", should encourage this:

> "The most important thing is not the shape of the organization itself but the decision rules and heuristics used to adapt and change the organization as new challenges arise; that is we need to design the design rules, not just the organization."

In summary I'd very much recommend this book to anyone tasked with organizing a software development organization, and indeed anyone working in software development. It's especially useful in that it presents a framework that anyone can use to both think and communicate about teams. The strategies it presents for moving from more traditional organization structures to a stream aligned style would also be essential reading for anyone attempting this transformation. It's quite a short book, always a good thing in my opinion, and an easy read. Definitely worth your time!
