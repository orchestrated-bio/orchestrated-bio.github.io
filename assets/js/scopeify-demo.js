(function () {
    const form = document.getElementById('scopeify-form');
    if (!form) return;

    const shell = form.closest('.scopeify-demo-shell');
    const hypothesis = document.getElementById('scopeify-hypothesis');
    const notes = document.getElementById('scopeify-notes');
    const dataFiles = document.getElementById('scopeify-data-files');
    const exampleButton = document.getElementById('scopeify-example');
    const statusPill = document.getElementById('scopeify-status-pill');
    const briefTitle = document.getElementById('scopeify-brief-title');
    const decision = document.getElementById('scopeify-decision');
    const summary = document.getElementById('scopeify-summary');
    const estimateHours = document.getElementById('scopeify-estimate-hours');
    const estimateRationale = document.getElementById('scopeify-estimate-rationale');
    const outputsList = document.getElementById('scopeify-outputs-list');
    const clientNotes = document.getElementById('scopeify-client-notes');
    const dataReview = document.getElementById('scopeify-data-review');
    const sowTitle = document.getElementById('scopeify-sow-title');
    const sowWindow = document.getElementById('scopeify-sow-window');
    const sowMeta = document.getElementById('scopeify-sow-meta');
    const sowObjective = document.getElementById('scopeify-sow-objective');
    const sowDecision = document.getElementById('scopeify-sow-decision');
    const sowGrid = document.getElementById('scopeify-sow-grid');
    const sowAssumptions = document.getElementById('scopeify-sow-assumptions');
    const sowExclusions = document.getElementById('scopeify-sow-exclusions');
    const lastChecked = document.getElementById('scopeify-last-checked');
    const auditTable = document.getElementById('scopeify-audit-table');
    const criteriaList = document.getElementById('scopeify-criteria-list');
    const shortlistCount = document.getElementById('scopeify-shortlist-count');
    const evidenceList = document.getElementById('scopeify-evidence-list');
    const downloadButton = document.getElementById('scopeify-download');
    const editButton = document.getElementById('scopeify-edit');
    const documentTabs = Array.from(document.querySelectorAll('[data-scopeify-tab]'));
    const documentPanels = Array.from(document.querySelectorAll('.scopeify-document-panel'));
    const DEFAULT_SCOPEIFY_API_BASE = 'https://scopeify-api.orchestrated.bio';
    const LIVE_API_HOSTS = new Set(['orchestrated.bio', 'www.orchestrated.bio', 'orchestrated-bio.github.io']);
    const scopeifyApiBase = getScopeifyApiBase();

    const reports = {
        neuro: {
            title: 'GLP-1 / cocaine reward-circuit scope',
            status: 'Conditional',
            decision: 'Promising, but indirect',
            confidence: 'Medium',
            found: 127,
            screened: 39,
            selected: 4,
            summary: 'A direct public dataset matching GLP-1 agonist treatment, cocaine exposure, and mouse brain transcriptomics is not the likely starting point. The stronger path is a feasibility package that triangulates cocaine-conditioned nucleus accumbens transcriptomics with GLP-1 cocaine-seeking mechanism papers, then decides whether the signal is strong enough for custom analysis.',
            searchLabel: 'Demo screen across PubMed, GEO, SRA, ENA, GSA/CNSA, and bioRxiv',
            estimate: {
                title: 'Feasibility sprint with raw-data checkpoint',
                hours: '18-28 hours',
                rationale: 'Matrix-first review is efficient, but the indirect hypothesis adds manual screening time. Raw SRA reprocessing would be quoted as an optional 18-36 hour add-on after metadata review.',
                outputs: [
                    'Nextflow pipeline when raw-data reprocessing is included or technically justified',
                    'Quarto HTML analysis report with evidence review, QC notes, and recommended analysis path',
                    'Slide deck plus review meeting to walk through feasibility, risks, and next-step options',
                    'Exported XLSX tables with search logs, dataset inventory, accession map, and exclusions'
                ]
            },
            sowTitle: 'Statement of Work: GLP-1 / cocaine public-data feasibility',
            sowWindow: '10 business days, matrix-first; raw SRA reprocessing scoped separately',
            sowMeta: [
                { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: 'Orchestrated Biosciences' },
                { label: 'Document type', value: 'Preliminary Statement of Work' },
                { label: 'Estimate status', value: 'Preliminary; consultation required before quote' }
            ],
            sowObjective: 'Determine whether public mouse reward-circuit transcriptomics and GLP-1/cocaine mechanism literature provide a defensible basis for a scoped consulting analysis.',
            sowDecision: 'Conditional go: proceed with a short feasibility sprint first. Do not quote a full custom analysis until direct-match absence, metadata power, and raw reprocessing value are confirmed.',
            sow: [
                { phase: '1', workstream: 'Public evidence search', detail: 'Run source-specific searches across PubMed, GEO, SRA, ENA, GSA/CNSA, and bioRxiv; record queries, counts, and exclusions.', output: 'Search log and screened evidence ledger', hours: '4-6' },
                { phase: '2', workstream: 'Dataset feasibility review', detail: 'Inspect selected GEO/SRA records for cohort, tissue, technology, metadata, supplement availability, and reuse risk.', output: 'Dataset inventory and accession map', hours: '5-8' },
                { phase: '3', workstream: 'Analysis recommendation', detail: 'Assess whether matrix-level analysis is sufficient or whether raw SRA reprocessing is justified before a larger scope.', output: 'Go/no-go rationale and raw-data checkpoint', hours: '5-8' },
                { phase: '4', workstream: 'Client-ready package', detail: 'Assemble the feasibility brief, XLSX tables, and consultation materials for review with the prospective client.', output: 'Quarto HTML brief, XLSX workbook, slide deck, review meeting', hours: '4-6' }
            ],
            sowAssumptions: [
                'The client is using this as a pre-consultation feasibility estimate, not a final quote.',
                'Initial scope prioritizes public processed matrices and accession metadata before raw-data reprocessing.',
                'Any proprietary client data review is limited to browser-side filename, format, heading, and preview-level summaries unless separately approved.'
            ],
            sowExclusions: [
                'No claim that GLP-1 agonist exposure and cocaine exposure are directly represented in the same public transcriptomic cohort until live search verifies it.',
                'Raw FASTQ reprocessing, cloud compute, and custom Nextflow productionization are optional add-ons after metadata review.',
                'Wet-lab design, regulatory claims, and causal therapeutic conclusions are outside this feasibility SOW.'
            ],
            sources: [
                { source: 'PubMed', query: 'GLP-1 receptor agonist, exendin-4, cocaine seeking, reward circuitry', found: 58, screened: 16, selected: 2, note: 'Mechanism papers and citation trail' },
                { source: 'GEO', query: 'mouse cocaine nucleus accumbens VTA RNA-seq snRNA-seq transcriptomics', found: 21, screened: 8, selected: 1, note: 'Reusable expression matrices' },
                { source: 'SRA', query: 'linked runs for selected GEO cocaine brain studies', found: 27, screened: 8, selected: 1, note: 'Raw-data feasibility and run metadata' },
                { source: 'ENA', query: 'INSDC cross-check for selected SRA/BioProject accessions', found: 14, screened: 4, selected: 0, note: 'Archive mirror and metadata consistency check' },
                { source: 'GSA/CNSA', query: 'GLP-1 cocaine reward circuitry mouse transcriptomics', found: 0, screened: 0, selected: 0, note: 'China-archive negative search logged' },
                { source: 'bioRxiv', query: 'GLP-1 VTA GABA cocaine seeking preprint transcriptomics', found: 7, screened: 3, selected: 0, note: 'Recent evidence, publication-status check' }
            ],
            criteria: [
                'Selected records must connect to reward circuitry, cocaine exposure, public accessions, or GLP-1 mechanism evidence.',
                'Dataset records were favored over narrative papers when expression matrices, raw reads, sample metadata, or BioProject links were visible.',
                'The brief separates directly analyzable datasets from interpretation-only papers so the client can see what can actually be computed.'
            ],
            evidence: [
                {
                    fit: 'Dataset',
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
                    fit: 'Raw data',
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
                    fit: 'Literature',
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
                    fit: 'Literature',
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
        },
        oncology: {
            title: 'Melanoma anti-PD-1 biomarker scope',
            status: 'Strong path',
            decision: 'Strong public-data path',
            confidence: 'High',
            found: 168,
            screened: 50,
            selected: 4,
            summary: 'This is a better public-data consulting target. Multiple melanoma immunotherapy cohorts expose transcriptomic matrices, response labels, linked publications, and SRA paths. The main work is cohort selection, endpoint harmonization, and avoiding leakage across overlapping studies.',
            searchLabel: 'Demo screen across PubMed, GEO, SRA, ENA, GSA/CNSA, and bioRxiv',
            estimate: {
                title: 'Matrix-first biomarker feasibility package',
                hours: '24-40 hours',
                rationale: 'Multiple matrix-ready cohorts reduce retrieval risk. Raw-data reprocessing, if requested, would add an estimated 24-45 hours depending on run count and endpoint harmonization.',
                outputs: [
                    'Nextflow pipeline when raw FASTQ/BAM reprocessing is included or needed for comparability',
                    'Quarto HTML analysis report with cohort review, QC checks, endpoint map, and scope recommendation',
                    'Slide deck plus review meeting to discuss analysis tradeoffs and follow-on scope',
                    'Exported XLSX tables for cohort inventory, response labels, search logs, exclusions, and selected evidence'
                ]
            },
            sowTitle: 'Statement of Work: melanoma anti-PD-1 biomarker feasibility',
            sowWindow: '10 business days matrix-first; 15-20 with raw-data reprocessing',
            sowMeta: [
                { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: 'Orchestrated Biosciences' },
                { label: 'Document type', value: 'Preliminary Statement of Work' },
                { label: 'Estimate status', value: 'Preliminary; consultation required before quote' }
            ],
            sowObjective: 'Assess whether public melanoma transcriptomics can support a practical anti-PD-1 response biomarker feasibility analysis with transparent cohort selection and endpoint harmonization.',
            sowDecision: 'Strong go for a matrix-first feasibility package. A larger raw-data or model-development scope should follow only after cohort overlap, endpoint labels, and batch structure are reviewed.',
            sow: [
                { phase: '1', workstream: 'Public evidence search', detail: 'Search PubMed, GEO, SRA, ENA, GSA/CNSA, and bioRxiv for melanoma immunotherapy cohorts with expression data and response labels.', output: 'Search log, screened records, and exclusion notes', hours: '5-8' },
                { phase: '2', workstream: 'Cohort and endpoint review', detail: 'Compare candidate cohorts for sample count, treatment timing, clinical-benefit labels, technology, supplements, and linked raw data.', output: 'Cohort inventory, endpoint map, and reuse-risk table', hours: '7-12' },
                { phase: '3', workstream: 'Analysis design', detail: 'Recommend matrix-level analyses, validation strategy, leakage controls, and whether raw SRA reprocessing is worth the additional cost.', output: 'Analysis plan and optional reprocessing checkpoint', hours: '8-14' },
                { phase: '4', workstream: 'Client-ready package', detail: 'Prepare the SOW-style feasibility brief, exported tables, and review materials for a decision meeting.', output: 'Quarto HTML brief, XLSX workbook, slide deck, review meeting', hours: '4-6' }
            ],
            sowAssumptions: [
                'The first scope uses public processed matrices where possible to keep the estimate efficient.',
                'Response labels, treatment timing, and patient overlap must be harmonized before any biomarker model is treated as interpretable.',
                'The client will confirm whether the goal is feasibility review, signature benchmarking, or follow-on model development.'
            ],
            sowExclusions: [
                'No clinical-grade biomarker claim, regulatory claim, or therapeutic efficacy claim is included in this feasibility SOW.',
                'Controlled-access datasets, cloud compute, and raw reprocessing are treated as optional follow-on work unless explicitly approved.',
                'Prospective validation, wet-lab assay design, and companion diagnostic development are outside this preliminary estimate.'
            ],
            sources: [
                { source: 'PubMed', query: 'melanoma anti-PD-1 response RNA-seq biomarker GEO', found: 72, screened: 19, selected: 2, note: 'Clinical context and endpoint definitions' },
                { source: 'GEO', query: 'melanoma anti-PD-1 response expression profiling high throughput sequencing', found: 31, screened: 10, selected: 2, note: 'Matrix-ready public cohorts' },
                { source: 'SRA', query: 'GSE91061 GSE78220 linked SRA raw reads', found: 33, screened: 10, selected: 2, note: 'Reprocessing and run metadata' },
                { source: 'ENA', query: 'INSDC cross-check for melanoma immunotherapy BioProjects', found: 22, screened: 7, selected: 0, note: 'Archive mirror and metadata consistency check' },
                { source: 'GSA/CNSA', query: 'melanoma anti-PD-1 response transcriptomics', found: 1, screened: 0, selected: 0, note: 'China-archive check; no rapid-scope fit selected' },
                { source: 'bioRxiv', query: 'melanoma immunotherapy transcriptomic response preprint spatial single-cell', found: 9, screened: 4, selected: 0, note: 'Recent methods and exclusion check' }
            ],
            criteria: [
                'Selected records must include melanoma, immunotherapy exposure, response or clinical-benefit labels, and public expression data.',
                'Matrix-ready cohorts are favored for rapid feasibility; SRA-linked cohorts are flagged for optional reprocessing.',
                'Controlled-access or label-poor cohorts are excluded from the rapid public-data package even when biologically relevant.'
            ],
            evidence: [
                {
                    fit: 'Dataset',
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
                    fit: 'Dataset',
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
                    fit: 'Dataset',
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
                    fit: 'Raw data',
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
        }
    };

    const MAX_TEXT_PREVIEW_BYTES = 160000;
    const DATA_PREVIEW_SCHEMA_VERSION = 'scopeify.client_data_preview.v1';

    let currentReport = reports.neuro;
    let dataScanReview = 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
    let latestDataPreview = createEmptyDataPreview();

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getScopeifyApiBase() {
        const explicit = typeof window.SCOPEIFY_API_BASE === 'string' ? window.SCOPEIFY_API_BASE.trim() : '';
        if (explicit) return explicit.replace(/\/+$/, '');

        const params = new URLSearchParams(window.location.search);
        const configured = params.get('scopeify_api');
        if (configured) return configured.replace(/\/+$/, '');

        if (LIVE_API_HOSTS.has(window.location.hostname)) return DEFAULT_SCOPEIFY_API_BASE;
        return '';
    }

    function formatGeneratedDate(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    }

    function createEmptyDataPreview() {
        return {
            schema_version: DATA_PREVIEW_SCHEMA_VERSION,
            privacy: 'browser_side_preview_only',
            files: [],
            aggregate: {
                files_selected: 0,
                parsable_files: 0,
                total_preview_rows: 0,
                roles_detected: {},
                risk_flags: []
            },
            validation: {
                status: 'no_files',
                errors: [],
                warnings: []
            }
        };
    }

    function publishDataPreview() {
        window.scopeifyLatestDataPreview = latestDataPreview;
    }

    function setDocumentTab(tabName) {
        documentTabs.forEach(tab => {
            const isActive = tab.dataset.scopeifyTab === tabName;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        documentPanels.forEach(panel => {
            const isActive = panel.id === `scopeify-panel-${tabName}`;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });
    }

    function chooseReport() {
        const text = hypothesis.value.toLowerCase();
        return text.match(/cancer|tumou?r|melanoma|immunotherapy|checkpoint|pd-?1/) ? reports.oncology : reports.neuro;
    }

    function moveShellToTop() {
        if (!shell) return;
        const masthead = document.querySelector('.masthead');
        const mastheadOffset = masthead ? masthead.getBoundingClientRect().height : 0;
        const top = Math.max(0, shell.getBoundingClientRect().top + window.pageYOffset - mastheadOffset - 16);
        window.scrollTo({ top, behavior: 'smooth' });
    }

    function enterSubmittedState() {
        if (!shell) return;
        shell.classList.add('scopeify-is-submitted');
        setDocumentTab('sow');
        moveShellToTop();
    }

    function enterIntakeState() {
        if (!shell) return;
        shell.classList.remove('scopeify-is-submitted');
        moveShellToTop();
        window.setTimeout(() => hypothesis.focus(), 180);
    }

    function getClientNotes() {
        const value = notes ? notes.value.trim() : '';
        return value || 'No additional notes entered yet. Scopeify will use comments here to tune estimate assumptions, deliverable format, and consultation agenda.';
    }

    function formatBytes(bytes) {
        if (!bytes) return '0 bytes';
        if (bytes < 1024) return `${bytes} bytes`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    function getFileExtension(fileName) {
        const match = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
        return match ? match[1] : '';
    }

    function isTextLike(file) {
        return /\.(csv|tsv|txt|json)$/i.test(file.name) || /^text\//.test(file.type);
    }

    function normalizeHeader(header) {
        return String(header || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function isMissingValue(value) {
        return value == null || String(value).trim() === '' || /^(na|n\/a|null|none|nan)$/i.test(String(value).trim());
    }

    function parseDelimitedRows(text, delimiter) {
        const rows = [];
        let row = [];
        let field = '';
        let inQuotes = false;

        for (let index = 0; index < text.length; index += 1) {
            const char = text[index];
            const next = text[index + 1];

            if (char === '"') {
                if (inQuotes && next === '"') {
                    field += '"';
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (!inQuotes && char === delimiter) {
                row.push(field.trim());
                field = '';
                continue;
            }

            if (!inQuotes && (char === '\n' || char === '\r')) {
                if (char === '\r' && next === '\n') index += 1;
                row.push(field.trim());
                if (row.some(value => value !== '')) rows.push(row);
                row = [];
                field = '';
                continue;
            }

            field += char;
        }

        row.push(field.trim());
        if (row.some(value => value !== '')) rows.push(row);
        return rows.slice(0, 251);
    }

    function chooseDelimiter(firstLine) {
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        return tabCount > commaCount ? '\t' : ',';
    }

    function getColumnValues(rows, index) {
        return rows.map(row => row[index] == null ? '' : String(row[index]).trim());
    }

    function inferPrimitiveType(values) {
        const present = values.filter(value => !isMissingValue(value));
        if (!present.length) return 'empty';

        const numeric = present.filter(value => /^-?\d+(\.\d+)?([eE]-?\d+)?$/.test(value));
        if (numeric.length / present.length >= 0.9) {
            return numeric.every(value => /^-?\d+$/.test(value)) ? 'integer' : 'number';
        }

        const booleanish = present.filter(value => /^(true|false|yes|no|y|n|0|1)$/i.test(value));
        if (booleanish.length / present.length >= 0.9) return 'boolean';

        const dateish = present.filter(value => /^\d{4}-\d{1,2}-\d{1,2}$/.test(value) || /^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(value));
        if (dateish.length / present.length >= 0.8) return 'date';

        const unique = new Set(present.map(value => value.toLowerCase()));
        if (unique.size <= Math.max(2, Math.min(12, Math.ceil(present.length * 0.55)))) return 'categorical';
        return 'text';
    }

    function inferColumnRole(header, primitiveType) {
        const normalized = normalizeHeader(header);
        const rules = [
            { role: 'sample_id', confidence: 0.92, pattern: /(^|_)(sample|sampleid|sample_id|specimen|barcode|cell_id|cellid|mouse_id|mouseid|animal_id|animalid|subject_id|subjectid|subj_id|patient_id|patientid|pt_id|donor_id|donorid|case_id|caseid)($|_)/ },
            { role: 'outcome', confidence: 0.9, pattern: /(^|_)(response|resp|responder|best_resp|best_response|outcome|phenotype|pheno|status|clinical_benefit|benefit|diagnosis|dx|disease|case_control|progression|survival|pfs|os)($|_)/ },
            { role: 'treatment', confidence: 0.88, pattern: /(^|_)(treatment|condition|group|arm|tx|rx|drug|dose|exposure|intervention|stimulus|challenge|treated|control)($|_)/ },
            { role: 'batch', confidence: 0.9, pattern: /(^|_)(batch|plate|lane|center|centre|site|run|run_id|seqrun|sequencing_run|library|lib_lane|library_lane|flowcell|instrument|operator)($|_)/ },
            { role: 'timepoint', confidence: 0.82, pattern: /(^|_)(time|timepoint|tp|day|week|month|visit|baseline|followup|follow_up)($|_)/ },
            { role: 'covariate', confidence: 0.76, pattern: /(^|_)(age|sex|gender|bmi|strain|genotype|race|ancestry|species|tissue|celltype|cell_type)($|_)/ },
            { role: 'feature_measure', confidence: 0.66, pattern: /(^|_)(gene|gene_id|symbol|transcript|count|counts|tpm|fpkm|cpm|expression)($|_)/ }
        ];

        const match = rules.find(rule => rule.pattern.test(normalized));
        if (match) return { role: match.role, confidence: match.confidence };
        if (primitiveType === 'categorical') return { role: 'candidate_design_field', confidence: 0.42 };
        return { role: 'unknown', confidence: 0.2 };
    }

    function uniquePreview(values) {
        const seen = [];
        values.forEach(value => {
            const trimmed = String(value || '').trim();
            if (!trimmed || seen.includes(trimmed)) return;
            if (seen.length < 6) seen.push(trimmed);
        });
        return seen;
    }

    function profileColumns(headers, rows) {
        return headers.map((header, index) => {
            const values = getColumnValues(rows, index);
            const missingCount = values.filter(isMissingValue).length;
            const primitiveType = inferPrimitiveType(values);
            const role = inferColumnRole(header, primitiveType);
            return {
                name: header,
                normalized_name: normalizeHeader(header),
                index,
                inferred_type: primitiveType,
                inferred_role: role.role,
                role_confidence: role.confidence,
                missing_count: missingCount,
                missing_rate: rows.length ? Number((missingCount / rows.length).toFixed(3)) : 0,
                unique_count_preview: new Set(values.filter(value => !isMissingValue(value)).map(value => value.toLowerCase())).size,
                unique_values_preview: uniquePreview(values)
            };
        });
    }

    function fieldsByRole(columns, roles) {
        return columns
            .filter(column => roles.includes(column.inferred_role))
            .map(column => column.name);
    }

    function makeFlag(code, severity, message, evidence) {
        return { code, severity, message, evidence: evidence || [] };
    }

    function buildRiskFlags(fileName, columns, rows) {
        const flags = [];
        const sampleFields = fieldsByRole(columns, ['sample_id']);
        const outcomeFields = fieldsByRole(columns, ['outcome']);
        const treatmentFields = fieldsByRole(columns, ['treatment']);
        const batchFields = fieldsByRole(columns, ['batch']);
        const designFields = fieldsByRole(columns, ['candidate_design_field']);

        if (rows.length > 0 && rows.length < 12) {
            flags.push(makeFlag('low_n', 'review', `low n signal in preview (${rows.length} rows)`, [fileName]));
        }
        if (!sampleFields.length) {
            flags.push(makeFlag('missing_sample_id', 'review', 'no obvious sample identifier field', []));
        }
        if (!outcomeFields.length && !treatmentFields.length && !designFields.length) {
            flags.push(makeFlag('missing_outcome_or_group', 'review', 'no obvious response or outcome field', []));
        }
        if (batchFields.length) {
            flags.push(makeFlag('batch_present', 'review', `batch-effect fields to review: ${batchFields.slice(0, 4).join(', ')}`, batchFields));
        }

        const idColumn = columns.find(column => column.inferred_role === 'sample_id');
        if (idColumn) {
            const values = getColumnValues(rows, idColumn.index).filter(value => !isMissingValue(value));
            if (new Set(values).size < values.length) {
                flags.push(makeFlag('duplicate_sample_ids', 'review', `duplicate sample identifiers detected in ${idColumn.name}`, [idColumn.name]));
            }
        }

        [...outcomeFields, ...treatmentFields].forEach(field => {
            const column = columns.find(item => item.name === field);
            if (!column || column.unique_count_preview !== 1) return;
            flags.push(makeFlag('single_group_design', 'review', `single group design detected in ${field}`, [field]));
        });

        columns.filter(column => column.missing_rate >= 0.25).forEach(column => {
            flags.push(makeFlag('high_missingness', 'review', `${column.name} has ${Math.round(column.missing_rate * 100)}% missing values in preview`, [column.name]));
        });

        if (columns.length > 80) {
            flags.push(makeFlag('wide_table', 'info', 'wide table may be an expression matrix rather than sample metadata', [`${columns.length} columns`]));
        }

        return flags;
    }

    function summarizeFieldList(label, fields, emptyText) {
        return fields.length ? `${label}: ${fields.slice(0, 4).join(', ')}` : emptyText;
    }

    function summarizeFilePreview(filePreview) {
        if (filePreview.parser_status === 'metadata_only' || filePreview.parser_status === 'parse_error' || filePreview.parser_status === 'empty') {
            return filePreview.summary;
        }

        const roles = filePreview.candidate_roles;
        const fieldSummaries = [
            roles.sample_id_fields.length ? `sample identifiers appear present (${roles.sample_id_fields.slice(0, 3).join(', ')})` : 'no obvious sample identifier field',
            summarizeFieldList('candidate outcome fields', roles.outcome_fields, 'no obvious response or outcome field'),
            summarizeFieldList('candidate group/treatment fields', roles.treatment_fields, 'no obvious group or treatment field'),
            summarizeFieldList('batch-effect fields to review', roles.batch_fields, 'no obvious batch field in preview')
        ];
        const riskMessages = filePreview.risk_flags.map(flag => flag.message);
        const riskSummary = riskMessages.length ? `risk flags: ${riskMessages.slice(0, 5).join('; ')}` : 'no immediate table-structure risks in preview';

        return `${filePreview.file_name}: ${filePreview.columns.length || 'unknown'} columns, ${filePreview.rows_previewed || 'unknown'} preview rows; LLM-ready table preview validated; ${fieldSummaries.join('; ')}; ${riskSummary}.`;
    }

    function validateFilePreview(filePreview) {
        const errors = [];
        const warnings = [];
        const columnNames = filePreview.columns.map(column => column.name);
        const duplicateColumns = columnNames.filter((name, index) => columnNames.indexOf(name) !== index);
        const roleFields = Object.values(filePreview.candidate_roles || {}).flat();

        if (duplicateColumns.length) {
            warnings.push(`${filePreview.file_name}: duplicate column headers: ${[...new Set(duplicateColumns)].join(', ')}`);
        }
        roleFields.forEach(field => {
            if (!columnNames.includes(field)) {
                errors.push(`${filePreview.file_name}: inferred role references missing column ${field}`);
            }
        });
        if (filePreview.parser_status !== 'parsed') {
            warnings.push(`${filePreview.file_name}: ${filePreview.parser_status}`);
        }
        return { errors, warnings };
    }

    function profileParsedTable(file, headers, rows, parserMetadata) {
        const cleanHeaders = headers.map((header, index) => String(header || '').trim() || `unnamed_${index + 1}`);
        const columns = profileColumns(cleanHeaders, rows);
        const candidateRoles = {
            sample_id_fields: fieldsByRole(columns, ['sample_id']),
            outcome_fields: fieldsByRole(columns, ['outcome']),
            treatment_fields: fieldsByRole(columns, ['treatment']),
            batch_fields: fieldsByRole(columns, ['batch']),
            timepoint_fields: fieldsByRole(columns, ['timepoint']),
            covariate_fields: fieldsByRole(columns, ['covariate']),
            design_field_candidates: fieldsByRole(columns, ['candidate_design_field'])
        };
        const riskFlags = buildRiskFlags(file.name, columns, rows);
        const filePreview = {
            file_name: file.name,
            extension: getFileExtension(file.name),
            mime_type: file.type || 'unknown',
            size_bytes: file.size,
            parser_status: rows.length ? 'parsed' : 'empty',
            delimiter: parserMetadata.delimiter || null,
            rows_previewed: rows.length,
            columns,
            candidate_roles: candidateRoles,
            risk_flags: riskFlags,
            llm_prompt_summary: '',
            summary: ''
        };
        if (!rows.length) {
            filePreview.risk_flags.push(makeFlag('no_data_rows', 'review', 'empty file or no readable rows detected', [file.name]));
            filePreview.summary = `${file.name}: empty file or no readable rows detected.`;
        } else {
            filePreview.summary = summarizeFilePreview(filePreview);
        }
        filePreview.llm_prompt_summary = filePreview.summary;
        return filePreview;
    }

    function profileJsonFile(file, text) {
        try {
            const parsed = JSON.parse(text);
            const records = Array.isArray(parsed) ? parsed.filter(item => item && typeof item === 'object') : [parsed].filter(item => item && typeof item === 'object');
            const headers = [...new Set(records.flatMap(record => Object.keys(record)))];
            const rows = records.slice(0, 250).map(record => headers.map(header => record[header] == null ? '' : String(record[header])));
            return profileParsedTable(file, headers, rows, { delimiter: null });
        } catch (error) {
            const summary = `${file.name}: JSON selected, but the preview could not parse it cleanly. Production review would inspect schema and representative records.`;
            return {
                file_name: file.name,
                extension: getFileExtension(file.name),
                mime_type: file.type || 'application/json',
                size_bytes: file.size,
                parser_status: 'parse_error',
                delimiter: null,
                rows_previewed: 0,
                columns: [],
                candidate_roles: {
                    sample_id_fields: [],
                    outcome_fields: [],
                    treatment_fields: [],
                    batch_fields: [],
                    timepoint_fields: [],
                    covariate_fields: [],
                    design_field_candidates: []
                },
                risk_flags: [makeFlag('invalid_json', 'blocker', 'JSON selected, but the preview could not parse it cleanly', [file.name])],
                llm_prompt_summary: summary,
                summary
            };
        }
    }

    function profileTextFile(file, text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 250);
        if (!lines.length) {
            return profileParsedTable(file, [], [], { delimiter: null });
        }

        if (/\.json$/i.test(file.name)) {
            return profileJsonFile(file, text);
        }

        const delimiter = chooseDelimiter(lines[0]);
        const parsedRows = parseDelimitedRows(text, delimiter);
        const headers = (parsedRows[0] || []).filter(Boolean);
        const rows = parsedRows.slice(1, 251);
        return profileParsedTable(file, headers, rows, { delimiter: delimiter === '\t' ? 'tab' : 'comma' });
    }

    function profileBinaryFile(file) {
        const summary = `${file.name}: ${formatBytes(file.size)} selected. Demo scans file name, format, and size only; production review would extract sheet/schema summaries before LLM scoping.`;
        return {
            file_name: file.name,
            extension: getFileExtension(file.name),
            mime_type: file.type || 'unknown',
            size_bytes: file.size,
            parser_status: 'metadata_only',
            delimiter: null,
            rows_previewed: 0,
            columns: [],
            candidate_roles: {
                sample_id_fields: [],
                outcome_fields: [],
                treatment_fields: [],
                batch_fields: [],
                timepoint_fields: [],
                covariate_fields: [],
                design_field_candidates: []
            },
            risk_flags: [makeFlag('metadata_only', 'info', 'selected. Demo scans file name, format, and size only', [file.name])],
            llm_prompt_summary: summary,
            summary
        };
    }

    function validateClientDataPreview(preview) {
        const errors = [];
        const warnings = [];
        preview.files.forEach(filePreview => {
            const result = validateFilePreview(filePreview);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
        });

        return {
            status: errors.length ? 'invalid' : warnings.length ? 'valid_with_warnings' : 'valid',
            errors,
            warnings
        };
    }

    function buildClientDataPreview(filePreviews) {
        const roles = {};
        const riskFlagCodes = [];

        filePreviews.forEach(filePreview => {
            Object.entries(filePreview.candidate_roles).forEach(([role, fields]) => {
                if (!roles[role]) roles[role] = [];
                roles[role].push(...fields.map(field => `${filePreview.file_name}.${field}`));
            });
            filePreview.risk_flags.forEach(flag => {
                if (!riskFlagCodes.includes(flag.code)) riskFlagCodes.push(flag.code);
            });
        });

        const preview = {
            schema_version: DATA_PREVIEW_SCHEMA_VERSION,
            privacy: 'browser_side_preview_only',
            files: filePreviews,
            aggregate: {
                files_selected: filePreviews.length,
                parsable_files: filePreviews.filter(file => file.parser_status === 'parsed').length,
                total_preview_rows: filePreviews.reduce((total, file) => total + file.rows_previewed, 0),
                roles_detected: roles,
                risk_flags: riskFlagCodes
            },
            validation: {
                status: 'pending',
                errors: [],
                warnings: []
            }
        };
        preview.validation = validateClientDataPreview(preview);
        return preview;
    }

    function summarizeDataPreview(preview) {
        if (!preview.files.length) {
            return 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
        }

        const summaries = preview.files.map(file => file.summary);
        const validationText = preview.validation.status === 'valid'
            ? 'Structured DataPreview is ready for the backend LLM.'
            : `Structured DataPreview requires review: ${[...preview.validation.errors, ...preview.validation.warnings].slice(0, 3).join('; ')}`;
        return `${summaries.join(' ')} ${validationText}`;
    }

    function renderDataReview() {
        if (dataReview) {
            dataReview.textContent = dataScanReview;
            dataReview.dataset.previewSchema = latestDataPreview.schema_version;
            dataReview.dataset.previewStatus = latestDataPreview.validation.status;
            dataReview.dataset.previewJson = JSON.stringify(latestDataPreview);
        }
        publishDataPreview();
    }

    function renderEstimate(report) {
        if (estimateHours) estimateHours.textContent = report.estimate.hours;
        if (estimateRationale) estimateRationale.textContent = report.estimate.rationale;
        if (outputsList) outputsList.innerHTML = report.estimate.outputs.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (clientNotes) clientNotes.textContent = getClientNotes();
        renderDataReview();
    }

    function renderSow(report) {
        if (sowMeta) {
            const generatedDate = formatGeneratedDate(new Date());
            const meta = [
                ...report.sowMeta,
                { label: 'Generation date', value: generatedDate },
                { label: 'Project window', value: report.sowWindow }
            ];
            sowMeta.innerHTML = meta.map(item => `
                <div>
                    <span>${escapeHtml(item.label)}</span>
                    <strong>${escapeHtml(item.value)}</strong>
                </div>
            `).join('');
            if (sowWindow) sowWindow.textContent = `Generated ${generatedDate}`;
        }
        if (sowObjective) sowObjective.textContent = report.sowObjective;
        if (sowDecision) sowDecision.textContent = report.sowDecision;
        sowGrid.innerHTML = `
            <div class="scopeify-sow-row scopeify-sow-head" role="row">
                <strong role="columnheader">Phase</strong>
                <span role="columnheader">Workstream</span>
                <span role="columnheader">Expected output</span>
                <span role="columnheader">Hours</span>
            </div>
            ${report.sow.map(item => `
                <div class="scopeify-sow-row" role="row">
                    <strong role="cell">${escapeHtml(item.phase)}</strong>
                    <span role="cell"><b>${escapeHtml(item.workstream)}</b><br>${escapeHtml(item.detail)}</span>
                    <span role="cell">${escapeHtml(item.output)}</span>
                    <span role="cell">${escapeHtml(item.hours)}</span>
                </div>
            `).join('')}
        `;
        if (sowAssumptions) sowAssumptions.innerHTML = report.sowAssumptions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (sowExclusions) sowExclusions.innerHTML = report.sowExclusions.map(item => `<li>${escapeHtml(item)}</li>`).join('');
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
        if (!evidenceList) return;
        evidenceList.innerHTML = `
            <div class="scopeify-inventory-table" role="table" aria-label="Dataset inventory preview">
                <div class="scopeify-inventory-row scopeify-inventory-head" role="row">
                    <strong role="columnheader">Record</strong>
                    <span role="columnheader">Role</span>
                    <span role="columnheader">Cohort / technology</span>
                    <span role="columnheader">Availability / risk</span>
                </div>
                ${report.evidence.map(item => `
                    <div class="scopeify-inventory-row" role="row">
                        <strong role="cell">${escapeHtml(item.id)}<small>${escapeHtml(item.source)} · ${escapeHtml(item.year)}</small></strong>
                        <span role="cell">${escapeHtml(item.fit)}<br>${escapeHtml(item.title)}</span>
                        <span role="cell"><b>Cohort:</b> ${escapeHtml(item.cohort)}<br><b>Technology:</b> ${escapeHtml(item.technology)}</span>
                        <span role="cell"><b>Availability:</b> ${escapeHtml(item.availability)}<br><b>Risk:</b> ${escapeHtml(item.risk)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderReport(report, statusText) {
        currentReport = report;
        briefTitle.textContent = report.title;
        statusPill.textContent = statusText || 'Draft SOW';
        if (decision) decision.textContent = report.decision;
        if (summary) summary.textContent = report.summary;
        sowTitle.textContent = report.sowTitle;
        if (sowWindow) sowWindow.textContent = report.sowWindow;
        if (lastChecked) lastChecked.textContent = report.searchLabel;
        shortlistCount.textContent = report.shortlistLabel || `${report.selected} selected from ${report.screened} screened`;
        renderEstimate(report);
        renderSow(report);
        renderAudit(report);
        renderEvidence(report);
        downloadButton.disabled = false;
    }

    async function postScopeify(endpoint, payload) {
        if (!scopeifyApiBase) throw new Error('Scopeify API is not configured for this host.');
        const response = await fetch(`${scopeifyApiBase}${endpoint}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            credentials: 'omit',
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            throw new Error(`Scopeify API returned ${response.status}`);
        }
        return response.json();
    }

    function liveArchiveSources() {
        return ['PubMed', 'GEO', 'SRA'];
    }

    function buildArchiveSearchPayload() {
        return {
            project: {
                hypothesis: hypothesis.value.trim(),
                notes: notes ? notes.value.trim() : '',
                requested_outputs: [
                    'Preliminary Statement of Work',
                    'Dataset inventory',
                    'Project estimate'
                ]
            },
            allowed_archive_sources: liveArchiveSources(),
            max_results_per_source: 3,
            expected_response_schema: 'scopeify.archive_search.v1'
        };
    }

    function sourceResultToAudit(result) {
        const returned = Number(result.returned_count || 0);
        const warnings = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
        const note = result.status === 'searched'
            ? 'Live backend returned candidate records for manual review'
            : warnings[0] || 'Source not searched by the current backend adapter';
        return {
            source: result.source || 'Unknown',
            query: result.query || 'Query unavailable',
            found: Number(result.found_count || 0),
            screened: returned,
            selected: returned,
            note
        };
    }

    function recordToEvidence(record) {
        const source = record.source || 'PubMed';
        const isData = ['GEO', 'SRA', 'ENA', 'GSA/CNSA'].includes(source);
        return {
            fit: isData ? 'Candidate dataset' : 'Candidate literature',
            source,
            id: record.identifier || 'Record',
            title: record.title || 'Untitled record',
            year: record.year || record.citation || 'Year pending',
            cohort: record.cohort || 'Needs manual cohort review',
            technology: record.technology || 'Needs manual technology review',
            availability: record.data_availability || 'Availability requires manual verification',
            rationale: `Returned by live ${source} search for review before inclusion in the final scope.`,
            risk: record.credibility || 'Candidate record only; inclusion requires human review of metadata, fit, and reuse terms.'
        };
    }

    function mergeLiveArchiveResponse(report, response) {
        const sourceResults = Array.isArray(response.source_results) ? response.source_results : [];
        const liveEvidence = sourceResults.flatMap(result => (result.records || []).map(recordToEvidence));
        const found = sourceResults.reduce((total, result) => total + Number(result.found_count || 0), 0);
        const returned = sourceResults.reduce((total, result) => total + Number(result.returned_count || 0), 0);
        const searchedSources = sourceResults.filter(result => result.status === 'searched').map(result => result.source).join(', ');
        const timestamp = new Date().toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });

        return {
            ...report,
            found,
            screened: returned,
            selected: liveEvidence.length,
            searchLabel: searchedSources
                ? `Live backend search: ${searchedSources}; ${timestamp}`
                : `Live backend search completed; ${timestamp}`,
            shortlistLabel: liveEvidence.length
                ? `${liveEvidence.length} live records returned for review`
                : 'No live records returned for review',
            sources: sourceResults.map(sourceResultToAudit),
            criteria: [
                'Live records are candidate inventory rows and still require manual inclusion review.',
                'The SOW remains a preliminary template until the Pydantic AI drafting contract and human review are complete.',
                'Dataset records should be checked for cohort labels, technology, accessions, supplement availability, and reuse risk.'
            ],
            evidence: liveEvidence
        };
    }

    function markLiveSearchUnavailable(report, message) {
        return {
            ...report,
            searchLabel: 'Demo search; live backend unavailable',
            criteria: [
                'This local or fallback view is using the static demo inventory.',
                message || 'The public backend did not return a live archive-search response.',
                ...report.criteria
            ]
        };
    }

    function toCsv(report) {
        const header = [
            'source',
            'record_id',
            'fit',
            'client_hypothesis',
            'client_notes',
            'browser_side_data_scan',
            'llm_ready_data_preview_json',
            'estimated_hours',
            'expected_outputs',
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
        const clientHypothesis = hypothesis.value.trim() || 'No hypothesis entered';
        const clientNoteText = notes && notes.value.trim() ? notes.value.trim() : 'No client notes entered';
        const expectedOutputs = report.estimate.outputs.join('; ');
        const rows = report.evidence.map(item => [
            item.source,
            item.id,
            item.fit,
            clientHypothesis,
            clientNoteText,
            dataScanReview,
            JSON.stringify(latestDataPreview),
            report.estimate.hours,
            expectedOutputs,
            item.title,
            item.year,
            item.cohort,
            item.technology,
            item.availability,
            item.rationale,
            item.risk,
            item.fit.toLowerCase().includes('dataset') ? 'Verify metadata and include in feasibility package' : 'Use as support or optional reprocessing path'
        ].map(safe).join(','));
        return [header.join(','), ...rows].join('\n');
    }

    function downloadCsv() {
        if (!currentReport) return;
        const blob = new Blob([toCsv(currentReport)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scopeify-dataset-inventory-project-estimate.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function runDemo() {
        const report = chooseReport();
        enterSubmittedState();
        statusPill.textContent = scopeifyApiBase ? 'Searching live inventory' : 'Generating';
        if (decision) decision.textContent = 'Building brief';
        if (summary) summary.textContent = 'Planning source-specific searches, screening records, and drafting a feasibility package.';
        downloadButton.disabled = true;

        if (!scopeifyApiBase) {
            window.setTimeout(() => renderReport(report, 'Draft SOW'), 620);
            return;
        }

        try {
            const response = await postScopeify('/v1/scopeify/archive-search', buildArchiveSearchPayload());
            renderReport(mergeLiveArchiveResponse(report, response), 'Live inventory');
        } catch (error) {
            renderReport(markLiveSearchUnavailable(report, error.message), 'Draft SOW');
        }
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
        if (notes) {
            notes.value = 'We need a practical preliminary estimate for a client-ready biomarker feasibility package before deciding whether to fund a larger analysis.';
        }
        runDemo();
    });

    async function scanSelectedFiles() {
        const files = dataFiles ? Array.from(dataFiles.files || []) : [];
        if (!files.length) {
            latestDataPreview = createEmptyDataPreview();
            dataScanReview = 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
            renderDataReview();
            return;
        }

        dataScanReview = 'Scanning selected file metadata in browser...';
        renderDataReview();

        const previews = await Promise.all(files.map(async file => {
            if (!isTextLike(file)) {
                return profileBinaryFile(file);
            }

            try {
                const text = await file.slice(0, MAX_TEXT_PREVIEW_BYTES).text();
                const preview = profileTextFile(file, text);
                if (file.size > MAX_TEXT_PREVIEW_BYTES) {
                    preview.risk_flags.push(makeFlag('preview_truncated', 'info', `preview limited to ${formatBytes(MAX_TEXT_PREVIEW_BYTES)}`, [file.name]));
                    preview.summary = summarizeFilePreview(preview);
                    preview.llm_prompt_summary = preview.summary;
                }
                return preview;
            } catch (error) {
                const summary = `${file.name}: ${formatBytes(file.size)} selected, but browser preview failed. Production review would retry with a server-side parser.`;
                return {
                    file_name: file.name,
                    extension: getFileExtension(file.name),
                    mime_type: file.type || 'unknown',
                    size_bytes: file.size,
                    parser_status: 'parse_error',
                    delimiter: null,
                    rows_previewed: 0,
                    columns: [],
                    candidate_roles: {
                        sample_id_fields: [],
                        outcome_fields: [],
                        treatment_fields: [],
                        batch_fields: [],
                        timepoint_fields: [],
                        covariate_fields: [],
                        design_field_candidates: []
                    },
                    risk_flags: [makeFlag('preview_failed', 'blocker', 'browser preview failed', [file.name])],
                    llm_prompt_summary: summary,
                    summary
                };
            }
        }));

        latestDataPreview = buildClientDataPreview(previews);
        dataScanReview = summarizeDataPreview(latestDataPreview);
        renderDataReview();
    }

    if (notes) {
        notes.addEventListener('input', () => {
            if (currentReport) clientNotes.textContent = getClientNotes();
        });
    }

    if (dataFiles) {
        dataFiles.addEventListener('change', scanSelectedFiles);
    }

    if (editButton) {
        editButton.addEventListener('click', enterIntakeState);
    }

    documentTabs.forEach(tab => {
        tab.addEventListener('click', () => setDocumentTab(tab.dataset.scopeifyTab || 'sow'));
    });

    downloadButton.addEventListener('click', downloadCsv);
    applyInitialParams();
})();
