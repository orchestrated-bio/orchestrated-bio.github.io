/* Highlights the section spine on report.html as the document scrolls.
   Progressive enhancement: without JS the spine is still a working set of
   in-page anchors. */
(function () {
  var links = [].slice.call(document.querySelectorAll('.dax-nav a[href^="#"]'));
  if (!links.length) return;

  var motion = window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';

  function mark(link) {
    links.forEach(function (item) {
      if (item === link) {
        item.classList.add('dax-nav-item-active');
        item.setAttribute('aria-current', 'true');
      } else {
        item.classList.remove('dax-nav-item-active');
        item.removeAttribute('aria-current');
      }
    });
    // Below 62rem the spine is a sideways-scrolling row of pills, so the
    // active one is usually off-screen. Scroll the spine itself rather than
    // scrollIntoView, which would also move the page vertically.
    var spine = link.closest && link.closest('.dax-spine');
    if (spine && spine.scrollWidth > spine.clientWidth) {
      spine.scrollTo({ left: link.offsetLeft - 16, behavior: motion });
    }
  }

  function linkFor(id) {
    return links.filter(function (link) {
      return link.getAttribute('href') === '#' + id;
    })[0];
  }

  links.forEach(function (link) {
    link.addEventListener('click', function () { mark(link); });
  });

  var sections = links
    .map(function (link) {
      return document.getElementById(link.getAttribute('href').slice(1));
    })
    .filter(Boolean);

  // On desktop the paper is its own scroll box (report.css). Below that
  // breakpoint the document flows with the page.
  var paper = document.querySelector('.dax-paper-scroll');
  var frame = document.querySelector('.dax-full');

  function contained() {
    return !!paper && /(auto|scroll)/.test(getComputedStyle(paper).overflowY);
  }

  function scrollPaperTo(target, behavior) {
    var top = target.getBoundingClientRect().top - paper.getBoundingClientRect().top + paper.scrollTop - 20;
    paper.scrollTo({ top: Math.max(0, top), behavior: behavior });
  }

  // A plain #anchor jump scrolls every ancestor to reveal its target, so the
  // page lurched along with the paper. When the paper is its own scroller,
  // links into it move only the paper. The skip link keeps the browser's
  // behaviour, which also moves focus.
  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href^="#"]');
    if (!link || link.classList.contains('skip-link') || !contained()) return;
    var id = decodeURIComponent(link.getAttribute('href').slice(1));
    var target = id && document.getElementById(id);
    if (!target || !paper.contains(target)) return;
    event.preventDefault();
    scrollPaperTo(target, motion);
    if (history.pushState) history.pushState(null, '', '#' + id);
  });

  // Arriving with a hash (the case study links to figures): bring the frame
  // under the masthead and open the paper at the target.
  window.addEventListener('load', function () {
    if (!location.hash || !contained()) return;
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (!target || !paper.contains(target)) return;
    var masthead = document.querySelector('.masthead');
    var offset = (masthead ? masthead.offsetHeight : 0) + 12;
    window.scrollTo(0, frame.getBoundingClientRect().top + window.scrollY - offset);
    scrollPaperTo(target, 'instant');
  });

  if (!('IntersectionObserver' in window) || !sections.length) {
    mark(links[0]);
    return;
  }

  // Sections are watched against whichever box scrolls them. Rebuilt when
  // the layout crosses the breakpoint.
  var observer;

  function watch() {
    if (observer) observer.disconnect();
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var link = linkFor(entry.target.id);
          if (link) mark(link);
        });
      },
      { root: contained() ? paper : null, rootMargin: '-15% 0px -70% 0px', threshold: 0 }
    );
    sections.forEach(function (section) { observer.observe(section); });
  }

  watch();
  var wide = window.matchMedia && window.matchMedia('(min-width: 62.01rem)');
  if (wide) {
    if (wide.addEventListener) wide.addEventListener('change', watch);
    else if (wide.addListener) wide.addListener(watch);
  }
  mark(links[0]);
})();
