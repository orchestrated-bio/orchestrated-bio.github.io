/* Progressive enhancement for the compact mobile navigation. Without this
   script, the complete navigation remains visible and usable. */
(function () {
  var nav = document.querySelector('.site-nav');
  var toggle = document.querySelector('.site-nav-toggle');
  if (!nav || !toggle) return;

  nav.classList.add('site-nav-enhanced');
  toggle.hidden = false;

  function setOpen(open) {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  }

  setOpen(false);
  toggle.addEventListener('click', function () { setOpen(nav.dataset.open !== 'true'); });
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) setOpen(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && nav.dataset.open === 'true') {
      setOpen(false);
      toggle.focus();
    }
  });

  // Report section links need to clear the actual masthead, including the
  // expanded mobile menu and text zoom, rather than a guessed fixed offset.
  var masthead = document.querySelector('.masthead');
  if (masthead && 'ResizeObserver' in window) {
    new ResizeObserver(function () {
      document.documentElement.style.setProperty('--masthead-height', masthead.offsetHeight + 'px');
    }).observe(masthead);
  }
})();
