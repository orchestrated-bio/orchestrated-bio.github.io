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
})();
