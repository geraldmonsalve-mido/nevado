(function () {
  const RANGOS = [
    { nombre: 'Cachorro', min: 0, icon: '/rangos/cachorro.png' },
    { nombre: 'Explorador', min: 1000, icon: '/rangos/explorador.png' },
    { nombre: 'Guardián', min: 2000, icon: '/rangos/guardian.png' },
    { nombre: 'Montañista', min: 3200, icon: '/rangos/montanista.png' },
    { nombre: 'Guía', min: 5450, icon: '/rangos/guia.png' },
    { nombre: 'Protector', min: 8450, icon: '/rangos/protector.png' },
    { nombre: 'Leyenda Andina', min: 16450, icon: '/rangos/leyenda-andina.png' }
  ];

  function rangoPorCroquetas(croquetas) {
    return [...RANGOS].reverse().find(r => croquetas >= r.min) || RANGOS[0];
  }

  function compactNumber(n) {
    return Number(n || 0).toLocaleString('es-CO');
  }

  function findSessionBox() {
    return [...document.querySelectorAll('div, a, button')]
      .find(el => /Sesión verificada|Sesión Verificada|2FA activa/i.test(el.textContent || ''));
  }

  function renderLogin(el) {
    el.innerHTML = `
      <span class="nv-session-icon">👤</span>
      <span class="nv-session-copy">
        <strong>Iniciar sesión</strong>
        <small>Modo Nevado</small>
      </span>
    `;
    el.classList.add('nv-session-widget');
    el.onclick = () => {
      window.location.href = '/auth.html?redirect=/';
    };
  }

  function renderUser(el, user, profile) {
    const croquetas = profile?.croquetas || 0;
    const rango = rangoPorCroquetas(croquetas);
    const username =
      profile?.username ||
      profile?.nombre ||
      user?.username ||
      user?.firstName ||
      'usuario';

    el.innerHTML = `
      <img class="nv-rank-icon" src="${rango.icon}" alt="${rango.nombre}" />
      <span class="nv-session-copy">
        <strong>@${String(username).replace(/^@/, '')}</strong>
        <small>${compactNumber(croquetas)} croquetas</small>
      </span>
    `;
    el.classList.add('nv-session-widget', 'is-authenticated');
    el.onclick = () => {
      window.location.href = '/profile.html';
    };
  }

  async function waitForClerk(timeout = 3500) {
    const start = Date.now();
    while (!window.Clerk && Date.now() - start < timeout) {
      await new Promise(r => setTimeout(r, 80));
    }
    return window.Clerk || null;
  }

  async function getProfile(user) {
    try {
      if (!window.nevadoDb || !user?.id) return null;
      const { data } = await window.nevadoDb
        .from('usuarios')
        .select('nombre, username, email, croquetas, rango')
        .eq('clerk_id', user.id)
        .single();
      return data;
    } catch {
      return null;
    }
  }

  async function boot() {
    const el = findSessionBox();
    if (!el) return;

    el.classList.add('nv-session-widget');
    renderLogin(el);

    const Clerk = await waitForClerk();
    if (!Clerk) return;

    try {
      await Clerk.load();
      const user = Clerk.user;
      if (!user) {
        renderLogin(el);
        return;
      }

      const profile = await getProfile(user);
      renderUser(el, user, profile);
    } catch {
      renderLogin(el);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
