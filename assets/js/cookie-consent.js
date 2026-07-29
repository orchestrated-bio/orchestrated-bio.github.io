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
        banner.setAttribute('style',
            'position:fixed;bottom:0;left:0;right:0;z-index:9999;' +
            'background:#152040;border-top:1px solid rgba(255,255,255,0.1);' +
            'padding:12px 16px;display:flex;align-items:center;justify-content:center;' +
            'gap:12px;flex-wrap:wrap;font-family:system-ui,sans-serif;font-size:13px;color:#9ca3af;'
        );

        var text = document.createElement('span');
        text.textContent = 'We use cookies for analytics. ';
        var link = document.createElement('a');
        link.href = '/privacy-policy.html';
        link.textContent = 'Privacy Policy';
        link.setAttribute('style', 'color:#40cea0;text-decoration:underline;');
        text.appendChild(link);

        var acceptBtn = document.createElement('button');
        acceptBtn.textContent = 'Accept';
        acceptBtn.setAttribute('style',
            'padding:6px 16px;border-radius:6px;background:#1B7760;color:white;' +
            'font-size:13px;font-weight:500;border:none;cursor:pointer;'
        );

        var declineBtn = document.createElement('button');
        declineBtn.textContent = 'Decline';
        declineBtn.setAttribute('style',
            'padding:6px 16px;border-radius:6px;background:transparent;color:#9ca3af;' +
            'font-size:13px;font-weight:500;border:1px solid rgba(255,255,255,0.1);cursor:pointer;'
        );

        acceptBtn.addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'accepted');
            banner.remove();
            loadGA4();
        });

        declineBtn.addEventListener('click', function() {
            localStorage.setItem(CONSENT_KEY, 'declined');
            banner.remove();
        });

        banner.appendChild(text);
        banner.appendChild(acceptBtn);
        banner.appendChild(declineBtn);
        document.body.appendChild(banner);
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
