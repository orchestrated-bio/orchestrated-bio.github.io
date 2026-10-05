# DrugAdopt artifact walkthrough draft

This homepage draft shows a scientific result through the report, presentation, parameter record, and original publication. It uses a white canvas and spacious alternating text/preview rows inspired by the supplied Webistry screenshot. ConversionLab and Champ case studies informed the concise case introduction and prominent scientific finding. Styling is scoped to the DrugAdopt homepage; the existing static site, design tokens, and portable-artifact builder remain the implementation. The production source is `index.html`; there is no second site or new framework.

## Selected evidence

Selections come from the completed tolvaptan/ADPKD edition dated October 2026. Original deliverables remain unchanged. Only bounded renders and two literal code excerpts are included:

| Artifact | Selection | Purpose |
| --- | --- | --- |
| Report | Page 6, figure and caption | Keep the CRISP cohort, observation times, and missing uncertainty estimates attached to disease endpoints. |
| Report | Page 15, comparison table and qualification | Keep TEMPO and REPRISE estimates, populations, and analysis windows distinct. |
| Report | Page 22, plasma figure and caption | Show a conditional model with its covariates and reference-line meaning. |
| Slides | 4, 8, 11, 10 | V2 mechanism, adult outcomes, safety, and labeled predictions, each with a report locator. |
| Hero | Slide 8, clinical table and units | Present readable estimates while retaining a link to the whole slide. |
| Workbook | Summary!A5:F8, focal preview C5:F6 | TEMPO growth-rate contrast, units, and source-reported confidence limits; the enlarged range also includes the distinct filtration contrasts. |
| Workbook | Parameters!A1:E4, focal preview C1:E4 | Endpoint, arm estimates, contrast, and units; the enlarged range includes stable IDs. |
| Workbook | Sources!F1:G3, focal preview F1:F3 | Readable publication URLs; adjacent caption maps rows 2–3 to source IDs and access depth. |
| Quarto | orientation_efficacy_landscape.qmd, lines 14–23 | Retained figure annotations, publication identifiers, and input-record path. |
| Python | plot_tempo_labels.py, lines 21–27 | Retained conversion of arm interval bounds into plotted error bars. |

Slides use retained 1,600 × 900 renders from the completed deck. Report pages were rendered from the final PDF with Poppler at a 1,600-pixel long edge. Workbook ranges were rendered from the final XLSX with the bundled Artifact Tool, without changing or exporting that workbook. JPEG encoding uses quality 93 with no resizing. Preview crops use these pixel bounds on their genuine source renders (left, top, right, bottom):

| Preview | Source render dimensions | Crop bounds |
| --- | --- | --- |
| Report p. 6 | 1237 × 1600 | (115, 133, 1120, 788) |
| Report p. 15 | 1237 × 1600 | (115, 116, 1120, 540) |
| Report p. 22 | 1237 × 1600 | (115, 403, 1120, 1380) |
| Slide 8 hero and gallery | 1600 × 900 | (92, 332, 735, 755) |
| Slide 4 gallery | 1600 × 900 | (92, 330, 1508, 716) |
| Slide 11 gallery | 1600 × 900 | (93, 296, 1508, 794) |
| Slide 10 gallery | 1600 × 900 | (93, 315, 785, 749) |
| Summary focal preview | 1829 × 414 | (870, 0, 1829, 223) |
| Parameters focal preview | 2004 × 378 | (897, 0, 2004, 378) |
| Sources focal preview | 1505 × 318 | (0, 0, 1032, 318) |

Full selected report pages and full selected slides remain available through their enlarge controls. No entire client bundle is included.

| Original artifact | SHA-256 |
| --- | --- |
| Report.pdf | `b0aa7be8a7fe4352b50f7d8a50ce55f88db4a0f218fefa8cb222bbf0b324ae38` |
| Findings.pptx | `907dbdccfb938d120520d0ab0e8ef30a7ad34e1388885c7409b17bb1a215846d` |
| Evidence.xlsx | `ea51c6eb26505602d70ded951f0d498764fbac99e6c93a316c98b7f2b38e96ae` |

Client identity, cover pages, full downloadable deliverables, source datasets, and analysis history are excluded. Selected report pages and slides carry only DrugAdopt/Orchestrated branding. Workbook previews are images; citations in the surrounding page are functioning links.

## Verified TEMPO trace

The trace uses one source-reported adjusted contrast: −2.7 percentage points/year in annual kidney-volume growth, with 95% CI −3.3 to −2.1. Its locations are report §1.1.2/page 6, slide 8, and Parameters row 4 (`tempo_tkv_diff`). Parameters!L4:M4 hold the interval; AO4 holds PMID 23121377; AQ4 holds the publication URL; AR4 locates Results > Primary End Point. Summary row 6 carries the same value and interval.

The literal Quarto and Python excerpts are displayed for inspection. The Python excerpt plots the separate arm means and intervals; it does not fit the adjusted between-group contrast. Source arm means are 2.8 and 5.5%/year. The primary MRI analysis includes 1,307 of 1,445 randomized participants. The trial selected adults aged 18–50 with baseline kidney volume ≥750 mL and estimated creatinine clearance ≥60 mL/min. This evidence does not establish individual response prediction.

## Interaction and review

Readers control the three artifact viewers through named selectors, previous/next controls, and Arrow/Home/End keys. Images remain direct links without JavaScript. A native dialog offers Fit and Read detail, including the full page or slide when its preview is cropped. Escape or Close restores focus to the opener.

The trace begins in a stable Report state. Play advances through its four steps once, at four-second intervals; Pause and manual selection stop it. Hidden-tab changes stop playback. Reduced-motion users receive manual steps with no transitions. Native details reveals the retained code. Code is not executed on this page.

The homepage uses an 82rem shell. Desktop rows alternate a large foreground excerpt with concise copy and three icon benefits. Genuine selected renders form the decorative background layers, with empty alt text and aria-hidden; the foreground alone carries reading content. Below the existing 60rem breakpoint, rows become a linear copy/preview sequence and decorative layers disappear. Narrow viewports retain readable image dimensions inside keyboard-scrollable regions, with a pan hint and enlarge control. Captions retain the central values and limits as selectable text. Controls have at least 44px targets. Lower-page images are lazy-loaded with explicit dimensions; the small hero table crop has high fetch priority.

Preview from this worktree using `python3 -m http.server 8773 --bind 127.0.0.1` and `http://127.0.0.1:8773/`. Rebuild the same-source portable review artifact with `python3 concepts/asset-diligence/build_artifact.py`.

The portable builder skips non-executable metadata scripts when assembling JavaScript. Its home route uses the same light styling and removes the homepage class when another route is selected.

Targeted verification includes local links/anchors, dimensions/alt text, deterministic crop-byte comparisons, exact source-code excerpts, unchanged deliverable hashes, JavaScript syntax, and portable builds. Root browser review covers the revised desktop/mobile composition and controls. IAB viewport overrides and screenshot coordinates are inconsistent; measured CSS sizes are recorded separately from requested dimensions, and some captures are clipped.

This is a local draft. Publication remains pending Alex's review of the selected excerpts, code snippets, scientific framing, and attribution scope. No deployment, push, or PR is part of this draft handoff.

## Browser review evidence

Root review confirmed the light desktop composition, readable scientific tables/figures, and no observed copy/image overlap. Desktop gallery selection, full report rendering (1237 × 1600), Read detail, and Escape focus return passed. Workbook End selected Sources 3/3 with the correct publication IDs and access depth. The trace progressed through Source and stopped; parameter selection and native code disclosure worked.

Final desktop review measured 1600 × 900 CSS pixels. Local captures are saved in the ignored `test-results/drugadopt-walkthrough/` directory as `desktop-light-20261005.jpg` and `slide-layout-light-20261005.jpg`. The latter is a crop of an actual page capture retaining the full slide row. Browser targeting/zoom explains the inconsistent earlier requested/measured viewport sizes; no site overflow was observed.

At measured 390 × 843 CSS pixels, the menu opened/closed, trace selection worked, and the code disclosure used one column with document scrollWidth 371. The workbook reading region was 329px wide with 760px content; ArrowRight panned it to scrollLeft 35. This verifies a narrow layout and keyboard panning, not a physical-device test. Earlier requested viewport sizes differed from measured sizes because of IAB zoom/capture behavior.

The portable review file includes DrugAdopt, Insight, the existing example report, and Company. Links to Custom analysis, Privacy, and Terms open their existing public pages; the data-handling link opens the Company section in the same portable file.
