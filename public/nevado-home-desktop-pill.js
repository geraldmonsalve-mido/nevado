
(function () {
  if (window.innerWidth < 768) return;

  const CLERK_SRC = 'https://clerk.nevado.pro/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
  const CLERK_KEY = 'pk_live_Y2xlcmsubmV2YWRvLnBybyQ';

  const ICONS = {
    cachorro: '/rangos/rango1-cachorro-bronce.png',
    explorador: '/rangos/rango2-explorador-bronce.png',
    guardian: '/rangos/rango3-guardian-plata.png',
    montanista: '/rangos/rango4-montanista-plata.png',
    guia: '/rangos/rango5-guia-plata.png',
    protector: '/rangos/rango6-protector-oro.png',
    leyendaandina: '/rangos/rango7-leyendaandina-oro-joyas.png'
  };

  function k(v) {
    return String(v || 'Cachorro')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '');
  }

  function loadClerk() {
    return new Promise((resolve, reject) => {
      if (window.Clerk) return resolve(window.Clerk);

      const s = document.createElement('script');
      s.src = CLERK_SRC;
      s.async = true;
      s.crossOrigin = 'anonymous';
      s.setAttribute('data-clerk-publishable-key', CLERK_KEY);
      s.onload = () => resolve(window.Clerk);
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function boot() {
    try {
      const Clerk = await loadClerk();
      await Clerk.load();

      const user = Clerk.user;
      if (!user) return;

      const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
      const clerkId = user.id || '';

      const params = new URLSearchParams();
      if (clerkId) params.set('clerk_id', clerkId);
      if (email) params.set('email', email);

      const res = await fetch('/api/usuario?' + params.toString(), { cache: 'no-store' });
      if (!res.ok) return;

      const profile = await res.json();

      if (document.getElementById('nv-home-desktop-pill')) return;

      const pill = document.createElement('button');
      pill.id = 'nv-home-desktop-pill';
      pill.innerHTML = `
        <img src="${ICONS[k(profile.rango)] || ICONS.cachorro}" alt="${profile.rango}">
        <span>${profile.nombre || email}</span>
        <strong>${Number(profile.croquetas || 0).toLocaleString('es-CO')} croquetas</strong>
        <em>${profile.rango} · Nivel ${profile.nivel}</em>
      `;
      pill.onclick = () => location.href = '/profile.html';

      document.body.appendChild(pill);
    } catch (e) {
      console.warn('[Nevado desktop pill]', e);
    }
  }

  window.addEventListener('load', () => {
    setTimeout(boot, 900);
  });
})();
