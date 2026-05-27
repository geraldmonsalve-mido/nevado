(function () {
  'use strict';

  // ─── ÚNICO EMAIL AUTORIZADO ────────────────────────────────────────
  // Solo el founder real. No agregar otros emails aquí.
  const FOUNDER_EMAIL = 'nevado.pro7@gmail.com';

  function showValidatingMsg(msg) {
    const el = document.getElementById('fp-validating');
    if (el) el.textContent = msg;
  }

  function denyAccess() {
    // Ocultar todo el contenido del panel inmediatamente
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.body.innerHTML = `
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        .fp-denied-screen {
          position: fixed;
          inset: 0;
          background: #05050A;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Geist', -apple-system, BlinkMacSystemFont, sans-serif;
          z-index: 99999;
        }

        .fp-denied-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 22px;
          padding: 56px 48px;
          max-width: 440px;
          width: 90%;
          text-align: center;
          backdrop-filter: blur(12px);
        }

        .fp-denied-icon {
          font-size: 48px;
          margin-bottom: 24px;
          display: block;
          opacity: 0.6;
        }

        .fp-denied-title {
          color: #ffffff;
          font-size: 20px;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin-bottom: 12px;
        }

        .fp-denied-text {
          color: rgba(255,255,255,0.45);
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 36px;
        }

        .fp-denied-btn {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.12);
          color: rgba(255,255,255,0.75);
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          padding: 12px 24px;
          border-radius: 10px;
          transition: background 0.2s, color 0.2s, border-color 0.2s;
          cursor: pointer;
        }

        .fp-denied-btn:hover {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.2);
          color: #ffffff;
        }

        .fp-denied-brand {
          position: fixed;
          top: 24px;
          left: 28px;
          color: rgba(255,255,255,0.3);
          font-size: 13px;
          font-weight: 600;
          letter-spacing: 0.08em;
          font-family: inherit;
        }
      </style>

      <div class="fp-denied-screen">
        <span class="fp-denied-brand">N · E V A D O</span>
        <div class="fp-denied-card">
          <span class="fp-denied-icon">🔒</span>
          <h1 class="fp-denied-title">Acceso restringido</h1>
          <p class="fp-denied-text">
            Esta sección es exclusiva del Fundador.<br />
            Tu cuenta no tiene permisos para acceder aquí.
          </p>
          <a href="/" class="fp-denied-btn">
            ← Regresar al ecosistema
          </a>
        </div>
      </div>
    `;
  }

  function waitForClerk(timeout) {
    return new Promise(function (resolve, reject) {
      if (window.Clerk) { resolve(window.Clerk); return; }
      var start = Date.now();
      function check() {
        if (window.Clerk) { resolve(window.Clerk); return; }
        if (Date.now() - start > timeout) { reject(new Error('Clerk no disponible')); return; }
        setTimeout(check, 100);
      }
      setTimeout(check, 100);
    });
  }

  async function boot() {
    var fallback = setTimeout(function () {
      showValidatingMsg('Error al validar sesión. Recarga la página.');
    }, 4000);

    try {
      var clerk = await waitForClerk(5000);
      await clerk.load();
      clearTimeout(fallback);

      var user = clerk.user;

      // Sin sesión → redirigir a login
      if (!user) {
        location.href = '/auth.html?redirect=founder-panel';
        return;
      }

      var email =
        (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
        (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) ||
        '';

      // Email no coincide con el founder → acceso denegado total
      if (email !== FOUNDER_EMAIL) {
        denyAccess();
        return;
      }

      // ── A partir de aquí: founder verificado ──────────────────────
      window.FP_FOUNDER_EMAIL = email;

      var nameEl  = document.getElementById('fp-user-name');
      var emailEl = document.getElementById('fp-user-email');
      if (nameEl)  nameEl.textContent  = user.fullName || user.firstName || 'Founder';
      if (emailEl) emailEl.textContent = email;

      var validating = document.getElementById('fp-validating');
      if (validating) { validating.hidden = true; validating.style.display = 'none'; }

      var wrap = document.getElementById('fp-wrap');
      if (wrap) { wrap.hidden = false; wrap.style.display = ''; }

      window.dispatchEvent(new CustomEvent('nvd:founder-ready', { detail: { email: email } }));

    } catch (err) {
      clearTimeout(fallback);
      showValidatingMsg('Error al validar sesión. Recarga la página.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
