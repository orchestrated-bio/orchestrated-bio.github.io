(function () {
  var proof = document.querySelector('.insight-product-proof');
  if (!proof) return;

  var ui = proof.querySelector('.insight-ui');
  var controls = [].slice.call(proof.querySelectorAll('[data-insight-phase]'));
  var playControl = proof.querySelector('[data-insight-play]');
  var visualScenes = [].slice.call(ui.querySelectorAll('.iui-scene'));
  var query = ui.querySelector('.iui-query-text');
  var queryBox = ui.querySelector('.iui-query');
  var stepsWrap = ui.querySelector('.iui-steps');
  var steps = ui.querySelector('.iui-steps-text');
  var context = ui.querySelector('.iui-crumb-context');
  var target = ui.querySelector('.iui-crumb-target');
  var cohort = ui.querySelector('.iui-cohort');
  var paragraphs = ui.querySelector('.iui-paras');
  var followups = ui.querySelector('.iui-follow-list');
  var phoneStory = ui.querySelector('.iui-mobile-story');
  var notebookStory = ui.querySelector('.iui-notebook-story');
  var workspaceParts = [
    ui.querySelector('.iui-side'),
    ui.querySelector('.iui-bar'),
    ui.querySelector('.iui-chat'),
    ui.querySelector('.iui-vis')
  ].filter(Boolean);
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var phase = 0;
  var playing = !reducedMotion;
  var phaseTimer = null;
  var phaseTimers = [];
  var typingTimer = null;

  var scenes = [
    {
      panel: 0,
      query: 'Where are TP53 mutations concentrated in breast cancer?',
      steps: 'Cohort matched · analysis checked',
      context: 'BRCA TCGA PanCanAtlas',
      target: 'TP53',
      cohort: 'PROFILED: N=1,066',
      paragraphs: [
        { label: 'Analysis', text: 'I selected the TCGA PanCancer Atlas breast cohort, kept 1,066 gene-profiled tumors, and counted recurrent TP53 protein changes.' },
        { label: 'Readout', text: "The recurrent changes cluster in TP53's DNA-binding domain. R175H appears in 21 tumors; R273H in 13; R196* in 8." },
        {
          label: 'Caveat',
          text: 'Each rate uses all 1,066 profiled tumors as the denominator. This is not the overall prevalence of TP53 alteration.',
          chips: [
            { label: 'Method', href: '#insight-methods' },
            { label: 'TCGA data', href: 'https://www.cbioportal.org/study/summary?id=brca_tcga_pan_can_atlas_2018', external: true }
          ]
        }
      ],
      followups: ['Match TP53 status to RNA-seq', 'Compare hotspot distribution across PAM50 subtypes']
    },
    {
      panel: 2,
      query: 'Which genes differ between TP53-mutant and wild-type breast tumors?',
      steps: 'Samples matched · model and FDR checked',
      context: 'BRCA TCGA PanCanAtlas',
      target: 'TP53 status',
      cohort: 'MATCHED: mutation + RNA-seq',
      paragraphs: [
        { label: 'Analysis', text: 'I matched mutation and RNA-seq data for the same tumors, then compared TP53-mutant with wild-type expression.' },
        { label: 'Readout', text: 'Each point is a gene, positioned by log2 fold change and FDR-adjusted significance.' },
        {
          label: 'Caveat',
          text: 'PAM50 subtype and tumor composition can drive expression differences, so the model needs stratification or covariate adjustment.',
          chips: [
            { label: 'Method', href: '#insight-methods' },
            { label: 'TCGA data', href: 'https://www.cbioportal.org/study/summary?id=brca_tcga_pan_can_atlas_2018', external: true }
          ]
        }
      ],
      followups: ['Adjust the model for PAM50 subtype', 'Run pathway enrichment on the adjusted result']
    }
  ];

  function later(fn, delay) {
    var timer = window.setTimeout(fn, delay);
    phaseTimers.push(timer);
    return timer;
  }

  function clearPhaseTimers() {
    phaseTimers.forEach(window.clearTimeout);
    phaseTimers = [];
    if (typingTimer) {
      window.clearInterval(typingTimer);
      typingTimer = null;
    }
    var cursor = queryBox.querySelector('.iui-cursor');
    if (cursor) cursor.remove();
  }

  function renderText(container, rows, reveal) {
    container.innerHTML = '';
    rows.forEach(function (row) {
      var p = document.createElement('p');
      p.className = 'iui-part' + (reveal ? '' : ' iui-part-shown');
      if (row.label) {
        var heading = document.createElement('strong');
        heading.className = 'iui-part-label';
        heading.textContent = row.label;
        p.appendChild(heading);
      }
      p.appendChild(document.createTextNode(row.text || row[0]));
      var chips = row.chips || (Array.isArray(row) ? row.slice(1) : []);
      chips.forEach(function (item) {
        var config = typeof item === 'string' ? { label: item } : item;
        var chip = document.createElement(config.href ? 'a' : 'span');
        chip.className = 'iui-cite';
        chip.textContent = config.label;
        if (config.href) chip.setAttribute('href', config.href);
        if (config.external) {
          chip.setAttribute('target', '_blank');
          chip.setAttribute('rel', 'noreferrer');
        }
        p.appendChild(chip);
      });
      container.appendChild(p);
    });
  }

  function typeQuery(text, done) {
    if (reducedMotion) {
      query.textContent = text;
      done();
      return;
    }
    query.textContent = '';
    var cursor = document.createElement('span');
    cursor.className = 'iui-cursor';
    queryBox.appendChild(cursor);
    var index = 0;
    typingTimer = window.setInterval(function () {
      if (index < text.length) {
        query.textContent = text.slice(0, index + 1);
        index += 1;
        return;
      }
      window.clearInterval(typingTimer);
      typingTimer = null;
      later(function () {
        cursor.remove();
        done();
      }, 250);
    }, 24);
  }

  function renderScene(index, animate) {
    var scene = scenes[index];
    if (!scene) return;

    visualScenes.forEach(function (panel) {
      var active = panel.getAttribute('data-scene') === String(scene.panel);
      panel.classList.toggle('iui-scene-active', active);
      panel.setAttribute('aria-hidden', active ? 'false' : 'true');
    });

    steps.textContent = scene.steps;
    context.textContent = scene.context;
    target.textContent = scene.target;
    cohort.textContent = scene.cohort;
    renderText(paragraphs, scene.paragraphs, animate);
    renderText(followups, scene.followups.map(function (text) { return { text: text }; }), animate);

    if (!animate || reducedMotion) {
      query.textContent = scene.query;
      stepsWrap.style.opacity = '1';
      return;
    }

    stepsWrap.style.opacity = '0';
    typeQuery(scene.query, function () {
      stepsWrap.style.opacity = '1';
      [].slice.call(paragraphs.children).forEach(function (item, itemIndex) {
        later(function () { item.classList.add('iui-part-shown'); }, 250 + itemIndex * 360);
      });
      [].slice.call(followups.children).forEach(function (item, itemIndex) {
        later(function () { item.classList.add('iui-part-shown'); }, 1650 + itemIndex * 260);
      });
    });
  }

  function updatePlayControl() {
    playControl.setAttribute('aria-pressed', playing ? 'true' : 'false');
    playControl.setAttribute('aria-label', playing ? 'Pause automatic demonstration' : 'Play automatic demonstration');
    playControl.textContent = playing ? 'Pause' : 'Play';
  }

  function scheduleNext() {
    window.clearTimeout(phaseTimer);
    if (!playing || document.hidden || proof.getClientRects().length === 0) return;
    var durations = [6200, 8200, 8200, 8600];
    phaseTimer = window.setTimeout(function () {
      showPhase((phase + 1) % 4);
    }, durations[phase]);
  }

  function showPhase(index) {
    clearPhaseTimers();
    phase = index;

    controls.forEach(function (button, buttonIndex) {
      button.setAttribute('aria-pressed', buttonIndex === phase ? 'true' : 'false');
    });

    ui.classList.toggle('iui-phase-phone', phase === 0);
    ui.classList.toggle('iui-phase-notebook', phase === 3);
    phoneStory.setAttribute('aria-hidden', phase === 0 ? 'false' : 'true');
    notebookStory.setAttribute('aria-hidden', phase === 3 ? 'false' : 'true');
    workspaceParts.forEach(function (part) {
      var covered = phase === 0 || phase === 3;
      part.hidden = covered;
      part.setAttribute('aria-hidden', covered ? 'true' : 'false');
    });

    if (phase === 0) renderScene(0, false);
    if (phase === 1) renderScene(0, true);
    if (phase === 2) renderScene(1, true);
    if (phase === 3) renderScene(1, false);

    scheduleNext();
  }

  controls.forEach(function (button, index) {
    button.addEventListener('click', function () { showPhase(index); });
  });

  playControl.addEventListener('click', function () {
    playing = !playing;
    updatePlayControl();
    scheduleNext();
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) window.clearTimeout(phaseTimer);
    else scheduleNext();
  });

  window.addEventListener('hashchange', function () {
    if (proof.getClientRects().length === 0) {
      window.clearTimeout(phaseTimer);
      return;
    }
    showPhase(0);
  });

  updatePlayControl();
  showPhase(0);
})();
