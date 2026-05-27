(function () {
  'use strict';

  const FOUNDER_EMAILS = [
    'nevado.pro7@gmail.com',
    'nevadopro7@gmail.com',
    'gerald.monsalve@gmail.com'
  ];

  function showValidatingMsg(msg) {
    const el = document.getElementById('fp-validating');
    if (el) el.textContent = msg;
  }

  function denyAccess(msg) {
    document.body.innerHTML = `
      <div class="fp-denied">
        <div class="fp-denied-box">
          <h1>Acceso restringido</h1>
          <p>${msg}</p>
          <a href="/">← Ecosistema</a>
        </div>
      </div>`;
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
      if (!user) {
        location.href = '/auth.html?redirect=founder-panel';
        return;
      }

      var email =
        (user.primaryEmailAddress && user.primaryEmailAddress.emailAddress) ||
        (user.emailAddresses && user.emailAddresses[0] && user.emailAddresses[0].emailAddress) ||
        '';

      if (!FOUNDER_EMAILS.includes(email)) {
        denyAccess('Tu cuenta no tiene acceso al Panel del Fundador.');
        return;
      }

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
