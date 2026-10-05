/* Reader-controlled artifact highlights. Images remain ordinary links without JS. */
(function () {
  'use strict';
  var viewers = document.querySelectorAll('[data-artifact-viewer]');
  viewers.forEach(function (viewer) {
    var panels = Array.from(viewer.querySelectorAll('[data-artifact-panel]'));
    var selectors = Array.from(viewer.querySelectorAll('[data-artifact-select]'));
    var status = viewer.querySelector('[data-artifact-status]');
    var index = 0;
    function show(next, moveFocus) {
      index = (next + panels.length) % panels.length;
      panels.forEach(function (panel, i) { panel.hidden = i !== index; });
      selectors.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(i === index));
      });
      status.textContent = viewer.dataset.kind + ' · ' + (index + 1) + ' of ' + panels.length;
      if (moveFocus) selectors[index].focus();
    }
    selectors.forEach(function (button, i) {
      button.addEventListener('click', function () { show(i); });
      button.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = index + 1;
        if (event.key === 'ArrowLeft') next = index - 1;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = panels.length - 1;
        if (next !== undefined) { event.preventDefault(); show(next, true); }
      });
    });
    viewer.querySelector('[data-artifact-prev]').addEventListener('click', function () { show(index - 1); });
    viewer.querySelector('[data-artifact-next]').addEventListener('click', function () { show(index + 1); });
    show(0);
    viewer.querySelector('.artifact-selector').hidden = false;
    viewer.querySelector('.artifact-controls').hidden = false;
  });

  var trace = document.querySelector('[data-evidence-trace]');
  if (trace) {
    var steps = Array.from(trace.querySelectorAll('[data-trace-step]'));
    var play = trace.querySelector('[data-trace-play]');
    var tracePanels = Array.from(trace.querySelectorAll('[data-trace-panel]'));
    var traceStatus = trace.querySelector('[data-trace-status]');
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    var traceIndex = 0;
    var timer;
    var playing = false;
    function showTrace(next, moveFocus) {
      traceIndex = (next + steps.length) % steps.length;
      steps.forEach(function (step, i) { step.setAttribute('aria-pressed', String(i === traceIndex)); });
      tracePanels.forEach(function (panel, i) { panel.hidden = i !== traceIndex; });
      traceStatus.textContent = steps[traceIndex].textContent + ' view · ' + (traceIndex + 1) + ' of ' + steps.length;
      if (moveFocus) steps[traceIndex].focus();
    }
    function stopTrace() {
      window.clearTimeout(timer);
      playing = false;
      play.setAttribute('aria-pressed', 'false');
      play.textContent = 'Play example →';
    }
    function advanceTrace() {
      if (!playing) return;
      if (traceIndex === steps.length - 1) { stopTrace(); return; }
      showTrace(traceIndex + 1);
      timer = window.setTimeout(advanceTrace, 4000);
    }
    steps.forEach(function (step, i) {
      step.addEventListener('click', function () { stopTrace(); showTrace(i); });
      step.addEventListener('keydown', function (event) {
        var next;
        if (event.key === 'ArrowRight') next = traceIndex + 1;
        if (event.key === 'ArrowLeft') next = traceIndex - 1;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = steps.length - 1;
        if (next !== undefined) { event.preventDefault(); stopTrace(); showTrace(next, true); }
      });
    });
    play.addEventListener('click', function () {
      if (playing) { stopTrace(); return; }
      showTrace(0);
      playing = true;
      play.setAttribute('aria-pressed', 'true');
      play.textContent = 'Pause example';
      timer = window.setTimeout(advanceTrace, 4000);
    });
    function setMotionPreference() { stopTrace(); play.hidden = motion.matches; }
    motion.addEventListener('change', setMotionPreference);
    document.addEventListener('visibilitychange', function () { if (document.hidden) stopTrace(); });
    showTrace(0);
    trace.querySelector('.trace-switcher').hidden = false;
    setMotionPreference();
  }

  var dialog = document.querySelector('.artifact-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  var image = dialog.querySelector('img');
  var scroller = dialog.querySelector('.artifact-dialog-scroll');
  var title = dialog.querySelector('#artifact-dialog-title');
  var caption = dialog.querySelector('.artifact-dialog-caption');
  var fit = dialog.querySelector('[data-artifact-fit]');
  var detail = dialog.querySelector('[data-artifact-detail]');
  var trigger;
  function zoom(isDetail) {
    scroller.dataset.detail = String(isDetail);
    fit.setAttribute('aria-pressed', String(!isDetail));
    detail.setAttribute('aria-pressed', String(isDetail));
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
  }
  document.querySelectorAll('[data-artifact-zoom]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      // Preserve modified clicks and the direct-image fallback.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      trigger = link;
      var source = link.querySelector('img');
      var figure = link.closest('figure');
      var description = figure.querySelector('figcaption');
      image.src = link.href;
      image.alt = link.dataset.detailAlt || source.alt.replace(/^Excerpt from /, 'Full ');
      // A wide worksheet needs its native width so the text remains readable.
      // Slides and report pages already render at useful reading dimensions.
      image.style.setProperty('--artifact-detail-width', (Number(link.dataset.detailWidth) || Number(source.getAttribute('width')) || source.naturalWidth) + 'px');
      title.textContent = link.dataset.detailTitle || description.querySelector('strong').textContent.replace('· Excerpt, ', '· Full ');
      caption.textContent = description.innerText.replace(/\s+/g, ' ').trim();
      zoom(false);
      dialog.showModal();
    });
  });
  fit.addEventListener('click', function () { zoom(false); });
  detail.addEventListener('click', function () { zoom(true); scroller.focus(); });
  dialog.querySelector('[data-artifact-close]').addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('close', function () {
    image.removeAttribute('src');
    if (trigger) trigger.focus({ preventScroll: true });
  });
})();
