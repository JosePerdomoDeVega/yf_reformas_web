// YF Reformas: motion, chapter ink, the "cuéntanos tu reforma" tool, contact form

// 0. Shared contact helpers: every WhatsApp / email link on every page is built from these.
const YF_PHONE = '34000000000';
const YF_EMAIL = 'info@yfreformas.com';
function waHref(text) { return `https://wa.me/${YF_PHONE}?text=${encodeURIComponent(text)}`; }
function mailHref(subject, body) { return `mailto:${YF_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }

// 1. Reveal once when an element enters the viewport.
(() => {
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  if (!targets.length) return;
  if (!('IntersectionObserver' in window)) { targets.forEach((el) => el.classList.add('is-in')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-in');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
  targets.forEach((el) => io.observe(el));
  window.addEventListener('load', () => setTimeout(() => {
    targets.forEach((el) => { const r = el.getBoundingClientRect(); if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in'); });
  }, 2500));
})();

// 2. Colour by chapter: the fixed "YF" mark takes the ink of the section under it,
//    and only appears once the hero's own wordmark has scrolled out of view.
(() => {
  const chapters = document.querySelectorAll('[data-ink]');
  const mark = document.querySelector('.mark');
  const hero = document.querySelector('.hero');
  if (chapters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.isIntersecting) document.documentElement.style.setProperty('--header-ink', entry.target.dataset.ink);
    }, { rootMargin: '0px 0px -85% 0px', threshold: 0 });
    chapters.forEach((el) => io.observe(el));
  }
  if (mark && hero && 'IntersectionObserver' in window) {
    const heroIo = new IntersectionObserver((entries) => {
      mark.classList.toggle('is-visible', !entries[0].isIntersecting);
    }, { threshold: 0 });
    heroIo.observe(hero);
  }
})();

// 3. Gallery photographs float on their own (see .gallery-photo.drift in style.css);
//    no script needed, so there is nothing to do here any more.

// 4. The live thing: picks build a ready-to-send WhatsApp or email message, never a price.
(() => {
  const form = document.getElementById('calcForm');
  if (!form) return;
  const rooms = form.querySelectorAll('input[type="checkbox"]');
  const nivel = form.querySelectorAll('input[name="nivel"]');
  const preview = document.getElementById('calcPreview');
  const waBtn = document.getElementById('calcWhatsapp');
  const mailBtn = document.getElementById('calcEmail');

  function build() {
    const chosen = [...rooms].filter((r) => r.checked).map((r) => r.value);
    const nivelVal = form.querySelector('input[name="nivel"]:checked').value;
    const message = chosen.length
      ? `Hola, quiero pedir información para reformar: ${chosen.join(', ')}. Acabado: ${nivelVal}.`
      : 'Hola, quiero pedir información sobre una reforma.';
    preview.textContent = chosen.length ? message : 'Elige al menos una estancia.';
    waBtn.href = waHref(message);
    mailBtn.href = mailHref('Información sobre una reforma', message);
  }
  rooms.forEach((r) => r.addEventListener('change', build));
  nivel.forEach((r) => r.addEventListener('change', build));
  build();
})();

// 4b. Generic: any link marked data-wa-msg gets a ready WhatsApp href (used on service pages).
(() => {
  document.querySelectorAll('[data-wa-msg]').forEach((a) => { a.href = waHref(a.dataset.waMsg); });
})();

// 5. Side menu: one link per type of renovation, plus the usual sections.
(() => {
  const toggle = document.getElementById('menuToggle');
  const close = document.getElementById('menuClose');
  const overlay = document.getElementById('menuOverlay');
  const menu = document.getElementById('sideMenu');
  if (!toggle || !menu) return;

  function openMenu() {
    menu.hidden = false;
    overlay.hidden = false;
    menu.getBoundingClientRect(); // force layout so the transform transition runs
    setTimeout(() => { menu.classList.add('is-open'); overlay.classList.add('is-open'); }, 10);
    toggle.setAttribute('aria-expanded', 'true');
    document.documentElement.style.overflow = 'hidden';
    close.focus();
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    overlay.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
    toggle.focus();
    setTimeout(() => { menu.hidden = true; overlay.hidden = true; }, 350);
  }
  toggle.addEventListener('click', () => { toggle.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu(); });
  close.addEventListener('click', closeMenu);
  overlay.addEventListener('click', closeMenu);
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') closeMenu(); });
})();

// 6. Contact form: no backend yet, so it opens a pre-filled email. Replace with a real
//    form handler (Formspree, Netlify Forms, etc.) before launch.
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const telefono = form.telefono.value.trim();
    const mensaje = form.mensaje.value.trim();
    window.location.href = mailHref(`Reforma — contacto de ${nombre}`, `Nombre: ${nombre}\nTeléfono: ${telefono}\n\n${mensaje}`);
  });
})();
