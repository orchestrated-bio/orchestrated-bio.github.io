/* Progressive enhancement for the compact mobile navigation. Without this
   script, the complete navigation remains visible and usable. */
(function () {
  var nav = document.querySelector('.site-nav');
  var toggle = document.querySelector('.site-nav-toggle');
  if (!nav || !toggle) return;
  var mobile = window.matchMedia('(max-width: 52rem)');
  var nativePopover = typeof nav.showPopover === 'function';

  nav.classList.add('site-nav-enhanced');
  toggle.hidden = false;

  function reflectOpen(open) {
    nav.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Close' : 'Menu';
  }

  function close() {
    if (nativePopover && nav.matches(':popover-open')) nav.hidePopover();
    reflectOpen(false);
  }

  // Native popovers provide outside-tap dismissal, Escape and keyboard order.
  // Remove the popover at the desktop breakpoint so the normal links stay visible.
  function updateMode() {
    close();
    if (nativePopover && mobile.matches) {
      nav.setAttribute('popover', 'auto');
      toggle.setAttribute('popovertarget', nav.id);
    } else {
      nav.removeAttribute('popover');
      toggle.removeAttribute('popovertarget');
    }
  }
  if (nativePopover) {
    nav.addEventListener('beforetoggle', function (event) {
      reflectOpen(event.newState === 'open');
    });
  } else {
    toggle.addEventListener('click', function () { reflectOpen(nav.dataset.open !== 'true'); });
    document.addEventListener('click', function (event) {
      if (!nav.contains(event.target) && !toggle.contains(event.target)) close();
    });
  }
  updateMode();
  mobile.addEventListener('change', updateMode);
  window.addEventListener('pagehide', close);
  nav.addEventListener('click', function (event) {
    if (event.target.closest('a')) close();
  });
  document.addEventListener('keydown', function (event) {
    if (!nativePopover && event.key === 'Escape' && nav.dataset.open === 'true') {
      close();
      toggle.focus();
    }
  });

  // Report section links need to clear the actual masthead, including the
  // expanded mobile menu and text zoom, rather than a guessed fixed offset.
  var masthead = document.querySelector('.masthead');
  if (masthead && 'ResizeObserver' in window) {
    function measureMasthead() {
      document.documentElement.style.setProperty('--masthead-height', masthead.offsetHeight + 'px');
    }
    measureMasthead();
    new ResizeObserver(measureMasthead).observe(masthead);
  }
})();
