(function () {
  const FOUNDER_EMAIL = 'nevado.pro7@gmail.com';

  function denyAccess() {
    document.documentElement.style.visibility = 'visible';
    document.body.innerHTML = `
      <main class="founder-denied">
        <section>
          <h1>Acceso restringido</h1>
          <p>Este panel pertenece exclusivamente al Founder de NEVADO.</p>
          <a href="/">Volver al ecosistema</a>
        </section>
      </main>
    `;
  }

  async function boot() {
    const timeout = setTimeout(() => {
      location.href = '/auth.html?redirect=founder-panel';
    }, 3000);

    try {
      await window.Clerk.load();
      clearTimeout(timeout);

      const user = window.Clerk.user;
      if (!user) {
        location.href = '/auth.html?redirect=founder-panel';
        return;
      }

      const email =
        user.primaryEmailAddress?.emailAddress ||
        user.emailAddresses?.[0]?.emailAddress ||
        '';

      if (email !== FOUNDER_EMAIL) {
        denyAccess();
        return;
      }

      document.documentElement.style.visibility = 'visible';

      cleanOldPlaceholders();
      injectCommandHeader();
      injectStats();
      injectCroquetasPanel(email);
      loadStats();
    } catch (e) {
      location.href = '/auth.html?redirect=founder-panel';
    }
  }

  function cleanOldPlaceholders() {
    [...document.querySelectorAll('section, article, .card, .panel, div')]
      .filter(el => {
        const text = el.textContent || '';
        return (
          text.includes('Centro de mando institucional') ||
          text.includes('Rango máximo') ||
          text.includes('Croquetas para otorgar') ||
          text.includes('Permiso superior') ||
          text.includes('Ver evaluaciones') ||
          text.includes('Ver reportes')
        );
      })
      .forEach(el => {
        if (!el.closest('#founder-croquetas-real') && !el.closest('#founder-real-stats')) {
          el.style.display = 'none';
        }
      });
  }

  function injectCommandHeader() {
    if (document.getElementById('founder-command-compact')) return;

    const header = document.createElement('section');
    header.id = 'founder-command-compact';
    header.innerHTML = `
      <div>
        <span>Founder Session</span>
        <h1>Centro de mando NEVADO</h1>
        <p>Control real de usuarios, croquetas, rangos y actividad institucional.</p>
      </div>
    `;

    const main = document.querySelector('main') || document.body;
    main.prepend(header);
  }

  function injectStats() {
    if (document.getElementById('founder-real-stats')) return;

    const stats = document.createElement('section');
    stats.id = 'founder-real-stats';
    stats.innerHTML = `
      <article><span>Usuarios</span><strong id="fs-users">—</strong><small>registrados</small></article>
      <article><span>Croquetas</span><strong id="fs-croquetas">—</strong><small>distribuidas</small></article>
      <article><span>Activos</span><strong id="fs-activos">—</strong><small>últimas 24h</small></article>
      <article><span>Guardián+</span><strong id="fs-guardian">—</strong><small>rango alto</small></article>
      <article><span>Logs</span><strong id="fs-logs">—</strong><small>recientes</small></article>
    `;

    const header = document.getElementById('founder-command-compact');
    header.insertAdjacentElement('afterend', stats);
  }

  async function loadStats() {
    try {
      const res = await fetch('/api/founder-stats', { cache: 'no-store' });
      if (!res.ok) return;

      const data = await res.json();

      document.getElementById('fs-users').textContent = Number(data.usuarios || 0).toLocaleString('es-CO');
      document.getElementById('fs-croquetas').textContent = Number(data.croquetas || 0).toLocaleString('es-CO');
      document.getElementById('fs-activos').textContent = Number(data.activos || 0).toLocaleString('es-CO');
      document.getElementById('fs-guardian').textContent = Number(data.guardianPlus || 0).toLocaleString('es-CO');
      document.getElementById('fs-logs').textContent = Number(data.logs?.length || 0).toLocaleString('es-CO');
    } catch (e) {
      console.warn('[Founder stats]', e);
    }
  }

  function injectCroquetasPanel(founderEmail) {
    if (document.getElementById('founder-croquetas-real')) return;

    const section = document.createElement('section');
    section.id = 'founder-croquetas-real';
    section.innerHTML = `
      <div class="fc-card">
        <div class="fc-head">
          <h2>Cambios de Croquetas</h2>
          <p>Primero ubica el usuario, valida su estado y luego suma o resta croquetas reales.</p>
        </div>

        <div class="fc-search">
          <label>
            Buscar usuario por email
            <input id="fc-lookup-email" type="email" value="gerald.monsalve@gmail.com">
          </label>
          <button id="fc-lookup-btn" type="button">Validar usuario</button>
        </div>

        <div id="fc-user-card" class="fc-user-card">
          Usuario no validado todavía.
        </div>

        <form id="fc-form">
          <label>
            Operación
            <select name="operacion">
              <option value="sumar">Sumar croquetas</option>
              <option value="restar">Restar croquetas</option>
            </select>
          </label>

          <label>
            Cantidad
            <input type="number" name="cantidad" value="200" min="1" required>
          </label>

          <label>
            Motivo
            <input type="text" name="motivo" value="Cambio institucional" required>
          </label>

          <button type="submit">Aplicar cambio</button>
        </form>

        <pre id="fc-result">Valida un usuario antes de modificar croquetas.</pre>
      </div>
    `;

    const stats = document.getElementById('founder-real-stats');
    stats.insertAdjacentElement('afterend', section);

    const emailInput = document.getElementById('fc-lookup-email');
    const lookupBtn = document.getElementById('fc-lookup-btn');
    const userCard = document.getElementById('fc-user-card');
    const form = document.getElementById('fc-form');
    const result = document.getElementById('fc-result');

    let currentUser = null;

    lookupBtn.addEventListener('click', async () => {
      currentUser = null;
      result.textContent = 'Validando usuario...';
      userCard.textContent = 'Buscando...';

      try {
        const email = emailInput.value.trim();
        const res = await fetch('/api/usuario?email=' + encodeURIComponent(email), { cache: 'no-store' });
        const data = await res.json();

        if (!res.ok) {
          userCard.textContent = 'Usuario no encontrado.';
          result.textContent = data.error || 'No se pudo validar usuario.';
          return;
        }

        currentUser = data;

        userCard.innerHTML = `
          <strong>${data.nombre || data.email}</strong>
          <span>${data.email}</span>
          <small>${Number(data.croquetas || 0).toLocaleString('es-CO')} croquetas · ${data.rango} · Nivel ${data.nivel}</small>
        `;

        result.textContent = 'Usuario validado. Ya puedes aplicar un cambio.';
      } catch (err) {
        userCard.textContent = 'Error validando usuario.';
        result.textContent = err.message;
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      if (!currentUser) {
        result.textContent = 'Primero valida un usuario real.';
        return;
      }

      const formData = new FormData(e.currentTarget);
      result.textContent = 'Aplicando cambio...';

      try {
        const response = await fetch('/api/founder-croquetas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            founder_email: founderEmail,
            to_email: currentUser.email,
            operacion: formData.get('operacion'),
            cantidad: Number(formData.get('cantidad')),
            motivo: formData.get('motivo')
          })
        });

        const data = await response.json();

        if (!response.ok) {
          result.textContent = 'Error: ' + (data.error || 'No se pudo completar.');
          return;
        }

        currentUser = data;

        userCard.innerHTML = `
          <strong>${data.usuario || data.email}</strong>
          <span>${data.email || ''}</span>
          <small>${Number(data.croquetas || 0).toLocaleString('es-CO')} croquetas · ${data.rango} · Nivel ${data.nivel}</small>
        `;

        result.textContent =
`✓ Cambio aplicado correctamente

Usuario: ${data.usuario}
Cambio: ${data.cambio > 0 ? '+' : ''}${data.cambio}
Croquetas actuales: ${data.croquetas}
Nivel: ${data.nivel}
Rango: ${data.rango}`;

        loadStats();
      } catch (err) {
        result.textContent = 'Error: ' + err.message;
      }
    });
  }

  boot();
})();
