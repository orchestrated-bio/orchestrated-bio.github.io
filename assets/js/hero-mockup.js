// Hero rotation — syncs subtitle, chat panel text, and visualization scenes
(function () {
    var rotateEl = document.getElementById('hero-rotate-text');
    var mockup   = document.querySelector('.hero-mockup');
    if (!rotateEl || !mockup) return;

    var scenes = [
        {
            subtitle: 'Cancer Genomics',
            query: 'TP53 mutations in breast cancer',
            steps: 'Investigated with 5 steps',
            crumbs: [
                { text: 'FOCUS', cls: 'bg-brand-500/20 text-brand-400' },
                { text: 'Brca TCGA Pan Can Atlas 2018', cls: 'bg-amber-500/15 text-amber-400' },
                { text: 'TP53', cls: 'bg-sky-500/15 text-sky-400' }
            ],
            cohort: 'COHORT: N=1,080',
            paras: [
                'TP53 is mutated in approximately 34% of breast invasive carcinomas (368/1,080 samples), with 207 mutations identified across 41 distinct protein positions.',
                'The mutation landscape is dominated by hotspots in the DNA-binding domain, specifically R175H (10%), R273H/C/L, and H193R/Y.',
                'These structural and contact mutations are found across both ER-positive and ER-negative tumors.'
            ],
            cites: ['D1', 'Shukla 2025'],
            followups: [
                '1. How do TP53 mutations correlate with ER/PR/HER2 status?',
                '2. Impact on overall survival in TCGA breast cancer patients?'
            ]
        },
        {
            subtitle: 'Survival Analysis',
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
            cites: ['D3', 'Steele 2018'],
            followups: [
                '1. Do specific KRAS codons show different survival outcomes?',
                '2. What about drug sensitivity?'
            ]
        },
        {
            subtitle: 'Drug Sensitivity',
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
        if (queryEl) queryEl.textContent = s.query;
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
                    if (i === 1 && current === 0) {
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
        if (stepsWrap)  stepsWrap.style.opacity = '0';
        if (parasEl)    parasEl.style.opacity = '0';
        if (followWrap) followWrap.style.opacity = '0';
        [stepsWrap, parasEl, followWrap].forEach(function (el) {
            if (el) {
                el.style.transition = 'opacity 0.4s ease';
                el.style.transform = 'translateY(0)';
            }
        });
    }

    function staggerChatReveal(scene) {
        hideChatElements();

        // Type the query first
        typeQuery(scene.query);

        // After typing finishes (~query.length * 30ms + 400ms cursor hide)
        var typeDone = scene.query.length * 30 + 500;

        // Show investigation badge
        addTimer(function () {
            if (stepsWrap) stepsWrap.style.opacity = '1';
        }, typeDone);

        // Show paragraphs one by one
        addTimer(function () {
            if (parasEl) parasEl.style.opacity = '1';
            // Stagger individual paragraphs
            var paras = parasEl ? parasEl.children : [];
            for (var i = 0; i < paras.length; i++) {
                (function(p, delay) {
                    p.style.opacity = '0';
                    p.style.transform = 'translateY(6px)';
                    p.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                    addTimer(function () {
                        p.style.opacity = '1';
                        p.style.transform = 'translateY(0)';
                    }, delay);
                })(paras[i], i * 400);
            }
        }, typeDone + 300);

        // Show follow-ups last
        addTimer(function () {
            if (followWrap) followWrap.style.opacity = '1';
        }, typeDone + 300 + (parasEl ? parasEl.children.length : 0) * 400 + 300);
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

    // Typing effect now targets the query pill (top), not the chat input
    var typingTimer = null;
    function typeQuery(text) {
        if (!queryEl) return;
        if (typingTimer) clearInterval(typingTimer);
        queryEl.textContent = '';
        var cursor = queryEl.parentNode.querySelector('.mock-typing-cursor');
        if (!cursor) {
            cursor = document.createElement('span');
            cursor.className = 'mock-typing-cursor';
            queryEl.parentNode.appendChild(cursor);
        }
        cursor.style.display = '';
        var i = 0;
        typingTimer = setInterval(function () {
            if (i < text.length) {
                queryEl.textContent = text.slice(0, i + 1);
                i++;
            } else {
                clearInterval(typingTimer);
                typingTimer = null;
                setTimeout(function () {
                    cursor.style.display = 'none';
                }, 400);
            }
        }, 30);
    }

    function advance() {
        rotateEl.classList.add('is-swapping');
        mockup.classList.add('mock-fading');

        setTimeout(function () {
            current = (current + 1) % scenes.length;
            var scene = scenes[current];

            rotateEl.textContent = scene.subtitle;
            rotateEl.classList.remove('is-swapping');
            updateChat(scene);
            showVisScene(current);

            // Hide chat elements before revealing
            hideChatElements();

            void mockup.offsetWidth;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
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
    }

    function clearAllInteractions() {
        interactionTimers.forEach(clearTimeout);
        interactionTimers = [];
        if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
        if (pubPopup) pubPopup.classList.remove('mock-popup-visible');
        if (pubBackdrop) pubBackdrop.classList.remove('mock-backdrop-visible');
        var citeD1 = mockup.querySelector('.mock-cite-d1');
        if (citeD1) citeD1.classList.remove('mock-cite-active');
        if (colabBtn) colabBtn.classList.remove('mock-colab-active');
        resetColabOverlay();
        var addedTag = mockup.querySelector('.mock-added-crumb');
        if (addedTag && addedTag.parentNode) addedTag.parentNode.removeChild(addedTag);
    }

    function playScene0Interactions() {
        if (current !== 0) return;

        // 1) Plot click at 3s — highlight R175H lollipop and add breadcrumb
        addTimer(function () {
            var scene0 = mockup.querySelector('[data-vis="0"]');
            var stems = scene0 ? scene0.querySelectorAll('.mock-lollipop-stem') : [];
            var r175h = stems[4];
            if (r175h) {
                var dot = r175h.querySelector('.mock-lollipop-dot');
                if (dot) dot.style.boxShadow = '0 0 0 3px rgba(245, 158, 11, 0.5)';
                var crumbBox = mockup.querySelector('.mock-crumbs');
                if (crumbBox) {
                    var tag = document.createElement('span');
                    tag.className = 'mock-added-crumb px-[0.5em] py-[0.15em] rounded-[0.2em] bg-amber-500/20 text-amber-300 text-[0.7em]';
                    tag.textContent = 'R175H';
                    tag.style.opacity = '0';
                    tag.style.transform = 'scale(0.8)';
                    tag.style.transition = 'all 0.3s ease';
                    crumbBox.appendChild(tag);
                    requestAnimationFrame(function () {
                        tag.style.opacity = '1';
                        tag.style.transform = 'scale(1)';
                    });
                }
                addTimer(function () {
                    if (dot) dot.style.boxShadow = '';
                }, 1500);
            }
        }, 3000);

        // 2) Citation click at 5s
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
            }, 2000);
        }, 5000);
    }

    function playColabTakeover(callback) {
        if (!colabOverlay) { callback(); return; }

        resetColabOverlay();

        // Step 1 (0ms): Highlight export button in scene 1
        if (colabBtn) colabBtn.classList.add('mock-colab-active');

        // Step 2 (600ms): Fade in the Colab overlay
        addTimer(function () {
            if (colabOverlay) colabOverlay.classList.add('mock-colab-visible');
            if (colabBtn) colabBtn.classList.remove('mock-colab-active');

            // Step 3 (1200ms): Run button pulse + show spinner
            addTimer(function () {
                if (colabRunBtnEl) colabRunBtnEl.classList.add('mock-colab-running');
                if (colabCellStatus) colabCellStatus.textContent = 'Running...';
                if (colabEmpty) colabEmpty.style.display = 'none';
                if (colabSpinner) colabSpinner.style.display = '';
            }, 600);

            // Step 4 (2200ms): Hide spinner, show plot, draw lines
            addTimer(function () {
                if (colabSpinner) colabSpinner.style.display = 'none';
                if (colabPlotArea) colabPlotArea.style.display = '';
                if (colabRunBtnEl) colabRunBtnEl.classList.remove('mock-colab-running');
                if (colabCellStatus) colabCellStatus.textContent = '0.34s';
                if (colabOutputStatus) colabOutputStatus.textContent = 'matplotlib inline';
                // Trigger line draw animation
                if (colabOverlay) colabOverlay.classList.add('mock-colab-plotted');
            }, 1600);

            // Step 5 (4000ms): Highlight title line, start typing edit
            addTimer(function () {
                if (colabTitleLine) {
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
            }, 3500);

            // Step 6 (5500ms): Re-run — pulse run button, update plot title
            addTimer(function () {
                if (colabRunBtnEl) colabRunBtnEl.classList.add('mock-colab-running');
                if (colabCellStatus) colabCellStatus.textContent = 'Running...';
            }, 5000);

            addTimer(function () {
                if (colabPlotTitle) colabPlotTitle.textContent = 'KRAS Survival \u2014 G12D vs G12R';
                if (colabTitleLine) colabTitleLine.classList.remove('mock-colab-highlight');
                if (colabRunBtnEl) colabRunBtnEl.classList.remove('mock-colab-running');
                if (colabCellStatus) colabCellStatus.textContent = '0.28s';
            }, 5600);

            // Step 7 (7500ms): Fade out Colab, callback to resume scene cycling
            addTimer(function () {
                if (colabOverlay) colabOverlay.classList.remove('mock-colab-visible');
                addTimer(function () {
                    resetColabOverlay();
                    callback();
                }, 600);
            }, 7000);

        }, 600);
    }

    // Mobile overlay elements
    var mobileOverlay  = mockup.querySelector('.mock-mobile-overlay');
    var mobileLabel    = mockup.querySelector('.mock-mobile-label');

    // Mobile phone inner elements
    var mobileQueryText    = mockup.querySelector('.mock-mobile-query-text');
    var mobileInvestigating = mockup.querySelector('.mock-mobile-investigating');
    var mobileBadge        = mockup.querySelector('.mock-mobile-badge');
    var mobileResponse     = mockup.querySelector('.mock-mobile-response');
    var mobileChart        = mockup.querySelector('.mock-mobile-chart');
    var mobileStems        = mockup.querySelectorAll('.mock-mini-stem');
    var mobileDots         = mockup.querySelectorAll('.mock-mini-dot');

    function resetMobilePhone() {
        // Reset all mobile phone elements to initial state
        if (mobileQueryText) mobileQueryText.textContent = '';
        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
        if (mobileBadge) mobileBadge.style.opacity = '0';
        if (mobileResponse) mobileResponse.style.opacity = '0';
        if (mobileChart) { mobileChart.style.opacity = '0'; mobileChart.style.transform = 'translateY(0.3em)'; }
        // Reset stems and dots
        mobileStems.forEach(function (s) { s.style.transform = 'scaleY(0)'; });
        mobileDots.forEach(function (d) { d.style.transform = 'scale(0)'; });
        // Remove any cursor
        var phoneCursor = mockup.querySelector('.mock-mobile-query-pill .mock-typing-cursor');
        if (phoneCursor) phoneCursor.style.display = 'none';
    }

    var mobileTypingTimer = null;

    function typeInPhone(text, callback) {
        if (!mobileQueryText) { if (callback) callback(); return; }
        mobileQueryText.textContent = '';

        // Add cursor
        var pill = mockup.querySelector('.mock-mobile-query-pill');
        var cursor = pill ? pill.querySelector('.mock-typing-cursor') : null;
        if (!cursor && pill) {
            cursor = document.createElement('span');
            cursor.className = 'mock-typing-cursor';
            cursor.style.height = '0.7em';
            cursor.style.verticalAlign = 'text-bottom';
            pill.appendChild(cursor);
        }
        if (cursor) cursor.style.display = '';

        var i = 0;
        if (mobileTypingTimer) clearInterval(mobileTypingTimer);
        mobileTypingTimer = setInterval(function () {
            if (i < text.length) {
                mobileQueryText.textContent = text.slice(0, i + 1);
                i++;
            } else {
                clearInterval(mobileTypingTimer);
                mobileTypingTimer = null;
                if (cursor) {
                    setTimeout(function () { cursor.style.display = 'none'; }, 300);
                }
                if (callback) callback();
            }
        }, 35);
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
                stem.style.transition = 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
                stem.style.transform = 'scaleY(1)';
            }, idx * 60);
        });
        // Animate dots after stems
        mobileDots.forEach(function (dot, idx) {
            setTimeout(function () {
                dot.style.transition = 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)';
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

        // Condensed mobile sequence: type query, show results, animate chart
        setTimeout(function () {
            typeInPhone('TP53 mutations in breast cancer', function () {
                // Quick reveal: investigating -> badge + response -> chart
                setTimeout(function () {
                    if (mobileInvestigating) mobileInvestigating.style.opacity = '1';
                    setTimeout(function () {
                        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
                        if (mobileBadge) mobileBadge.style.opacity = '1';
                        if (mobileResponse) mobileResponse.style.opacity = '1';
                        setTimeout(function () {
                            animateMobileChart();

                            // After chart animates, pause briefly then expand
                            setTimeout(function () {
                                mobileOverlay.classList.add('mock-mobile-expanding');
                                setTimeout(function () {
                                    mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                                    if (frame) frame.style.transform = '';
                                    callback();
                                }, 1100);
                            }, 1000);
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
        });

        // Step 2 (800ms): Type query in phone
        setTimeout(function () {
            typeInPhone('TP53 mutations in breast cancer', function () {

                // Step 3 (after typing ~1700ms): Show investigating state
                setTimeout(function () {
                    if (mobileInvestigating) mobileInvestigating.style.opacity = '1';

                    // Step 3.5 (~700ms later): Replace investigating with badge + response
                    setTimeout(function () {
                        if (mobileInvestigating) mobileInvestigating.style.opacity = '0';
                        if (mobileBadge) mobileBadge.style.opacity = '1';
                        if (mobileResponse) mobileResponse.style.opacity = '1';

                        // Step 4 (200ms later): Animate chart
                        setTimeout(function () {
                            animateMobileChart();

                            // Step 5 (1300ms pause): Let users register the mobile experience
                            // Step 6 (after pause): Expand phone to desktop
                            setTimeout(function () {
                                // Prep desktop content underneath before expansion
                                updateChat(scenes[0]);
                                showVisScene(0);
                                // Remove the desktop-hidden class so parts are ready
                                mockup.classList.remove('mock-desktop-hidden');
                                // But keep fading class so it appears through the expansion
                                mockup.classList.add('mock-fading');

                                // Start phone expansion
                                mobileOverlay.classList.add('mock-mobile-expanding');

                                // Step 7 (1000ms): Expansion done, reveal desktop
                                setTimeout(function () {
                                    mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                                    if (frame) frame.style.transform = '';

                                    // Fade in desktop with staggered chat reveal
                                    void mockup.offsetWidth;
                                    requestAnimationFrame(function () {
                                        requestAnimationFrame(function () {
                                            mockup.classList.remove('mock-fading');
                                            staggerChatReveal(scenes[0]);
                                            playScene0Interactions();
                                            // Start the scene cycling
                                            startSceneCycling();
                                        });
                                    });
                                }, 1100);
                            }, 1300);
                        }, 200);
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

        // If transitioning from Scene 2 back to Scene 0, play mobile transition
        if (current === 2) {
            mockup.classList.add('mock-fading');
            setTimeout(function () {
                // Swap content while hidden
                current = 0;
                rotateEl.textContent = scenes[0].subtitle;
                rotateEl.classList.remove('is-swapping');
                updateChat(scenes[0]);
                showVisScene(0);

                // Keep desktop HIDDEN — show mobile overlay on top first
                // Do NOT remove mock-fading yet
                playMobileTransition(function () {
                    // Phone has expanded — now reveal the desktop underneath
                    void mockup.offsetWidth;
                    mockup.classList.remove('mock-fading');
                    staggerChatReveal(scenes[0]);
                    playScene0Interactions();
                    scheduleNext();
                });
            }, 500);
            return;
        }

        // Scene 1 → Colab takeover → Scene 2
        if (current === 1) {
            playColabTakeover(function () {
                // After Colab fades out, advance to Scene 2
                advance();
                setTimeout(function () {
                    scheduleNext();
                }, 600);
            });
            return;
        }

        // Normal advance for Scene 0 → Scene 1
        advance();
        setTimeout(function () {
            if (current === 0) playScene0Interactions();
            scheduleNext();
        }, 600);
    }

    // ═══ Start with mobile-first sequence instead of immediate cycling ═══
    initialMobileSequence();
})();
