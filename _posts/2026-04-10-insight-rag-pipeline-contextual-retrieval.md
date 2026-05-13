---
layout: post
title: "The Retrieval Gap: Why Vector Search Fails Biomedical Research"
subtitle: "Notes on rebuilding Insight's retrieval pipeline around citation survival"
date: 2026-04-10
author: "Alex Nesta, PhD"
author_title: "CTO, Orchestrated Biosciences"
tags: [Engineering, RAG, Bioinformatics, AI-SEO]
description: "Why standard vector search hallucinates in cancer genomics, and how contextual retrieval and query fan-out fix it."
image: /images/blog/building-insight.png
---

I asked Insight about PDAC mutation hotspots last month. The answer read beautifully. The citation was about a completely unrelated cancer.

I burned an hour looking for a bug in my orchestration code before I realized the code was fine. Vector search had matched on "hotspots" and "mutations" and quietly thrown out the biology. That's the Retrieval Gap, and it's why most biomedical RAG demos fall apart the moment you actually check the sources.

Closing it took a month. The trigger was watching how rarely Google's AI Overviews hallucinate citations now — they're a search engine company, that's the whole job — and reading [Dani Shashko's reverse-engineering of how they pull it off](https://github.com/danishashko/grounding-citation-analysis/blob/main/article/article.md). The same ideas, adapted to the quirks of cancer literature, are what made Insight start telling the truth.

The core fix is contextual chunking. Standard RAG slices documents into arbitrary pieces and embeds each one in isolation, which works fine for product manuals and falls apart for science — "the results showed 90% survival" is a meaningless string without the study attached to it. We now embed every chunk together with a short header summarizing the paper it came from, so the vector itself carries the biological context. A BRCA query stops grabbing PDAC results not because we filter them out, but because they no longer look similar in the first place.

The second piece is query fan-out, an idea borrowed from the same Google work. A user's question rarely matches the language of the underlying papers, so before retrieval we reformulate it along separate axes — one targeting the genes involved, one the disease context — and run the searches in parallel. It costs a little latency. It catches the papers that a single embedding would have missed.

We measure all of this with what we call citation survival: for every answer, the cited paper is checked against the claim it supports, and if the verification fails the citation dies. It's the metric that finally let us tell whether a change to the pipeline was real or just vibes. The hover-over UI in Insight surfaces it on every answer, so users see the same signal we do.

None of this is novel research. It's [Anthropic's contextual retrieval](https://www.anthropic.com/news/contextual-retrieval) and Google's grounding work, applied carefully to a domain where the cost of a confident wrong answer is somebody's grant. The lesson, if there is one, is that in biotech you can't trust the vector store alone — you have to measure whether the citations hold up. Everything else follows from that.
