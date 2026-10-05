/* Reader-controlled artifact highlights. Images remain ordinary links without JS. */
(function () {
  'use strict';
  function createBackcards(container, panels, select) {
    var layer = document.createElement('div');
    layer.className = 'artifact-backcards';
    var cards = [0, 1].map(function () {
      var card = document.createElement('button');
      card.type = 'button';
      card.className = 'artifact-backcard';
      var label = document.createElement('span');
      var preview = document.createElement('img');
      preview.alt = '';
      preview.decoding = 'async';
      card.append(label, preview);
      card.addEventListener('click', function () { select(Number(card.dataset.previewIndex)); });
      layer.append(card);
      return card;
    });
    container.classList.add('preview-stack');
    container.prepend(layer);
    return function (index) {
      cards.forEach(function (card, offset) {
        var next = (index + offset + 1) % panels.length;
        var panel = panels[next];
        var image = panel.querySelector('img');
        var label = panel.querySelector('figcaption strong').textContent.split(' · ')[0];
        card.dataset.previewIndex = String(next);
        card.setAttribute('aria-label', 'Show ' + label);
        card.querySelector('span').textContent = label;
        card.querySelector('img').src = image.src;
      });
    };
  }
  var viewers = document.querySelectorAll('[data-artifact-viewer]');
  viewers.forEach(function (viewer) {
    var panels = Array.from(viewer.querySelectorAll('[data-artifact-panel]'));
    var selectors = Array.from(viewer.querySelectorAll('[data-artifact-select]'));
    var status = viewer.querySelector('[data-artifact-status]');
    var index = 0;
    var updateBackcards = createBackcards(viewer.parentElement, panels, function (next) { show(next); });
    function show(next, moveFocus) {
      index = (next + panels.length) % panels.length;
      panels.forEach(function (panel, i) { panel.hidden = i !== index; });
      selectors.forEach(function (button, i) {
        button.setAttribute('aria-pressed', String(i === index));
      });
      status.textContent = viewer.dataset.kind + ' · ' + (index + 1) + ' of ' + panels.length;
      updateBackcards(index);
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
    var chapterId = viewer.closest('.artifact-chapter').id;
    document.querySelectorAll('a[href="#' + chapterId + '"][data-artifact-index]').forEach(function (link) {
      link.addEventListener('click', function () { show(Number(link.dataset.artifactIndex)); });
    });
    show(0);
    viewer.querySelector('.artifact-selector').hidden = false;
    viewer.querySelector('.artifact-controls').hidden = false;
  });

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
