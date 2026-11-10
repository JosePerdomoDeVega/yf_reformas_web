// YF Reformas: motion, chapter ink, the "cuéntanos tu reforma" tool, contact form

// 0. Shared contact helpers: every phone / WhatsApp / email on every page is built from these
//    four lines. Change a value here and every page picks it up, nothing else to edit.
const YF_PHONE = '34622835595';          // digits only, with country code, no spaces or +
const YF_PHONE_DISPLAY = '+34 622 83 55 95'; // shown as text wherever the number is visible
const YF_EMAIL = 'yperdomo@gmx.es';
// Access key from web3forms.com, tied to the inbox that should receive contact-form submissions.
const YF_WEB3FORMS_KEY = '62f4ff60-5f44-431b-a658-96d1b008cf09';

// Datos fiscales del titular (autónomo), solo para el aviso legal. Rellena estos tres y se
// actualiza en toda la web, no hay que tocar aviso-legal.html.
const YF_LEGAL_NAME = 'Fabián Ernesto Bedoya Soto';    // nombre y apellidos del autónomo
const YF_LEGAL_NIF = '62085758H';     // NIF
const YF_LEGAL_ADDRESS = 'Calle el Cortijo de San Gregorio, 38'; // domicilio fiscal (calle y número)

function waHref(text) { return text ? `https://wa.me/${YF_PHONE}?text=${encodeURIComponent(text)}` : `https://wa.me/${YF_PHONE}`; }
function mailHref(subject, body) { return `mailto:${YF_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; }

// 0b. Generic: fill in every plain contact link from the lines above.
//   data-tel            → tel: link, text replaced with the formatted number
//   data-wa             → plain wa.me link (no pre-filled message)
//   data-mail-plain     → mailto: link, keeps its own label (e.g. "Email")
//   data-mail-subject + data-mail-body → mailto: link with a pre-filled subject/body
//   data-legal-name / data-legal-nif / data-legal-address → text filled in from YF_LEGAL_*
(() => {
  document.querySelectorAll('[data-tel]').forEach((a) => { a.href = `tel:+${YF_PHONE}`; a.textContent = YF_PHONE_DISPLAY; });
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waHref(); });
  document.querySelectorAll('[data-mail-plain]').forEach((a) => { a.href = `mailto:${YF_EMAIL}`; });
  document.querySelectorAll('[data-mail-subject]').forEach((a) => { a.href = mailHref(a.dataset.mailSubject, a.dataset.mailBody || ''); });
  document.querySelectorAll('[data-legal-name]').forEach((el) => { el.textContent = YF_LEGAL_NAME; });
  document.querySelectorAll('[data-legal-nif]').forEach((el) => { el.textContent = YF_LEGAL_NIF; });
  document.querySelectorAll('[data-legal-address]').forEach((el) => { el.textContent = YF_LEGAL_ADDRESS; });
})();

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

  let currentMessage = '';
  function build() {
    const chosen = [...rooms].filter((r) => r.checked).map((r) => r.value);
    const nivelVal = form.querySelector('input[name="nivel"]:checked').value;
    currentMessage = chosen.length
      ? `Hola, quiero pedir información para reformar: ${chosen.join(', ')}. Acabado: ${nivelVal}.`
      : 'Hola, quiero pedir información sobre una reforma.';
    preview.textContent = chosen.length ? currentMessage : 'Elige al menos una estancia.';
    waBtn.href = waHref(currentMessage);
  }
  rooms.forEach((r) => r.addEventListener('change', build));
  nivel.forEach((r) => r.addEventListener('change', build));
  build();

  // "Enviar por email" goes to the real contact form (Web3Forms), not a mailto: draft.
  mailBtn.addEventListener('click', () => {
    const mensaje = document.querySelector('#contactForm textarea[name="mensaje"]');
    if (mensaje) mensaje.value = currentMessage;
  });
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

// 6. Contact form: sends through Web3Forms (static site, no backend of our own) so the
//    message reaches our inbox even if the visitor has no email client configured.
//    Falls back to a pre-filled mailto if the request fails or the key isn't set.
(() => {
  const form = document.getElementById('contactForm');
  if (!form) return;

  let status = form.querySelector('.contact-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'contact-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    form.appendChild(status);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = form.nombre.value.trim();
    const telefono = form.telefono.value.trim();
    const mensaje = form.mensaje.value.trim();
    const submitBtn = form.querySelector('button[type="submit"]');
    const fallback = () => { window.location.href = mailHref(`Reforma — contacto de ${nombre}`, `Nombre: ${nombre}\nTeléfono: ${telefono}\n\n${mensaje}`); };

    if (!YF_WEB3FORMS_KEY || YF_WEB3FORMS_KEY === 'TU_ACCESS_KEY_DE_WEB3FORMS') { fallback(); return; }

    submitBtn.disabled = true;
    status.textContent = 'Enviando…';
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: YF_WEB3FORMS_KEY,
          subject: `Reforma — contacto de ${nombre}`,
          nombre, telefono, mensaje,
        }),
      });
      const data = await res.json();
      if (data.success) {
        status.textContent = '¡Gracias! Hemos recibido tu mensaje, te contactaremos pronto.';
        form.reset();
      } else {
        fallback();
      }
    } catch {
      fallback();
    } finally {
      submitBtn.disabled = false;
    }
  });
})();
