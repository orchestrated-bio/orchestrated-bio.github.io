(function () {
  var links = [].slice.call(document.querySelectorAll('.report-contents a[href^="#"]'));
  if (!links.length) return;

  function mark(link) {
    links.forEach(function (item) {
      if (item === link) item.setAttribute('aria-current', 'location');
      else item.removeAttribute('aria-current');
    });
  }

  function linkForId(id) {
    return links.find(function (link) {
      return link.getAttribute('href') === '#' + id;
    });
  }

  function syncToHash() {
    var current = linkForId(window.location.hash.slice(1));
    if (current) mark(current);
  }

  links.forEach(function (link) {
    link.addEventListener('click', function () { mark(link); });
  });

  window.addEventListener('hashchange', syncToHash);
  syncToHash();

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var current = linkForId(entry.target.id);
        if (current) mark(current);
      });
    }, {
      rootMargin: '-18% 0px -68% 0px',
      threshold: 0
    });

    links.forEach(function (link) {
      var section = document.querySelector(link.getAttribute('href'));
      if (section) observer.observe(section);
    });
  }
})();
