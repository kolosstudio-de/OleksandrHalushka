/**
 * Smart Header & Cookie Banner Component — V4
 *
 * Header behavior:
 * - Hides immediately when scrolling DOWN (any scroll-down = hide)
 * - Shows ONLY when: (a) user is at the very top (scrollY < 10) OR (b) mouse near top edge
 * - Never shows while user is scrolling down (even slowly)
 */

class SmartHeader {
    constructor() {
        this.header = document.getElementById('mainHeader');
        if (!this.header) return;

        this.prevScrollY = window.scrollY;
        this.hidden = true; // start in hidden state
        this.ticking = false;
        this.mouseNearTop = false;
        this.entryDone = false;
        this.menuOpen = false;

        this.init();
    }

    hide() {
        if (!this.hidden && !this.menuOpen) {
            this.hidden = true;
            this.header.classList.add('header-hidden');
            this.header.classList.remove('visible');
        }
    }

    show() {
        if (this.hidden) {
            this.hidden = false;
            this.header.classList.remove('header-hidden');
            this.header.classList.add('visible');
            if (!this.entryDone) {
                this.entryDone = true;
                // slight delay so CSS transition has time to register
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this.header.classList.add('header-loaded');
                    });
                });
            }
        }
    }

    init() {
        // Add scrolled style when not at top
        const updateScrolledClass = () => {
            if (window.scrollY > 20) {
                this.header.classList.add('scrolled');
            } else {
                this.header.classList.remove('scrolled');
            }
        };

        window.addEventListener('scroll', () => {
            if (this.ticking) return;
            this.ticking = true;

            window.requestAnimationFrame(() => {
                const currentY = window.scrollY;
                updateScrolledClass();

                if (currentY <= 10) {
                    // At very top — always visible
                    this.show();
                } else if (currentY > this.prevScrollY) {
                    // Scrolling DOWN — hide immediately
                    this.hide();
                } else if (currentY < this.prevScrollY && this.mouseNearTop) {
                    // Scrolling UP and mouse is near top — show
                    this.show();
                }
                // Scrolling UP without mouse near top — stay hidden

                this.prevScrollY = currentY;
                this.ticking = false;
            });
        }, { passive: true });

        // Mouse near top edge: reveal header
        document.addEventListener('mousemove', (e) => {
            if (e.clientY < 72) {
                this.mouseNearTop = true;
                if (window.scrollY > 10) this.show();
            } else {
                this.mouseNearTop = false;
            }
        });

        // Touch: swipe up near top reveals header
        let touchStartY = 0;
        document.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            const delta = e.changedTouches[0].clientY - touchStartY;
            if (delta > 40 && window.scrollY <= 10) this.show();
        }, { passive: true });

        // Initial state — always show on load with entrance animation
        setTimeout(() => {
            if (window.scrollY <= 10) {
                this.show();
            } else {
                // scrolled down on load — show briefly then hide
                this.header.classList.add('header-loaded');
                this.entryDone = true;
                this.hide();
            }
            updateScrolledClass();
        }, 120);

        // Burger Menu Toggle
        const burger = document.getElementById('burgerToggle');
        const nav = document.querySelector('.header-nav');

        if (burger && nav) {
            burger.addEventListener('click', () => {
                this.menuOpen = !this.menuOpen;
                burger.classList.toggle('active');
                nav.classList.toggle('active');
                document.body.style.overflow = this.menuOpen ? 'hidden' : '';
            });

            // Close menu when link is clicked
            nav.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    this.menuOpen = false;
                    burger.classList.remove('active');
                    nav.classList.remove('active');
                    document.body.style.overflow = '';
                });
            });

            // V-05: Inject empty lang switcher slot into mobile nav
            // i18n.js v6 populates all .langSwitcher-clone divs automatically on DOMContentLoaded
            if (!nav.querySelector('.langSwitcher-clone')) {
                const mobileLang = document.createElement('div');
                mobileLang.className = 'langSwitcher-clone';
                nav.appendChild(mobileLang);
            }
        }
    }
}

// Initialize robustly
function initComponents() {
    new SmartHeader();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    initComponents();
}
