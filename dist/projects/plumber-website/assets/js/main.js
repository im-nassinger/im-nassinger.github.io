document.addEventListener('DOMContentLoaded', () => {
    const yearEl = document.getElementById('year');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    const toggle = document.querySelector('.nav-toggle');
    const nav = document.getElementById('site-nav');
    if (toggle && nav) {
        toggle.addEventListener('click', () => {
            const open = nav.classList.toggle('open');
            toggle.setAttribute('aria-expanded', String(open));
        });
        nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
            nav.classList.remove('open');
            toggle.setAttribute('aria-expanded', 'false');
        }));
    }

    document.querySelectorAll('a[href^="#"]').forEach(link => {
        link.addEventListener('click', e => {
            const id = link.getAttribute('href');
            if (id && id.length > 1) {
                const target = document.querySelector(id);
                if (target) {
                    e.preventDefault();
                    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }
        });
    });

    const carousel = document.querySelector('[data-carousel]');
    if (carousel) {
        const track = carousel.querySelector('.carousel-track');
        const slides = [...track.children];
        const prev = carousel.querySelector('.prev');
        const next = carousel.querySelector('.next');
        const dotsEl = carousel.querySelector('.carousel-dots');
        let index = 0; let timer = null;

        slides.forEach((_, i) => {
            const b = document.createElement('button');
            if (i === 0) b.classList.add('active');
            b.addEventListener('click', () => go(i));
            dotsEl.appendChild(b);
        });
        const dots = [...dotsEl.children];

        function update() {
            const width = carousel.clientWidth;
            track.style.transform = `translateX(${-index * width}px)`;
            dots.forEach((d, i) => d.classList.toggle('active', i === index));
        }
        function go(i) { index = (i + slides.length) % slides.length; update(); reset(); }
        function nextFn() { go(index + 1); }
        function reset() { clearInterval(timer); timer = setInterval(nextFn, 5000); }
        window.addEventListener('resize', update);
        prev.addEventListener('click', () => go(index - 1));
        next.addEventListener('click', nextFn);
        update();
        reset();
    }

    document.addEventListener('click', (event) => {
        if (event.target.closest('.modal-close')) {
            event.target.closest('.modal')?.setAttribute('hidden', '');
        }
    });
});

