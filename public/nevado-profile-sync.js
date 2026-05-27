(function () {
  const CLERK_SRC = 'https://clerk.nevado.pro/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
  const CLERK_KEY = 'pk_live_Y2xlcmsubmV2YWRvLnBybyQ';

  function loadScript(src, attrs = {}) {
    return new Promise((resolve, reject) => {
      if ([...document.scripts].some(s => s.src === src)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.crossOrigin = 'anonymous';
      Object.entries(attrs).forEach(([k, v]) => v && s.setAttribute(k, v));
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function getUser() {
    await loadScript(CLERK_SRC, { 'data-clerk-publishable-key': CLERK_KEY });
    await window.Clerk.load();
    return window.Clerk.user;
  }

  async function getProfile(user) {
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';
    const clerkId = user?.id || '';

    const params = new URLSearchParams();
    if (clerkId) params.set('clerk_id', clerkId);
    if (email) params.set('email', email);

    const res = await fetch('/api/usuario?' + params.toString(), {
      headers: { Accept: 'application/json' }
    });

    if (!res.ok) return null;
    return await res.json();
  }

  function format(n) {
    return Number(n || 0).toLocaleString('es-CO');
  }

  function nextCroquetas(rango, croquetas) {
    const n = Number(croquetas || 0);
    const steps = [
      { rango: 'Cachorro', next: 'Explorador', target: 1000 },
      { rango: 'Explorador', next: 'Guardián', target: 2000 },
      { rango: 'Guardián', next: 'Montañista', target: 3200 },
      { rango: 'Montañista', next: 'Guía', target: 5450 },
      { rango: 'Guía', next: 'Protector', target: 8450 },
      { rango: 'Protector', next: 'Leyenda Andina', target: 16450 }
    ];

    const current = steps.find(s => s.rango === rango) || steps.find(s => n < s.target);
    if (!current) return { text: 'Rango máximo', next: 'Leyenda Andina' };

    const faltan = Math.max(current.target - n, 0);
    return {
      text: faltan ? format(faltan) + ' 🦴' : 'Listo para ascender',
      next: current.next
    };
  }

  function setValueAfterLabel(label, value) {
    const nodes = [...document.querySelectorAll('div, span, p, strong, h1, h2, h3')];
    const labelNode = nodes.find(el => (el.textContent || '').trim().toLowerCase() === label.toLowerCase());

    if (!labelNode) return false;

    const container = labelNode.closest('div') || labelNode.parentElement;
    if (!container) return false;

    const candidates = [...container.querySelectorAll('strong, span, div, p')]
      .filter(el => el !== labelNode && (el.textContent || '').trim());

    const valueNode = candidates[candidates.length - 1];

    if (valueNode) {
      valueNode.textContent = value;
      return true;
    }

    return false;
  }

  function replaceTextExact(oldText, newText) {
    [...document.querySelectorAll('div, span, p, strong, small, h1, h2, h3')]
      .filter(el => (el.textContent || '').trim() === oldText)
      .forEach(el => el.textContent = newText);
  }

  function removePreviousExtraCard() {
    document.getElementById('nevado-profile-live-card')?.remove();
    document.querySelectorAll('.npl-card').forEach(el => el.remove());
  }

  function injectCleanSummary(profile) {
    if (document.getElementById('nevado-profile-summary')) return;

    const card = document.createElement('section');
    card.id = 'nevado-profile-summary';
    card.innerHTML = `
      <strong>${profile.nombre || profile.email}</strong>
      <span>${format(profile.croquetas)} croquetas</span>
      <em>${profile.rango} · Nivel ${profile.nivel || 1}</em>
    `;

    const target =
      document.querySelector('.profile-card') ||
      document.querySelector('main') ||
      document.body;

    target.prepend(card);
  }

  function applyProfile(profile) {
    removePreviousExtraCard();

    const croquetas = Number(profile.croquetas || 0);
    const rango = profile.rango || 'Cachorro';
    const nivel = Number(profile.nivel || 1);
    const next = nextCroquetas(rango, croquetas);

    replaceTextExact('0', format(croquetas));
    setValueAfterLabel('Croquetas', format(croquetas));
    setValueAfterLabel('Nivel', String(nivel));
    setValueAfterLabel('Rango actual', rango);
    setValueAfterLabel('Croquetas para ascender', next.text);

    replaceTextExact('Cachorro', rango);

    [...document.querySelectorAll('p, div')]
      .filter(el => /Para ascender de/i.test(el.textContent || ''))
      .forEach(el => {
        el.innerHTML = `Para ascender de <strong>${rango}</strong> a <strong>${next.next}</strong>, debes alcanzar <strong>${next.text.replace(' 🦴', ' Croquetas')}</strong>.`;
      });

    injectCleanSummary(profile);
  }

  async function boot() {
    try {
      const user = await getUser();
      if (!user) return;

      const profile = await getProfile(user);
      if (!profile) return;

      window.NEVADO_CURRENT_USER = profile;

      setTimeout(() => applyProfile(profile), 300);
      setTimeout(() => applyProfile(profile), 900);
      setTimeout(() => applyProfile(profile), 1800);
    } catch (e) {
      console.warn('[Nevado profile sync]', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
