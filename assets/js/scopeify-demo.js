(function () {
    const form = document.getElementById('scopeify-form');
    if (!form) return;

    const shell = form.closest('.scopeify-demo-shell');
    const hypothesis = document.getElementById('scopeify-hypothesis');
    const notes = document.getElementById('scopeify-notes');
    const dataFiles = document.getElementById('scopeify-data-files');
    const extendedSearch = document.getElementById('scopeify-extended-search');
    const moreOptions = document.getElementById('scopeify-more');
    const exampleButton = document.getElementById('scopeify-example');
    const submitButton = document.getElementById('scopeify-submit');
    const statusPill = document.getElementById('scopeify-status-pill');
    const sampleBanner = document.getElementById('scopeify-sample-banner');
    const sampleBannerText = document.getElementById('scopeify-sample-banner-text');
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
    const reviewRequestButton = document.getElementById('scopeify-review-request');
    const reviewDialog = document.getElementById('scopeify-review-dialog');
    const reviewForm = document.getElementById('scopeify-review-form');
    const reviewFields = document.getElementById('scopeify-review-fields');
    const reviewReceipt = document.getElementById('scopeify-review-receipt');
    const reviewReceiptMessage = document.getElementById('scopeify-review-receipt-message');
    const reviewReference = document.getElementById('scopeify-review-reference');
    const reviewRefreshButton = document.getElementById('scopeify-review-refresh');
    const reviewError = document.getElementById('scopeify-review-error');
    const reviewSubmitButton = document.getElementById('scopeify-review-submit');
    const reviewName = document.getElementById('scopeify-review-name');
    const reviewEmail = document.getElementById('scopeify-review-email');
    const reviewOrganization = document.getElementById('scopeify-review-organization');
    const reviewConsent = document.getElementById('scopeify-review-consent');
    const documentTabs = Array.from(document.querySelectorAll('[data-scopeify-tab]'));
    const documentPanels = Array.from(document.querySelectorAll('.scopeify-document-panel'));
    const feedbackProgress = document.getElementById('scopeify-feedback-progress');
    const feedbackList = document.getElementById('scopeify-feedback-list');
    const reportArticle = document.querySelector('.scopeify-report');
    const progressPanel = document.getElementById('scopeify-progress');
    const progressBar = document.getElementById('scopeify-progress-bar');
    const progressMessage = document.getElementById('scopeify-progress-message');
    const progressElapsed = document.getElementById('scopeify-progress-elapsed');
    const progressStages = Array.from(document.querySelectorAll('[data-scopeify-stage]'));
    const DEFAULT_SCOPEIFY_API_BASE = 'https://scopeify-api.orchestrated.bio';
    const LIVE_API_HOSTS = new Set(['orchestrated.bio', 'www.orchestrated.bio', 'orchestrated-bio.github.io']);
    const SCOPEIFY_API_TIMEOUT_MS = 12000;
    const SCOPEIFY_API_MAX_ATTEMPTS = 2;
    const SCOPEIFY_JOB_POLL_MS = 900;
    const SCOPEIFY_JOB_MAX_POLLS = 180;
    const MAX_SCHEMA_FILES = 8;
    const MAX_PROFILE_COLUMNS = 256;
    const MAX_SPREADSHEET_BYTES = 16 * 1024 * 1024;
    const scopeifyApiBase = getScopeifyApiBase();

    const MAX_TEXT_PREVIEW_BYTES = 160000;
    const DATA_PREVIEW_SCHEMA_VERSION = 'scopeify.client_data_preview.v1';

    let currentReport = null;
    let currentDraftJobId = '';
    let partialInventoryJobId = '';
    let activeRunId = 0;
    let documentTabChosen = false;
    let currentReviewReceipt = null;
    let dataScanReview = 'No local files selected.';
    let latestDataPreview = createEmptyDataPreview();
    let dataScanPromise = Promise.resolve();

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getScopeifyApiBase() {
        const explicit = typeof window.SCOPEIFY_API_BASE === 'string' ? window.SCOPEIFY_API_BASE.trim() : '';
        if (explicit && isAllowedApiBase(explicit)) return explicit.replace(/\/+$/, '');

        if (LIVE_API_HOSTS.has(window.location.hostname)) return DEFAULT_SCOPEIFY_API_BASE;

        const isLocalPage = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
        if (isLocalPage) {
            const configured = new URLSearchParams(window.location.search).get('scopeify_api');
            if (configured && isAllowedApiBase(configured)) return configured.replace(/\/+$/, '');
        }
        return '';
    }

    function isAllowedApiBase(value) {
        try {
            const parsed = new URL(value, window.location.href);
            if (parsed.origin === new URL(DEFAULT_SCOPEIFY_API_BASE).origin) return true;
            return ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname)
                && ['http:', 'https:'].includes(parsed.protocol);
        } catch (error) {
            return false;
        }
    }

    function formatGeneratedDate(date) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
    }

    function formatIsoGeneratedDate(value) {
        if (!value) return formatGeneratedDate(new Date());
        const date = new Date(`${value}T00:00:00Z`);
        return Number.isNaN(date.getTime()) ? value : formatGeneratedDate(date);
    }

    function formatHourRange(min, max) {
        const lower = Number(min || 0);
        const upper = Number(max || 0);
        if (!lower && !upper) return 'Pending';
        if (lower === upper) return `${lower}`;
        return `${lower}-${upper}`;
    }

    function compactSowTitle(baseReport, sowTitleText) {
        const titleText = String(sowTitleText || '').trim();
        if (!titleText) return baseReport.sowTitle || 'Statement of Work: public-data feasibility review';
        return titleText;
    }

    function wait(ms) {
        return new Promise(resolve => window.setTimeout(resolve, ms));
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

    function setDocumentTab(tabName) {
        documentTabs.forEach(tab => {
            const isActive = tab.dataset.scopeifyTab === tabName;
            tab.classList.toggle('is-active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
            tab.tabIndex = isActive ? 0 : -1;
        });

        documentPanels.forEach(panel => {
            const isActive = panel.id === `scopeify-panel-${tabName}`;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });
    }

    function formatFeedbackStatus(status) {
        return String(status || 'pending').replace(/_/g, ' ');
    }

    function makeFeedbackItem(label, status, severity, message, detail) {
        return {
            label,
            status,
            severity,
            message,
            detail: detail || ''
        };
    }

    function initialFeedback() {
        return [
            makeFeedbackItem(
                'File check',
                latestDataPreview.validation.status === 'no_files' ? 'complete' : 'needs_review',
                latestDataPreview.validation.status === 'valid' || latestDataPreview.validation.status === 'no_files' ? 'info' : 'review',
                latestDataPreview.validation.status === 'no_files'
                    ? 'No local files selected.'
                    : dataScanReview,
                latestDataPreview.aggregate.risk_flags.join(', ')
            ),
            makeFeedbackItem(
                'Evidence search',
                'pending',
                'info',
                'Runs after submission.'
            ),
            makeFeedbackItem(
                'Statement of Work',
                'pending',
                'info',
                'Submit the form to draft the SOW.'
            )
        ];
    }

    function fallbackFeedback(message) {
        return [
            makeFeedbackItem(
                'Recovery',
                'needs_review',
                'review',
                'No result was issued.',
                message || 'Retry or schedule a consultation.'
            ),
            makeFeedbackItem(
                'Statement of Work',
                'blocked',
                'blocker',
                'No draft or inventory is available.'
            )
        ];
    }

    function feedbackFromDraftResponse(response) {
        const hasSow = Boolean(response && response.sow);
        const archive = response && response.archive_search;
        const sourceResults = archive && Array.isArray(archive.source_results) ? archive.source_results : [];
        const returned = sourceResults.reduce((total, source) => total + Number(source.returned_count || 0), 0);
        const searched = sourceResults.filter(source => source.status === 'searched').map(source => source.source).join(', ');
        const dataStatus = response && response.data_preview_status ? response.data_preview_status : latestDataPreview.validation.status;
        const riskFlags = response && Array.isArray(response.data_preview_risk_flags) ? response.data_preview_risk_flags : latestDataPreview.aggregate.risk_flags;
        return [
            makeFeedbackItem(
                'File check',
                dataStatus === 'invalid' ? 'blocked' : riskFlags.length ? 'needs_review' : 'complete',
                dataStatus === 'invalid' ? 'blocker' : riskFlags.length ? 'review' : 'info',
                riskFlags.length ? `Review: ${riskFlags.join(', ')}.` : dataStatus === 'no_files' ? 'No local files selected.' : 'No structure issues found.',
                dataScanReview
            ),
            makeFeedbackItem(
                'Evidence search',
                archive ? (archive.status === 'searched' ? 'complete' : 'needs_review') : 'complete',
                archive && archive.status === 'searched' ? 'info' : 'review',
                archive
                    ? `${searched || 'Sources'}: ${returned} candidates.`
                    : 'Archive search not run.',
                archive && Array.isArray(archive.warnings) ? archive.warnings.slice(0, 3).join(' ') : ''
            ),
            makeFeedbackItem(
                'Statement of Work',
                hasSow ? 'complete' : 'needs_review',
                hasSow ? 'info' : 'blocker',
                hasSow ? `${response.sow.estimated_hours_min}-${response.sow.estimated_hours_max} hours; review required before quoting.` : 'More project detail needed.',
                hasSow ? '' : response && response.next_step ? response.next_step : ''
            )
        ];
    }

    function renderFeedback(items, progressText) {
        if (feedbackProgress) feedbackProgress.textContent = progressText || 'Ready';
        if (!feedbackList) return;
        const safeItems = Array.isArray(items) && items.length
            ? items
            : initialFeedback();
        feedbackList.innerHTML = safeItems.map(item => `
            <li class="scopeify-feedback-item" data-severity="${escapeHtml(item.severity || 'info')}">
                <div>
                    <strong class="scopeify-feedback-name">${escapeHtml(item.label || 'Scope check')}</strong>
                    <span class="scopeify-feedback-state">${escapeHtml(formatFeedbackStatus(item.status))}</span>
                </div>
                <p class="scopeify-feedback-message">
                    ${escapeHtml(item.message || '')}
                    ${item.detail ? `<span class="scopeify-feedback-detail">${escapeHtml(item.detail)}</span>` : ''}
                </p>
            </li>
        `).join('');
    }

    function neutralProjectReport(state) {
        const isFailure = state === 'failed';
        const projectQuestion = hypothesis.value.trim() || 'Project question pending';
        const sourceRows = liveArchiveSources().map(source => ({
            source,
            query: isFailure ? 'Not completed' : 'Pending source-specific plan',
            found: 0,
            screened: 0,
            selected: 0,
            note: isFailure ? 'Search unavailable' : 'Search pending'
        }));
        return {
            title: isFailure ? 'Scoping request not completed' : 'Preparing project scope',
            status: isFailure ? 'Unavailable' : 'Running',
            decision: isFailure ? 'No result issued' : 'Scoping in progress',
            summary: isFailure
                ? 'Scopeify could not return a project-specific result.'
                : `Preparing a SOW for: ${projectQuestion}`,
            searchLabel: isFailure ? 'Live search not completed' : 'Live search pending',
            shortlistLabel: isFailure ? 'No inventory issued' : 'Inventory pending',
            estimate: {
                title: isFailure ? 'Estimate unavailable' : 'Estimate pending',
                hours: 'Pending',
                rationale: isFailure
                    ? 'No estimate issued.'
                    : 'Calculating hours from the planned work.',
                outputs: [
                    'Nextflow pipeline when raw-data processing is applicable',
                    'Quarto HTML analysis report',
                    'Slide deck plus review meeting',
                    'Exported XLSX dataset inventory and project estimates'
                ]
            },
            sowTitle: 'Statement of Work',
            sowWindow: isFailure ? 'Not issued' : 'Generation in progress',
            generatedDate: new Date().toISOString().slice(0, 10),
            sowMeta: [
                { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: 'Orchestrated Biosciences' }
            ],
            sowObjective: isFailure
                ? 'Retry the scoping workflow before relying on an estimate.'
                : 'Define the work needed to address the project question.',
            sowDecision: isFailure
                ? 'No project recommendation was issued. Retry or schedule a consultation.'
                : 'Pending project and evidence checks.',
            sow: [{
                phase: '1',
                workstream: isFailure ? 'Recovery' : 'Intake and evidence review',
                detail: isFailure ? 'Retry the request.' : 'Check the question, sources, and analysis route.',
                output: isFailure ? 'Retry or consultation' : 'Draft SOW and evidence workbook',
                hours: 'Pending'
            }],
            sowAssumptions: ['Human review is required before quoting.'],
            sowExclusions: ['No estimate is issued until the request completes.'],
            clientNotesReflected: getClientNotes(),
            dataPreviewConsiderations: [],
            sources: sourceRows,
            criteria: isFailure
                ? ['No records selected.']
                : ['Queries and selection notes appear in the workbook.'],
            evidence: [],
            selected: 0,
            screened: 0,
            found: 0,
            feedback: []
        };
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
        documentTabChosen = false;
        setDocumentTab('sow');
        moveShellToTop();
        window.setTimeout(() => {
            if (reportArticle) reportArticle.focus({ preventScroll: true });
        }, 0);
    }

    function enterIntakeState() {
        if (!shell) return;
        // Abandon any in-flight run so its polling stops writing to a screen the user left.
        activeRunId += 1;
        stopProgressPanel();
        setSubmitBusy(false);
        if (reportArticle) reportArticle.setAttribute('aria-busy', 'false');
        currentDraftJobId = '';
        currentReviewReceipt = null;
        if (reviewRequestButton) {
            reviewRequestButton.disabled = true;
            reviewRequestButton.textContent = 'Request human review';
        }
        shell.classList.remove('scopeify-is-submitted');
        moveShellToTop();
        window.setTimeout(() => hypothesis.focus(), 180);
    }

    function getClientNotes() {
        const value = notes ? notes.value.trim() : '';
        return value || 'None provided.';
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
        return /\.(csv|tsv|txt|json|jsonl|ndjson)$/i.test(file.name) || /^text\//.test(file.type);
    }

    function isSpreadsheet(file) {
        return /\.(xlsx|xls|xlsm|ods)$/i.test(file.name);
    }

    function normalizeHeader(header) {
        return String(header || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
    }

    function safeSchemaLabel(value, fallback, maxLength) {
        const cleaned = String(value == null ? '' : value)
            .replace(/[\u0000-\u001f\u007f]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        return (cleaned || fallback).slice(0, maxLength);
    }

    function safeFileName(fileName) {
        return safeSchemaLabel(String(fileName || '').replace(/[\\/]/g, '_'), 'unnamed_file', 255);
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
        return { rows: rows.slice(0, 251), unclosedQuote: inQuotes };
    }

    function chooseDelimiter(text) {
        const sample = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 12).join('\n');
        const candidates = ['\t', ',', ';', '|'];
        return candidates
            .map(delimiter => ({ delimiter, count: (sample.split(delimiter).length - 1) }))
            .sort((left, right) => right.count - left.count)[0].delimiter;
    }

    function delimiterName(delimiter) {
        return {
            '\t': 'tab',
            ',': 'comma',
            ';': 'semicolon',
            '|': 'pipe'
        }[delimiter] || null;
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

    function profileColumns(headers, rows) {
        return headers.map((header, index) => {
            const values = getColumnValues(rows, index);
            const missingCount = values.filter(isMissingValue).length;
            const primitiveType = inferPrimitiveType(values);
            const role = inferColumnRole(header, primitiveType);
            return {
                name: safeSchemaLabel(header, `unnamed_${index + 1}`, 256),
                normalized_name: normalizeHeader(header).slice(0, 256) || `column_${index + 1}`,
                index,
                inferred_type: primitiveType,
                inferred_role: role.role,
                role_confidence: role.confidence,
                missing_count: missingCount,
                missing_rate: rows.length ? Number((missingCount / rows.length).toFixed(3)) : 0,
                unique_count_preview: new Set(values.filter(value => !isMissingValue(value)).map(value => value.toLowerCase())).size,
                value_examples_redacted: true
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
            summarizeFieldList('sample ID', roles.sample_id_fields, 'sample ID not found'),
            summarizeFieldList('outcome', roles.outcome_fields, 'outcome not found'),
            summarizeFieldList('group', roles.treatment_fields, 'group not found'),
            summarizeFieldList('batch', roles.batch_fields, 'batch not found')
        ];
        const riskMessages = filePreview.risk_flags.map(flag => flag.message);
        const riskSummary = riskMessages.length ? `Review: ${riskMessages.slice(0, 3).join('; ')}` : 'No structure issues found';

        return `${filePreview.file_name}: ${filePreview.columns.length || 'unknown'} columns; ${filePreview.rows_previewed || 'unknown'} rows checked. ${fieldSummaries.join('; ')}. ${riskSummary}. Values stayed local.`.slice(0, 600);
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
        const observedColumnCount = headers.length;
        const cleanHeaders = headers
            .slice(0, MAX_PROFILE_COLUMNS)
            .map((header, index) => safeSchemaLabel(header, `unnamed_${index + 1}`, 256));
        const boundedRows = rows.map(row => row.slice(0, MAX_PROFILE_COLUMNS));
        const formulaCellCount = parserMetadata.formulaCellCount || boundedRows.reduce(
            (total, row) => total + row.filter(value => /^\s*[=+\-@]/.test(String(value || ''))).length,
            0
        );
        const columns = profileColumns(cleanHeaders, boundedRows);
        const candidateRoles = {
            sample_id_fields: fieldsByRole(columns, ['sample_id']),
            outcome_fields: fieldsByRole(columns, ['outcome']),
            treatment_fields: fieldsByRole(columns, ['treatment']),
            batch_fields: fieldsByRole(columns, ['batch']),
            timepoint_fields: fieldsByRole(columns, ['timepoint']),
            covariate_fields: fieldsByRole(columns, ['covariate']),
            design_field_candidates: fieldsByRole(columns, ['candidate_design_field'])
        };
        const riskFlags = buildRiskFlags(file.name, columns, boundedRows);
        if (observedColumnCount > MAX_PROFILE_COLUMNS) {
            riskFlags.push(makeFlag(
                'column_profile_limit',
                'review',
                `${observedColumnCount} columns observed; schema summary limited to the first ${MAX_PROFILE_COLUMNS}`,
                [file.name]
            ));
        }
        if (parserMetadata.unclosedQuote) {
            riskFlags.push(makeFlag('unclosed_quote', 'blocker', 'an unclosed quoted field was detected', [file.name]));
        }
        if (parserMetadata.rowWidthMismatch) {
            riskFlags.push(makeFlag('row_width_mismatch', 'review', 'rows with inconsistent field counts were detected', [file.name]));
        }
        if (formulaCellCount) {
            riskFlags.push(makeFlag(
                'formula_cells_present',
                'info',
                `${formulaCellCount} formula-like cells detected; formulas were not executed`,
                [parserMetadata.selectedSheet || file.name]
            ));
        }
        if (parserMetadata.hiddenSheetCount) {
            riskFlags.push(makeFlag(
                'hidden_sheets_present',
                'review',
                `${parserMetadata.hiddenSheetCount} hidden workbook sheet(s) require review`,
                [file.name]
            ));
        }
        const filePreview = {
            file_name: safeFileName(file.name),
            extension: getFileExtension(file.name),
            mime_type: file.type || 'unknown',
            size_bytes: file.size,
            parser_status: boundedRows.length ? 'parsed' : 'empty',
            delimiter: parserMetadata.delimiter || null,
            rows_previewed: boundedRows.length,
            columns_observed: observedColumnCount,
            columns,
            workbook_sheet_count: parserMetadata.workbookSheetCount || 0,
            sheet_names: parserMetadata.sheetNames || [],
            selected_sheet: parserMetadata.selectedSheet || '',
            candidate_roles: candidateRoles,
            risk_flags: riskFlags,
            llm_prompt_summary: '',
            summary: ''
        };
        if (!boundedRows.length) {
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
            const summary = `${file.name}: JSON could not be parsed.`;
            return {
                file_name: safeFileName(file.name),
                extension: getFileExtension(file.name),
                mime_type: file.type || 'application/json',
                size_bytes: file.size,
                parser_status: 'parse_error',
                delimiter: null,
                rows_previewed: 0,
                columns_observed: 0,
                columns: [],
                workbook_sheet_count: 0,
                sheet_names: [],
                selected_sheet: '',
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

    function profileJsonLinesFile(file, text) {
        const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 250);
        try {
            const records = lines.map(line => JSON.parse(line)).filter(item => item && typeof item === 'object' && !Array.isArray(item));
            const headers = [...new Set(records.flatMap(record => Object.keys(record)))];
            const rows = records.map(record => headers.map(header => record[header] == null ? '' : String(record[header])));
            return profileParsedTable(file, headers, rows, { delimiter: null });
        } catch (error) {
            const summary = `${file.name}: JSON Lines selected, but at least one inspected line was not a valid object.`;
            return {
                file_name: safeFileName(file.name),
                extension: getFileExtension(file.name),
                mime_type: file.type || 'application/x-ndjson',
                size_bytes: file.size,
                parser_status: 'parse_error',
                delimiter: null,
                rows_previewed: 0,
                columns_observed: 0,
                columns: [],
                workbook_sheet_count: 0,
                sheet_names: [],
                selected_sheet: '',
                candidate_roles: {
                    sample_id_fields: [],
                    outcome_fields: [],
                    treatment_fields: [],
                    batch_fields: [],
                    timepoint_fields: [],
                    covariate_fields: [],
                    design_field_candidates: []
                },
                risk_flags: [makeFlag('invalid_json_lines', 'blocker', 'JSON Lines preview contains an invalid record', [file.name])],
                llm_prompt_summary: summary,
                summary
            };
        }
    }

    function profileTextFile(file, text) {
        text = text.replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(line => line.trim()).slice(0, 250);
        if (!lines.length) {
            return profileParsedTable(file, [], [], { delimiter: null });
        }

        if (/\.json$/i.test(file.name)) {
            return profileJsonFile(file, text);
        }
        if (/\.(jsonl|ndjson)$/i.test(file.name)) {
            return profileJsonLinesFile(file, text);
        }

        const delimiter = chooseDelimiter(text);
        const parsed = parseDelimitedRows(text, delimiter);
        const parsedRows = parsed.rows;
        const headers = parsedRows[0] || [];
        const rows = parsedRows.slice(1, 251);
        const expectedWidth = (parsedRows[0] || []).length;
        const rowWidthMismatch = rows.some(row => row.length !== expectedWidth);
        return profileParsedTable(file, headers, rows, {
            delimiter: delimiterName(delimiter),
            unclosedQuote: parsed.unclosedQuote,
            rowWidthMismatch
        });
    }

    async function profileSpreadsheetFile(file) {
        if (file.size > MAX_SPREADSHEET_BYTES) {
            const preview = profileBinaryFile(file);
            preview.risk_flags = [makeFlag(
                'spreadsheet_size_limit',
                'review',
                `workbook exceeds the ${formatBytes(MAX_SPREADSHEET_BYTES)} browser inspection limit`,
                [file.name]
            )];
            preview.summary = `${file.name}: too large for browser review (${formatBytes(file.size)}).`;
            preview.llm_prompt_summary = preview.summary;
            return preview;
        }
        if (!window.XLSX) {
            const preview = profileBinaryFile(file);
            preview.risk_flags = [makeFlag('spreadsheet_parser_unavailable', 'blocker', 'workbook parser is unavailable', [file.name])];
            preview.summary = `${file.name}: workbook parser did not load, so no sheet or column structure was inspected.`;
            preview.llm_prompt_summary = preview.summary;
            return preview;
        }

        try {
            const workbook = window.XLSX.read(await file.arrayBuffer(), {
                type: 'array',
                cellFormula: true,
                cellHTML: false,
                cellNF: false,
                cellStyles: false,
                cellDates: false,
                dense: false
            });
            let sheetNames = (workbook.SheetNames || []).slice(0, 20);
            const sheetMetadata = workbook.Workbook && Array.isArray(workbook.Workbook.Sheets)
                ? workbook.Workbook.Sheets
                : [];
            const hiddenByName = new Map(sheetMetadata.map((item, index) => [
                item.name || workbook.SheetNames[index],
                Number(item.Hidden || 0)
            ]));
            const hiddenSheetCount = sheetMetadata.filter(item => Number(item.Hidden || 0) > 0).length;
            const selectedSheet = (workbook.SheetNames || []).find(name => {
                const worksheet = workbook.Sheets[name];
                return Number(hiddenByName.get(name) || 0) === 0 && worksheet && worksheet['!ref'];
            }) || '';
            if (selectedSheet && !sheetNames.includes(selectedSheet)) {
                sheetNames = [...sheetNames.slice(0, 19), selectedSheet];
            }

            if (!selectedSheet) {
                const preview = profileBinaryFile(file);
                preview.workbook_sheet_count = (workbook.SheetNames || []).length;
                preview.sheet_names = sheetNames;
                preview.risk_flags = [makeFlag(
                    'no_visible_worksheet',
                    'review',
                    'no visible readable worksheet data were found; hidden sheets were not profiled',
                    [file.name]
                )];
                preview.summary = `${file.name}: workbook opened locally, but no visible readable worksheet data were found. Hidden sheets were not profiled.`;
                preview.llm_prompt_summary = preview.summary;
                return preview;
            }

            const worksheet = workbook.Sheets[selectedSheet];
            const tableRows = window.XLSX.utils.sheet_to_json(worksheet, {
                header: 1,
                raw: false,
                defval: '',
                blankrows: false,
                range: 0
            }).slice(0, 251);
            const headers = (tableRows[0] || []).map(value => String(value || ''));
            const rows = tableRows.slice(1);
            const expectedWidth = headers.length;
            const formulaCellCount = Object.keys(worksheet).slice(0, 100000).reduce((total, address) => {
                if (address.startsWith('!')) return total;
                const cell = worksheet[address];
                return total + (cell && typeof cell.f === 'string' ? 1 : 0);
            }, 0);
            return profileParsedTable(file, headers, rows, {
                delimiter: null,
                rowWidthMismatch: rows.some(row => row.length !== expectedWidth),
                formulaCellCount,
                hiddenSheetCount,
                workbookSheetCount: (workbook.SheetNames || []).length,
                sheetNames,
                selectedSheet
            });
        } catch (error) {
            const preview = profileBinaryFile(file);
            preview.parser_status = 'parse_error';
            preview.risk_flags = [makeFlag('workbook_parse_failed', 'blocker', 'workbook could not be inspected locally', [file.name])];
            preview.summary = `${file.name}: workbook could not be inspected. Encrypted, damaged, or unsupported workbook features may require consultation review.`;
            preview.llm_prompt_summary = preview.summary;
            return preview;
        }
    }

    function profileBinaryFile(file) {
        const summary = `${file.name}: ${formatBytes(file.size)} selected. This format is recognized, but only file metadata can be inspected safely in the current browser parser.`;
        return {
            file_name: safeFileName(file.name),
            extension: getFileExtension(file.name),
            mime_type: file.type || 'unknown',
            size_bytes: file.size,
            parser_status: 'metadata_only',
            delimiter: null,
            rows_previewed: 0,
            columns_observed: 0,
            columns: [],
            workbook_sheet_count: 0,
            sheet_names: [],
            selected_sheet: '',
            candidate_roles: {
                sample_id_fields: [],
                outcome_fields: [],
                treatment_fields: [],
                batch_fields: [],
                timepoint_fields: [],
                covariate_fields: [],
                design_field_candidates: []
            },
            risk_flags: [makeFlag('metadata_only', 'review', 'schema inspection is not available for this file format', [file.name])],
            llm_prompt_summary: summary,
            summary
        };
    }

    function validateClientDataPreview(preview) {
        const errors = [];
        const warnings = [];
        let hasBlocker = false;
        preview.files.forEach(filePreview => {
            const result = validateFilePreview(filePreview);
            errors.push(...result.errors);
            warnings.push(...result.warnings);
            filePreview.risk_flags.forEach(flag => {
                warnings.push(`${filePreview.file_name}: ${flag.code}`);
                if (flag.severity === 'blocker') hasBlocker = true;
            });
        });

        return {
            status: errors.length || hasBlocker ? 'invalid' : warnings.length ? 'valid_with_warnings' : 'valid',
            errors: errors.slice(0, 32),
            warnings: [...new Set(warnings)].slice(0, 32)
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
            return 'No local files selected.';
        }

        const summaries = preview.files.map(file => file.summary);
        const validationText = preview.validation.status === 'valid'
            ? 'No structure issues found.'
            : `Review: ${[...preview.validation.errors, ...preview.validation.warnings].slice(0, 3).join('; ')}`;
        return `${summaries.join(' ')} ${validationText}`;
    }

    function renderDataReview(textOverride) {
        if (dataReview) {
            dataReview.textContent = textOverride || dataScanReview;
            dataReview.dataset.previewSchema = latestDataPreview.schema_version;
            dataReview.dataset.previewStatus = latestDataPreview.validation.status;
        }
    }

    function renderEstimate(report) {
        if (estimateHours) estimateHours.textContent = report.estimate.hours;
        if (estimateRationale) estimateRationale.textContent = report.estimate.rationale;
        if (outputsList) outputsList.innerHTML = report.estimate.outputs.map(item => `<li>${escapeHtml(item)}</li>`).join('');
        if (clientNotes) clientNotes.textContent = report.clientNotesReflected || getClientNotes();
        const dataConsiderations = Array.isArray(report.dataPreviewConsiderations) && report.dataPreviewConsiderations.length
            ? report.dataPreviewConsiderations.join(' ')
            : '';
        renderDataReview(dataConsiderations);
    }

    function renderSow(report) {
        if (sowMeta) {
            const generatedDate = report.generatedDate
                ? formatIsoGeneratedDate(report.generatedDate)
                : formatGeneratedDate(new Date());
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
                    <strong role="cell" data-label="Source">${escapeHtml(item.source)}</strong>
                    <span role="cell" data-label="Query focus">${auditQueryMarkup(item.query)}${item.displayNote ? `<span class="scopeify-audit-note">${escapeHtml(item.displayNote)}</span>` : ''}</span>
                    <span role="cell" data-label="Found">${item.found}</span>
                    <span role="cell" data-label="Screened">${item.screened}</span>
                    <span role="cell" data-label="Selected">${item.selected}</span>
                </div>
            `).join('')}
        `;

        criteriaList.innerHTML = report.criteria.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    }

    function renderEvidence(report) {
        if (!evidenceList) return;
        if (!report.evidence.length) {
            evidenceList.innerHTML = `
                <p class="scopeify-empty-inventory">No selected inventory rows were returned. Review source warnings, refine the hypothesis, or use the consultation step before treating public data as available.</p>
            `;
            return;
        }
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
                        <strong role="cell" data-label="Record">${escapeHtml(item.id)}<small>${escapeHtml(item.source)} · ${escapeHtml(item.year)}</small></strong>
                        <span role="cell" data-label="Role">${escapeHtml(item.fit)}<br>${escapeHtml(item.title)}</span>
                        <span role="cell" data-label="Cohort / technology"><b>Cohort:</b> ${escapeHtml(item.cohort)}<br><b>Technology:</b> ${escapeHtml(item.technology)}</span>
                        <span role="cell" data-label="Availability / risk"><b>Availability:</b> ${escapeHtml(item.availability)}<br><b>Risk:</b> ${escapeHtml(item.risk)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    function renderReport(report, statusText) {
        currentReport = report;
        if (reportArticle) reportArticle.setAttribute('aria-busy', 'false');
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
        renderFeedback(report.feedback, statusText || 'Ready for review');
        downloadButton.disabled = false;
    }

    async function fetchScopeifyJson(url, payload, timeoutMs, method, requestHeaders) {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
        const requestMethod = method || 'POST';
        const options = {
            method: requestMethod,
            credentials: 'omit',
            signal: controller.signal,
            headers: { ...(requestHeaders || {}) }
        };
        if (requestMethod !== 'GET') {
            options.headers['content-type'] = 'application/json';
            options.body = JSON.stringify(payload);
        }
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                const errorPayload = await response.json().catch(() => ({}));
                const error = new Error(
                    errorPayload.detail
                    || errorPayload.error?.message
                    || `Scopeify API returned ${response.status}`
                );
                error.status = response.status;
                const retryAfter = Number(response.headers.get('retry-after') || 0);
                error.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0
                    ? Math.min(retryAfter * 1000, 30000)
                    : 0;
                throw error;
            }
            return response.json();
        } catch (error) {
            if (error && error.name === 'AbortError') {
                throw new Error(`Scopeify API timed out after ${Math.round(timeoutMs / 1000)} seconds`);
            }
            throw error;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    function shouldRetryScopeify(error) {
        if (!error || !error.status) return true;
        return error.status === 408 || error.status === 429 || error.status >= 500;
    }

    async function postScopeify(endpoint, payload, requestHeaders, maxAttempts) {
        if (!scopeifyApiBase) throw new Error('Scopeify API is not configured for this host.');

        const url = `${scopeifyApiBase}${endpoint}`;
        const attemptLimit = Number.isInteger(maxAttempts) ? Math.max(1, maxAttempts) : SCOPEIFY_API_MAX_ATTEMPTS;
        let lastError = null;
        for (let attempt = 1; attempt <= attemptLimit; attempt += 1) {
            try {
                return await fetchScopeifyJson(url, payload, SCOPEIFY_API_TIMEOUT_MS, 'POST', requestHeaders);
            } catch (error) {
                lastError = error;
                if (attempt >= attemptLimit || !shouldRetryScopeify(error)) break;
                await wait(error.retryAfterMs || 450 * attempt);
            }
        }

        throw lastError || new Error('Scopeify API did not return a response');
    }

    async function getScopeify(endpoint, requestHeaders) {
        if (!scopeifyApiBase) throw new Error('Scopeify API is not configured for this host.');

        const url = `${scopeifyApiBase}${endpoint}`;
        let lastError = null;
        for (let attempt = 1; attempt <= SCOPEIFY_API_MAX_ATTEMPTS; attempt += 1) {
            try {
                return await fetchScopeifyJson(url, null, SCOPEIFY_API_TIMEOUT_MS, 'GET', requestHeaders);
            } catch (error) {
                lastError = error;
                if (attempt >= SCOPEIFY_API_MAX_ATTEMPTS || !shouldRetryScopeify(error)) break;
                await wait(error.retryAfterMs || 450 * attempt);
            }
        }

        throw lastError || new Error('Scopeify API did not return a response');
    }

    // ENA and GSA/CNSA answer far more slowly than the rest, and ENA largely mirrors the
    // INSDC records SRA already exposes, so they are opt-in rather than part of every run.
    const EXTENDED_ARCHIVE_SOURCES = ['ENA', 'GSA/CNSA'];

    function extendedSearchRequested() {
        return Boolean(extendedSearch && extendedSearch.checked);
    }

    function liveArchiveSources() {
        const sources = ['PubMed', 'GEO', 'SRA', 'bioRxiv'];
        return extendedSearchRequested() ? sources.concat(EXTENDED_ARCHIVE_SOURCES) : sources;
    }

    function buildDraftPayload() {
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
            client_data_preview: latestDataPreview,
            allowed_archive_sources: liveArchiveSources(),
            expected_response_schema: 'scopeify.sow_draft.v1'
        };
    }

    function screenedOutCount(warnings) {
        return (warnings || []).reduce((total, warning) => {
            const match = String(warning || '').match(/screened out\s+(\d+)/i);
            return total + (match ? Number(match[1]) : 0);
        }, 0);
    }

    // "screened out N records" is already reported by the Screened column, so it is dropped
    // from the displayed note. Caveats that qualify what the counts mean are kept.
    function auditCaveats(warnings) {
        return warnings.filter(warning => !/screened out\s+\d+/i.test(String(warning)));
    }

    const AUDIT_QUERY_INLINE_LIMIT = 96;

    // Backend queries run to several hundred characters. Show a readable head and keep the
    // exact query one click away; the workbook always carries the full string.
    function auditQueryMarkup(query) {
        const text = String(query || 'Query unavailable');
        if (text.length <= AUDIT_QUERY_INLINE_LIMIT) {
            return `<span class="scopeify-audit-query">${escapeHtml(text)}</span>`;
        }
        const head = text.slice(0, AUDIT_QUERY_INLINE_LIMIT).replace(/\s+\S*$/, '');
        return `
            <details class="scopeify-audit-query-details">
                <summary><span class="scopeify-audit-query">${escapeHtml(head)}…</span></summary>
                <code>${escapeHtml(text)}</code>
            </details>
        `;
    }

    function sourceResultToAudit(result) {
        const returned = Number(result.returned_count || 0);
        const warnings = Array.isArray(result.warnings) ? result.warnings.filter(Boolean) : [];
        const screenedOut = screenedOutCount(warnings);
        const note = result.status === 'searched'
            ? ['Live backend returned candidate records for inventory review', ...warnings].join(' ')
            : warnings[0] || 'Source not searched by the current backend adapter';
        return {
            source: result.source || 'Unknown',
            query: result.query || 'Query unavailable',
            found: Number(result.found_count || 0),
            screened: returned + screenedOut,
            selected: returned,
            // Full text goes to the workbook; the table shows a readable summary.
            note,
            displayNote: result.status === 'searched'
                ? auditCaveats(warnings).join(' ')
                : warnings[0] || 'Source not searched by the current backend adapter'
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
            url: record.url || '',
            authors: Array.isArray(record.authors) ? record.authors.join('; ') : '',
            pmid: record.pmid || '',
            doi: record.doi || '',
            citation: record.citation || '',
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
        const screened = sourceResults.reduce((total, result) => total + Number(result.returned_count || 0) + screenedOutCount(result.warnings || []), 0);
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
            screened,
            selected: liveEvidence.length,
            searchLabel: searchedSources
                ? `Live backend search: ${searchedSources}; ${timestamp}`
                : `Live backend search completed; ${timestamp}`,
            shortlistLabel: liveEvidence.length
                ? `${liveEvidence.length} live records returned for review`
                : 'No live records returned for review',
            sources: sourceResults.map(sourceResultToAudit),
            criteria: [
                'Review candidate records before selecting data for analysis.',
                'Source warnings and exclusions are saved in the workbook.'
            ],
            evidence: liveEvidence
        };
    }

    function reportFromDraftResponse(baseReport, response) {
        if (!response || !response.sow) {
            const questions = Array.isArray(response && response.warnings) ? response.warnings : [];
            return {
                ...baseReport,
                title: 'Scope clarification needed',
                decision: 'More project detail needed',
                summary: response && response.message ? response.message : 'Add more project detail before drafting the SOW.',
                estimate: {
                    title: 'Clarification needed',
                    hours: 'Pending',
                    rationale: 'Add the study system, data type, comparison, and intended decision.',
                    outputs: ['Clarified intake', 'Recommended next scoping path', 'Consultation agenda']
                },
                sowTitle: 'Statement of Work: clarification needed',
                sowWindow: 'Pending',
                generatedDate: '',
                sowMeta: [
                    { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                    { label: 'Prepared by', value: 'Orchestrated Biosciences' }
                ],
                sowObjective: 'Clarify the project question before preparing a consulting scope.',
                sowDecision: response && response.next_step ? response.next_step : 'Schedule a consultation or revise the intake with organism, modality, comparison, and intended output.',
                sow: [
                    { phase: '1', workstream: 'Clarify intake', detail: questions.join(' ') || 'Confirm organism, data type, comparison groups, and desired decision.', output: 'Scoped project question', hours: 'Pending' }
                ],
                sowAssumptions: ['The project question will be clarified before estimating the work.'],
                sowExclusions: ['No analysis or quote is included in this response.'],
                clientNotesReflected: getClientNotes(),
                dataPreviewConsiderations: [],
                evidence: []
            };
        }

        const sow = response.sow;
        const hours = `${formatHourRange(sow.estimated_hours_min, sow.estimated_hours_max)} hours`;
        const displayTitle = compactSowTitle(baseReport, sow.title);
        const phaseRows = (sow.phases || []).map(phase => ({
            phase: String(phase.phase || ''),
            workstream: phase.workstream || 'Workstream',
            detail: Array.isArray(phase.activities) ? phase.activities.join('; ') : '',
            output: phase.expected_output || '',
            hours: formatHourRange(phase.hours_min, phase.hours_max)
        }));
        const report = {
            ...baseReport,
            title: displayTitle.replace(/^Statement of Work:\s*/i, ''),
            status: response.status || 'validated',
            decision: 'Draft SOW generated',
            summary: sow.objective || baseReport.summary,
            estimate: {
                title: 'Estimated effort',
                hours,
                rationale: sow.expected_timeline || '',
                outputs: Array.isArray(sow.deliverables) ? sow.deliverables : baseReport.estimate.outputs
            },
            sowTitle: displayTitle,
            sowWindow: sow.expected_timeline || baseReport.sowWindow,
            generatedDate: sow.generated_date || '',
            sowMeta: [
                { label: 'Prepared for', value: sow.prepared_for || 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: sow.prepared_by || 'Orchestrated Biosciences' }
            ],
            sowObjective: sow.objective || baseReport.sowObjective,
            sowDecision: sow.scope_decision || baseReport.sowDecision,
            sow: phaseRows.length ? phaseRows : baseReport.sow,
            sowAssumptions: Array.isArray(sow.assumptions) ? sow.assumptions : baseReport.sowAssumptions,
            sowExclusions: Array.isArray(sow.exclusions) ? sow.exclusions : baseReport.sowExclusions,
            clientNotesReflected: sow.client_notes_reflected || getClientNotes(),
            dataPreviewConsiderations: Array.isArray(sow.data_preview_considerations) ? sow.data_preview_considerations : [],
            evidence: []
        };

        return response.archive_search
            ? mergeLiveArchiveResponse(report, response.archive_search)
            : report;
    }

    function markLiveSearchUnavailable(report, message) {
        const failedReport = neutralProjectReport('failed');
        return {
            ...failedReport,
            feedback: fallbackFeedback(message),
            clientNotesReflected: report.clientNotesReflected || getClientNotes()
        };
    }

    const SCOPEIFY_STAGE_ORDER = ['queued', 'reading_intake', 'searching_archives', 'drafting_sow', 'finished'];
    const SKELETON_WIDTHS = ['is-long', 'is-medium', 'is-short'];
    let jobStartedAt = 0;
    let elapsedTimerId = 0;

    function skeletonLines(count) {
        return Array.from({ length: count }, (_unused, index) =>
            `<span class="scopeify-skeleton scopeify-skeleton-line ${SKELETON_WIDTHS[index % SKELETON_WIDTHS.length]}"></span>`
        ).join('');
    }

    function applySkeleton(panel) {
        if (!panel) return;
        panel.querySelectorAll('[data-scopeify-skeleton]').forEach(node => {
            node.innerHTML = skeletonLines(Number(node.dataset.scopeifySkeleton) || 2);
        });
    }

    function clearSkeleton(panel) {
        if (!panel) return;
        panel.querySelectorAll('[data-scopeify-skeleton]').forEach(node => {
            node.querySelectorAll('.scopeify-skeleton').forEach(bar => bar.remove());
        });
    }

    // #scopeify-feedback-progress is an aria-live region. Polling ticks every 900ms, so
    // announcing a raw percentage there would queue dozens of interruptions per job.
    // Announce the stage instead: it changes about four times and carries real meaning.
    const SCOPEIFY_STAGE_LABELS = {
        queued: 'Queued',
        reading_intake: 'Reading intake',
        searching_archives: 'Searching archives',
        drafting_sow: 'Drafting statement of work',
        finished: 'Complete'
    };

    function progressTextForJob(job) {
        const progress = Number(job && job.progress || 0);
        if (progress >= 100) return 'Complete';
        const stage = job && job.stage;
        return SCOPEIFY_STAGE_LABELS[stage] || `${progress}%`;
    }

    function formatElapsed(ms) {
        const totalSeconds = Math.max(0, Math.round(ms / 1000));
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return minutes ? `${minutes}m ${String(seconds).padStart(2, '0')}s` : `${seconds}s`;
    }

    function tickElapsed() {
        if (!progressElapsed || !jobStartedAt) return;
        progressElapsed.textContent = formatElapsed(Date.now() - jobStartedAt);
    }

    function setSubmitBusy(busy) {
        if (submitButton) {
            submitButton.disabled = busy;
            submitButton.textContent = busy ? 'Drafting SOW…' : 'Draft SOW';
        }
        if (exampleButton) exampleButton.disabled = busy;
    }

    function startProgressPanel() {
        if (!progressPanel) return;
        jobStartedAt = Date.now();
        progressPanel.hidden = false;
        if (progressBar) {
            progressBar.style.width = '8%';
            progressBar.classList.add('is-working');
        }
        if (progressMessage) progressMessage.textContent = 'Preparing the draft SOW.';
        applyStageMarkers('queued');
        tickElapsed();
        window.clearInterval(elapsedTimerId);
        elapsedTimerId = window.setInterval(tickElapsed, 1000);
    }

    function stopProgressPanel() {
        window.clearInterval(elapsedTimerId);
        elapsedTimerId = 0;
        jobStartedAt = 0;
        if (progressBar) progressBar.classList.remove('is-working');
        if (progressPanel) progressPanel.hidden = true;
    }

    function applyStageMarkers(stage) {
        const activeIndex = SCOPEIFY_STAGE_ORDER.indexOf(stage);
        progressStages.forEach(node => {
            const nodeIndex = SCOPEIFY_STAGE_ORDER.indexOf(node.dataset.scopeifyStage);
            node.classList.toggle('is-active', nodeIndex === activeIndex);
            node.classList.toggle('is-done', activeIndex > nodeIndex);
        });
    }

    function updateProgressPanel(job) {
        if (!progressPanel || progressPanel.hidden) return;
        const progress = Math.max(0, Math.min(100, Number(job && job.progress || 0)));
        if (progressBar) {
            progressBar.style.width = `${Math.max(progress, 8)}%`;
            progressBar.classList.toggle('is-working', progress < 100);
        }
        if (progressMessage && job && job.message) progressMessage.textContent = job.message;
        applyStageMarkers((job && job.stage) || 'queued');
    }

    function statusTextForJob(job) {
        if (!job) return 'Checking scope';
        if (job.status === 'failed') return 'Recovered';
        if (job.status === 'completed') {
            return job.draft && job.draft.status === 'needs_clarification' ? 'Needs details' : 'Ready';
        }
        if (job.status === 'queued') return 'Queued';
        return 'Checking scope';
    }

    function renderJobProgress(job) {
        if (statusPill) statusPill.textContent = statusTextForJob(job);
        if (summary && job && job.message) summary.textContent = job.message;
        renderFeedback(job && job.feedback ? job.feedback : [], progressTextForJob(job));
        updateProgressPanel(job);
        renderPartialInventory(job);
    }

    // The job publishes the archive search before the SOW exists, so the dataset
    // inventory can be populated while the SOW panel is still a skeleton.
    function renderPartialInventory(job) {
        const archive = job && job.partial && job.partial.archive_search;
        if (!archive || partialInventoryJobId === (job && job.job_id)) return;
        partialInventoryJobId = job.job_id;
        const merged = mergeLiveArchiveResponse(currentReport || neutralProjectReport('pending'), archive);
        currentReport = merged;
        if (lastChecked) lastChecked.textContent = merged.searchLabel;
        if (shortlistCount) shortlistCount.textContent = merged.shortlistLabel;
        renderAudit(merged);
        renderEvidence(merged);
        clearSkeleton(document.getElementById('scopeify-panel-inventory'));
        // Drafting the SOW takes far longer than the search, so show the records that just
        // landed rather than leaving a skeleton on screen. A reader who already picked a tab
        // keeps it: this only moves a view nobody has touched.
        if (!documentTabChosen && merged.evidence.length) setDocumentTab('inventory');
    }

    function newIdempotencyKey() {
        if (window.crypto && typeof window.crypto.randomUUID === 'function') {
            return `scopeify:${window.crypto.randomUUID()}`;
        }
        const entropy = `${Date.now()}:${Math.random().toString(36).slice(2)}:${Math.random().toString(36).slice(2)}`;
        return `scopeify:${entropy}`.slice(0, 120);
    }

    async function runDraftJob(payload, idempotencyKey) {
        const submissionTicket = await getScopeify('/v1/scopeify/submission-ticket');
        if (!submissionTicket || typeof submissionTicket.token !== 'string') {
            throw new Error('Scopeify did not issue a valid submission ticket.');
        }
        let job = await postScopeify('/v1/scopeify/draft-jobs', payload, {
            'x-idempotency-key': idempotencyKey,
            'x-scopeify-submission-token': submissionTicket.token
        }, 1);
        renderJobProgress(job);

        const pollRunId = activeRunId;
        for (let poll = 0; poll < SCOPEIFY_JOB_MAX_POLLS; poll += 1) {
            if (job.status === 'completed' || job.status === 'failed') return job;
            await wait(SCOPEIFY_JOB_POLL_MS);
            // A newer submission supersedes this one; stop rendering into its screen.
            if (pollRunId !== activeRunId) return job;
            job = await getScopeify(`/v1/scopeify/draft-jobs/${encodeURIComponent(job.job_id)}`);
            renderJobProgress(job);
        }

        throw new Error('Scopeify scoping job did not finish before the browser timeout.');
    }

    async function requestScopeifyDraft(payload) {
        let lastError = null;
        const idempotencyKey = newIdempotencyKey();
        for (let recoveryAttempt = 0; recoveryAttempt < 2; recoveryAttempt += 1) {
            try {
                const job = await runDraftJob(payload, idempotencyKey);
                if (job.status === 'completed' && job.draft) {
                    return {
                        response: job.draft,
                        feedback: job.feedback || feedbackFromDraftResponse(job.draft),
                        statusText: statusTextForJob(job),
                        jobId: job.job_id
                    };
                }
                const failure = new Error(job.error || job.message || 'Scopeify scoping job failed.');
                failure.status = 503;
                throw failure;
            } catch (error) {
                lastError = error;
                if (recoveryAttempt === 0 && shouldRetryScopeify(error)) {
                    renderFeedback([
                        makeFeedbackItem('Recovery', 'running', 'review', 'The first scoping job did not finish. Starting one bounded recovery attempt.')
                    ], 'Recovering');
                    await wait(error.retryAfterMs || 800);
                    continue;
                }
                break;
            }
        }

        try {
            const apiUrl = new URL(scopeifyApiBase);
            if (lastError && lastError.status === 405 && ['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname)) {
                const response = await postScopeify('/v1/scopeify/draft', payload);
                return {
                    response,
                    feedback: feedbackFromDraftResponse(response),
                    statusText: response.status === 'needs_clarification' ? 'Needs details' : 'Live SOW'
                };
            }
        } catch (error) {
            lastError = error;
        }
        throw lastError || new Error('Scopeify could not complete the scoping request.');
    }

    function neutralizeSpreadsheetText(value) {
        const text = String(value == null ? '' : value);
        return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
    }

    function safeWorkbookValue(value) {
        return typeof value === 'number' && Number.isFinite(value)
            ? value
            : neutralizeSpreadsheetText(value);
    }

    // Without explicit widths every column renders at Excel's ~8 character default, so long
    // queries and titles arrive as unreadable slivers. Widths are derived from the content and
    // capped. (The vendored SheetJS community build writes !cols but not freeze panes.)
    function worksheetColumnWidths(rows, { min = 10, max = 62 } = {}) {
        const widths = [];
        rows.forEach(row => {
            row.forEach((value, index) => {
                const text = value == null ? '' : String(value);
                const longestLine = text.split('\n').reduce((a, b) => (a.length > b.length ? a : b), '');
                widths[index] = Math.max(widths[index] || min, Math.min(max, longestLine.length + 2));
            });
        });
        return widths.map(width => ({ wch: width }));
    }

    function worksheetFromRows(rows, options) {
        const sheet = window.XLSX.utils.aoa_to_sheet(rows.map(row => row.map(safeWorkbookValue)));
        sheet['!cols'] = worksheetColumnWidths(rows, options);
        return sheet;
    }

    function workbookRows(report) {
        const estimateRows = [
            ['Scopeify project estimate', ''],
            ['Generated', report.generatedDate || new Date().toISOString().slice(0, 10)],
            ['Hypothesis', hypothesis.value.trim() || 'No hypothesis entered'],
            ['Client notes', notes && notes.value.trim() ? notes.value.trim() : 'No client notes entered'],
            ['SOW title', report.sowTitle],
            ['Estimated effort', report.estimate.hours],
            ['Expected timeline', report.sowWindow],
            ['Scope decision', report.sowDecision],
            [],
            ['Phase', 'Workstream', 'Activities', 'Expected output', 'Hours'],
            ...report.sow.map(item => [item.phase, item.workstream, item.detail, item.output, item.hours]),
            [],
            ['Deliverables'],
            ...report.estimate.outputs.map(item => [item]),
            [],
            ['Assumptions'],
            ...report.sowAssumptions.map(item => [item]),
            [],
            ['Exclusions'],
            ...report.sowExclusions.map(item => [item])
        ];

        const inventoryRows = [[
            'Source', 'Record ID', 'Role', 'Title', 'Year', 'Authors', 'PMID', 'DOI', 'URL',
            'Cohort', 'Technology', 'Availability', 'Selection rationale', 'Reuse risk'
        ], ...report.evidence.map(item => [
            item.source, item.id, item.fit, item.title, item.year, item.authors || '', item.pmid || '',
            item.doi || '', item.url || '', item.cohort, item.technology, item.availability, item.rationale, item.risk
        ])];

        const auditRows = [[
            'Source', 'Query', 'Found', 'Screened', 'Selected', 'Notes'
        ], ...report.sources.map(item => [
            item.source, item.query, Number(item.found || 0), Number(item.screened || 0),
            Number(item.selected || 0), item.note
        ])];

        const schemaRows = [[
            'File name', 'Format', 'Sheet', 'Parser status', 'Rows inspected', 'Columns observed',
            'Column name', 'Inferred type', 'Inferred role', 'Role confidence',
            'Missing count', 'Missing rate', 'Unique values inspected', 'Cell values exported'
        ]];
        latestDataPreview.files.forEach(file => {
            if (!file.columns.length) {
                schemaRows.push([
                    file.file_name, file.extension, file.selected_sheet || '', file.parser_status,
                    file.rows_previewed, file.columns_observed, '', '', '', '', '', '', '', 'No'
                ]);
            }
            file.columns.forEach(column => {
                schemaRows.push([
                    file.file_name, file.extension, file.selected_sheet || '', file.parser_status,
                    file.rows_previewed, file.columns_observed, column.name, column.inferred_type,
                    column.inferred_role, column.role_confidence, column.missing_count,
                    column.missing_rate, column.unique_count_preview, 'No'
                ]);
            });
        });

        if (schemaRows.length === 1) {
            schemaRows.push(['No files were selected for the browser-side structure check.']);
        }

        return { estimateRows, inventoryRows, auditRows, schemaRows };
    }

    function toFallbackCsv(report) {
        const rows = workbookRows(report).inventoryRows;
        const safeCsv = value => `"${neutralizeSpreadsheetText(value).replace(/"/g, '""')}"`;
        return rows.map(row => row.map(safeCsv).join(',')).join('\n');
    }

    function downloadProjectWorkbook() {
        if (!currentReport) return;
        if (window.XLSX) {
            const workbook = window.XLSX.utils.book_new();
            const rows = workbookRows(currentReport);
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.estimateRows, { min: 14, max: 78 }), 'Project Estimate');
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.inventoryRows), 'Dataset Inventory');
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.auditRows, { max: 80 }), 'Search Audit');
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.schemaRows), 'Data Schema');
            window.XLSX.writeFile(workbook, 'scopeify-project-scope.xlsx', {
                compression: true,
                bookType: 'xlsx'
            });
            return;
        }

        const blob = new Blob([toFallbackCsv(currentReport)], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'scopeify-dataset-inventory.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    async function runDemo() {
        // Each run claims a generation. A superseded run must stop touching the DOM:
        // otherwise a late poll from the previous job overwrites the current one and can
        // merge two jobs' records into currentReport (and the workbook export).
        const runId = ++activeRunId;
        const isStaleRun = () => runId !== activeRunId;
        setSubmitBusy(true);
        await dataScanPromise;
        if (isStaleRun()) return;
        currentDraftJobId = '';
        currentReviewReceipt = null;
        try { sessionStorage.removeItem('scopeify_review_receipt'); } catch (_error) { /* no-op */ }
        if (reviewRequestButton) {
            reviewRequestButton.disabled = true;
            reviewRequestButton.textContent = 'Request human review';
        }
        const report = neutralProjectReport('pending');
        partialInventoryJobId = '';
        hideSampleBanner();
        enterSubmittedState();
        renderReport(report, scopeifyApiBase ? 'Checking scope' : 'Generating');
        if (reportArticle) reportArticle.setAttribute('aria-busy', 'true');
        if (scopeifyApiBase) {
            startProgressPanel();
            applySkeleton(document.getElementById('scopeify-panel-sow'));
            applySkeleton(document.getElementById('scopeify-panel-inventory'));
        }
        renderFeedback([
            makeFeedbackItem('File check', latestDataPreview.validation.status === 'no_files' ? 'complete' : 'needs_review', latestDataPreview.validation.status === 'valid' || latestDataPreview.validation.status === 'no_files' ? 'info' : 'review', dataScanReview),
            makeFeedbackItem('Evidence search', 'pending', 'info', scopeifyApiBase ? 'Queued.' : 'Live API unavailable.'),
            makeFeedbackItem('Statement of Work', 'pending', 'info', scopeifyApiBase ? 'Drafting.' : 'Live API unavailable.')
        ], scopeifyApiBase ? 'Queued' : 'Local demo');
        if (decision) decision.textContent = 'Scoping in progress';
        if (summary) summary.textContent = 'Preparing the SOW and dataset inventory.';
        downloadButton.disabled = true;

        if (!scopeifyApiBase) {
            window.setTimeout(() => {
                if (isStaleRun()) return;
                setSubmitBusy(false);
                renderReport(markLiveSearchUnavailable(report, 'The live Scopeify API is not configured for this page.'), 'No result');
            }, 620);
            return;
        }

        try {
            const { response, feedback, statusText, jobId } = await requestScopeifyDraft(buildDraftPayload());
            if (isStaleRun()) return;
            const liveReport = reportFromDraftResponse(report, response);
            liveReport.feedback = feedback;
            stopProgressPanel();
            setSubmitBusy(false);
            renderReport(liveReport, statusText);
            // The inventory was shown while the SOW drafted. Now that the SOW exists, return
            // to it as the primary document — unless the reader chose a tab themselves.
            if (!documentTabChosen) setDocumentTab('sow');
            if (response.status === 'validated' && response.sow && jobId) {
                currentDraftJobId = jobId;
                if (reviewRequestButton) reviewRequestButton.disabled = false;
            }
        } catch (error) {
            if (isStaleRun()) return;
            stopProgressPanel();
            setSubmitBusy(false);
            renderReport(markLiveSearchUnavailable(report, error.message), 'No result');
        }
    }

    function showSampleBanner(capturedOn) {
        if (!sampleBanner) return;
        if (sampleBannerText && capturedOn) {
            sampleBannerText.textContent = `A real Scopeify run from ${capturedOn}, kept here as an example.`;
        }
        sampleBanner.hidden = false;
    }

    function hideSampleBanner() {
        if (sampleBanner) sampleBanner.hidden = true;
        if (shell) shell.classList.remove('scopeify-is-sample');
    }

    // The landing view shows a stored run so the page opens on a finished SOW instead of
    // an empty form. It renders through reportFromDraftResponse, the same transform a live
    // run uses, so the example cannot drift in shape from a real result. The banner marks
    // it as stored, and the first live submission clears it.
    function renderSampleReport() {
        const sample = window.SCOPEIFY_SAMPLE_REPORT;
        if (!sample || !sample.draft || !sample.draft.sow) return false;

        // The intake must show the question this sample answers, or the form and the
        // report on screen describe two different projects. The notes stay out of the
        // collapsed form: showing them would mean opening the disclosure on load and
        // undoing the compact landing state.
        if (hypothesis && sample.hypothesis) hypothesis.value = sample.hypothesis;

        const report = reportFromDraftResponse(neutralProjectReport('pending'), sample.draft);
        report.feedback = Array.isArray(sample.feedback) ? sample.feedback : [];
        renderReport(report, 'Sample output');
        if (shell) shell.classList.add('scopeify-is-sample');
        showSampleBanner(sample.captured_on);
        // A stored draft has no job, so human review cannot be requested from it.
        currentDraftJobId = '';
        if (reviewRequestButton) reviewRequestButton.disabled = true;
        if (!documentTabChosen) setDocumentTab('sow');
        return true;
    }

    function revealMoreOptionsWhenUsed() {
        if (!moreOptions) return;
        const hasContent = () => Boolean(
            (notes && notes.value.trim())
            || (dataFiles && dataFiles.files && dataFiles.files.length)
            || (extendedSearch && extendedSearch.checked)
        );
        if (hasContent()) moreOptions.open = true;
        [notes, dataFiles, extendedSearch].forEach(field => {
            if (field) field.addEventListener('change', () => { if (hasContent()) moreOptions.open = true; });
        });
    }

    function applyInitialParams() {
        const params = new URLSearchParams(window.location.search);
        const initialHypothesis = params.get('hypothesis');
        if (initialHypothesis) hypothesis.value = initialHypothesis;
        // A visitor-supplied question gets the neutral intake state, not the example.
        if (!initialHypothesis && renderSampleReport()) return;
        renderReport(neutralProjectReport('pending'), 'Ready to scope');
    }

    function openReviewDialog() {
        if (!reviewDialog || (!currentDraftJobId && !currentReviewReceipt)) return;
        if (reviewError) reviewError.textContent = '';
        if (reviewFields) reviewFields.hidden = Boolean(currentReviewReceipt);
        if (reviewReceipt) reviewReceipt.hidden = !currentReviewReceipt;
        if (currentReviewReceipt) renderReviewReceipt(currentReviewReceipt);
        if (typeof reviewDialog.showModal === 'function') reviewDialog.showModal();
        else reviewDialog.setAttribute('open', '');
        window.setTimeout(() => {
            const target = currentReviewReceipt ? reviewDialog.querySelector('a') : reviewName;
            if (target) target.focus();
        }, 0);
        if (currentReviewReceipt) refreshReviewStatus();
    }

    function closeReviewDialog() {
        if (!reviewDialog) return;
        if (typeof reviewDialog.close === 'function') reviewDialog.close();
        else reviewDialog.removeAttribute('open');
    }

    function renderReviewReceipt(receipt) {
        if (reviewFields) reviewFields.hidden = true;
        if (reviewReceipt) reviewReceipt.hidden = false;
        if (reviewReceiptMessage) reviewReceiptMessage.textContent = receipt.message;
        if (reviewReference) reviewReference.textContent = receipt.review_id.slice(0, 12).toUpperCase();
    }

    function restoreReviewReceipt() {
        try {
            const stored = JSON.parse(sessionStorage.getItem('scopeify_review_receipt') || 'null');
            if (!stored || typeof stored.review_id !== 'string' || typeof stored.access_token !== 'string') return;
            currentReviewReceipt = stored;
            if (reviewRequestButton) {
                reviewRequestButton.disabled = false;
                reviewRequestButton.textContent = 'Check review status';
            }
            enterSubmittedState();
            window.setTimeout(openReviewDialog, 0);
        } catch (_error) {
            try { sessionStorage.removeItem('scopeify_review_receipt'); } catch (_storageError) { /* no-op */ }
        }
    }

    async function refreshReviewStatus() {
        if (!currentReviewReceipt || !reviewRefreshButton) return;
        reviewRefreshButton.disabled = true;
        reviewRefreshButton.textContent = 'Checking…';
        if (reviewError) reviewError.textContent = '';
        try {
            const status = await getScopeify(
                `/v1/scopeify/review-submissions/${encodeURIComponent(currentReviewReceipt.review_id)}`,
                { 'x-scopeify-review-token': currentReviewReceipt.access_token }
            );
            currentReviewReceipt = {
                ...currentReviewReceipt,
                status: status.status,
                message: status.message
            };
            try {
                sessionStorage.setItem('scopeify_review_receipt', JSON.stringify(currentReviewReceipt));
            } catch (_error) { /* The active page still retains the receipt. */ }
            renderReviewReceipt(currentReviewReceipt);
            if (status.status === 'approved' && status.proposal) {
                const reviewedReport = reportFromDraftResponse(neutralProjectReport('pending'), {
                    status: 'validated',
                    sow: status.proposal,
                    archive_search: null
                });
                reviewedReport.feedback = [
                    makeFeedbackItem('Human review', 'complete', 'info', 'The human-reviewed preliminary proposal is ready.', status.message)
                ];
                renderReport(reviewedReport, 'Human reviewed');
                enterSubmittedState();
                reviewRequestButton.disabled = false;
                reviewRequestButton.textContent = 'Reviewed proposal';
            }
        } catch (error) {
            if (reviewError) reviewError.textContent = error.message;
        } finally {
            reviewRefreshButton.disabled = false;
            reviewRefreshButton.textContent = 'Check review status';
        }
    }

    async function submitReviewRequest() {
        if (!reviewForm || !currentDraftJobId || !reviewForm.reportValidity()) return;
        if (reviewError) reviewError.textContent = '';
        reviewSubmitButton.disabled = true;
        reviewSubmitButton.textContent = 'Submitting…';
        try {
            const receipt = await postScopeify('/v1/scopeify/review-submissions', {
                job_id: currentDraftJobId,
                contact: {
                    name: reviewName.value.trim(),
                    email: reviewEmail.value.trim(),
                    organization: reviewOrganization.value.trim()
                },
                consent_to_human_review: reviewConsent.checked
            }, {}, 1);
            currentReviewReceipt = receipt;
            try {
                sessionStorage.setItem('scopeify_review_receipt', JSON.stringify(receipt));
            } catch (error) {
                // The receipt remains available for this page even when storage is unavailable.
            }
            renderReviewReceipt(receipt);
            reviewRequestButton.disabled = false;
            reviewRequestButton.textContent = 'Check review status';
            if (currentReport && Array.isArray(currentReport.feedback)) {
                currentReport.feedback = currentReport.feedback.map(item => item.label === 'Human review'
                    ? makeFeedbackItem('Human review', 'complete', 'info', 'Submitted to Orchestrated Biosciences for human review.', `Reference ${receipt.review_id.slice(0, 12).toUpperCase()}`)
                    : item);
                renderFeedback(currentReport.feedback, 'Human review requested');
            }
        } catch (error) {
            if (reviewError) reviewError.textContent = error.message;
        } finally {
            reviewSubmitButton.disabled = Boolean(currentReviewReceipt);
            reviewSubmitButton.textContent = currentReviewReceipt ? 'Submitted' : 'Submit for review';
        }
    }

    form.addEventListener('submit', event => {
        event.preventDefault();
        runDemo();
    });

    exampleButton.addEventListener('click', () => {
        hypothesis.value = 'Can public tumor transcriptomics data identify biomarkers of anti-PD-1 response in melanoma patients?';
        if (notes) {
            notes.value = 'Estimate a biomarker study before we decide whether to fund a larger analysis.';
        }
        runDemo();
    });

    async function scanSelectedFiles() {
        const selectedFiles = dataFiles ? Array.from(dataFiles.files || []) : [];
        if (!selectedFiles.length) {
            latestDataPreview = createEmptyDataPreview();
            dataScanReview = 'No local files selected.';
            renderDataReview();
            return;
        }

        const files = selectedFiles.slice(0, MAX_SCHEMA_FILES);
        dataScanReview = 'Scanning selected file metadata in browser...';
        renderDataReview();

        const previews = await Promise.all(files.map(async file => {
            if (isSpreadsheet(file)) {
                return profileSpreadsheetFile(file);
            }
            if (!isTextLike(file)) {
                return profileBinaryFile(file);
            }

            try {
                const isTruncated = file.size > MAX_TEXT_PREVIEW_BYTES;
                let text = await file.slice(0, MAX_TEXT_PREVIEW_BYTES).text();
                if (isTruncated && /\.json$/i.test(file.name)) {
                    const preview = profileBinaryFile(file);
                    preview.risk_flags = [makeFlag(
                        'json_size_limit',
                        'review',
                        `JSON exceeds the ${formatBytes(MAX_TEXT_PREVIEW_BYTES)} complete-document parsing limit`,
                        [file.name]
                    )];
                    preview.summary = `${file.name}: oversized JSON was not partially parsed because a truncated document could produce false schema findings.`;
                    preview.llm_prompt_summary = preview.summary;
                    return preview;
                }
                if (isTruncated && /\.(jsonl|ndjson)$/i.test(file.name)) {
                    const lastCompleteLine = Math.max(text.lastIndexOf('\n'), text.lastIndexOf('\r'));
                    if (lastCompleteLine <= 0) {
                        const preview = profileBinaryFile(file);
                        preview.risk_flags = [makeFlag(
                            'json_lines_record_too_large',
                            'review',
                            'no complete JSON Lines record fit within the bounded browser preview',
                            [file.name]
                        )];
                        preview.summary = `${file.name}: no complete JSON Lines record fit within the bounded browser preview.`;
                        preview.llm_prompt_summary = preview.summary;
                        return preview;
                    }
                    text = text.slice(0, lastCompleteLine);
                }
                const preview = profileTextFile(file, text);
                if (file.size > MAX_TEXT_PREVIEW_BYTES) {
                    preview.risk_flags.push(makeFlag('preview_truncated', 'info', `preview limited to ${formatBytes(MAX_TEXT_PREVIEW_BYTES)}`, [file.name]));
                    preview.summary = summarizeFilePreview(preview);
                    preview.llm_prompt_summary = preview.summary;
                }
                return preview;
            } catch (error) {
                const summary = `${file.name}: browser review failed.`;
                return {
                    file_name: safeFileName(file.name),
                    extension: getFileExtension(file.name),
                    mime_type: file.type || 'unknown',
                    size_bytes: file.size,
                    parser_status: 'parse_error',
                    delimiter: null,
                    rows_previewed: 0,
                    columns_observed: 0,
                    columns: [],
                    workbook_sheet_count: 0,
                    sheet_names: [],
                    selected_sheet: '',
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
        if (selectedFiles.length > MAX_SCHEMA_FILES) {
            latestDataPreview.validation.warnings.push(
                `${selectedFiles.length - MAX_SCHEMA_FILES} additional file(s) were not inspected because one scoping request supports ${MAX_SCHEMA_FILES} files.`
            );
            if (latestDataPreview.validation.status === 'valid') {
                latestDataPreview.validation.status = 'valid_with_warnings';
            }
        }
        dataScanReview = summarizeDataPreview(latestDataPreview);
        renderDataReview();
    }

    if (notes) {
        notes.addEventListener('input', () => {
            if (currentReport) clientNotes.textContent = getClientNotes();
        });
    }

    if (dataFiles) {
        dataFiles.addEventListener('change', () => {
            dataScanPromise = scanSelectedFiles();
        });
    }

    if (editButton) {
        editButton.addEventListener('click', enterIntakeState);
    }

    if (reviewRequestButton) reviewRequestButton.addEventListener('click', openReviewDialog);
    if (reviewRefreshButton) reviewRefreshButton.addEventListener('click', refreshReviewStatus);
    if (reviewForm) {
        reviewForm.addEventListener('submit', event => {
            event.preventDefault();
            submitReviewRequest();
        });
    }
    ['scopeify-review-close', 'scopeify-review-cancel'].forEach(id => {
        const button = document.getElementById(id);
        if (button) button.addEventListener('click', closeReviewDialog);
    });
    if (reviewDialog) {
        reviewDialog.addEventListener('click', event => {
            if (event.target === reviewDialog) closeReviewDialog();
        });
    }

    documentTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            documentTabChosen = true;
            setDocumentTab(tab.dataset.scopeifyTab || 'sow');
        });
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            documentTabChosen = true;
            const currentIndex = documentTabs.indexOf(tab);
            let nextIndex = currentIndex;
            if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + documentTabs.length) % documentTabs.length;
            if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % documentTabs.length;
            if (event.key === 'Home') nextIndex = 0;
            if (event.key === 'End') nextIndex = documentTabs.length - 1;
            const nextTab = documentTabs[nextIndex];
            setDocumentTab(nextTab.dataset.scopeifyTab || 'sow');
            nextTab.focus();
        });
    });

    downloadButton.addEventListener('click', downloadProjectWorkbook);
    revealMoreOptionsWhenUsed();
    applyInitialParams();
    restoreReviewReceipt();
})();
