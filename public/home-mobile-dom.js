(function () {
  if (!window.matchMedia('(max-width: 768px)').matches) return;

  function initMobile() {
    if (document.getElementById('mobile-overlay')) return;

    /* ── Header fijo ─────────────────────────────────────────── */
    var header = document.createElement('div');
    header.id = 'mobile-header';
    header.innerHTML =
      '<div id="mobile-session-card">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B8944A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
          '<circle cx="12" cy="8" r="4"/>' +
          '<path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>' +
        '</svg>' +
        '<div class="mobile-session-info">' +
          '<span class="mobile-session-title">Sesión verificada</span>' +
          '<span class="mobile-session-sub">2FA activa</span>' +
        '</div>' +
      '</div>' +
      '<button id="mobile-menu-btn" aria-label="Menú">' +
        '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5" stroke-linecap="round">' +
          '<line x1="3" y1="7"  x2="21" y2="7"/>' +
          '<line x1="3" y1="12" x2="21" y2="12"/>' +
          '<line x1="3" y1="17" x2="21" y2="17"/>' +
        '</svg>' +
      '</button>';
    document.body.appendChild(header);

    /* ── Overlay scrollable ──────────────────────────────────── */
    var overlay = document.createElement('div');
    overlay.id = 'mobile-overlay';

    overlay.innerHTML =
      /* Hero: área transparente que deja ver el perro */
      '<div id="mobile-hero"></div>' +

      /* Bloque institucional */
      '<div id="mobile-nevado-text">' +
        '<h1 class="mobile-neva-title">NEVADO</h1>' +
        '<p class="mobile-neva-sub">CUSTODIO DEL ECOSISTEMA</p>' +
        '<div id="mobile-status-pill">' +
          '<span class="mobile-status-dot"></span>' +
          '<span class="mobile-status-text">Ecosistema activo · 48,291 venezolanos</span>' +
        '</div>' +
      '</div>' +

      /* Cards del ecosistema */
      '<div id="mobile-cards">' +

        /* Card grande — Capital Humano */
        '<a class="mobile-card-big mobile-card-yellow" href="/talento.html">' +
          '<span class="mobile-card-cat">Capital Humano</span>' +
          '<div class="mobile-card-name">TALENTO</div>' +
          '<span class="mobile-card-metric">847 vacantes activas hoy</span>' +
        '</a>' +

        /* Carrusel — 4 cards secundarias */
        '<div id="mobile-carousel">' +

          '<a class="mobile-card-mini mobile-card-yellow" href="/avila.html">' +
            '<span class="mobile-card-cat">Aprendizaje</span>' +
            '<div class="mobile-card-name">ÁVILA</div>' +
            '<span class="mobile-card-metric">340 rutas</span>' +
          '</a>' +

          '<a class="mobile-card-mini mobile-card-blue" href="/enterate.html">' +
            '<span class="mobile-card-cat">Información</span>' +
            '<div class="mobile-card-name">TITULARES</div>' +
            '<span class="mobile-card-metric">24 / 7</span>' +
          '</a>' +

          '<a class="mobile-card-mini mobile-card-blue" href="/corazon.html">' +
            '<span class="mobile-card-cat">Comunidad</span>' +
            '<div class="mobile-card-name">CORAZÓN</div>' +
            '<span class="mobile-card-metric">12K miembros</span>' +
          '</a>' +

          '<a class="mobile-card-mini mobile-card-red" href="/nodo.html">' +
            '<span class="mobile-card-cat">Red</span>' +
            '<div class="mobile-card-name">NODO</div>' +
            '<span class="mobile-card-metric">2,800 nodos</span>' +
          '</a>' +

        '</div>' +

        /* Card grande — Servicios */
        '<a class="mobile-card-big mobile-card-red" href="/servicios.html">' +
          '<span class="mobile-card-cat">Red de Servicios</span>' +
          '<div class="mobile-card-name">SERVICIOS</div>' +
          '<span class="mobile-card-metric">12,000+ proveedores</span>' +
        '</a>' +

      '</div>' + /* #mobile-cards */

      /* Espaciador para ticker */
      '<div style="height:32px;pointer-events:none;"></div>';

    document.body.appendChild(overlay);
  }

  /* Ejecutar después de que main.js haya montado el DOM */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobile);
  } else {
    initMobile();
  }
})();
