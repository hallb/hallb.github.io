---
title: "Non-functional Requirements are Underappreciated"
date: 2014-04-29
tags: ["requirements", "non-functional requirements", "software development"]
image: "/img/i-proving.png"
draft: true
---


_recovered from https://i-proving.com/2014/04/29/non-functional-requirements-are-underappreciated/ via https://web.archive.org_

When I talk to people about non-functional requirements I often get the following responses:

- “Huh? I don’t know what you’re talking about.”
- “Oh yeah. Non-functional requirements…that’s performance, right?”
- “This is boring. Please stop talking.”

## Huh?

The quickest way to connect the dots from “huh” to “oh” is to recognize that non-functional requirements are indeed requirements. Like all requirements, they’re important things that the system must achieve. The functional requirements are “what” the system has to do, and the non-functional requirements are “how” the system is supposed to do it. Functional requirements are the application requirements while non-functional requirements are largely achieved by the architecture.

## More than just performance

Most non-functional requirements will fall into one of these six categories.[^1]

### 1 Performance

- Speed, latency, throughput
- Precision and accuracy
- Reliability, availability, fault-tolerance
- Capacity (e.g., volumes of data to be held or numbers of concurrent users)
- Longevity
- Scalability (consider most of the above and how much they may increase over the expected lifespan of the product)

### 2) Security

- Fraud and audit
- Immunity (what does the application do to protect itself from undesired use?)
- Access, authentication, and authorization
- Integrity (data corresponds to what was delivered by collaborating systems)
- Privacy

### 3) Operational and Environmental

- Product distribution and installation (consider partner integrations and collaborating systems)
- Product sale
- Release cycle (consider the expected frequency and impact of future releases of the product)
- Disaster recovery
- Integration points with collaborating systems

### 4)      Maintainability

- Maintenance
- Supportability and monitoring
- Adaptability and ongoing development (consider likely future changes. e.g., “this app should be readily ported to a Blackberry operating system”)

### 5) User Experience

- Appearance and branding
- Style and mood
- Ergonomics and usability
- Personalization
- Internationalization and other foreign market considerations
- Understandability
- Politeness and cultural considerations
- Accessibility

### 6) Legal

- Compliance with regulations
- Compliance with industry standards
- Certification from third parties
- Use of licensed components

## So what?

To reiterate: For the most part, the non-functional requirements are achieved via the architecture. I say “for the most part” because it’s arguable that UX and Legal concerns aren’t exactly what we normally think of as architectural concerns, but the rule is still useful.

Teams often have to decide between architectural directions. Sometimes this involves negotiation between different players with conflicting positions. For example, an architect might say, “this problem needs a rules engine”; a development manager might say, “we should be using Wicket for this project”; and a developer might say, “automated tests aren’t worth the cost.”[^2] It’s useful to think about how these positions relate to requirements because they can each be tied back to a benefit that the product owner should be able to make a decision about. In each of these examples, we are uncovering one or more non-functional requirements.

Going back to those examples, we might ask, “how does a rule engine relate to understandability for the users or performance or the release cycle“; “how does Wicket relate to the appearance or supportability of the application”; and, “how does testing relate to longevity and maintainability“? Looking at these architectural alternatives in the light of non-functional requirements will make the team think more deeply about the overall system requirements. In particular, the team can think about the relative priority of the various possible requirements and make informed decisions about trade-offs.

Again, returning to the examples: Possibly a rule engine will decrease throughput, but the increase in understandability to the users is worth the performance hit; Wicket might be a good choice, but it won’t be supportable by the PHP developers who are actually available to create the front end;  and maybe testing isn’t worth the cost because it’s an application that will only be used for a short term marketing campaign and then quickly thrown away therefore maintainability isn’t important (maybe).

## Measurability of requirements and KPIs

With all requirements, we want to have a clear definition of:

- the description,
- the rationale, and
- measurable criteria.

From an Agile development perspective, having measurable criteria is similar to having a definition of “done” for a story. In some cases, it may be a stretch to come up with measurable criteria for a non-functional requirement. Take user experience requirements such as “learnability”. To measure learnability, you can come up with criteria such as “75% of new users can create a new account in the system within 5 minutes.” This can be tested explicitly and in advance with test user groups.

In addition to up-front testing, these measurable criteria lead to metrics that should be gathered from your running system. For example, the “learnability” criteria might be tracked using a web analytics package.

A more obvious example comes from performance. A common requirement might be that “99% of responses to requests should take less than 1 second”. Clearly this would lead to set of test cases in an up-front performance test suite. However, this requirement would also lead us to include the appropriate telemetry and monitoring in the application so this key performance indicator can be tracked in production.

## What’s in a name?

Non-functional requirements are critically important to a project, but they are often taken for granted in the overall planning process by developers, team leads, and product owners. Try to address your system’s non-functional requirements early in your project and make them explicit in your development plan. Making these requirements explicit as soon as possible benefits everyone:

- The product owner gets information early enough to make necessary trade-offs between functional and non-functional requirements and avoids surprises at the end of the project.
- The development team thinks early and often about the non-functional requirements and therefore makes it part of the plan.
- The product owner can measure the success of the project by more than just the functional requirements.

Over the last year, I’ve found myself referring to the list of non-functional requirements a number of times and it’s given me a better appreciation for the poorly named non-functional requirement. I think it’s time to come up with a better name for them. Suggestions anyone?

 

[^1]: Adapted from Mastering the Requirements Process: Getting Requirements Right, 3rd Ed. Suzanne Robertson; James Robertson, 2012.

[^2]: Not a developer who works for Intelliware, but these people exist in the wild.
