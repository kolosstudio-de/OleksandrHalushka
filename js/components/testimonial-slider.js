/**
 * Testimonial Carousel Component — V4
 * 6 authentic Bavarian reviews per section, with local dialect where natural.
 */

const testimonials = [
    // ---- AUTO ----
    {
        name: "Michael K.",
        city: "Regensburg",
        text: "Hab schon viele Werkstätten ausprobiert — aber des war was anderes. Haben mir alles erklärt, nix aufschwatzen wollen, Preis war fair. Komm sicher wieder.",
        type: "auto"
    },
    {
        name: "Olena S.",
        city: "Neutraubling",
        text: "Ankaufsinspektion für meinen Gebrauchtwagen: haben einen versteckten Rahmenbruch gefunden, den der Verkäufer nicht erwähnt hatte. Hat mich vor einem teuren Fehlkauf bewahrt. Absolut top!",
        type: "auto"
    },
    {
        name: "Thomas F.",
        city: "Kelheim",
        text: "Klimaanlage ausgefallen. War in einer Stunde diagnostiziert, zwei Tage später fertig. So muss das sein — schnell, ehrlich, kein unnötiger Schnickschnack.",
        type: "auto"
    },
    {
        name: "Sarah L.",
        city: "Obertraubling",
        text: "Reifenwechsel und Einlagerung — alles super schnell und ordentlich. Termin über WhatsApp vereinbart, war innerhalb von 10 Minuten bestätigt. Passt!",
        type: "auto"
    },
    {
        name: "Andreas W.",
        city: "Bad Abbach",
        text: "Klimaanlage aufgefüllt und desinfiziert. Kühlt jetzt besser als neu. Der Chef hat mir noch erklärt warum das passiert — so geht Kundenservice!",
        type: "auto"
    },
    {
        name: "Kateryna D.",
        city: "Straubing",
        text: "Kenn mich mit Autos nicht groß aus — haben mir trotzdem alles verständlich erklärt und nix Unnötiges empfohlen. Fühlt sich an wie beim Bekannten in der Werkstatt.",
        type: "auto"
    },

    // ---- BAU ----
    {
        name: "Anna M.",
        city: "München",
        text: "Unser Badezimmer wurde komplett neu gefliest. Das Ergebnis ist einfach wunderschön — Fugen gerade, Material top. Eine Freude zum Anschauen. Danke an das ganze Team!",
        type: "bau"
    },
    {
        name: "Viktor K.",
        city: "Augsburg",
        text: "Umzug von Regensburg nach München — drei Zimmer, Klavier inklusive. Alles kam unbeschädigt an, pünktlich und ohne Stress. Würde ich sofort wieder buchen.",
        type: "bau"
    },
    {
        name: "Christian R.",
        city: "Kelheim",
        text: "Malerarbeiten im ganzen Haus — Wände, Decken, Türrahmen. Super sauber gearbeitet, keine Farbe irgendwo wo sie nicht hingehört. Preis-Leistung passt hundertprozentig.",
        type: "bau"
    },
    {
        name: "Oksana P.",
        city: "Neutraubling",
        text: "IKEA-Küchenmontage über 2 Tage. Die Jungs waren früh da, fleißig gearbeitet und danach alles blitzsauber hinterlassen. Besser als ich's selbst hingebracht hätt!",
        type: "bau"
    },
    {
        name: "Stefan M.",
        city: "Regensburg",
        text: "Parkett verlegen im Wohnzimmer. Sehr präzise gearbeitet, Dielen liegen butterweich. Haben sogar die alten Leisten sauber wieder montiert. Tolle Arbeit!",
        type: "bau"
    },
    {
        name: "Lisa T.",
        city: "Parsberg",
        text: "Terrasse mit Feinsteinzeug belegt. Hab lang Angebote verglichen — hier war der Preis fair und die Qualität einwandfrei. Freude jeden Tag wenn ich rausgeh!",
        type: "bau"
    }
];

class TestimonialSlider {
    constructor(containerId, theme) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.theme = theme; // 'auto' or 'bau'
        this.items = testimonials.filter(t => t.type === this.theme);
        this.currentIndex = 0;
        this.intervalId = null;

        this.init();
    }

    init() {
        this.render();
        this.startAutoScroll();
        this.bindEvents();
    }

    render() {
        // Base styles injected once
        if (!document.getElementById('ts-styles')) {
            const style = document.createElement('style');
            style.id = 'ts-styles';
            style.textContent = `

                .ts-wrapper { position: relative; max-width: 900px; margin: 0 auto; padding: 0 40px; box-sizing: border-box; width: 100%; }
                .ts-viewport { overflow: hidden; border-radius: 12px; width: 100%; }
                .ts-track { display: flex; transition: transform 0.5s cubic-bezier(0.25, 1, 0.5, 1); width: 100%; }
                .ts-slide { flex: 0 0 100%; padding: 20px; box-sizing: border-box; width: 100%; max-width: 100vw; }
                .ts-card { 
                    padding: 3rem 2rem; 
                    border-radius: 16px; 
                    text-align: center;
                    transition: transform 0.3s;
                    box-sizing: border-box;
                    width: 100%;
                }
                .ts-card.auto { background: var(--color-auto-surface); border: 1px solid var(--color-auto-surface-border); }
                .ts-card.bau { background: #fff; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
                .ts-stars { font-size: 1.2rem; margin-bottom: 1.5rem; }
                .ts-stars.auto { color: var(--color-auto-primary); }
                .ts-stars.bau { color: var(--color-bau-primary); }
                .ts-text { font-size: 1.05rem; line-height: 1.7; font-style: italic; margin-bottom: 2rem; }
                .ts-text.auto { color: var(--color-auto-text); }
                .ts-text.bau { color: var(--color-bau-text); }
                .ts-author { font-size: 0.9rem; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; }
                .ts-author.auto { color: var(--color-auto-text-muted); }
                .ts-author.bau { color: var(--color-bau-text-muted); }
                
                .ts-nav { 
                    position: absolute; top: 50%; transform: translateY(-50%); 
                    width: 40px; height: 40px; border-radius: 50%; 
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; border: none; background: rgba(255,255,255,0.1); 
                    color: inherit; transition: all 0.2s; z-index: 10;
                }
                .ts-nav:hover { background: var(--color-auto-primary); color: #fff; }
                .ts-nav.bau { background: #fff; border: 1px solid #e2e8f0; color: #0f172a; }
                .ts-nav.bau:hover { background: var(--color-bau-primary); color: #fff; border-color: var(--color-bau-primary); }
                .ts-prev { left: 0; }
                .ts-next { right: 0; }
                
                .ts-dots { display: flex; justify-content: center; gap: 8px; margin-top: 2rem; }
                .ts-dot { width: 8px; height: 8px; border-radius: 50%; background: #ccc; cursor: pointer; transition: 0.3s; }
                .ts-dot.active { transform: scale(1.5); }
                .ts-dot.active.auto { background: var(--color-auto-primary); }
                .ts-dot.active.bau { background: var(--color-bau-primary); }
                
                @media (max-width: 600px) {
                    .ts-wrapper { padding: 0 10px; }
                    .ts-nav { display: none; }
                    .ts-card { padding: 2rem 1.25rem; }
                    .ts-slide { padding: 10px; }
                }
            `;
            document.head.appendChild(style);
        }

        const trackHtml = this.items.map(item => `
            <div class="ts-slide">
                <div class="ts-card ${this.theme}">
                    <div class="ts-stars ${this.theme}">★★★★★</div>
                    <blockquote class="ts-text ${this.theme}">„${item.text}"</blockquote>
                    <div class="ts-author ${this.theme}">— ${item.name}, ${item.city}</div>
                </div>
            </div>
        `).join('');

        const dotsHtml = this.items.map((_, i) => `
            <div class="ts-dot ${this.theme} ${i === 0 ? 'active' : ''}" data-index="${i}"></div>
        `).join('');

        this.container.innerHTML = `
            <div class="ts-wrapper">
                <button class="ts-nav ts-prev ${this.theme}" aria-label="Vorheriger">❮</button>
                <div class="ts-viewport">
                    <div class="ts-track" id="ts-track-${this.theme}">
                        ${trackHtml}
                    </div>
                </div>
                <button class="ts-nav ts-next ${this.theme}" aria-label="Nächster">❯</button>
            </div>
            <div class="ts-dots" id="ts-dots-${this.theme}">
                ${dotsHtml}
            </div>
        `;

        this.track = document.getElementById(`ts-track-${this.theme}`);
        this.dots = document.getElementById(`ts-dots-${this.theme}`).children;
    }

    bindEvents() {
        const prevBtn = this.container.querySelector('.ts-prev');
        const nextBtn = this.container.querySelector('.ts-next');

        prevBtn.addEventListener('click', () => { this.prev(); this.resetAutoScroll(); });
        nextBtn.addEventListener('click', () => { this.next(); this.resetAutoScroll(); });

        Array.from(this.dots).forEach(dot => {
            dot.addEventListener('click', (e) => {
                this.goTo(parseInt(e.target.dataset.index));
                this.resetAutoScroll();
            });
        });

        // Pause on hover
        this.container.addEventListener('mouseenter', () => clearInterval(this.intervalId));
        this.container.addEventListener('mouseleave', () => this.startAutoScroll());
    }

    goTo(index) {
        if (index < 0) index = this.items.length - 1;
        if (index >= this.items.length) index = 0;

        this.currentIndex = index;
        this.track.style.transform = `translateX(-${index * 100}%)`;

        Array.from(this.dots).forEach(d => d.classList.remove('active'));
        this.dots[index].classList.add('active');
    }

    next() { this.goTo(this.currentIndex + 1); }
    prev() { this.goTo(this.currentIndex - 1); }

    startAutoScroll() {
        this.intervalId = setInterval(() => this.next(), 5000);
    }

    resetAutoScroll() {
        clearInterval(this.intervalId);
        this.startAutoScroll();
    }
}

// Auto-initialize if containers exist on page load
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('testimonial-slider-auto')) {
        new TestimonialSlider('testimonial-slider-auto', 'auto');
    }
    if (document.getElementById('testimonial-slider-bau')) {
        new TestimonialSlider('testimonial-slider-bau', 'bau');
    }
});
