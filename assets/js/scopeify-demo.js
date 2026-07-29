(function () {
    const form = document.getElementById('scopeify-form');
    if (!form) return;

    const hypothesis = document.getElementById('scopeify-hypothesis');
    const exampleButton = document.getElementById('scopeify-example');
    const statusPill = document.getElementById('scopeify-status-pill');
    const briefTitle = document.getElementById('scopeify-brief-title');
    const decision = document.getElementById('scopeify-decision');
    const summary = document.getElementById('scopeify-summary');
    const metrics = document.getElementById('scopeify-metrics');
    const sowTitle = document.getElementById('scopeify-sow-title');
    const sowWindow = document.getElementById('scopeify-sow-window');
    const sowGrid = document.getElementById('scopeify-sow-grid');
    const lastChecked = document.getElementById('scopeify-last-checked');
    const auditTable = document.getElementById('scopeify-audit-table');
    const criteriaList = document.getElementById('scopeify-criteria-list');
    const shortlistCount = document.getElementById('scopeify-shortlist-count');
    const evidenceList = document.getElementById('scopeify-evidence-list');
    const boundaryList = document.getElementById('scopeify-boundary-list');
    const downloadButton = document.getElementById('scopeify-download');
    const downloadNote = document.getElementById('scopeify-download-note');

    const reports = {
        neuro: {
            title: 'GLP-1 / cocaine reward-circuit scope',
            status: 'Conditional',
            decision: 'Promising, but indirect',
            confidence: 'Medium',
            found: 113,
            screened: 35,
            selected: 4,
            summary: 'A direct public dataset matching GLP-1 agonist treatment, cocaine exposure, and mouse brain transcriptomics is not the likely starting point. The stronger path is a feasibility package that triangulates cocaine-conditioned nucleus accumbens transcriptomics with GLP-1 cocaine-seeking mechanism papers, then decides whether the signal is strong enough for custom analysis.',
            searchLabel: 'Demo screen across PubMed, GEO, SRA, and bioRxiv',
            sowTitle: 'Feasibility package for indirect public-data analysis',
            sowWindow: '10 business days, matrix-first; raw SRA reprocessing scoped separately',
            sow: [
                { label: 'Objective', value: 'Decide whether public mouse reward-circuit data can support a GLP-1 / cocaine transcriptomic hypothesis.' },
                { label: 'Deliverables', value: 'Excel-ready inventory, accession map, metadata QC, feasibility memo, and go/no-go analysis plan.' },
                { label: 'Analysis path', value: 'Start with GEO matrices and linked SRA records; use GLP-1 literature for perturbation interpretation.' },
                { label: 'Stop condition', value: 'If live search finds no direct or defensible indirect cohort, recommend against a full analysis.' }
            ],
            sources: [
                { source: 'PubMed', query: 'GLP-1 receptor agonist, exendin-4, cocaine seeking, reward circuitry', found: 58, screened: 16, selected: 2, note: 'Mechanism papers and citation trail' },
                { source: 'GEO', query: 'mouse cocaine nucleus accumbens VTA RNA-seq snRNA-seq transcriptomics', found: 21, screened: 8, selected: 1, note: 'Reusable expression matrices' },
                { source: 'SRA', query: 'linked runs for selected GEO cocaine brain studies', found: 27, screened: 8, selected: 1, note: 'Raw-data feasibility and run metadata' },
                { source: 'bioRxiv', query: 'GLP-1 VTA GABA cocaine seeking preprint transcriptomics', found: 7, screened: 3, selected: 0, note: 'Recent evidence, publication-status check' }
            ],
            criteria: [
                'Selected records must connect to reward circuitry, cocaine exposure, public accessions, or GLP-1 mechanism evidence.',
                'Dataset records were favored over narrative papers when expression matrices, raw reads, sample metadata, or BioProject links were visible.',
                'The brief separates directly analyzable datasets from interpretation-only papers so the client can see what can actually be computed.'
            ],
            evidence: [
                {
                    fit: 'Primary dataset',
                    source: 'GEO',
                    id: 'GSE210850',
                    title: 'NPAS4 controls cell type-specific circuit adaptations underlying drug-seeking behavior',
                    year: 'Public 2023; citation PMID 39117647',
                    cohort: 'Mouse nucleus accumbens after cocaine or saline conditioning',
                    technology: 'Single-nucleus RNA-seq, Illumina NovaSeq 6000',
                    availability: 'Processed H5 supplement; raw data linked through BioProject PRJNA867708',
                    rationale: 'Best molecular anchor for a cocaine-conditioned reward-circuit analysis. It does not test GLP-1 directly, so it should anchor feasibility rather than overclaim causality.',
                    risk: 'Only four GEO samples are visible on the series record; downstream value depends on cell-state metadata and statistical power.'
                },
                {
                    fit: 'Linked raw data',
                    source: 'SRA',
                    id: 'PRJNA867708',
                    title: 'Raw sequencing path for the GSE210850 nucleus accumbens study',
                    year: 'Linked to GSE210850',
                    cohort: 'Same mouse nucleus accumbens conditioning experiment',
                    technology: 'Raw sequencing files for reprocessing',
                    availability: 'SRA access available from the GEO series',
                    rationale: 'Keeps a deeper reproducibility path open if the matrix is insufficient or if the client wants custom reprocessing.',
                    risk: 'Reprocessing cost depends on run count, cell-level metadata, and whether the raw files match the desired comparison.'
                },
                {
                    fit: 'Mechanistic support',
                    source: 'PubMed',
                    id: 'PMID 26072178',
                    title: 'GLP-1 receptor agonist exendin-4 reduces cocaine self-administration',
                    year: '2015',
                    cohort: 'Rodent cocaine self-administration model',
                    technology: 'Behavioral pharmacology, not omics',
                    availability: 'Paper evidence; no reusable transcriptomic matrix',
                    rationale: 'Supports the biological plausibility of GLP-1 receptor agonism in cocaine-related behavior.',
                    risk: 'Useful for hypothesis framing, not for computing a transcriptomic effect.'
                },
                {
                    fit: 'Recent support',
                    source: 'PubMed / bioRxiv',
                    id: 'PMID 40009667',
                    title: 'Endogenous GLP-1 circuit engages VTA GABA neurons to attenuate cocaine seeking',
                    year: '2025',
                    cohort: 'Rodent mesolimbic circuit study',
                    technology: 'Circuit physiology and behavioral evidence',
                    availability: 'Publication and preprint trail; omics reuse requires manual supplement check',
                    rationale: 'Gives the review a current mechanistic bridge between GLP-1 signaling, VTA circuitry, and cocaine seeking.',
                    risk: 'May not provide a direct expression matrix for Scopeify to reuse.'
                }
            ],
            boundary: [
                { label: 'Direct matched cohort', reason: 'No demo-hit record directly combines GLP-1 agonist exposure, cocaine exposure, mouse brain, and public transcriptomics. Live production search would verify this before quoting analysis.' },
                { label: 'Behavior-only GLP-1 studies', reason: 'Strong biological support, but excluded from the computable dataset shortlist when no matrix or accession is present.' },
                { label: 'Human cocaine-use cohorts', reason: 'Potential translational context, but weaker fit to the mouse reward-circuit question and likely a separate scope.' }
            ]
        },
        oncology: {
            title: 'Melanoma anti-PD-1 biomarker scope',
            status: 'Strong path',
            decision: 'Strong public-data path',
            confidence: 'High',
            found: 145,
            screened: 43,
            selected: 4,
            summary: 'This is a better public-data consulting target. Multiple melanoma immunotherapy cohorts expose transcriptomic matrices, response labels, linked publications, and SRA paths. The main work is cohort selection, endpoint harmonization, and avoiding leakage across overlapping studies.',
            searchLabel: 'Demo screen across PubMed, GEO, SRA, and bioRxiv',
            sowTitle: 'Feasibility package for biomarker discovery',
            sowWindow: '10 business days matrix-first; 15-20 with raw-data reprocessing',
            sow: [
                { label: 'Objective', value: 'Assess whether public melanoma transcriptomics can support anti-PD-1 response biomarker discovery.' },
                { label: 'Deliverables', value: 'Cohort inventory, endpoint map, expression QC, candidate signal screen, and feasibility memo.' },
                { label: 'Analysis path', value: 'Prioritize matrix-ready GEO cohorts, then decide whether SRA reprocessing materially improves confidence.' },
                { label: 'Decision use', value: 'Give the client a go/no-go recommendation and a scoped follow-on analysis plan.' }
            ],
            sources: [
                { source: 'PubMed', query: 'melanoma anti-PD-1 response RNA-seq biomarker GEO', found: 72, screened: 19, selected: 2, note: 'Clinical context and endpoint definitions' },
                { source: 'GEO', query: 'melanoma anti-PD-1 response expression profiling high throughput sequencing', found: 31, screened: 10, selected: 2, note: 'Matrix-ready public cohorts' },
                { source: 'SRA', query: 'GSE91061 GSE78220 linked SRA raw reads', found: 33, screened: 10, selected: 2, note: 'Reprocessing and run metadata' },
                { source: 'bioRxiv', query: 'melanoma immunotherapy transcriptomic response preprint spatial single-cell', found: 9, screened: 4, selected: 0, note: 'Recent methods and exclusion check' }
            ],
            criteria: [
                'Selected records must include melanoma, immunotherapy exposure, response or clinical-benefit labels, and public expression data.',
                'Matrix-ready cohorts are favored for rapid feasibility; SRA-linked cohorts are flagged for optional reprocessing.',
                'Controlled-access or label-poor cohorts are excluded from the rapid public-data package even when biologically relevant.'
            ],
            evidence: [
                {
                    fit: 'Primary dataset',
                    source: 'GEO',
                    id: 'GSE91061 / SRP094781',
                    title: 'Molecular portraits of tumor mutational and micro-environmental sculpting by immune checkpoint blockade therapy',
                    year: 'Public 2018; PMID 29033130',
                    cohort: '65 patients; 109 RNA-seq samples with pre-treatment and on-treatment tumors',
                    technology: 'Bulk RNA-seq; Illumina Genome Analyzer',
                    availability: 'Processed CSV files and raw data in SRA',
                    rationale: 'Best anchor cohort because it has paired treatment timing, patient-level samples, processed matrices, and a linked SRA path.',
                    risk: 'Endpoint and treatment labels need harmonization before any model or signature comparison.'
                },
                {
                    fit: 'Primary dataset',
                    source: 'GEO',
                    id: 'GSE78220 / SRP070710',
                    title: 'mRNA expressions in pre-treatment melanomas undergoing anti-PD-1 checkpoint inhibition therapy',
                    year: 'Public 2016; PMID 26997480',
                    cohort: '28 pretreatment melanoma biopsies',
                    technology: 'Paired-end RNA-seq, Illumina HiSeq 2000',
                    availability: 'Processed XLSX matrix; raw data available in SRA',
                    rationale: 'Clean pretreatment response setting that can validate or benchmark signatures discovered in GSE91061.',
                    risk: 'Small cohort; clinical endpoint labels must be extracted and standardized carefully.'
                },
                {
                    fit: 'Support cohort',
                    source: 'GEO',
                    id: 'GSE168204',
                    title: 'Pathway signatures derived from on-treatment tumor specimens predict anti-PD-1 response',
                    year: 'Public 2021',
                    cohort: 'Metastatic melanoma cohorts with pre-treatment and on-treatment RNA-seq',
                    technology: 'RNA-seq and clinical response annotations',
                    availability: 'GEO series record with reusable expression data',
                    rationale: 'Useful as a secondary cohort and methods reference for pathway-level response scoring.',
                    risk: 'May overlap conceptually with prior cohorts; de-duplication and provenance checks are required.'
                },
                {
                    fit: 'Linked raw data',
                    source: 'SRA',
                    id: 'SRP094781 and SRP070710',
                    title: 'Raw sequencing runs for selected melanoma GEO cohorts',
                    year: 'Linked to GEO records',
                    cohort: 'Selected melanoma tumor RNA-seq samples',
                    technology: 'Raw sequencing files',
                    availability: 'SRA run selector links from GEO',
                    rationale: 'Provides a reproducibility option if matrix-level analysis is insufficient or if batch handling needs stricter control.',
                    risk: 'Raw reprocessing increases cost and timeline; labels may remain in publication supplements.'
                }
            ],
            boundary: [
                { label: 'Pan-cancer-only studies', reason: 'Useful for background, but excluded from the first-pass melanoma scope unless response labels are cleanly reusable.' },
                { label: 'Controlled-access trials', reason: 'Potentially valuable, but not appropriate for a rapid public-data feasibility screen.' },
                { label: 'Single-cell immune atlases', reason: 'Mechanistically rich, but not selected unless patient response labels and reuse permissions are clear.' }
            ]
        }
    };

    let currentReport = reports.neuro;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function chooseReport() {
        const text = hypothesis.value.toLowerCase();
        return text.match(/cancer|tumou?r|melanoma|immunotherapy|checkpoint|pd-?1/) ? reports.oncology : reports.neuro;
    }

    function renderMetrics(report) {
        metrics.innerHTML = [
            ['Found', report.found],
            ['Screened', report.screened],
            ['Selected', report.selected],
            ['Confidence', report.confidence]
        ].map(([label, value]) => `
            <div>
                <dt>${escapeHtml(label)}</dt>
                <dd>${escapeHtml(value)}</dd>
            </div>
        `).join('');
    }

    function renderSow(report) {
        sowGrid.innerHTML = report.sow.map(item => `
            <div class="scopeify-sow-item">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.value)}</span>
            </div>
        `).join('');
    }

    function renderAudit(report) {
        auditTable.innerHTML = `
            <div class="scopeify-audit-row scopeify-audit-head" role="row">
                <strong role="columnheader">Source</strong>
                <span role="columnheader">Query focus</span>
                <span role="columnheader">Found</span>
                <span role="columnheader">Screened</span>
                <span role="columnheader">Selected</span>
            </div>
            ${report.sources.map(item => `
                <div class="scopeify-audit-row" role="row">
                    <strong role="cell">${escapeHtml(item.source)}</strong>
                    <span role="cell">${escapeHtml(item.query)}<br>${escapeHtml(item.note)}</span>
                    <span role="cell">${item.found}</span>
                    <span role="cell">${item.screened}</span>
                    <span role="cell">${item.selected}</span>
                </div>
            `).join('')}
        `;

        criteriaList.innerHTML = report.criteria.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }

    function renderEvidence(report) {
        evidenceList.innerHTML = report.evidence.map(item => {
            const fitClass = item.fit.toLowerCase().includes('primary') ? 'primary' : item.fit.toLowerCase().includes('raw') ? 'high' : 'support';
            return `
                <article class="scopeify-evidence-row">
                    <div class="scopeify-evidence-record">
                        <span class="scopeify-fit ${fitClass}">${escapeHtml(item.fit)}</span>
                        <span class="scopeify-record-id">${escapeHtml(item.id)}</span>
                        <span class="scopeify-record-meta">${escapeHtml(item.source)} · ${escapeHtml(item.year)}</span>
                    </div>
                    <div class="scopeify-evidence-main">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p>${escapeHtml(item.rationale)}</p>
                        <div class="scopeify-evidence-facts">
                            <span><strong>Cohort:</strong> ${escapeHtml(item.cohort)}</span>
                            <span><strong>Technology:</strong> ${escapeHtml(item.technology)}</span>
                            <span><strong>Availability:</strong> ${escapeHtml(item.availability)}</span>
                            <span><strong>Risk:</strong> ${escapeHtml(item.risk)}</span>
                        </div>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderBoundary(report) {
        boundaryList.innerHTML = report.boundary.map(item => `
            <div class="scopeify-boundary-item">
                <strong>${escapeHtml(item.label)}</strong>
                <span>${escapeHtml(item.reason)}</span>
            </div>
        `).join('');
    }

    function renderReport(report, statusText) {
        currentReport = report;
        briefTitle.textContent = report.title;
        statusPill.textContent = statusText || report.status;
        decision.textContent = report.decision;
        summary.textContent = report.summary;
        sowTitle.textContent = report.sowTitle;
        sowWindow.textContent = report.sowWindow;
        lastChecked.textContent = report.searchLabel;
        shortlistCount.textContent = `${report.selected} selected from ${report.screened} screened`;
        renderMetrics(report);
        renderSow(report);
        renderAudit(report);
        renderEvidence(report);
        renderBoundary(report);
        downloadButton.disabled = false;
        downloadNote.textContent = 'Excel-ready inventory is ready.';
    }

    function toCsv(report) {
        const header = [
            'source',
            'record_id',
            'fit',
            'title',
            'year_or_citation',
            'cohort',
            'technology',
            'availability',
            'selection_rationale',
            'reuse_risk',
            'consulting_next_action'
        ];
        const safe = value => `"${String(value).replace(/"/g, '""')}"`;
        const rows = report.evidence.map(item => [
            item.source,
            item.id,
            item.fit,
            item.title,
            item.year,
            item.cohort,
            item.technology,
            item.availability,
            item.rationale,
            item.risk,
            item.fit.toLowerCase().includes('primary') ? 'Verify metadata and include in feasibility package' : 'Use as support or optional reprocessing path'
        ].map(safe).join(','));
        return [header.join(','), ...rows].join('\n');
    }

    function downloadCsv() {
        if (!currentReport) return;
        const blob = new Blob([toCsv(currentReport)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scopeify-public-data-inventory.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    function runDemo() {
        const report = chooseReport();
        statusPill.textContent = 'Screening';
        decision.textContent = 'Building brief';
        summary.textContent = 'Planning source-specific searches, screening records, and drafting a feasibility package.';
        downloadButton.disabled = true;
        downloadNote.textContent = 'Screening records...';
        window.setTimeout(() => renderReport(report, report.status), 620);
    }

    function applyInitialParams() {
        const params = new URLSearchParams(window.location.search);
        const initialHypothesis = params.get('hypothesis');
        if (initialHypothesis) hypothesis.value = initialHypothesis;
        renderReport(chooseReport(), 'Example brief');
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        runDemo();
    });

    exampleButton.addEventListener('click', () => {
        hypothesis.value = 'Can public tumor transcriptomics data identify biomarkers of anti-PD-1 response in melanoma patients?';
        runDemo();
    });

    downloadButton.addEventListener('click', downloadCsv);
    applyInitialParams();
})();
