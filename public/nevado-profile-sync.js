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
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });

    if (!res.ok) return null;
    return await res.json();
  }

  function fmt(n) {
    return Number(n || 0).toLocaleString('es-CO');
  }

  function nextInfo(profile) {
    const c = Number(profile.croquetas || 0);
    const rango = profile.rango || 'Cachorro';

    const steps = [
      ['Cachorro', 'Explorador', 1000],
      ['Explorador', 'Guardián', 2000],
      ['Guardián', 'Montañista', 3200],
      ['Montañista', 'Guía', 5450],
      ['Guía', 'Protector', 8450],
      ['Protector', 'Leyenda Andina', 16450]
    ];

    const current = steps.find(s => s[0] === rango) || steps.find(s => c < s[2]);

    if (!current) {
      return {
        next: 'Rango máximo',
        missing: 'Máximo',
        phrase: 'Has alcanzado el rango máximo del ecosistema NEVADO.'
      };
    }

    const missing = Math.max(current[2] - c, 0);

    return {
      next: current[1],
      missing: missing ? `${fmt(missing)} 🦴` : 'Listo',
      phrase: `Para ascender de <strong>${rango}</strong> a <strong>${current[1]}</strong>, debes alcanzar <strong>${fmt(current[2])} Croquetas acumuladas</strong>.`
    };
  }

  function setMetric(label, value) {
    const all = [...document.querySelectorAll('div, span, p, strong, small')];

    const labelNode = all.find(el =>
      (el.textContent || '').trim().toLowerCase() === label.toLowerCase()
    );

    if (!labelNode) return false;

    let box = labelNode.closest('div');
    for (let i = 0; i < 4 && box; i++) {
      const children = [...box.querySelectorAll('div, span, strong, p')]
        .filter(el => el !== labelNode);

      const valueNode = children.find(el => {
        const t = (el.textContent || '').trim();
        return t && !/Nivel|Croquetas|Rango actual|Croquetas para ascender/i.test(t);
      });

      if (valueNode) {
        valueNode.textContent = value;
        return true;
      }

      box = box.parentElement;
    }

    return false;
  }

  function setMainTexts(profile) {
    const name = profile.nombre || profile.email || 'Usuario Nevado';
    const rango = profile.rango || 'Cachorro';

    const h1 = [...document.querySelectorAll('h1, h2')]
      .find(el => /Gerald|Nevado|Monsalve|Usuario/i.test(el.textContent || ''));

    if (h1) h1.textContent = name;

    [...document.querySelectorAll('div, span, p, strong')]
      .filter(el => (el.textContent || '').trim() === 'Cachorro')
      .forEach(el => el.textContent = rango);
  }

  function apply(profile) {
    const info = nextInfo(profile);

    setMainTexts(profile);
    setMetric('Nivel', String(profile.nivel || 1));
    setMetric('Croquetas', fmt(profile.croquetas));
    setMetric('Rango actual', profile.rango || 'Cachorro');
    setMetric('Croquetas para ascender', info.missing);

    [...document.querySelectorAll('p, div')]
      .filter(el => /Para ascender de/i.test(el.textContent || ''))
      .forEach(el => { el.innerHTML = info.phrase; });

    window.NEVADO_CURRENT_USER = profile;
    document.documentElement.dataset.nevadoProfileSynced = 'true';
  }

  async function boot() {
    try {
      const user = await getUser();
      if (!user) return;

      const profile = await getProfile(user);
      if (!profile) return;

      [200, 700, 1400, 2400].forEach(t => setTimeout(() => apply(profile), t));
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
