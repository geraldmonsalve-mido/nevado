(function () {
  const CLERK_SRC = 'https://clerk.nevado.pro/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
  const CLERK_KEY = 'pk_live_Y2xlcmsubmV2YWRvLnBybyQ';

  const RANGO_ICONS = {
    cachorro: '/rangos/rango1-cachorro-bronce.png',
    explorador: '/rangos/rango2-explorador-bronce.png',
    guardian: '/rangos/rango3-guardian-plata.png',
    montanista: '/rangos/rango4-montanista-plata.png',
    guia: '/rangos/rango5-guia-plata.png',
    protector: '/rangos/rango6-protector-oro.png',
    leyendaandina: '/rangos/rango7-leyendaandina-oro-joyas.png'
  };

  function key(v) {
    return String(v || 'Cachorro').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '');
  }

  function icon(rango) {
    return RANGO_ICONS[key(rango)] || RANGO_ICONS.cachorro;
  }

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

    const res = await fetch('/api/usuario?' + params.toString());
    if (!res.ok) return null;
    return res.json();
  }

  function upsertProfileCard(profile) {
    const existing = document.getElementById('nevado-profile-live-card');
    if (existing) existing.remove();

    const card = document.createElement('section');
    card.id = 'nevado-profile-live-card';
    card.innerHTML = `
      <div class="npl-card">
        <img src="${icon(profile.rango)}" alt="${profile.rango}">
        <div>
          <strong>${profile.nombre || profile.email}</strong>
          <span>${Number(profile.croquetas || 0).toLocaleString('es-CO')} croquetas</span>
          <small>${profile.rango} · Nivel ${profile.nivel || 1}</small>
        </div>
      </div>
    `;

    const target = document.querySelector('main, .profile-container, .profile-card, body');
    target.prepend(card);
  }

  async function boot() {
    try {
      const user = await getUser();
      if (!user) return;

      const profile = await getProfile(user);
      if (!profile) return;

      window.NEVADO_CURRENT_USER = profile;
      upsertProfileCard(profile);
    } catch (e) {
      console.warn('[Nevado profile sync]', e);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
