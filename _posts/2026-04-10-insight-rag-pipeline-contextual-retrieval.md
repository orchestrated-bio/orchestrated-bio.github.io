---
layout: post
title: "The Retrieval Gap: Why Vector Search Fails Biomedical Research"
subtitle: "How we hit 96% citation survival using query fan-out and contextual chunking"
date: 2026-04-10
author: "Alex Nesta, PhD"
author_title: "CTO, Orchestrated Biosciences"
tags: [Engineering, RAG, Bioinformatics, AI-SEO]
description: "A technical breakdown of Insight's RAG pipeline, explaining how contextual retrieval and query fan-out solve the hallucination problem in cancer genomics."
image: /images/blog/building-insight.png
---

I recently ran a query on Insight about PDAC (pancreatic ductal adenocarcinoma) mutation hotspots. The answer looked perfect — until I checked the citation, which turned out to be about a completely unrelated cancer type.

I spent an hour assuming I had a bug in my orchestration code. I didn't. The code was fine; the retrieval was just bad. Standard vector search had matched on "hotspots" and "mutations" while ignoring the biological context. That's the Retrieval Gap.

We spent the last month closing it, moving from keyword matching to a pipeline optimized for citation survival. The trigger was noticing how accurate Google's AI citations had gotten — they're a search engine company, after all, and researchers like [Dani Shashko](https://github.com/danishashko/grounding-citation-analysis/blob/main/article/article.md) had recently reverse-engineered how they do it. We applied those ideas to the specific quirks of cancer genomics.

## Insight retrieves biomedical knowledge using contextual chunking, not keyword matching.

Standard RAG breaks documents into arbitrary pieces. These pieces often lose their meaning. A sentence saying "The results showed 90% survival" is useless alone. You need to know which study it belongs to. 

| Metric | Baseline RAG (Keyword/Vector) | Insight Contextual RAG |
|--------|-------------------------------|------------------------|
| **Citation Survival Rate** | 75.5% | 96.0% |
| **Avg. Latency Overhead** | +0ms | +100ms |
| **Retrieval Diversity (Jaccard)** | 0.12 | 0.45 |

We now use contextual chunking. Each chunk carries a summary of the whole paper. This ensures the embedding captures the global intent. It prevents the model from grabbing a PDAC result for a BRCA query.

## Query fan-out expands each search into multiple sub-queries before retrieval.

We no longer run just one search. We use "Query Fan-out." This technique reformulates the user's prompt into three distinct sub-queries:

- **Original query:** The user's literal input.
- **Entity-focused:** Targeting specific genes or proteins.
- **Cancer-focused:** Targeting the specific disease context.

These queries run in parallel. This captures a wider net of relevant papers. It ensures we don't miss a critical paper because of sparse vector space.

## Contextual retrieval improved Insight's citation survival rate from 75.5% to 96.0%.

In Insight, "citation survival" is a critical metric. It measures the health of our grounding pipeline. It is the hover-over UI that shows:

1. The retrieved RAG context.
2. The primary paper citation.
3. The NLP-based verification result.

If the verification fails, the citation "dies." We improved this rate from 75.5% to 96.0%. This was achieved by aligning our retrieval with [Anthropic's research on Contextual Retrieval](https://www.anthropic.com/news/contextual-retrieval). We now prioritize atomic factual claims over long paragraphs.

## Each chunk is embedded with its surrounding document context, not in isolation.

Isolated chunks are the primary cause of hallucinations. We now prepend a concise "context header" to every text chunk. This header includes the study title and the main goal. 

- This metadata is embedded with the text.
- It provides a stronger signal for vector search.
- It keeps the "PDAC" results away from "BRCA" queries.
- The model always knows the source of the data.

## Results are merged and deduplicated across sub-query retrievals.

Running three queries produces redundant results. We use a merging step to clean the data. We deduplicate results by PubMed ID (PMID). 

- We keep only the highest-scoring chunk per paper. 
- We re-rank the remaining chunks using a cross-encoder. 
- This ensures the top 3 results are diverse. 
- It prevents a single paper from dominating the answer.

## The Future: Do More with Less

We are currently training BioJEDI to handle this more efficiently. Developing a bullet-proof RAG pipeline requires many transformers. We found obvious overlap in our embedded content. 

BioJEDI will allow us to compress this knowledge. We want the same accuracy with lower compute costs. Accurate RAG is no longer a luxury in biotech. It is a requirement for scientific trust.

If you are building AI for science, stop trusting your vector database. Start measuring your citation survival.
