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
        // Clear any running typing timer
        if (typingTimer) clearInterval(typingTimer);
        queryEl.textContent = '';
        // Add cursor to query pill parent
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

        // Wait for CSS fade-out transition to fully complete (0.4s + buffer)
        setTimeout(function () {
            current = (current + 1) % scenes.length;
            var scene = scenes[current];

            // Update content while invisible
            rotateEl.textContent = scene.subtitle;
            rotateEl.classList.remove('is-swapping');
            updateChat(scene);
            showVisScene(current);

            // Force layout flush, then fade back in on next frame
            void mockup.offsetWidth;
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    mockup.classList.remove('mock-fading');
                    typeQuery(scene.query);
                });
            });
        }, 500); // Wait a full 500ms to ensure fade-out is done
    }

    // ═══ Micro-interactions ═══

    // Track all interaction timers so we can clean up on scene swap
    var interactionTimers = [];
    function addTimer(fn, delay) {
        var t = setTimeout(fn, delay);
        interactionTimers.push(t);
        return t;
    }

    var colabBtn     = mockup.querySelector('.mock-colab-btn');
    var colabPopup   = mockup.querySelector('.mock-colab-popup');
    var pubPopup     = mockup.querySelector('.mock-pubmed-popup');
    var pubBackdrop  = mockup.querySelector('.mock-pubmed-backdrop');

    function clearAllInteractions() {
        interactionTimers.forEach(clearTimeout);
        interactionTimers = [];
        if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
        if (pubPopup) pubPopup.classList.remove('mock-popup-visible');
        if (pubBackdrop) pubBackdrop.classList.remove('mock-backdrop-visible');
        // Find the dynamic D1 cite and clear it
        var citeD1 = mockup.querySelector('.mock-cite-d1');
        if (citeD1) citeD1.classList.remove('mock-cite-active');
        if (colabBtn) colabBtn.classList.remove('mock-colab-active');
        if (colabPopup) colabPopup.classList.remove('mock-popup-visible');
        // Remove any added breadcrumb tags
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

        // 2) Citation click at 5s — highlight D1 + show PubMed popup
        //    Popup dismisses at 7s, full 1s before scene transition at 8s
        addTimer(function () {
            var citeD1 = mockup.querySelector('.mock-cite-d1');
            if (citeD1) citeD1.classList.add('mock-cite-active');
            addTimer(function () {
                if (pubBackdrop) pubBackdrop.classList.add('mock-backdrop-visible');
                if (pubPopup) pubPopup.classList.add('mock-popup-visible');
            }, 300);
            // Dismiss at 7s (5s + 2s)
            addTimer(function () {
                if (pubPopup) pubPopup.classList.remove('mock-popup-visible');
                if (pubBackdrop) pubBackdrop.classList.remove('mock-backdrop-visible');
                if (citeD1) citeD1.classList.remove('mock-cite-active');
            }, 2000);
        }, 5000);
    }

    function playScene1Interactions() {
        if (current !== 1) return;

        // Colab export at 4s — highlight button, show Colab popup
        // Dismiss at 7s, 1s before scene transition
        addTimer(function () {
            if (colabBtn) colabBtn.classList.add('mock-colab-active');
            addTimer(function () {
                if (colabPopup) colabPopup.classList.add('mock-popup-visible');
            }, 400);
            // Dismiss at 7s (4s + 3s)
            addTimer(function () {
                if (colabPopup) colabPopup.classList.remove('mock-popup-visible');
                if (colabBtn) colabBtn.classList.remove('mock-colab-active');
            }, 3000);
        }, 4000);
    }

    // Mobile overlay elements
    var mobileOverlay  = mockup.querySelector('.mock-mobile-overlay');
    var mobileLabel    = mockup.querySelector('.mock-mobile-label');

    function playMobileTransition(callback) {
        if (!mobileOverlay) { callback(); return; }

        // Show mobile device with fade in
        mobileOverlay.classList.add('mock-mobile-visible');

        // After 2s viewing the phone, expand to desktop
        setTimeout(function () {
            mobileOverlay.classList.add('mock-mobile-expanding');

            // After expansion (0.9s), hide overlay and show desktop
            setTimeout(function () {
                mobileOverlay.classList.remove('mock-mobile-visible', 'mock-mobile-expanding');
                callback();
            }, 900);
        }, 2000);
    }

    // Initial play
    typeQuery(scenes[0].query);
    playScene0Interactions();

    // ═══ Scene timer ═══
    function advanceWithInteractions() {
        clearAllInteractions();

        // If transitioning from Scene 2 back to Scene 0, play mobile transition
        if (current === 2) {
            mockup.classList.add('mock-fading');
            setTimeout(function () {
                // Swap to scene 0 while hidden
                current = 0;
                rotateEl.textContent = scenes[0].subtitle;
                rotateEl.classList.remove('is-swapping');
                updateChat(scenes[0]);
                showVisScene(0);

                void mockup.offsetWidth;
                requestAnimationFrame(function () {
                    requestAnimationFrame(function () {
                        mockup.classList.remove('mock-fading');

                        // Show mobile overlay, then expand to desktop
                        playMobileTransition(function () {
                            typeQuery(scenes[0].query);
                            playScene0Interactions();
                        });
                    });
                });
            }, 500);
            return;
        }

        // Normal advance for other scenes
        advance();
        setTimeout(function () {
            if (current === 0) playScene0Interactions();
            if (current === 1) playScene1Interactions();
        }, 600);
    }

    setInterval(advanceWithInteractions, INTERVAL);
})();
