// Hero rotation — syncs subtitle, chat panel text, and visualization scenes
(function () {
    var rotateEl = document.getElementById('hero-rotate-text'); // may be null if not in HTML
    var mockup   = document.querySelector('.hero-mockup');
    if (!mockup) return;

    var scenes = [
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
            cites: ['D1', 'Steele 2018'],
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
        if (rotateEl) rotateEl.classList.add('is-swapping');
        mockup.classList.add('mock-fading');

        setTimeout(function () {
            current = (current + 1) % scenes.length;
            var scene = scenes[current];

            if (rotateEl) {
                rotateEl.textContent = scene.subtitle;
                rotateEl.classList.remove('is-swapping');
            }
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
        revealLabelWords();

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
                                    mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                                    if (frame) frame.style.transform = '';
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
                // After Colab fades out, play mobile transition back to Scene 0
                mockup.classList.add('mock-fading');
                setTimeout(function () {
                    current = 0;
                    if (rotateEl) {
                        rotateEl.textContent = scenes[0].subtitle;
                        rotateEl.classList.remove('is-swapping');
                    }
                    updateChat(scenes[0]);

                    // Instantly swap vis scenes while hidden
                    visScenes.forEach(function (s) {
                        s.style.transition = 'none';
                        s.classList.remove('mock-vis-active');
                    });
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

    // ═══ Hero text state toggling ═══
    var heroState1 = document.getElementById('hero-state-1');
    var heroState2 = document.getElementById('hero-state-2');
    var heroTextState = 1; // track which state is visible
    var cycleCount = 0;    // count full scene cycles

    function showHeroState(stateNum) {
        if (!heroState1 || !heroState2) return;
        if (stateNum === heroTextState) return;
        heroTextState = stateNum;

        if (stateNum === 2) {
            heroState1.style.opacity = '0';
            heroState1.style.pointerEvents = 'none';
            heroState2.style.opacity = '1';
            heroState2.style.pointerEvents = 'auto';
        } else {
            heroState2.style.opacity = '0';
            heroState2.style.pointerEvents = 'none';
            heroState1.style.opacity = '1';
            heroState1.style.pointerEvents = 'auto';
        }
    }

    // Hook into scene advance — toggle hero text every full cycle (3 scenes)
    var origAdvanceWithInteractions = advanceWithInteractions;
    advanceWithInteractions = function () {
        // When we're about to leave scene 1 (last scene), that's a full cycle
        if (current === 1) {
            cycleCount++;
            // Toggle hero text state on each full cycle
            showHeroState(cycleCount % 2 === 0 ? 1 : 2);
        }
        origAdvanceWithInteractions();
    };

    // ═══ Start with mobile-first sequence instead of immediate cycling ═══
    initialMobileSequence();
})();
