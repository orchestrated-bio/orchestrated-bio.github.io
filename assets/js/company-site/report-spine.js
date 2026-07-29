/* Highlights the section spine on report.html as the document scrolls.
   Progressive enhancement: without JS the spine is still a working set of
   in-page anchors. */
(function () {
  var links = [].slice.call(document.querySelectorAll('.dax-nav a[href^="#"]'));
  if (!links.length) return;

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

  if (!('IntersectionObserver' in window) || !sections.length) {
    mark(links[0]);
    return;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var link = linkFor(entry.target.id);
        if (link) mark(link);
      });
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );

  sections.forEach(function (section) { observer.observe(section); });
  mark(links[0]);
})();
