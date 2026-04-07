// Mobile menu toggle
const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const mobileMenu = document.getElementById('mobile-menu');

if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.setAttribute('aria-expanded', 'false');
    mobileMenuBtn.setAttribute('aria-controls', 'mobile-menu');
    mobileMenu.setAttribute('aria-hidden', 'true');

    const openMenu = () => {
        mobileMenu.classList.remove('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'true');
        mobileMenu.setAttribute('aria-hidden', 'false');
        const firstLink = mobileMenu.querySelector('a');
        if (firstLink) firstLink.focus();
    };

    const closeMenu = () => {
        mobileMenu.classList.add('hidden');
        mobileMenuBtn.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        mobileMenuBtn.focus();
    };

    mobileMenuBtn.addEventListener('click', () => {
        mobileMenu.classList.contains('hidden') ? openMenu() : closeMenu();
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && !mobileMenu.classList.contains('hidden')) {
            closeMenu();
        }
    });
}

// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
    window.addEventListener('scroll', () => {
        const scrolled = window.scrollY > 100;
        navbar.classList.toggle('shadow-lg', scrolled);
        navbar.classList.toggle('shadow-black/10', scrolled);
    }, { passive: true });
}

// Scroll animations
const observerOpts = { threshold: 0.08, rootMargin: '0px 0px -40px 0px' };

// Fade-up for non-grid sections
const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            sectionObserver.unobserve(entry.target);
        }
    });
}, observerOpts);

// Staggered reveal for grid children
const gridObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            Array.from(entry.target.children).forEach((child, i) => {
                setTimeout(() => {
                    child.style.opacity = '1';
                    child.style.transform = 'translateY(0) scale(1)';
                }, i * 100);
            });
            gridObserver.unobserve(entry.target);
        }
    });
}, observerOpts);

document.querySelectorAll('section').forEach((section, i) => {
    if (i === 0) return; // Hero is always visible

    const grids = section.querySelectorAll('.grid');
    if (grids.length) {
        grids.forEach(grid => {
            Array.from(grid.children).forEach(child => {
                child.style.opacity = '0';
                child.style.transform = 'translateY(16px) scale(0.97)';
                child.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            });
            gridObserver.observe(grid);
        });
    } else {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        sectionObserver.observe(section);
    }
});
