// Cookie consent + GA4 gating
(function() {
    var GA_ID = 'G-QR515CQLLQ';
    var CONSENT_KEY = 'ob_cookie_consent';

    function loadGA4() {
        if (document.querySelector('script[src*="googletagmanager"]')) return;
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        window.gtag = gtag;
        gtag('js', new Date());
        gtag('config', GA_ID);
    }

    function showBanner() {
        var banner = document.createElement('div');
        banner.id = 'cookie-banner';
        banner.className = 'cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie preferences');

        var text = document.createElement('span');
        text.textContent = 'We use cookies for analytics. ';
        var link = document.createElement('a');
        link.href = '/privacy-policy.html';
        link.textContent = 'Privacy Policy';
        text.appendChild(link);

        var acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.type = 'button';
        acceptBtn.className = 'cookie-accept';

        var declineBtn = document.createElement('button');
        declineBtn.textContent = 'Decline';
        declineBtn.type = 'button';

        // The banner is fixed to the bottom, so without reserved space it
        // sits on top of the footer: the Privacy and Terms links cannot be
        // seen, clicked, or reached by keyboard until a choice is made.
        function reserveSpace() {
            var h = banner.offsetHeight + 'px';
            document.body.style.paddingBottom = h;
            document.documentElement.style.scrollPaddingBottom = h;
        }

        function releaseSpace() {
            document.body.style.paddingBottom = '';
            document.documentElement.style.scrollPaddingBottom = '';
        }

        acceptBtn.addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'accepted');
            releaseSpace();
            banner.remove();
            loadGA4();
        });

        declineBtn.addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'declined');
            releaseSpace();
            banner.remove();
        });

        banner.appendChild(text);
        var actions = document.createElement('div');
        actions.className = 'cookie-actions';
        actions.appendChild(acceptBtn);
        actions.appendChild(declineBtn);
        banner.appendChild(actions);
        document.body.appendChild(banner);
        reserveSpace();
        // The banner reflows from one line to three between desktop and
        // phone widths, so the reserved space has to follow it.
        if (typeof ResizeObserver === 'function') {
            new ResizeObserver(reserveSpace).observe(banner);
        }
    }

    var consent = localStorage.getItem(CONSENT_KEY);
    if (consent === 'accepted') {
        loadGA4();
    } else if (consent !== 'declined') {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', showBanner);
        } else {
            showBanner();
        }
    }
    // Track CTA clicks
    document.addEventListener('click', function(e) {
        if (typeof window.gtag !== 'function') return;
        var link = e.target.closest('a');
        if (!link) return;
        var href = link.getAttribute('href') || '';
        if (href.indexOf('calendar.google.com/calendar/appointments') !== -1 ||
            href.indexOf('calendar.app.google') !== -1) {
            window.gtag('event', 'book_demo_click', {
                button_text: link.textContent.trim(),
                page_location: window.location.pathname
            });
        } else if (href.indexOf('insight.orchestrated.bio') !== -1) {
            window.gtag('event', 'try_insight_click', {
                button_text: link.textContent.trim(),
                page_location: window.location.pathname
            });
        }
    });
})();
