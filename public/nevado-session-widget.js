(function () {
  const CLERK_SRC = 'https://clerk.nevado.pro/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
  const CLERK_KEY = 'pk_live_Y2xlcmsubmV2YWRvLnBybyQ';

  var RANK_IMG = {
    'Cachorro':       '/rangos/rango1-cachorro-bronce-sm.webp',
    'Explorador':     '/rangos/rango2-explorador-bronce-sm.webp',
    'Guardián':       '/rangos/rango3-guardian-plata-sm.webp',
    'Montañista':     '/rangos/rango4-montanista-plata-sm.webp',
    'Guía':           '/rangos/rango5-guia-plata-sm.webp',
    'Protector':      '/rangos/rango6-protector-oro-sm.webp',
    'Leyenda Andina': '/rangos/rango7-leyendaandina-oro-joyas-sm.webp'
  };

  function fmt(n) { return Number(n || 0).toLocaleString('es-VE'); }

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
      '#nvd-session-pill { position: relative; display: inline-flex; align-items: center; transition: opacity 150ms ease; }',
      '.nvd-pill-trigger { display:flex; align-items:center; gap:8px; padding:4px 12px 4px 6px; border-radius:999px; border:1px solid rgba(255,255,255,.14); background:rgba(255,255,255,.055); color:#fff; font-size:13px; font-weight:600; font-family:Inter,"Geist",system-ui,sans-serif; cursor:pointer; white-space:nowrap; transition:background .2s,border-color .2s; line-height:1; }',
      '.nvd-pill-trigger:hover, .nvd-pill-trigger.is-open { background:rgba(255,255,255,.09); border-color:rgba(184,148,74,.35); }',
      '.nvd-pill-avatar { width:26px; height:26px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,215,120,.25); flex-shrink:0; display:block; }',
      '.nvd-pill-name { max-width:120px; overflow:hidden; text-overflow:ellipsis; }',
      '.nvd-pill-chevron { opacity:.5; flex-shrink:0; transition:transform .2s; }',
      '.nvd-pill-trigger.is-open .nvd-pill-chevron { transform:rotate(180deg); }',
      '.nvd-pill-panel { display:none; position:absolute; top:calc(100% + 10px); right:0; min-width:264px; background:rgba(5,5,10,.96); border:1px solid rgba(255,255,255,.1); border-radius:22px; padding:16px; backdrop-filter:blur(30px); -webkit-backdrop-filter:blur(30px); box-shadow:0 24px 60px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04); z-index:9900; font-family:Inter,"Geist",system-ui,sans-serif; }',
      '.nvd-pill-panel.is-open { display:block; }',
      '.nvd-dd-hdr { display:flex; align-items:center; gap:12px; margin-bottom:14px; }',
      '.nvd-dd-hdr-avatar { width:44px; height:44px; border-radius:50%; object-fit:cover; border:1.5px solid rgba(184,148,74,.4); flex-shrink:0; }',
      '.nvd-dd-hdr-info { display:flex; flex-direction:column; gap:3px; min-width:0; }',
      '.nvd-dd-hdr-name { font-size:14px; font-weight:700; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.nvd-dd-hdr-email { font-size:11px; color:rgba(255,255,255,.38); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }',
      '.nvd-dd-rank { display:flex; align-items:center; gap:12px; padding:10px 12px; border-radius:14px; background:rgba(184,148,74,.05); border:1px solid rgba(184,148,74,.14); margin-bottom:12px; }',
      '.nvd-dd-rank-img { width:36px; height:36px; object-fit:contain; flex-shrink:0; filter:drop-shadow(0 2px 8px rgba(184,148,74,.3)); }',
      '.nvd-dd-rank-body { display:flex; flex-direction:column; gap:2px; }',
      '.nvd-dd-rank-name { font-size:13px; font-weight:700; color:#B8944A; }',
      '.nvd-dd-rank-detail { font-size:11px; color:rgba(255,255,255,.4); }',
      '.nvd-dd-sep { height:1px; background:rgba(255,255,255,.07); margin:4px 0 8px; }',
      '.nvd-dd-item { display:flex; align-items:center; width:100%; padding:10px 14px; border-radius:12px; background:transparent; border:none; color:rgba(255,255,255,.75); font-size:13px; font-weight:600; font-family:inherit; text-decoration:none; cursor:pointer; text-align:left; box-sizing:border-box; transition:background .15s,color .15s; }',
      '.nvd-dd-item:hover { background:rgba(255,255,255,.06); color:#fff; }',
      '.nvd-dd-logout:hover { background:rgba(255,70,70,.08) !important; color:rgba(255,120,120,.9) !important; }',
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
    var email     = user.primaryEmailAddress?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';
    var nombre    = user.fullName || user.firstName || 'Usuario';
    var img       = user.imageUrl || '/NevadoUtil.png';
    var croquetas = Number((profile && profile.croquetas) || 0);
    var rango     = (profile && profile.rango) || 'Cachorro';
    var nivel     = (profile && profile.nivel) || 1;
    var rankImgSrc = RANK_IMG[rango] || RANK_IMG['Cachorro'];

    var chevron = '<svg class="nvd-pill-chevron" width="10" height="6" viewBox="0 0 10 6" fill="none">' +
      '<path d="M1 1l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
      '</svg>';

    el.innerHTML =
      '<button id="nvd-pill-trigger" class="nvd-pill-trigger" type="button">' +
        '<img class="nvd-pill-avatar" src="' + img + '" alt="' + nombre + '" onerror="this.src=\'/NevadoUtil.png\'" />' +
        '<span class="nvd-pill-name">' + nombre + '</span>' +
        chevron +
      '</button>' +
      '<div id="nvd-pill-panel" class="nvd-pill-panel">' +
        '<div class="nvd-dd-hdr">' +
          '<img class="nvd-dd-hdr-avatar" src="' + img + '" alt="' + nombre + '" onerror="this.src=\'/NevadoUtil.png\'" />' +
          '<div class="nvd-dd-hdr-info">' +
            '<span class="nvd-dd-hdr-name">' + nombre + '</span>' +
            '<span class="nvd-dd-hdr-email">' + email + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="nvd-dd-rank">' +
          '<img class="nvd-dd-rank-img" src="' + rankImgSrc + '" alt="' + rango + '" />' +
          '<div class="nvd-dd-rank-body">' +
            '<span class="nvd-dd-rank-name">' + rango + '</span>' +
            '<span class="nvd-dd-rank-detail">🦴 ' + fmt(croquetas) + ' · Nivel ' + nivel + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="nvd-dd-sep"></div>' +
        '<a class="nvd-dd-item" href="/profile.html">Ver perfil</a>' +
        '<button class="nvd-dd-item nvd-dd-logout" id="nvd-dd-logout" type="button">Cerrar sesión</button>' +
      '</div>';

    var trigger = document.getElementById('nvd-pill-trigger');
    var panel   = document.getElementById('nvd-pill-panel');

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      var open = panel.classList.toggle('is-open');
      trigger.classList.toggle('is-open', open);
    });

    document.addEventListener('click', function (e) {
      if (!el.contains(e.target)) {
        panel.classList.remove('is-open');
        trigger.classList.remove('is-open');
      }
    });

    document.getElementById('nvd-dd-logout').addEventListener('click', async function () {
      try { if (window.Clerk && window.Clerk.signOut) await window.Clerk.signOut(); } catch (_) {}
      window.location.href = '/';
    });
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
