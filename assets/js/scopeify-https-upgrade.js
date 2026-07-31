(() => {
  "use strict";

  if (
    window.location.protocol === "http:" &&
    /^(?:www\.)?orchestrated\.bio$/i.test(window.location.hostname)
  ) {
    window.location.replace(`https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`);
  }
})();
