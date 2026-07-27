/* DrugAdopt report render — a clickable section spine (cover, the four
   reader sections, and evidence & gaps) that opens each part as a
   K-Dense report page. Auto-advances slowly until a reader chooses a
   section, then yields control permanently; pauses off-screen. Drives every .dax-ui on
   the page independently so the single-file artifact (one on each route)
   works too. Plain DOM + CSS classes. */
(function () {
  var DWELL = 9000;  // long enough to read the overview before advancing

  function wire(ui) {
    if (ui.dataset.daxWired) return;   // artifact merges pages; wire once
    ui.dataset.daxWired = '1';
    var navItems = [].slice.call(ui.querySelectorAll('.dax-nav-item'));
    var pages    = [].slice.call(ui.querySelectorAll('.dax-page'));
    var order    = navItems.map(function (n) { return n.dataset.page; });
    var current = 0, timer = null, running = false, held = false;

    function show(i) {
      current = ((i % order.length) + order.length) % order.length;
      var key = order[current];
      navItems.forEach(function (n) {
        var active = n.dataset.page === key;
        n.classList.toggle('dax-nav-item-active', active);
        if (active) n.setAttribute('aria-current', 'page');
        else n.removeAttribute('aria-current');
      });
      pages.forEach(function (p) { p.classList.toggle('dax-page-active', p.dataset.page === key); });
    }
    function schedule() {
      clearTimeout(timer);
      if (!running || held) return;
      timer = setTimeout(function () { show(current + 1); schedule(); }, DWELL);
    }
    function start() { if (running) return; running = true; schedule(); }
    function stop() { running = false; clearTimeout(timer); }

    // Once a reader chooses a section, stop auto-advancing and leave the
    // report under their control. Used by both the spine and the overview's
    // clickable section rows.
    function jump(i) {
      show(i); held = true; clearTimeout(timer);
    }
    navItems.forEach(function (n, i) { n.addEventListener('click', function () { jump(i); }); });
    // Overview section rows (data-goto="clinical" …) deep-link into a section.
    [].forEach.call(ui.querySelectorAll('[data-goto]'), function (el) {
      el.addEventListener('click', function () {
        var idx = order.indexOf(el.dataset.goto);
        if (idx >= 0) jump(idx);
      });
    });

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { show(0); return; }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.25 }).observe(ui);
    } else {
      start();
    }
    // The single-file artifact swaps routes with display:none. Re-check once
    // when its hash route changes instead of polling the page forever.
    window.addEventListener('hashchange', function () {
      setTimeout(function () { if (ui.offsetParent !== null && !running) start(); }, 60);
    });
  }

  [].forEach.call(document.querySelectorAll('.dax-ui'), wire);
})();
