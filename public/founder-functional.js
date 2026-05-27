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

      injectCroquetasPanel(email);

    } catch (e) {

      location.href = '/auth.html?redirect=founder-panel';

    }
  }

  function injectCroquetasPanel(founderEmail) {

    if (document.getElementById('founder-croquetas-real')) {
      return;
    }

    const section = document.createElement('section');

    section.id = 'founder-croquetas-real';

    section.innerHTML = `
      <div class="fc-card">

        <div class="fc-head">
          <h2>Migración de Croquetas</h2>
          <p>Otorga croquetas reales desde el founder.</p>
        </div>

        <form id="fc-form">

          <label>
            Usuario destino
            <input
              type="email"
              name="to_email"
              value="gerald.monsalve@gmail.com"
              required
            >
          </label>

          <label>
            Cantidad
            <input
              type="number"
              name="cantidad"
              value="200"
              min="1"
              required
            >
          </label>

          <label>
            Motivo
            <input
              type="text"
              name="motivo"
              value="Migración institucional"
              required
            >
          </label>

          <button type="submit">
            Otorgar Croquetas
          </button>

        </form>

        <pre id="fc-result">
Listo para transferir croquetas reales.
        </pre>

      </div>
    `;

    const main = document.querySelector('main') || document.body;

    main.prepend(section);

    document
      .getElementById('fc-form')
      .addEventListener('submit', async (e) => {

        e.preventDefault();

        const form = new FormData(e.currentTarget);

        const result = document.getElementById('fc-result');

        result.textContent = 'Procesando...';

        try {

          const response = await fetch('/api/founder-croquetas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              founder_email: founderEmail,
              to_email: form.get('to_email'),
              cantidad: Number(form.get('cantidad')),
              motivo: form.get('motivo')
            })
          });

          const data = await response.json();

          if (!response.ok) {

            result.textContent =
              'Error: ' + (data.error || 'No se pudo completar');

            return;
          }

          result.textContent =
`✓ Croquetas otorgadas correctamente

Usuario: ${data.usuario}
Croquetas: ${data.croquetas}
Nivel: ${data.nivel}
Rango: ${data.rango}`;

        } catch (err) {

          result.textContent =
            'Error: ' + err.message;

        }

      });

  }

  boot();

})();
