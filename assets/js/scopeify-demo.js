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
    const feedbackProgress = document.getElementById('scopeify-feedback-progress');
    const feedbackList = document.getElementById('scopeify-feedback-list');
    const reportArticle = document.querySelector('.scopeify-report');
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
    let dataScanReview = 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
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
                'Project route',
                'pending',
                'info',
                'Enter a biological question to prepare a project-specific scope.',
                'Scopeify will identify the analysis route after submission.'
            ),
            makeFeedbackItem(
                'Browser data preview',
                latestDataPreview.validation.status === 'no_files' ? 'complete' : 'needs_review',
                latestDataPreview.validation.status === 'valid' || latestDataPreview.validation.status === 'no_files' ? 'info' : 'review',
                latestDataPreview.validation.status === 'no_files'
                    ? 'No local files selected; Scopeify can still scope against public data.'
                    : dataScanReview,
                latestDataPreview.aggregate.risk_flags.join(', ')
            ),
            makeFeedbackItem(
                'Public archive screen',
                'pending',
                'info',
                'Public archive search begins after submission.',
                'Dataset inventory stays separate from the Statement of Work.'
            ),
            makeFeedbackItem(
                'Statement of Work',
                'pending',
                'info',
                'No project-specific Statement of Work has been generated yet.',
                'Submit the form to run the scoping workflow.'
            ),
            makeFeedbackItem(
                'Human review',
                'needs_review',
                'review',
                'Preliminary output requires Orchestrated Biosciences review before it becomes a formal quote.',
                'Use the consultation link after reviewing the draft.'
            )
        ];
    }

    function fallbackFeedback(message) {
        return [
            makeFeedbackItem(
                'Recovery',
                'needs_review',
                'review',
                'Live scoping did not return a validated result after one recovery attempt.',
                message || 'Retry the request or schedule a consultation.'
            ),
            makeFeedbackItem(
                'Statement of Work',
                'blocked',
                'blocker',
                'No hypothesis-specific SOW or dataset inventory is being shown as a substitute.',
                'This prevents a stale example from being mistaken for a live result.'
            ),
            makeFeedbackItem(
                'Human review',
                'needs_review',
                'review',
                'A human review is still required before quoting.',
                'Schedule a consultation to confirm scope, data access, and assumptions.'
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
                'Project route',
                hasSow ? 'complete' : 'needs_review',
                hasSow ? 'info' : 'blocker',
                hasSow ? `Routed to ${response.project_type || 'a Scopeify SOW template'}.` : 'More project detail is needed before a useful SOW can be drafted.',
                response && response.message ? response.message : ''
            ),
            makeFeedbackItem(
                'Browser data preview',
                dataStatus === 'invalid' ? 'blocked' : riskFlags.length ? 'needs_review' : 'complete',
                dataStatus === 'invalid' ? 'blocker' : riskFlags.length ? 'review' : 'info',
                riskFlags.length ? `Data preview passed with review flags: ${riskFlags.join(', ')}.` : `Data preview status: ${dataStatus}.`,
                dataScanReview
            ),
            makeFeedbackItem(
                'Public archive screen',
                archive ? (archive.status === 'searched' ? 'complete' : 'needs_review') : 'complete',
                archive && archive.status === 'searched' ? 'info' : 'review',
                archive
                    ? `Screened ${searched || 'configured sources'} and returned ${returned} candidate records for the inventory appendix.`
                    : 'No live archive search was included in this draft response.',
                archive && Array.isArray(archive.warnings) ? archive.warnings.slice(0, 3).join(' ') : ''
            ),
            makeFeedbackItem(
                'Statement of Work',
                hasSow ? 'complete' : 'needs_review',
                hasSow ? 'info' : 'blocker',
                hasSow ? `Validated SOW generated with ${response.sow.estimated_hours_min}-${response.sow.estimated_hours_max} estimated hours.` : 'Clarification response returned instead of a SOW.',
                hasSow ? `Generation mode: ${response.sow.generation_mode}.` : response && response.next_step ? response.next_step : ''
            ),
            makeFeedbackItem(
                'Human review',
                'needs_review',
                'review',
                'Preliminary output requires human review before quoting.',
                response && response.next_step ? response.next_step : 'Schedule a consultation to confirm assumptions.'
            )
        ];
    }

    function renderFeedback(items, progressText) {
        if (feedbackProgress) feedbackProgress.textContent = progressText || 'Ready for review';
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
            note: isFailure ? 'No validated source result returned' : 'Waiting for validated backend search'
        }));
        return {
            title: isFailure ? 'Scoping request not completed' : 'Preparing project scope',
            status: isFailure ? 'Unavailable' : 'Running',
            decision: isFailure ? 'No result issued' : 'Scoping in progress',
            summary: isFailure
                ? 'Scopeify could not return a validated project-specific result. No static example has been substituted.'
                : `Scopeify is validating the intake and preparing a project-specific SOW for: ${projectQuestion}`,
            searchLabel: isFailure ? 'Live search not completed' : 'Live search pending',
            shortlistLabel: isFailure ? 'No validated inventory issued' : 'Inventory pending',
            estimate: {
                title: isFailure ? 'Estimate unavailable' : 'Estimate pending',
                hours: 'Pending',
                rationale: isFailure
                    ? 'Estimated hours require a validated project route and source screen.'
                    : 'Hours will be calculated from the project route, source coverage, data structure, and review requirements.',
                outputs: [
                    'Nextflow pipeline when raw-data processing is applicable',
                    'Quarto HTML analysis report',
                    'Slide deck plus review meeting',
                    'Exported XLSX dataset inventory and project estimates'
                ]
            },
            sowTitle: 'Statement of Work: preliminary project scope',
            sowWindow: isFailure ? 'Not issued' : 'Generation in progress',
            generatedDate: new Date().toISOString().slice(0, 10),
            sowMeta: [
                { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: 'Orchestrated Biosciences' },
                { label: 'Document type', value: 'Preliminary Statement of Work' },
                { label: 'Estimate status', value: isFailure ? 'Not issued' : 'Pending validation' }
            ],
            sowObjective: isFailure
                ? 'Retry the scoping workflow before relying on an estimate.'
                : 'Translate the submitted hypothesis into a reviewable consulting scope.',
            sowDecision: isFailure
                ? 'No project recommendation was issued. Retry or schedule a consultation.'
                : 'Pending source search, data-structure review, and project routing.',
            sow: [{
                phase: '1',
                workstream: isFailure ? 'Recovery' : 'Intake and evidence review',
                detail: isFailure ? 'Retry the validated scoping workflow.' : 'Validate the question, identify suitable sources, and determine the appropriate analysis route.',
                output: isFailure ? 'Validated retry or consultation agenda' : 'Project-specific SOW and evidence appendix',
                hours: 'Pending'
            }],
            sowAssumptions: ['A formal quote requires human review of the generated scope.'],
            sowExclusions: ['No project-specific evidence or estimate is asserted until the backend returns a validated result.'],
            clientNotesReflected: getClientNotes(),
            dataPreviewConsiderations: [],
            sources: sourceRows,
            criteria: isFailure
                ? ['No archive result is treated as selected after an incomplete request.']
                : ['Source-specific queries and selection criteria will be recorded in the separate inventory appendix.'],
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
        setDocumentTab('sow');
        moveShellToTop();
        window.setTimeout(() => {
            if (reportArticle) reportArticle.focus({ preventScroll: true });
        }, 0);
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
            roles.sample_id_fields.length ? `sample identifiers appear present (${roles.sample_id_fields.slice(0, 3).join(', ')})` : 'no obvious sample identifier field',
            summarizeFieldList('candidate outcome fields', roles.outcome_fields, 'no obvious response or outcome field'),
            summarizeFieldList('candidate group/treatment fields', roles.treatment_fields, 'no obvious group or treatment field'),
            summarizeFieldList('batch-effect fields to review', roles.batch_fields, 'no obvious batch field in preview')
        ];
        const riskMessages = filePreview.risk_flags.map(flag => flag.message);
        const riskSummary = riskMessages.length ? `risk flags: ${riskMessages.slice(0, 5).join('; ')}` : 'no immediate table-structure risks in preview';

        return `${filePreview.file_name}: ${filePreview.columns.length || 'unknown'} profiled columns, ${filePreview.rows_previewed || 'unknown'} locally inspected rows; schema summary validated; ${fieldSummaries.join('; ')}; ${riskSummary}. Cell values remain in this browser.`.slice(0, 1200);
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
            const summary = `${file.name}: JSON selected, but the preview could not parse it cleanly. Production review would inspect schema and representative records.`;
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
            preview.summary = `${file.name}: ${formatBytes(file.size)} workbook selected. It is too large for bounded browser-side schema inspection and requires consultation review.`;
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
            return 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
        }

        const summaries = preview.files.map(file => file.summary);
        const validationText = preview.validation.status === 'valid'
            ? 'Structured DataPreview is ready for the backend LLM.'
            : `Structured DataPreview requires review: ${[...preview.validation.errors, ...preview.validation.warnings].slice(0, 3).join('; ')}`;
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
                const error = new Error(`Scopeify API returned ${response.status}`);
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

    async function getScopeify(endpoint) {
        if (!scopeifyApiBase) throw new Error('Scopeify API is not configured for this host.');

        const url = `${scopeifyApiBase}${endpoint}`;
        let lastError = null;
        for (let attempt = 1; attempt <= SCOPEIFY_API_MAX_ATTEMPTS; attempt += 1) {
            try {
                return await fetchScopeifyJson(url, null, SCOPEIFY_API_TIMEOUT_MS, 'GET');
            } catch (error) {
                lastError = error;
                if (attempt >= SCOPEIFY_API_MAX_ATTEMPTS || !shouldRetryScopeify(error)) break;
                await wait(error.retryAfterMs || 450 * attempt);
            }
        }

        throw lastError || new Error('Scopeify API did not return a response');
    }

    function liveArchiveSources() {
        return ['PubMed', 'GEO', 'SRA', 'ENA', 'GSA/CNSA', 'bioRxiv'];
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
                'Dataset inventory rows are separate from the Statement of Work and still require manual inclusion review.',
                'Source warnings record records screened out for weak visible metadata, false-positive terms, or missing query concepts.',
                'Public-data search informs scope assumptions, but the consulting quote still requires human review.'
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
                summary: response && response.message ? response.message : 'Scopeify needs a more specific research question before drafting a useful SOW.',
                estimate: {
                    title: 'Clarification-first scoping',
                    hours: 'Pending',
                    rationale: 'A defensible estimate needs the study system, modality, comparison, and intended decision.',
                    outputs: ['Clarified intake', 'Recommended next scoping path', 'Consultation agenda']
                },
                sowTitle: 'Statement of Work: clarification needed',
                sowWindow: 'Pending',
                generatedDate: '',
                sowMeta: [
                    { label: 'Prepared for', value: 'Prospective Orchestrated.bio client' },
                    { label: 'Prepared by', value: 'Orchestrated Biosciences' },
                    { label: 'Document type', value: 'Preliminary Statement of Work' },
                    { label: 'Estimate status', value: 'Needs clarification before quote' }
                ],
                sowObjective: 'Clarify the project question before preparing a consulting scope.',
                sowDecision: response && response.next_step ? response.next_step : 'Schedule a consultation or revise the intake with organism, modality, comparison, and intended output.',
                sow: [
                    { phase: '1', workstream: 'Clarify intake', detail: questions.join(' ') || 'Confirm organism, data type, comparison groups, and desired decision.', output: 'Scoped project question', hours: 'Pending' }
                ],
                sowAssumptions: ['No final estimate should be issued until the intake is clarified.'],
                sowExclusions: ['Technical analysis, archive screening, and formal quoting are excluded from this clarification response.'],
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
                title: sow.estimate_status || 'Preliminary project estimate',
                hours,
                rationale: [sow.expected_timeline, sow.public_data_summary].filter(Boolean).join(' '),
                outputs: Array.isArray(sow.deliverables) ? sow.deliverables : baseReport.estimate.outputs
            },
            sowTitle: displayTitle,
            sowWindow: sow.expected_timeline || baseReport.sowWindow,
            generatedDate: sow.generated_date || '',
            sowMeta: [
                { label: 'Prepared for', value: sow.prepared_for || 'Prospective Orchestrated.bio client' },
                { label: 'Prepared by', value: sow.prepared_by || 'Orchestrated Biosciences' },
                { label: 'Document type', value: sow.document_type || 'Preliminary Statement of Work' },
                { label: 'Estimate status', value: sow.estimate_status || 'Ballpark; human review before quote' }
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

    function progressTextForJob(job) {
        const progress = Number(job && job.progress || 0);
        const status = job && job.status ? formatFeedbackStatus(job.status) : 'running';
        return `${status} · ${progress}%`;
    }

    function statusTextForJob(job) {
        if (!job) return 'Checking scope';
        if (job.status === 'failed') return 'Recovered';
        if (job.status === 'completed') {
            return job.draft && job.draft.status === 'needs_clarification' ? 'Needs details' : 'Live SOW';
        }
        if (job.status === 'queued') return 'Queued';
        return 'Checking scope';
    }

    function renderJobProgress(job) {
        if (statusPill) statusPill.textContent = statusTextForJob(job);
        if (summary && job && job.message) summary.textContent = job.message;
        renderFeedback(job && job.feedback ? job.feedback : [], progressTextForJob(job));
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

        for (let poll = 0; poll < SCOPEIFY_JOB_MAX_POLLS; poll += 1) {
            if (job.status === 'completed' || job.status === 'failed') return job;
            await wait(SCOPEIFY_JOB_POLL_MS);
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
                        statusText: statusTextForJob(job)
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

    function worksheetFromRows(rows) {
        return window.XLSX.utils.aoa_to_sheet(rows.map(row => row.map(safeWorkbookValue)));
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
            'source', 'record_id', 'role', 'title', 'year', 'authors', 'pmid', 'doi', 'url',
            'cohort', 'technology', 'availability', 'selection_rationale', 'reuse_risk'
        ], ...report.evidence.map(item => [
            item.source, item.id, item.fit, item.title, item.year, item.authors || '', item.pmid || '',
            item.doi || '', item.url || '', item.cohort, item.technology, item.availability, item.rationale, item.risk
        ])];

        const auditRows = [[
            'source', 'query_focus', 'found', 'screened', 'selected', 'source_note'
        ], ...report.sources.map(item => [
            item.source, item.query, Number(item.found || 0), Number(item.screened || 0),
            Number(item.selected || 0), item.note
        ])];

        const schemaRows = [[
            'file_name', 'format', 'sheet', 'parser_status', 'rows_inspected', 'columns_observed',
            'column_name', 'inferred_type', 'inferred_role', 'role_confidence',
            'missing_count', 'missing_rate', 'unique_count_inspected', 'cell_values_exported'
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
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.estimateRows), 'Project Estimate');
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.inventoryRows), 'Dataset Inventory');
            window.XLSX.utils.book_append_sheet(workbook, worksheetFromRows(rows.auditRows), 'Search Audit');
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
        await dataScanPromise;
        const report = neutralProjectReport('pending');
        enterSubmittedState();
        renderReport(report, scopeifyApiBase ? 'Checking scope' : 'Generating');
        if (reportArticle) reportArticle.setAttribute('aria-busy', 'true');
        renderFeedback([
            makeFeedbackItem('Intake received', 'complete', 'info', 'Client question accepted for preliminary scoping.', hypothesis.value.trim()),
            makeFeedbackItem('Browser data preview', latestDataPreview.validation.status === 'no_files' ? 'complete' : 'needs_review', latestDataPreview.validation.status === 'valid' || latestDataPreview.validation.status === 'no_files' ? 'info' : 'review', dataScanReview),
            makeFeedbackItem('Public archive screen', 'pending', 'info', scopeifyApiBase ? 'Queued for backend archive screening.' : 'No live API is configured for this page.'),
            makeFeedbackItem('Statement of Work', 'pending', 'info', scopeifyApiBase ? 'Waiting for the scoped SOW response.' : 'No project-specific SOW can be issued without the live API.'),
            makeFeedbackItem('Human review', 'needs_review', 'review', 'Preliminary output requires review before quote.')
        ], scopeifyApiBase ? 'queued · 0%' : 'Local demo');
        if (decision) decision.textContent = 'Scoping in progress';
        if (summary) summary.textContent = 'Validating the intake, preparing feedback, drafting the SOW, and keeping the dataset inventory appendix separate.';
        downloadButton.disabled = true;

        if (!scopeifyApiBase) {
            window.setTimeout(() => renderReport(markLiveSearchUnavailable(report, 'The live Scopeify API is not configured for this page.'), 'No result'), 620);
            return;
        }

        try {
            const { response, feedback, statusText } = await requestScopeifyDraft(buildDraftPayload());
            const liveReport = reportFromDraftResponse(report, response);
            liveReport.feedback = feedback;
            renderReport(liveReport, statusText);
        } catch (error) {
            renderReport(markLiveSearchUnavailable(report, error.message), 'No result');
        }
    }

    function applyInitialParams() {
        const params = new URLSearchParams(window.location.search);
        const initialHypothesis = params.get('hypothesis');
        if (initialHypothesis) hypothesis.value = initialHypothesis;
        renderReport(neutralProjectReport('pending'), 'Ready to scope');
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
        const selectedFiles = dataFiles ? Array.from(dataFiles.files || []) : [];
        if (!selectedFiles.length) {
            latestDataPreview = createEmptyDataPreview();
            dataScanReview = 'No file selected. Scopeify can still scope against public data, or scan local metadata headings to flag low sample size, missing outcome labels, and batch-effect risks.';
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
                const summary = `${file.name}: ${formatBytes(file.size)} selected, but browser preview failed. Production review would retry with a server-side parser.`;
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

    documentTabs.forEach(tab => {
        tab.addEventListener('click', () => setDocumentTab(tab.dataset.scopeifyTab || 'sow'));
        tab.addEventListener('keydown', event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
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
    applyInitialParams();
})();
