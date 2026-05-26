(function () {
  if (window.innerWidth > 768) return;

  function init() {
    if (document.querySelector('.mobile-scroll-wrapper')) return;

    /* ── Tarjeta sesión — esquina superior izquierda ─────────── */
    var sessionCard = document.createElement('div');
    sessionCard.className = 'mobile-session-card';
    sessionCard.innerHTML =
      '<svg width="14" height="14" viewBox="0 0 24 24" fill="none"' +
        ' stroke="rgba(184,148,74,0.9)" stroke-width="2"' +
        ' stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>' +
        '<circle cx="12" cy="7" r="4"/>' +
      '</svg>' +
      '<div>' +
        '<span class="session-label">Sesión verificada</span>' +
        '<span class="session-sub">2FA activa</span>' +
      '</div>';
    document.body.appendChild(sessionCard);

    /* ── Botón menú — esquina superior derecha ───────────────── */
    var menuBtn = document.createElement('button');
    menuBtn.className = 'mobile-menu-button';
    menuBtn.setAttribute('aria-label', 'Menú');
    menuBtn.innerHTML =
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"' +
        ' stroke="white" stroke-width="2" stroke-linecap="round">' +
        '<line x1="3" y1="6"  x2="21" y2="6"/>' +
        '<line x1="3" y1="12" x2="21" y2="12"/>' +
        '<line x1="3" y1="18" x2="21" y2="18"/>' +
      '</svg>';
    document.body.appendChild(menuBtn);

    /* ── Wrapper scrollable (contiene todo el contenido mobile) ─ */
    var wrapper = document.createElement('div');
    wrapper.className = 'mobile-scroll-wrapper';
    wrapper.innerHTML =

      /* Spacer transparente que deja ver el perro 3D (canvas z-index:1) */
      '<div class="mobile-hero-spacer"></div>' +

      /* Bloque institucional */
      '<div class="hero-identity">' +
        '<h1 class="hero-name">NEVADO</h1>' +
        '<p class="hero-title-text">CUSTODIO DEL ECOSISTEMA</p>' +
        '<div class="status-pill">' +
          '<span class="status-dot"></span>' +
          '<span>Ecosistema activo · <strong>48,291</strong> venezolanos</span>' +
        '</div>' +
      '</div>' +

      /* Cards del ecosistema */
      '<div class="mobile-ecosystem">' +

        /* Card grande — Capital Humano */
        '<a href="/talento.html" class="mobile-card-primary mobile-card-amarillo">' +
          '<span class="mc-cat">RED DE TALENTO</span>' +
          '<h2 class="mc-title">CAPITAL HUMANO</h2>' +
          '<p class="mc-metric"><strong>12,430</strong> profesionales activos</p>' +
          '<span class="mc-arrow">→</span>' +
        '</a>' +

        /* Carrusel horizontal — 4 cards secundarias */
        '<div class="mobile-card-carousel">' +

          '<a href="/avila.html" class="mobile-card-mini" style="--mc-color:#FFD700">' +
            '<span class="mc-cat">FORMACIÓN</span>' +
            '<h3 class="mc-title">ÁVILA</h3>' +
            '<p class="mc-metric">340 rutas</p>' +
          '</a>' +

          '<a href="/enterate.html" class="mobile-card-mini" style="--mc-color:#003DA5">' +
            '<span class="mc-cat">TITULARES</span>' +
            '<h3 class="mc-title">TITULARES</h3>' +
            '<p class="mc-metric">180 artículos</p>' +
          '</a>' +

          '<a href="/corazon-tricolor.html" class="mobile-card-mini" style="--mc-color:#003DA5">' +
            '<span class="mc-cat">PROYECTOS</span>' +
            '<h3 class="mc-title">CORAZÓN</h3>' +
            '<p class="mc-metric">180 historias</p>' +
          '</a>' +

          '<a href="/nodo.html" class="mobile-card-mini" style="--mc-color:#CF142B">' +
            '<span class="mc-cat">COMUNIDAD</span>' +
            '<h3 class="mc-title">NODO</h3>' +
            '<p class="mc-metric">89 espacios</p>' +
          '</a>' +

        '</div>' + /* .mobile-card-carousel */

        /* Card grande — Servicios */
        '<a href="/servicios.html" class="mobile-card-primary mobile-card-rojo">' +
          '<span class="mc-cat">ECONOMÍA DISTRIBUIDA</span>' +
          '<h2 class="mc-title">SERVICIOS</h2>' +
          '<p class="mc-metric"><strong>2,180</strong> freelancers verificados</p>' +
          '<span class="mc-arrow">→</span>' +
        '</a>' +

      '</div>'; /* .mobile-ecosystem */

    document.body.appendChild(wrapper);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
