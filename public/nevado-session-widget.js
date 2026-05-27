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
      Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function findSessionBox() {
    return [...document.querySelectorAll('div, a, button')]
      .find(el => /Sesión verificada|Sesión Verificada|Iniciar sesión|Modo Nevado|2FA activa/i.test(el.textContent || ''));
  }

  function setLogin(el) {
    el.innerHTML = `<span class="nv-session-icon">👤</span><strong>Iniciar sesión</strong>`;
    el.classList.add('nv-session-widget');
    el.onclick = () => location.href = '/auth.html?redirect=/';
  }

  function rangoIcon(rango) {
    const key = String(rango || 'Cachorro')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '');

    const icons = {
      cachorro: '/rangos/rango1-cachorro-bronce.png',
      explorador: '/rangos/rango2-explorador-bronce.png',
      guardian: '/rangos/rango3-guardian-plata.png',
      montanista: '/rangos/rango4-montanista-plata.png',
      montanista: '/rangos/rango4-montanista-plata.png',
      guia: '/rangos/rango5-guia-plata.png',
      protector: '/rangos/rango6-protector-oro.png',
      leyendaandina: '/rangos/rango7-leyendaandina-oro-joyas.png'
    };

    return icons[key] || icons.cachorro;
  }

  async function getProfile(user) {
    const clerkId = user?.id || '';
    const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || '';

    const params = new URLSearchParams();
    if (clerkId) params.set('clerk_id', clerkId);
    if (email) params.set('email', email);

    try {
      const res = await fetch('/api/usuario?' + params.toString(), {
        headers: { 'Accept': 'application/json' }
      });

      if (!res.ok) {
        console.warn('[Nevado session] API usuario:', res.status);
        return null;
      }

      return await res.json();
    } catch (e) {
      console.warn('[Nevado session] API usuario error:', e);
      return null;
    }
  }

  function setUser(el, user, profile) {
    const email = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
    const username = profile?.username || profile?.nombre || user.username || user.firstName || email.split('@')[0] || 'usuario';
    const croquetas = Number(profile?.croquetas || 0);
    const rango = profile?.rango || 'Cachorro';

    el.innerHTML = `
      <img class="nv-rank-icon" src="${rangoIcon(rango)}" alt="${rango}">
      <span class="nv-session-copy">
        <strong>@${String(username).replace(/^@/, '')}</strong>
        <small>${croquetas.toLocaleString('es-CO')} croquetas</small>
      </span>
    `;
    el.classList.add('nv-session-widget', 'is-authenticated');
    el.onclick = () => location.href = '/profile.html';
  }

  function renderDesktopEcosystemPill(profile) {
    if (!profile || window.innerWidth < 768) return;
    if (document.getElementById('nv-desktop-user-pill')) return;

    const ecosystem = [...document.querySelectorAll('div, span, p')]
      .find(el => /Ecosistema activo/i.test(el.textContent || ''));

    if (!ecosystem) return;

    const pill = document.createElement('button');
    pill.id = 'nv-desktop-user-pill';
    pill.innerHTML = `
      <img src="${rangoIcon(profile.rango)}" alt="${profile.rango}">
      <span>@${String(profile.nombre || profile.email || 'usuario').split(' ')[0].replace(/^@/, '')}</span>
      <strong>${Number(profile.croquetas || 0).toLocaleString('es-CO')}</strong>
      <em>${profile.rango || 'Cachorro'}</em>
    `;
    pill.onclick = () => location.href = '/profile.html';

    ecosystem.insertAdjacentElement('afterend', pill);
  }

  async function bootSession() {
    const el = findSessionBox();
    if (!el) return;

    setLogin(el);

    try {
      await loadScript(CLERK_SRC, { 'data-clerk-publishable-key': CLERK_KEY });
      await window.Clerk.load();

      const user = window.Clerk.user;
      if (!user) return setLogin(el);

      const profile = await getProfile(user);
      setUser(el, user, profile);
      renderDesktopEcosystemPill(profile);
    } catch (e) {
      console.warn('[Nevado session]', e);
      setLogin(el);
    }
  }

  function bootDogClick() {
    const dog = document.getElementById('nevado-canvas-container');
    if (!dog) return;

    dog.style.pointerEvents = 'auto';
    dog.style.cursor = 'pointer';

    dog.addEventListener('click', () => {
      const possibleTrigger =
        document.querySelector('[data-nevado-mode]') ||
        document.querySelector('#nevado-mode-trigger') ||
        document.querySelector('.nevado-mode-trigger') ||
        document.querySelector('#mini-nevado');

      if (possibleTrigger) {
        possibleTrigger.click();
        return;
      }

      window.dispatchEvent(new CustomEvent('open-nevado-mode'));
      document.dispatchEvent(new CustomEvent('open-nevado-mode'));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      bootSession();
      bootDogClick();
    });
  } else {
    bootSession();
    bootDogClick();
  }
})();
