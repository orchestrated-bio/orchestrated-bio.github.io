/* The sample stays on the reader's chosen section. No timed page changes. */
(function () {
  function wire(ui) {
    if (ui.dataset.daxWired) return;
    ui.dataset.daxWired = '1';
    var navItems = [].slice.call(ui.querySelectorAll('.dax-nav-item'));
    var pages = [].slice.call(ui.querySelectorAll('.dax-page'));

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
        if (active) page.scrollTop = 0;
      });
    }

    navItems.forEach(function (item) {
      item.addEventListener('click', function () { show(item.dataset.page); });
    });
    [].forEach.call(ui.querySelectorAll('[data-goto]'), function (item) {
      item.addEventListener('click', function () {
        show(item.dataset.goto);
        // The overview button is now hidden; keep keyboard focus visible.
        var target = navItems.find(function (nav) { return nav.dataset.page === item.dataset.goto; });
        if (target) target.focus({ preventScroll: true });
      });
    });
    show('cover');
  }

  [].forEach.call(document.querySelectorAll('.dax-ui:not(.dax-full)'), wire);
})();
