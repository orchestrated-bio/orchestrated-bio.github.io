# DrugAdopt artifact walkthrough draft

The company pages now default to a soft off-white canvas, with muted green accents. The DrugAdopt homepage uses alternating text/preview rows inspired by Alex's Webistry screenshot and the supplied ConversionLab and Champ case studies. The implementation remains the existing static site: `index.html`, scoped CSS, reader controls, and the existing portable-artifact builder.

## Report hero and four-card source view

The interactive HTML reader now sits in the opening hero beside “Understand the evidence for your drug.” Its seven sections remain reader-controlled. Desktop typography is 17px; the report scrolls within its frame. On phones, the section buttons form a horizontal strip and the report expands into the page.

The finding walkthrough now shows four vertical cards together: Report, Slide deck, Spreadsheet, and Code & source. The report card uses the original trial figure and rates. The spreadsheet card presents the retained Parameters rows 2–4 in a readable two-column layout; the original labels and values remain available in the larger worksheet preview. The code card retains the original Quarto/Python excerpt and publication link. The Slide 8 and Parameters links select those exact views in the larger galleries.

The former hero rotation, walkthrough switcher, status announcements, and separate code disclosure are removed, including their unused JavaScript and CSS. The angled cards remain on the larger report, slide, and workbook galleries. Repeated topic descriptions and the extra report-topic/modality list were removed. The report builder refreshes the marked reader in place, preserving its hero position on rebuild.

Checks covered all seven report selections, image loading, slide detail and Escape focus return, precise gallery links, and the 390px mobile layout without horizontal page overflow. Four columns were checked on desktop. All 194 local file/anchor references resolve across the five main pages. Full HTML report and figure bytes match the prior commit; original code and worksheet values match their retained sources. JavaScript/Python syntax, whitespace checks, prose review, and the existing portable build completed. The portable file is 8.49 MB. Screenshots are in `test-results/drugadopt-walkthrough/design-review/`.

## Earlier visual refinement (superseded above)

The latest revision removes visible enlargement links, playback, repeated viewing instructions, redundant preview descriptions, and the generic feature lists. Images themselves open the reading dialog. The section descriptions name scientific topics instead of generic document features. The Quarto/Python disclosure is retained with its literal code unchanged.

The hero fades between five views: the original binding figure, a kidney single-nucleus UMAP, a report excerpt, a complete slide, and a reflowed spreadsheet selection. It advances every nine seconds with a 1.8-second fade. Hover and focus pause rotation, manual selection stops it, and reduced-motion users receive manual selection. Offscreen and hidden-tab rotation pauses.

Alex requested the layered preview cards back. The hero and all three artifact galleries now show two angled cards behind the front preview. They are buttons: selecting an exposed card brings that view forward. Keyboard activation works too. The main image keeps its full fitted frame.

The interactive HTML report sample is restored below the report-to-source walkthrough. Its seven section buttons cover Overview, Disease biology, Mechanism, Clinical results, Exposure, Safety, and IP landscape. Each excerpt links to the matching full-report anchor. `report.html` now presents the completed tolvaptan–ADPKD scientific report, replacing the old prexasertib example on this route. The homepage and full reader share the same report projection and the existing navigation scripts.

The report projection uses the completed package's `_bundle.qmd`, because its retained `_reader.html` contains older overview wording. Installed Pandoc converts the Markdown without executing analysis code. The existing website builder gains a case-specific `--tolvaptan-qmd` mode; this is a website projection, not a new DrugAdopt case renderer. Fourteen figure files are copied unchanged. `images/drugadopt/tolvaptan/report/projection-sources.json` records the input and figure hashes, three requested wording corrections, and the omission of internal run/provenance and client-package download sections. Scientific body sections, estimates, and public citations are retained. The preview selects the report's readable introduction for biology, mechanism, clinical results, and safety, plus the relevant figures or tables.

Rebuild the reader and homepage excerpt with `python3 scripts/build_report_page.py --tolvaptan-qmd <completed-package>/reproducibility/case/report/_bundle.qmd --out report.html`. This operator command uses installed Pandoc and BeautifulSoup. Refresh CSS/JS cache hashes when changing styles, then rebuild the existing portable artifact. Its main-element lookup now accepts valid HTML attribute order, including the order emitted by the HTML serializer.

Company and Custom Analysis use the shared light background throughout. Insight's illustrated phone, desktop workspace, and notebook now use the same pale surfaces, dark text, and muted accents. No live Insight application was changed. Browser checks covered the new reader's section switching, preview-to-report anchors, direct pointer activation of an exposed card, keyboard activation, and page overflow at a 390px viewport. The full reader, Company, and Custom Analysis also stayed within that viewport. Temporary browser viewport overrides were reset.

Report previews show the useful upper portion of each page in a landscape frame. The report-to-source view shows the corresponding paragraph on page 6. A click opens the complete original page. Slides retain their full frame and report locator.

The spreadsheet previews are SVG layouts of the original cell values, with more readable column widths and row heights. They are website views, not edits to the XLSX. Selections are Summary!A5:F8, Parameters!A1:E4, and Sources!A1:E5. The read-only builder checks the source workbook hash before and after extraction.

The new UMAP plots all 102,710 published coordinate pairs in GSE185948_metadata_RNA.csv.gz using the authors' 15 cell labels. It is a descriptive cell map from the completed single-nucleus follow-on. It does not introduce a treatment-response analysis. Only the rendered figure and a small source record are retained on the website.

`images/drugadopt/tolvaptan/preview-sources.json` records the original selected workbook values, workbook SHA-256, UMAP input SHA-256, count, and labels. `scripts/build_drugadopt_previews.py` regenerates these website images from retained inputs. It uses existing local Python plotting/image libraries; the bundled runtime lacks Matplotlib. No packages or client files were changed.

The homepage and Company page were checked with the system still requesting dark mode: both render the shared off-white background. The company styles default to light across routes; the existing explicit data-theme palettes remain available. Desktop and narrow-viewport checks covered image fitting, workbook wrapping, direct click-to-open, keyboard focus return, source disclosure, reduced motion, and automatic hero rotation. Narrow layouts had no horizontal page overflow. The website builders read source files without writing to the client deliverables. The portable artifact was rebuilt with the existing builder.

Screenshots and before/after prose scans are in the ignored `test-results/drugadopt-walkthrough/design-review/` directory. This is a local review draft, without a push or deployment.

## Earlier October 5 revisions (superseded where described above)

- The hero uses the retained molecular-binding figure instead of a clinical table. The image is byte-identical to `report/receptor-pocket.png` in the completed reproducibility package. It shows the observed tolvaptan pocket and a comparison with docking run 2. The caption distinguishes the observed structure from the computation and links to PDB 9U81.
- The former four-box text strip and progress line have been replaced by a visual stage. Readers switch between the report page, full slide, selected workbook range, and retained Quarto excerpt with the publication link. Optional playback advances once, with a short reveal transition. Manual selection stops playback; hidden tabs stop it; reduced-motion users receive manual controls without animation.
- Report and slide galleries now show complete pages and slides. Workbook previews show complete selected ranges. The default page has no forced horizontal panning. Fit and Read detail remain available in the enlargement dialog.
- Headings and captions explain the role of each artifact. Detailed endpoint names, estimates, identifiers, and assumptions remain in the artifacts and expandable source code.

## Retained selections

| Artifact | Selection | Purpose |
| --- | --- | --- |
| Report | Full pages 6, 15, 22 | Disease endpoints, clinical comparisons, and exposure modeling. |
| Slides | Full slides 4, 8, 11, 10, 6 | Mechanism, clinical outcomes, safety, predictions, and receptor structure. |
| Hero | Binding figure, published UMAP, report excerpt, slide, workbook | Five views of the case. |
| Workbook | Summary!A5:F8 | Selected clinical estimates and confidence intervals. |
| Workbook | Parameters!A1:E4 | IDs, endpoints, values, and units. |
| Workbook | Sources!A1:E5 | Publication identifiers, authors, years, and titles. |
| Quarto | orientation_efficacy_landscape.qmd, lines 14–23 | Retained figure annotations, publication identifiers, and input path. The stage displays selected literal lines from this excerpt. |
| Python | plot_tempo_labels.py, lines 21–27 | Retained conversion of arm interval bounds into plotted error bars. |

Slides use retained 1600 × 900 renders from the completed deck. Report pages were rendered from the final PDF with Poppler at a 1600-pixel long edge. Workbook ranges were rendered from the final XLSX with the bundled Artifact Tool. Earlier tightly cropped preview images are superseded; the current page uses the complete selected renders.

The source-reported clinical contrast can be found in report §1.1.2/page 6, slide 8, and Parameters row 4 (`tempo_tkv_diff`). Parameters!L4:M4 contain the interval, AO4 the source ID, AQ4 the publication URL, and AR4 the source locator. The plotting excerpt draws the separate arm means and intervals. The adjusted between-group contrast is retained separately. Code is displayed for inspection and is not executed on the page.

## Source preservation

| Original artifact | SHA-256 |
| --- | --- |
| Report.pdf | `b0aa7be8a7fe4352b50f7d8a50ce55f88db4a0f218fefa8cb222bbf0b324ae38` |
| Findings.pptx | `4a1ebd32c6c67f1698c643e06f45872323beab612c148f8c68b9167be82257a8` |
| Evidence.xlsx | `ea51c6eb26505602d70ded951f0d498764fbac99e6c93a316c98b7f2b38e96ae` |

These hashes were read from the completed `tolvaptan-specialist-refined-20261005` package at closeout. The PDF and workbook match the prior source record; an earlier draft note carried a different PPTX hash, so the table now records the current completed package. The website work did not edit these files. The website includes bounded public-evidence selections; client identity, cover pages, full downloadable deliverables, source datasets, and analysis history are excluded. Selected pages and slides carry DrugAdopt/Orchestrated branding.

## Interaction and verification

Readers control the galleries and walkthrough through named buttons and Arrow/Home/End keys. Without JavaScript, previews and source links remain available. A native dialog offers Fit and Read detail. Escape or Close restores focus to the opener. Native details expands the literal Quarto and Python excerpts.

Desktop review measured 1600 × 900 CSS pixels. The stage switched the visible artifact through all four views; playback completed at Code & source and stopped. Gallery controls, source disclosure, and enlargement worked. All visible images loaded. The full selected slide stays in view, including its heading and report reference.

Narrow review measured 390 × 843 CSS pixels. The stage uses a single column. Document scrollWidth was 390px. The workbook fit preview stayed within the page; Read detail expanded to its native 2004px width inside the dialog. Escape closed the dialog and returned focus to the correct opener. Keyboard End selected Code & source. This is browser viewport testing, not a physical-device test.

Source checks passed for local files/anchors, duplicate attributes, selected image dimensions/alt text, literal code excerpts, the byte-identical molecular figure, and original deliverable hashes. JavaScript syntax and `git diff --check` passed. The existing portable builder completed. Browser capture coordinates use IAB's zoomed coordinate system; actual CSS viewport measurements are recorded above.

The final browser screenshot is saved in the ignored `test-results/drugadopt-walkthrough/visual-walkthrough-20261005.jpg` directory. It shows the new stage and source disclosure in desktop context.

Preview: `http://127.0.0.1:8773/`. Rebuild the same-source portable artifact with `python3 concepts/asset-diligence/build_artifact.py`. The portable file includes DrugAdopt, Insight, the tolvaptan example report, and Company; links to Custom analysis, Privacy, and Terms open their existing public pages.

This remains a local draft for review. No push, PR, deployment, or client-file modification is included.

## Copy review with de-ai-slop

The homepage copy was edited with the refined de-ai-slop skill. The review covered headings, section descriptions, captions, reading controls, accessibility text, and metadata. Generic slogans and internal terminology were replaced with direct descriptions of what a reader can learn or look up. For example, “One finding, from explanation to evidence” became “Where the numbers come from.” “Values and units stay attached to stable identifiers” became “Recorded values and units, with an ID for each entry.”

Before/after scans of the source and extracted prose were followed by a manual reading of each section. The original draft already had short sentences, so sentence-length scores did not expose the vague headings. The remaining technical terms name actual methods, fields, and statistical quantities. Lists of formats and scientific topics were retained where they help the reader.

Checks confirmed identical displayed numbers, quoted code, source and image links, and anchor IDs. Captions were checked against the selected renders. The source-list caption describes full-paper versus abstract access; the code panel describes plotting the published trial values. The portable review file was rebuilt. Desktop and narrow-screen review confirmed that the revised copy wraps within its panels and that the code disclosure still opens.

Review files and screenshots are in the ignored `test-results/drugadopt-walkthrough/copy-review/` directory. The edited homepage remains the same local review draft.
