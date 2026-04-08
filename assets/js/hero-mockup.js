// Hero rotation — syncs subtitle, chat panel text, and visualization scenes
(function () {
    var rotateEl = document.getElementById('hero-rotate-text'); // may be null if not in HTML
    var subtextEl = document.getElementById('hero-subtext');
    var mockup   = document.querySelector('.hero-mockup');
    if (!mockup) return;

    // Hero subtexts keyed by phase
    var heroSubtexts = {
        mobile:  'Seamless experience \u2014 start your research anywhere',
        scene0:  'We bring you the literature and the data',
        scene1:  'Accelerate drug discovery with real patient data',
        colab:   'Bioinformatician approved, 100% reproducible code'
    };

    function setHeroSubtext(key) {
        if (!subtextEl) return;
        var text = heroSubtexts[key];
        if (!text || subtextEl.textContent === text) return;
        subtextEl.style.opacity = '0';
        subtextEl.style.transform = 'translateY(6px)';
        setTimeout(function () {
            subtextEl.textContent = text;
            subtextEl.style.opacity = '1';
            subtextEl.style.transform = 'translateY(0)';
        }, 300);
    }

    var scenes = [
        {
            subtitle: 'Survival Analysis',
            heroSubtextKey: 'scene0',
            query: 'How do KRAS mutations impact survival in pancreatic cancer?',
            steps: 'Investigated with 3 steps',
            crumbs: [
                { text: 'FOCUS', cls: 'bg-brand-500/20 text-brand-400' },
                { text: 'Paad TCGA Pan Can Atlas 2018', cls: 'bg-amber-500/15 text-amber-400' },
                { text: 'KRAS', cls: 'bg-sky-500/15 text-sky-400' }
            ],
            cohort: 'COHORT: N=184',
            paras: [
                'KRAS mutations significantly reduce overall survival in pancreatic cancer, with mutant carriers reaching a median survival of only 1.4 years compared to 3.6 years for wild-type patients (p=0.00029).',
                'This disparity is driven by near-universal mutations at codon 12 (86.6%), primarily G12D (39%), G12V, and G12R variants.',
                'KRAS G12R is associated with improved survival and decreased distant recurrence compared to G12D.'
            ],
            cites: ['D1', 'Steele 2018'],
            followups: [
                '1. Do specific KRAS codons show different survival outcomes?',
                '2. What about drug sensitivity?'
            ]
        },
        {
            subtitle: 'Drug Sensitivity',
            heroSubtextKey: 'scene1',
            query: 'What about drug sensitivity?',
            steps: 'Investigated with 4 steps',
            crumbs: [
                { text: 'FOCUS', cls: 'bg-brand-500/20 text-brand-400' },
                { text: 'Paad TCGA Pan Can Atlas 2018', cls: 'bg-amber-500/15 text-amber-400' },
                { text: 'KRAS', cls: 'bg-sky-500/15 text-sky-400' }
            ],
            cohort: 'COHORT: N=184',
            paras: [
                'Drug sensitivity in pancreatic cancer is characterized by high resistance to standard therapies, though molecular profiling reveals emerging therapeutic targets.',
                'KRAS was long considered undruggable, but is now tractable via small molecules and PROTACs, with two FDA-approved inhibitors targeting G12C.',
                'TP53, CDKN2A, and SMAD4 present varying degrees of druggability and clinical tractability.'
            ],
            cites: ['D4', 'Raj 2026'],
            followups: [
                '1. How does KRAS G12D vs G12V affect sensitivity to MEK inhibitors?',
                '2. Are there emerging drugs targeting TP53-mutant pancreatic cancer?'
            ]
        }
    ];

    var current = 0;
    var INTERVAL = 8000; // 8s per scene for better readability

    // Cache chat panel elements
    var queryEl   = mockup.querySelector('.mock-query-text');
    var stepsEl   = mockup.querySelector('.mock-steps-text');
    var crumbBox  = mockup.querySelector('.mock-crumbs');
    var cohortEl  = mockup.querySelector('.mock-cohort');
    var parasEl   = mockup.querySelector('.mock-paragraphs');
    var followEl  = mockup.querySelector('.mock-followups');
    var chatInput = mockup.querySelector('.mock-chat-input-text');
    var visScenes = mockup.querySelectorAll('.mock-vis-scene');

    function updateChat(s) {
        // Don't set query text here — staggerChatReveal will type it
        if (queryEl) queryEl.textContent = '';
        if (stepsEl) stepsEl.textContent = s.steps;
        if (cohortEl) cohortEl.textContent = s.cohort;

        if (crumbBox) {
            while (crumbBox.firstChild) crumbBox.removeChild(crumbBox.firstChild);
            s.crumbs.forEach(function (b) {
                var span = document.createElement('span');
                span.className = 'px-[0.5em] py-[0.15em] rounded-[0.2em] text-[0.7em] ' + b.cls;
                span.textContent = b.text;
                crumbBox.appendChild(span);
            });
        }

        if (parasEl) {
            while (parasEl.firstChild) parasEl.removeChild(parasEl.firstChild);
            s.paras.forEach(function (txt, i) {
                var p = document.createElement('p');
                p.className = 'text-[0.7em] leading-[1.5] text-gray-300';
                p.textContent = txt;
                if (s.cites[i]) {
                    var cite = document.createElement('span');
                    cite.className = 'px-[0.3em] py-[0.1em] rounded bg-brand-600/25 text-brand-400 text-[0.85em] ml-[0.3em]';
                    if (i === 0 && current === 0) {
                        cite.className += ' mock-cite-d1';
                    }
                    cite.textContent = s.cites[i];
                    p.appendChild(cite);
                }
                parasEl.appendChild(p);
            });
        }

        if (followEl) {
            while (followEl.firstChild) followEl.removeChild(followEl.firstChild);
            s.followups.forEach(function (txt) {
                var p = document.createElement('p');
                p.className = 'text-[0.6em] text-gray-300';
                p.textContent = txt;
                followEl.appendChild(p);
            });
        }

        // Reset chat input to placeholder
        if (chatInput) chatInput.textContent = 'Ask a follow-up question...';
    }

    // Stagger chat elements: type query → show steps → paragraphs one by one → follow-ups
    var stepsWrap    = mockup.querySelector('.mock-steps-wrap');
    var followWrap   = mockup.querySelector('.mock-followups-wrap');

    function hideChatElements() {
        // Instant hide — no transition so content is invisible immediately
        [stepsWrap, parasEl, followWrap].forEach(function (el) {
            if (el) {
                el.style.transition = 'none';
                el.style.opacity = '0';
                el.style.transform = 'translateY(0)';
            }
        });
        // Also hide individual paragraphs immediately
        if (parasEl) {
            var paras = parasEl.children;
            for (var i = 0; i < paras.length; i++) {
                paras[i].style.transition = 'none';
                paras[i].style.opacity = '0';
                paras[i].style.transform = 'translateY(6px)';
            }
        }
        // Also hide individual follow-up items
        if (followEl) {
            var items = followEl.children;
            for (var i = 0; i < items.length; i++) {
                items[i].style.transition = 'none';
                items[i].style.opacity = '0';
                items[i].style.transform = 'translateY(6px)';
            }
        }
    }

    function staggerChatReveal(scene) {
        hideChatElements();

        // Type the query first
        typeQuery(scene.query);

        // After typing finishes (~query.length * 30ms + 400ms cursor hide)
        var typeDone = scene.query.length * 30 + 500;

        // Show investigation badge
        addTimer(function () {
            if (stepsWrap) {
                stepsWrap.style.transition = 'opacity 0.4s ease';
                stepsWrap.style.opacity = '1';
            }
        }, typeDone);

        // Show paragraphs one by one
        addTimer(function () {
            // Make the container visible but keep individual paras hidden
            if (parasEl) {
                parasEl.style.transition = 'none';
                parasEl.style.opacity = '1';
            }
            // Stagger individual paragraphs
            var paras = parasEl ? parasEl.children : [];
            for (var i = 0; i < paras.length; i++) {
                (function(p, delay) {
                    addTimer(function () {
                        p.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                        p.style.opacity = '1';
                        p.style.transform = 'translateY(0)';
                    }, delay);
                })(paras[i], i * 400);
            }
        }, typeDone + 300);

        // Show follow-ups last, one by one
        var followStart = typeDone + 300 + (parasEl ? parasEl.children.length : 0) * 400 + 300;
        addTimer(function () {
            if (followWrap) {
                followWrap.style.transition = 'none';
                followWrap.style.opacity = '1';
            }
            // Stagger individual follow-up items
            var items = followEl ? followEl.children : [];
            for (var i = 0; i < items.length; i++) {
                (function(item, delay) {
                    addTimer(function () {
                        item.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, delay);
                })(items[i], i * 300);
            }
        }, followStart);
    }

    function showVisScene(index) {
        visScenes.forEach(function (s) { s.classList.remove('mock-vis-active'); });
        var target = visScenes[index];
        if (!target) return;
        // Reset animations inside this scene via reflow trick
        target.classList.add('mock-reset');
        void target.offsetWidth;
        target.classList.remove('mock-reset');
        target.classList.add('mock-vis-active');
    }

    // Shared typing effect — types text character-by-character into a target element
    var activeTypingTimers = [];
    function typeText(targetEl, opts) {
        if (!targetEl) { if (opts.onDone) opts.onDone(); return; }
        var text     = opts.text || '';
        var speed    = opts.speed || 30;
        var cursorEl = opts.cursor;
        var onDone   = opts.onDone;

        // Clear any previous typing timer for this element
        activeTypingTimers.forEach(clearInterval);
        activeTypingTimers = [];

        targetEl.textContent = '';

        // Ensure cursor is visible
        if (!cursorEl) {
            var parent = targetEl.parentNode;
            cursorEl = parent.querySelector('.mock-typing-cursor');
            if (!cursorEl) {
                cursorEl = document.createElement('span');
                cursorEl.className = 'mock-typing-cursor';
                parent.appendChild(cursorEl);
            }
        }
        cursorEl.style.display = '';

        var i = 0;
        var timer = setInterval(function () {
            if (i < text.length) {
                targetEl.textContent = text.slice(0, i + 1);
                i++;
            } else {
                clearInterval(timer);
                setTimeout(function () { cursorEl.style.display = 'none'; }, 350);
                if (onDone) onDone();
            }
        }, speed);
        activeTypingTimers.push(timer);
    }

    // Desktop query typing (30ms/char)
    function typeQuery(text) {
        typeText(queryEl, { text: text, speed: 30 });
    }

    function advance() {
        if (rotateEl) rotateEl.classList.add('is-swapping');
        mockup.classList.add('mock-fading');

        setTimeout(function () {
            current = (current + 1) % scenes.length;
            var scene = scenes[current];

            if (rotateEl) {
                rotateEl.textContent = scene.subtitle;
                rotateEl.classList.remove('is-swapping');
            }
            if (scene.heroSubtextKey) setHeroSubtext(scene.heroSubtextKey);
            updateChat(scene);

            // Instantly swap vis scenes (no CSS transition during hidden state)
            visScenes.forEach(function (s) {
                s.style.transition = 'none';
                s.classList.remove('mock-vis-active');
            });
            var target = visScenes[current];
            if (target) {
                target.classList.add('mock-reset');
                void target.offsetWidth;
                target.classList.remove('mock-reset');
                target.style.transition = 'none';
                target.classList.add('mock-vis-active');
            }

            // Hide chat elements before revealing
            hideChatElements();

            // Ensure everything is committed while hidden
            void mockup.offsetWidth;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    // Restore vis transitions for future use
                    visScenes.forEach(function (s) { s.style.transition = ''; });
                    mockup.classList.remove('mock-fading');
                    staggerChatReveal(scene);
                });
            });
        }, 500);
    }

    // ═══ Micro-interactions ═══

    var interactionTimers = [];
    function addTimer(fn, delay) {
        var t = setTimeout(fn, delay);
        interactionTimers.push(t);
        return t;
    }

    var colabBtn     = mockup.querySelector('.mock-colab-btn');
    var pubPopup     = mockup.querySelector('.mock-pubmed-popup');
    var pubBackdrop  = mockup.querySelector('.mock-pubmed-backdrop');

    // Colab overlay elements
    var colabOverlay   = mockup.querySelector('.mock-colab-overlay');
    var colabRunBtnEl  = mockup.querySelector('.mock-colab-run-btn');
    var colabSpinner   = mockup.querySelector('.mock-colab-spinner');
    var colabPlotArea  = mockup.querySelector('.mock-colab-plot-area');
    var colabEmpty     = mockup.querySelector('.mock-colab-empty');
    var colabTitleLine = mockup.querySelector('.mock-colab-title-line');
    var colabPlotTitle = mockup.querySelector('.mock-colab-plot-title');
    var colabCellStatus = mockup.querySelector('.mock-colab-cell-status');
    var colabOutputStatus = mockup.querySelector('.mock-colab-output-status');
    var colabKmLines   = colabOverlay ? colabOverlay.querySelectorAll('.mock-colab-km-line') : [];
    var colabCiBands   = colabOverlay ? colabOverlay.querySelectorAll('.mock-colab-ci') : [];
    var colabLegendLines = colabOverlay ? colabOverlay.querySelectorAll('.mock-colab-legend-swatch') : [];
    var colabLegendTexts = colabOverlay ? colabOverlay.querySelectorAll('.mock-colab-legend-text') : [];
    var colabColorArgs   = colabOverlay ? colabOverlay.querySelectorAll('.mock-colab-color-arg') : [];
    // Colors for the G12D vs G12R re-run
    var colabNewColors = ['#ef4444', '#3b82f6'];

    function resetColabOverlay() {
        if (colabOverlay) {
            colabOverlay.classList.remove('mock-colab-visible', 'mock-colab-plotted');
        }
        if (colabSpinner) colabSpinner.style.display = 'none';
        if (colabPlotArea) colabPlotArea.style.display = 'none';
        if (colabEmpty) colabEmpty.style.display = '';
        if (colabTitleLine) {
            colabTitleLine.textContent = 'KRAS Survival';
            colabTitleLine.classList.remove('mock-colab-highlight');
        }
        if (colabPlotTitle) colabPlotTitle.textContent = 'KRAS Survival';
        if (colabRunBtnEl) colabRunBtnEl.classList.remove('mock-colab-running');
        if (colabCellStatus) colabCellStatus.textContent = '';
        if (colabOutputStatus) colabOutputStatus.textContent = '';
        // Reset line/CI/legend colors to originals
        for (var i = 0; i < colabKmLines.length; i++) {
            colabKmLines[i].style.stroke = '';
        }
        for (var i = 0; i < colabCiBands.length; i++) {
            colabCiBands[i].style.fill = '';
        }
        for (var i = 0; i < colabLegendLines.length; i++) {
            colabLegendLines[i].style.stroke = '';
        }
        if (colabLegendTexts.length >= 2) {
            colabLegendTexts[0].textContent = 'Wild-type';
            colabLegendTexts[1].textContent = 'KRAS Mutant';
        }
        // Hide color= args in code cell
        for (var i = 0; i < colabColorArgs.length; i++) {
            colabColorArgs[i].style.opacity = '0';
            colabColorArgs[i].style.display = 'none';
        }
    }

    function clearAllInteractions() {
        interactionTimers.forEach(clearTimeout);
        interactionTimers = [];
        activeTypingTimers.forEach(clearInterval);
        activeTypingTimers = [];
        if (pubPopup) pubPopup.classList.remove('mock-popup-visible');
        if (pubBackdrop) pubBackdrop.classList.remove('mock-backdrop-visible');
        var citeD1 = mockup.querySelector('.mock-cite-d1');
        if (citeD1) citeD1.classList.remove('mock-cite-active');
        if (colabBtn) colabBtn.classList.remove('mock-colab-active');
        resetColabOverlay();
    }

    function playScene0Interactions() {
        if (current !== 0) return;

        // Citation click at 4s — highlight D1, show PubMed popup
        addTimer(function () {
            var citeD1 = mockup.querySelector('.mock-cite-d1');
            if (citeD1) citeD1.classList.add('mock-cite-active');
            addTimer(function () {
                if (pubBackdrop) pubBackdrop.classList.add('mock-backdrop-visible');
                if (pubPopup) pubPopup.classList.add('mock-popup-visible');
            }, 300);
            addTimer(function () {
                if (pubPopup) pubPopup.classList.remove('mock-popup-visible');
                if (pubBackdrop) pubBackdrop.classList.remove('mock-backdrop-visible');
                if (citeD1) citeD1.classList.remove('mock-cite-active');
            }, 2500);
        }, 4000);
    }

    // ── Colab takeover: individual step functions ──

    function colabShowOverlay() {
        if (colabOverlay) colabOverlay.classList.add('mock-colab-visible');
        if (colabBtn) colabBtn.classList.remove('mock-colab-active');
        setHeroSubtext('colab');
    }

    function colabStartRun() {
        if (colabRunBtnEl) colabRunBtnEl.classList.add('mock-colab-running');
        if (colabCellStatus) colabCellStatus.textContent = 'Running...';
        if (colabEmpty) colabEmpty.style.display = 'none';
        if (colabSpinner) colabSpinner.style.display = '';
    }

    function colabShowPlot() {
        if (colabSpinner) colabSpinner.style.display = 'none';
        if (colabPlotArea) colabPlotArea.style.display = '';
        if (colabRunBtnEl) colabRunBtnEl.classList.remove('mock-colab-running');
        if (colabCellStatus) colabCellStatus.textContent = '0.34s';
        if (colabOutputStatus) colabOutputStatus.textContent = 'matplotlib inline';
        if (colabOverlay) colabOverlay.classList.add('mock-colab-plotted');
    }

    function colabEditTitle() {
        if (!colabTitleLine) return;
        colabTitleLine.classList.add('mock-colab-highlight');
        var newTitle = 'KRAS Survival \u2014 G12D vs G12R';
        var baseTitle = 'KRAS Survival';
        var ci = baseTitle.length;
        var titleTimer = setInterval(function () {
            if (ci < newTitle.length) {
                colabTitleLine.textContent = newTitle.slice(0, ci + 1);
                ci++;
            } else {
                clearInterval(titleTimer);
            }
        }, 50);
        interactionTimers.push(titleTimer);
    }

    function colabRevealColorArgs() {
        for (var i = 0; i < colabColorArgs.length; i++) {
            colabColorArgs[i].style.display = '';
            colabColorArgs[i].offsetWidth; // reflow to trigger transition
            colabColorArgs[i].style.opacity = '1';
        }
    }

    function colabSwapColors() {
        if (colabPlotTitle) colabPlotTitle.textContent = 'KRAS Survival \u2014 G12D vs G12R';
        if (colabTitleLine) colabTitleLine.classList.remove('mock-colab-highlight');
        if (colabRunBtnEl) colabRunBtnEl.classList.remove('mock-colab-running');
        if (colabCellStatus) colabCellStatus.textContent = '0.28s';
        for (var i = 0; i < colabKmLines.length && i < colabNewColors.length; i++) {
            colabKmLines[i].style.stroke = colabNewColors[i];
        }
        for (var i = 0; i < colabCiBands.length && i < colabNewColors.length; i++) {
            colabCiBands[i].style.fill = colabNewColors[i];
        }
        for (var i = 0; i < colabLegendLines.length && i < colabNewColors.length; i++) {
            colabLegendLines[i].style.stroke = colabNewColors[i];
        }
        if (colabLegendTexts.length >= 2) {
            colabLegendTexts[0].textContent = 'G12D';
            colabLegendTexts[1].textContent = 'G12R';
        }
    }

    function colabFadeOut(callback) {
        // Hide underlying scene BEFORE overlay fades to prevent flash-through
        visScenes.forEach(function (s) {
            s.style.transition = 'none';
            s.classList.remove('mock-vis-active');
        });
        mockup.classList.add('mock-fading');
        if (colabOverlay) colabOverlay.classList.remove('mock-colab-visible');
        addTimer(function () {
            resetColabOverlay();
            callback();
        }, 600);
    }

    // ── Colab takeover: orchestrator (flat timeline, all offsets from T0) ──

    function playColabTakeover(callback) {
        if (!colabOverlay) { callback(); return; }
        resetColabOverlay();

        // T0: Highlight export button
        if (colabBtn) colabBtn.classList.add('mock-colab-active');

        addTimer(colabShowOverlay,    600);   // T+600ms:  overlay fades in
        addTimer(colabStartRun,       1200);  // T+1200ms: run button + spinner
        addTimer(colabShowPlot,       2200);  // T+2200ms: plot appears, lines draw
        addTimer(colabEditTitle,      4100);  // T+4100ms: type new title in code cell
        addTimer(colabRevealColorArgs,5400);  // T+5400ms: show color= args
        addTimer(function () {               // T+5800ms: re-run pulse
            if (colabRunBtnEl) colabRunBtnEl.classList.add('mock-colab-running');
            if (colabCellStatus) colabCellStatus.textContent = 'Running...';
        }, 5800);
        addTimer(colabSwapColors,     6400);  // T+6400ms: plot updates with new colors
        addTimer(function () {               // T+7800ms: fade out → callback
            colabFadeOut(callback);
        }, 7800);
    }

    // Mobile overlay elements
    var mobileOverlay  = mockup.querySelector('.mock-mobile-overlay');
    var mobileLabel    = mockup.querySelector('.mock-mobile-label');
    var mobileLabelWords = mockup.querySelectorAll('.mock-label-word');

    function revealLabelWords() {
        mobileLabelWords.forEach(function (word, i) {
            word.classList.remove('is-visible');
        });
        mobileLabelWords.forEach(function (word, i) {
            setTimeout(function () {
                word.classList.add('is-visible');
            }, 200 + i * 250);
        });
    }

    function resetLabelWords() {
        mobileLabelWords.forEach(function (word) {
            word.classList.remove('is-visible');
        });
    }

    // Mobile phone inner elements
    var mobileQueryText    = mockup.querySelector('.mock-mobile-query-text');
    var mobileInvestigating = mockup.querySelector('.mock-mobile-investigating');
    var mobileBadge        = mockup.querySelector('.mock-mobile-badge');
    var mobileResponse     = mockup.querySelector('.mock-mobile-response');
    var mobileChart        = mockup.querySelector('.mock-mobile-chart');
    var mobileFollowups    = mockup.querySelector('.mock-mobile-followups');
    var mobileStems        = mockup.querySelectorAll('.mock-mini-stem');
    var mobileDots         = mockup.querySelectorAll('.mock-mini-dot');

    function resetMobilePhone() {
        // Reset label words
        resetLabelWords();
        // Reset all mobile phone elements to initial state
        if (mobileQueryText) mobileQueryText.textContent = '';
        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
        if (mobileBadge) mobileBadge.style.opacity = '0';
        if (mobileResponse) mobileResponse.style.opacity = '0';
        if (mobileChart) { mobileChart.style.opacity = '0'; mobileChart.style.transform = 'translateY(0.3em)'; }
        if (mobileFollowups) mobileFollowups.style.opacity = '0';
        // Reset stems and dots
        mobileStems.forEach(function (s) { s.style.transform = 'scaleY(0)'; });
        mobileDots.forEach(function (d) { d.style.transform = 'scale(0)'; });
        // Remove any cursor
        var phoneCursor = mockup.querySelector('.mock-mobile-query-pill .mock-typing-cursor');
        if (phoneCursor) phoneCursor.style.display = 'none';
    }

    // Mobile phone cursor (created once, reused)
    var mobileCursor = (function () {
        var pill = mockup.querySelector('.mock-mobile-query-pill');
        var c = pill ? pill.querySelector('.mock-typing-cursor') : null;
        if (!c && pill) {
            c = document.createElement('span');
            c.className = 'mock-typing-cursor';
            c.style.height = '0.7em';
            c.style.verticalAlign = 'text-bottom';
            pill.appendChild(c);
        }
        return c;
    })();

    // Mobile phone typing (35ms/char, slightly slower feel)
    function typeInPhone(text, callback) {
        typeText(mobileQueryText, { text: text, speed: 35, cursor: mobileCursor, onDone: callback });
    }

    function animateMobileChart() {
        // Show chart card
        if (mobileChart) {
            mobileChart.style.opacity = '1';
            mobileChart.style.transform = 'translateY(0)';
        }
        // Animate stems staggered
        mobileStems.forEach(function (stem, idx) {
            setTimeout(function () {
                stem.style.transition = 'transform 0.4s var(--ease-out)';
                stem.style.transform = 'scaleY(1)';
            }, idx * 60);
        });
        // Animate dots after stems
        mobileDots.forEach(function (dot, idx) {
            setTimeout(function () {
                dot.style.transition = 'transform 0.25s var(--ease-bounce)';
                dot.style.transform = 'scale(1)';
            }, 300 + idx * 60);
        });
    }

    function playMobileTransition(callback) {
        if (!mobileOverlay) { callback(); return; }

        resetMobilePhone();

        var frame = mobileOverlay.querySelector('.mock-mobile-frame');
        if (frame) frame.style.transform = 'scale(0.85)';

        mobileOverlay.classList.remove('mock-mobile-expanding');
        mobileOverlay.classList.add('mock-mobile-visible');
        revealLabelWords();
        setHeroSubtext('mobile');

        // Condensed mobile sequence: type query, show results, animate chart
        setTimeout(function () {
            typeInPhone(scenes[0].query, function () {
                // Quick reveal: investigating -> badge -> response -> chart
                setTimeout(function () {
                    if (mobileInvestigating) mobileInvestigating.style.opacity = '1';
                    setTimeout(function () {
                        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
                        if (mobileBadge) mobileBadge.style.opacity = '1';
                        // Response fades in after badge
                        setTimeout(function () {
                            if (mobileResponse) mobileResponse.style.opacity = '1';
                        }, 300);
                        setTimeout(function () {
                            animateMobileChart();

                            // Show follow-ups after chart renders
                            setTimeout(function () {
                                if (mobileFollowups) mobileFollowups.style.opacity = '1';
                            }, 1000);

                            // Wait for chart + follow-ups, then expand
                            setTimeout(function () {
                                mobileOverlay.classList.add('mock-mobile-expanding');
                                setTimeout(function () {
                                    mobileOverlay.style.transition = 'none';
                                    mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                                    if (frame) frame.style.transform = '';
                                    void mobileOverlay.offsetWidth;
                                    mobileOverlay.style.transition = '';
                                    callback();
                                }, 1100);
                            }, 2000);
                        }, 150);
                    }, 500);
                }, 150);
            });
        }, 400);
    }

    // ═══ Initial mobile-first sequence ═══
    function initialMobileSequence() {
        resetMobilePhone();

        var frame = mobileOverlay ? mobileOverlay.querySelector('.mock-mobile-frame') : null;

        // Step 1 (0ms): Mobile is already visible via HTML class. Ensure frame is at scale.
        if (frame) frame.style.transform = 'scale(0.85)';
        // Trigger the scale(1) transition
        requestAnimationFrame(function () {
            if (frame) frame.style.transform = '';
            if (mobileOverlay) {
                mobileOverlay.classList.remove('mock-mobile-expanding');
                // Ensure visible
                mobileOverlay.classList.add('mock-mobile-visible');
            }
            // Reveal label words with stagger
            revealLabelWords();
        });

        // Step 2 (800ms): Type query in phone
        setTimeout(function () {
            typeInPhone('TP53 mutations in breast cancer', function () {

                // Step 3 (after typing ~1700ms): Show investigating state
                setTimeout(function () {
                    if (mobileInvestigating) mobileInvestigating.style.opacity = '1';

                    // Step 3.5 (~700ms later): Replace investigating with badge
                    setTimeout(function () {
                        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
                        if (mobileBadge) mobileBadge.style.opacity = '1';

                        // Step 3.7 (400ms later): Fade in response text
                        setTimeout(function () {
                            if (mobileResponse) mobileResponse.style.opacity = '1';
                        }, 400);

                        // Step 4 (600ms later): Animate chart
                        setTimeout(function () {
                            animateMobileChart();

                            // Step 4.5: Show follow-ups after chart renders
                            setTimeout(function () {
                                if (mobileFollowups) mobileFollowups.style.opacity = '1';
                            }, 1000);

                            // Step 5 (2200ms pause): Let chart + follow-ups render
                            // Step 6 (after pause): Expand phone to desktop
                            setTimeout(function () {
                                // Prep desktop content underneath before expansion
                                updateChat(scenes[0]);
                                showVisScene(0);
                                hideChatElements();

                                // Start phone expansion
                                mobileOverlay.classList.add('mock-mobile-expanding');

                                // Step 7 (1100ms): Expansion done, reveal desktop
                                setTimeout(function () {
                                    // Kill overlay instantly — no fade-out transition
                                    mobileOverlay.style.transition = 'none';
                                    mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                                    if (frame) frame.style.transform = '';
                                    // Force reflow then restore transitions
                                    void mobileOverlay.offsetWidth;
                                    mobileOverlay.style.transition = '';
                                    // Desktop appears instantly
                                    mockup.classList.remove('mock-desktop-hidden');
                                    setHeroSubtext('scene0');
                                    staggerChatReveal(scenes[0]);
                                    playScene0Interactions();
                                    startSceneCycling();
                                }, 1100);
                            }, 2200);
                        }, 600);
                    }, 700);
                }, 200);
            });
        }, 800);
    }

    // ═══ Scene timer ═══
    var sceneTimer = null;

    function scheduleNext() {
        var delay = INTERVAL;
        sceneTimer = setTimeout(function () {
            advanceWithInteractions();
        }, delay);
    }

    function startSceneCycling() {
        if (sceneTimer) clearTimeout(sceneTimer);
        scheduleNext();
    }

    function advanceWithInteractions() {
        clearAllInteractions();
        if (sceneTimer) clearTimeout(sceneTimer);

        // Last scene → Colab takeover → mobile transition → Scene 0
        if (current === 1) {
            playColabTakeover(function () {
                // After Colab fades out — mockup is already fading & vis scenes already cleared
                // inside playColabTakeover, so go straight to scene 0 setup
                setTimeout(function () {
                    current = 0;
                    if (rotateEl) {
                        rotateEl.textContent = scenes[0].subtitle;
                        rotateEl.classList.remove('is-swapping');
                    }
                    updateChat(scenes[0]);

                    var target = visScenes[0];
                    if (target) {
                        target.classList.add('mock-reset');
                        void target.offsetWidth;
                        target.classList.remove('mock-reset');
                        target.style.transition = 'none';
                        target.classList.add('mock-vis-active');
                    }
                    hideChatElements();

                    // Keep desktop HIDDEN — show mobile overlay on top first
                    playMobileTransition(function () {
                        void mockup.offsetWidth;
                        visScenes.forEach(function (s) { s.style.transition = ''; });
                        mockup.classList.remove('mock-fading');
                        setHeroSubtext('scene0');
                        staggerChatReveal(scenes[0]);
                        playScene0Interactions();
                        scheduleNext();
                    });
                }, 300);
            });
            return;
        }

        // Normal advance: Scene 0 → Scene 1
        advance();
        setTimeout(function () {
            if (current === 0) playScene0Interactions();
            scheduleNext();
        }, 600);
    }

    // ═══ Start with mobile-first sequence instead of immediate cycling ═══
    initialMobileSequence();
})();
