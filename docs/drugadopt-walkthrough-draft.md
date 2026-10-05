# DrugAdopt artifact walkthrough draft

The DrugAdopt homepage uses a white canvas and alternating text/preview rows inspired by Alex's Webistry screenshot and the supplied ConversionLab and Champ case studies. The implementation remains the existing static site: `index.html`, scoped CSS, reader controls, and the existing portable-artifact builder.

## October 5 review revisions

- The hero uses the retained molecular-binding figure instead of a clinical table. The image is byte-identical to `report/receptor-pocket.png` in the completed reproducibility package. It shows the observed tolvaptan pocket and a comparison with docking run 2. The caption distinguishes the observed structure from the computation and links to PDB 9U81.
- The former four-box text strip and progress line have been replaced by a visual stage. Readers switch between the report page, full slide, selected workbook range, and retained Quarto excerpt with the publication link. Optional playback advances once, with a short reveal transition. Manual selection stops playback; hidden tabs stop it; reduced-motion users receive manual controls without animation.
- Report and slide galleries now show complete pages and slides. Workbook previews show complete selected ranges. The default page has no forced horizontal panning. Fit and Read detail remain available in the enlargement dialog.
- Headings and captions explain the role of each artifact. Detailed endpoint names, estimates, identifiers, and assumptions remain in the artifacts and expandable source code.

## Retained selections

| Artifact | Selection | Purpose |
| --- | --- | --- |
| Report | Full pages 6, 15, 22 | Disease endpoints, clinical comparisons, and exposure modeling. |
| Slides | Full slides 4, 8, 11, 10, 6 | Mechanism, clinical outcomes, safety, predictions, and receptor structure. |
| Hero | Full receptor-pocket.png | Molecular evidence from the report. |
| Workbook | Summary!A5:F8 | Selected clinical estimates and confidence intervals. |
| Workbook | Parameters!A1:E4 | IDs, endpoints, values, and units. |
| Workbook | Sources!F1:G3 | Publication links and access depth. |
| Quarto | orientation_efficacy_landscape.qmd, lines 14–23 | Retained figure annotations, publication identifiers, and input path. The stage displays selected literal lines from this excerpt. |
| Python | plot_tempo_labels.py, lines 21–27 | Retained conversion of arm interval bounds into plotted error bars. |

Slides use retained 1600 × 900 renders from the completed deck. Report pages were rendered from the final PDF with Poppler at a 1600-pixel long edge. Workbook ranges were rendered from the final XLSX with the bundled Artifact Tool. Earlier tightly cropped preview images are superseded; the current page uses the complete selected renders.

The source-reported clinical contrast can be found in report §1.1.2/page 6, slide 8, and Parameters row 4 (`tempo_tkv_diff`). Parameters!L4:M4 contain the interval, AO4 the source ID, AQ4 the publication URL, and AR4 the source locator. The plotting excerpt draws the separate arm means and intervals. The adjusted between-group contrast is retained separately. Code is displayed for inspection and is not executed on the page.

## Source preservation

| Original artifact | SHA-256 |
| --- | --- |
| Report.pdf | `b0aa7be8a7fe4352b50f7d8a50ce55f88db4a0f218fefa8cb222bbf0b324ae38` |
| Findings.pptx | `907dbdccfb938d120520d0ab0e8ef30a7ad34e1388885c7409b17bb1a215846d` |
| Evidence.xlsx | `ea51c6eb26505602d70ded951f0d498764fbac99e6c93a316c98b7f2b38e96ae` |

Original deliverables are unchanged. The website includes bounded public-evidence selections; client identity, cover pages, full downloadable deliverables, source datasets, and analysis history are excluded. Selected pages and slides carry DrugAdopt/Orchestrated branding.

## Interaction and verification

Readers control the galleries and walkthrough through named buttons and Arrow/Home/End keys. Without JavaScript, previews and source links remain available. A native dialog offers Fit and Read detail. Escape or Close restores focus to the opener. Native details expands the literal Quarto and Python excerpts.

Desktop review measured 1600 × 900 CSS pixels. The stage switched the visible artifact through all four views; playback completed at Code & source and stopped. Gallery controls, source disclosure, and enlargement worked. All visible images loaded. The full selected slide stays in view, including its heading and report reference.

Narrow review measured 390 × 843 CSS pixels. The stage uses a single column. Document scrollWidth was 390px. The workbook fit preview stayed within the page; Read detail expanded to its native 2004px width inside the dialog. Escape closed the dialog and returned focus to the correct opener. Keyboard End selected Code & source. This is browser viewport testing, not a physical-device test.

Source checks passed for local files/anchors, duplicate attributes, selected image dimensions/alt text, literal code excerpts, the byte-identical molecular figure, and original deliverable hashes. JavaScript syntax and `git diff --check` passed. The existing portable builder completed. Browser capture coordinates use IAB's zoomed coordinate system; actual CSS viewport measurements are recorded above.

The final browser screenshot is saved in the ignored `test-results/drugadopt-walkthrough/visual-walkthrough-20261005.jpg` directory. It shows the new stage and source disclosure in desktop context.

Preview: `http://127.0.0.1:8773/`. Rebuild the same-source portable artifact with `python3 concepts/asset-diligence/build_artifact.py`. The portable file includes DrugAdopt, Insight, the existing example report, and Company; links to Custom analysis, Privacy, and Terms open their existing public pages.

This remains a local draft for review. No push, PR, deployment, or client-file modification is included.
