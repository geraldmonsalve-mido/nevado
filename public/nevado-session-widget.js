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
    // Busca el pill dedicado primero, luego fallback por texto solo en elementos visibles
    var pill = document.getElementById('nvd-session-pill');
    if (pill) return pill;
    return [...document.querySelectorAll('div, a, button')]
      .find(el => el.offsetParent !== null &&
        /Sesión verificada|Sesión Verificada|Iniciar sesión|Modo Nevado|2FA activa/i.test(el.textContent || ''));
  }

  function injectShimmerStyles() {
    if (document.getElementById('nvd-pill-loading-style')) return;
    const s = document.createElement('style');
    s.id = 'nvd-pill-loading-style';
    s.textContent = [
      '@keyframes nvd-shimmer {',
      '  0%   { background-position: 200% 0; }',
      '  100% { background-position: -200% 0; }',
      '}',
      '.nvd-pill-shimmer {',
      '  display: inline-flex;',
      '  align-items: center;',
      '  padding: 6px 16px;',
      '  border-radius: 999px;',
      '  border: 1px solid rgba(255,255,255,0.08);',
      '  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);',
      '  background-size: 200% 100%;',
      '  animation: nvd-shimmer 1.2s linear infinite;',
      '  min-width: 110px;',
      '  height: 32px;',
      '  user-select: none;',
      '}',
      '#nvd-session-pill {',
      '  transition: opacity 150ms ease;',
      '}',
    ].join('\n');
    document.head.appendChild(s);
  }

  function setLoading(el) {
    el.classList.remove('nv-session-widget', 'is-authenticated');
    el.style.opacity = '1';
    el.onclick = null;
    el.innerHTML = '<span class="nvd-pill-shimmer"></span>';
  }

  function applyState(el, fn) {
    el.style.transition = 'opacity 150ms ease';
    el.style.opacity = '0';
    setTimeout(() => {
      fn();
      el.style.opacity = '1';
    }, 150);
  }

  function setLogin(el) {
    el.innerHTML = `<span class="nv-session-icon">👤</span><strong>Iniciar sesión</strong>`;
    el.classList.add('nv-session-widget');
    el.onclick = () => location.href = '/auth.html?redirect=/';
  }

  function rangoIcon(rango) {
    const key = String(rango || 'Cachorro')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/\s+/g, '');

    const icons = {
      cachorro:     '/rangos/rango1-cachorro-bronce.png',
      explorador:   '/rangos/rango2-explorador-bronce.png',
      guardian:     '/rangos/rango3-guardian-plata.png',
      montanista:   '/rangos/rango4-montanista-plata.png',
      guia:         '/rangos/rango5-guia-plata.png',
      protector:    '/rangos/rango6-protector-oro.png',
      leyendaandina:'/rangos/rango7-leyendaandina-oro-joyas.png'
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
      <img class="nv-rank-icon" src="${rangoIcon(rango)}" alt="${rango}" style="width:24px;height:24px;object-fit:contain;flex-shrink:0">
      <span class="nv-session-copy">
        <strong>@${String(username).replace(/^@/, '')}</strong>
        <small>${croquetas.toLocaleString('es-CO')} croquetas</small>
      </span>
    `;
    el.classList.add('nv-session-widget', 'is-authenticated');
    el.onclick = () => location.href = '/profile.html';
  }

  async function bootSession() {
    injectShimmerStyles();

    const el = findSessionBox();
    if (!el) return;

    setLoading(el);

    try {
      await loadScript(CLERK_SRC, { 'data-clerk-publishable-key': CLERK_KEY });
      await window.Clerk.load();

      const user = window.Clerk.user;
      if (!user) return applyState(el, () => setLogin(el));

      const profile = await getProfile(user);
      applyState(el, () => setUser(el, user, profile));
    } catch (e) {
      console.warn('[Nevado session]', e);
      applyState(el, () => setLogin(el));
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
