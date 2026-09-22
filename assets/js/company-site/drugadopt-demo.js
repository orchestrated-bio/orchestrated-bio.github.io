/* The sample stays on the reader's chosen section. No timed page changes. */
(function () {
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var phone = window.matchMedia('(max-width: 40rem)');

  function wire(ui) {
    if (ui.dataset.daxWired) return;
    ui.dataset.daxWired = '1';
    var navItems = [].slice.call(ui.querySelectorAll('.dax-nav-item'));
    var pages = [].slice.call(ui.querySelectorAll('.dax-page'));
    var paper = ui.querySelector('.dax-paper');

    // The panel is shorter than every section; the fade says there is more.
    function markEnd(page) {
      if (!paper) return;
      var atEnd = page.scrollTop + page.clientHeight >= page.scrollHeight - 4;
      paper.classList.toggle('is-end', atEnd);
    }

    function show(key) {
      if (!pages.some(function (page) { return page.dataset.page === key; })) return;
      navItems.forEach(function (item) {
        var active = item.dataset.page === key;
        item.classList.toggle('dax-nav-item-active', active);
        if (active) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      pages.forEach(function (page) {
        var active = page.dataset.page === key;
        page.classList.toggle('dax-page-active', active);
        page.hidden = !active;
        // The page is its own scroll box above 40rem, so it needs to be a tab
        // stop there: Safari does not make scrollers focusable on its own.
        page.tabIndex = active && !phone.matches ? 0 : -1;
        if (active) {
          page.scrollTop = 0;
          markEnd(page);
        }
      });
    }

    pages.forEach(function (page) {
      var head = page.querySelector('.dax-sec-h, .dax-ov-asset');
      if (head && head.id) page.setAttribute('aria-labelledby', head.id);
      page.addEventListener('scroll', function () { markEnd(page); });
    });

    navItems.forEach(function (item) {
      item.addEventListener('click', function () { show(item.dataset.page); });
    });
    [].forEach.call(ui.querySelectorAll('[data-goto]'), function (item) {
      item.addEventListener('click', function () {
        show(item.dataset.goto);
        // The overview button is now hidden; keep keyboard focus visible.
        var target = navItems.find(function (nav) { return nav.dataset.page === item.dataset.goto; });
        if (target) target.focus({ preventScroll: true });
        // On phones the pages are not height-limited, so swapping one in
        // leaves the reader wherever the overview row was — near its bottom.
        if (phone.matches && paper) {
          paper.scrollIntoView({ block: 'start', behavior: reduceMotion.matches ? 'auto' : 'smooth' });
        }
      });
    });
    show('cover');

    // Rotating across the 40rem line changes whether the panel scrolls, and
    // so whether it should be a tab stop.
    var onWidthChange = function () {
      var current = navItems.find(function (item) {
        return item.classList.contains('dax-nav-item-active');
      });
      show(current ? current.dataset.page : 'cover');
    };
    if (phone.addEventListener) phone.addEventListener('change', onWidthChange);
    else if (phone.addListener) phone.addListener(onWidthChange);
  }

  [].forEach.call(document.querySelectorAll('.dax-ui:not(.dax-full)'), wire);
})();
