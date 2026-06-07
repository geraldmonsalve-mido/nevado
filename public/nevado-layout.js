/* NEVADO — Centralized layout: nav + footer for all subpages.
   Injected before nevado-session-widget.js on every subpage.
   Creates #topbar with #nvd-session-pill (shimmer), then session-widget.js
   hydrates the pill. Never touches Clerk or auth logic. */

(function () {
  'use strict';
  document.documentElement.style.visibility = 'hidden';

  var PATH = window.location.pathname;

  // ── Section accent colors ──────────────────────────────────────────────────
  var SECTIONS = [
    { re: /^\/(talento|capital-humano)/i, color: '#F4D03F' },
    { re: /^\/avila/i,                    color: '#F4D03F' },
    { re: /^\/(enterate|titulares)/i,     color: '#2980B9' },
    { re: /^\/corazon/i,                  color: '#2980B9' },
    { re: /^\/nodo/i,                     color: '#E74C3C' },
    { re: /^\/servicios/i,                color: '#E74C3C' },
    { re: /^\/transparencia/i,            color: '#B8944A' },
  ];

  var accent = '#B8944A';
  for (var s = 0; s < SECTIONS.length; s++) {
    if (SECTIONS[s].re.test(PATH)) { accent = SECTIONS[s].color; break; }
  }

  // ── Nav link definitions ───────────────────────────────────────────────────
  var LINKS = [
    { href: '/talento.html',          label: 'Capital Humano', re: /^\/(talento|capital-humano)/i },
    { href: '/avila.html',            label: 'ÁVILA',          re: /^\/avila/i },
    { href: '/nodo.html',             label: 'NODO',           re: /^\/nodo/i },
    { href: '/enterate.html',         label: 'Titulares',      re: /^\/(enterate|titulares)/i },
    { href: '/corazon-tricolor.html', label: 'Corazón',        re: /^\/corazon/i },
    { href: '/servicios.html',        label: 'Servicios',      re: /^\/servicios/i },
  ];

  // ── Inject CSS (once, using ID guard) ─────────────────────────────────────
  if (!document.getElementById('nvd-layout-css')) {
    var st = document.createElement('style');
    st.id = 'nvd-layout-css';
    st.textContent =
      ':root { --topbar-h: 60px; --page-accent: ' + accent + '; }\n' +
      '#topbar {\n' +
      '  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;\n' +
      '  height: var(--topbar-h);\n' +
      '  display: flex; align-items: center; justify-content: space-between;\n' +
      '  padding: 0 28px;\n' +
      '  background: rgba(5,5,10,0.85);\n' +
      '  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);\n' +
      '  border-bottom: 1px solid rgba(255,255,255,0.05);\n' +
      '  transition: box-shadow 0.3s ease, border-color 0.3s ease;\n' +
      '  font-family: "Geist", system-ui, sans-serif;\n' +
      '  box-sizing: border-box;\n' +
      '}\n' +
      '#topbar.nvd-scrolled {\n' +
      '  box-shadow: 0 4px 32px rgba(0,0,0,0.45);\n' +
      '  border-bottom-color: rgba(255,255,255,0.09);\n' +
      '}\n' +
      '.topbar-logo {\n' +
      '  font-family: "Cormorant Garamond", Georgia, serif;\n' +
      '  font-size: 14px; font-weight: 400; letter-spacing: 0.18em;\n' +
      '  color: rgba(232,228,220,0.9); text-decoration: none; flex-shrink: 0;\n' +
      '  transition: opacity 0.2s;\n' +
      '}\n' +
      '.topbar-logo:hover { opacity: 0.7; }\n' +
      '.topbar-logo span { color: var(--page-accent, #B8944A); }\n' +
      '.topbar-nav {\n' +
      '  display: flex; align-items: center; gap: 2px;\n' +
      '  position: absolute; left: 50%; transform: translateX(-50%);\n' +
      '}\n' +
      '.nav-item {\n' +
      '  font-size: 12px; font-weight: 400; letter-spacing: 0.07em;\n' +
      '  color: rgba(232,228,220,0.42); padding: 6px 12px; border-radius: 4px;\n' +
      '  text-decoration: none; transition: color 0.2s, background 0.2s;\n' +
      '  white-space: nowrap;\n' +
      '}\n' +
      '.nav-item:hover {\n' +
      '  color: rgba(232,228,220,0.85);\n' +
      '  background: rgba(255,255,255,0.05);\n' +
      '}\n' +
      '.nav-item.active {\n' +
      '  color: var(--page-accent, #B8944A);\n' +
      '  background: rgba(255,255,255,0.05);\n' +
      '}\n' +
      '.topbar-actions {\n' +
      '  display: flex; align-items: center; gap: 10px; flex-shrink: 0;\n' +
      '}\n' +
      '.topbar-divider {\n' +
      '  width: 1px; height: 20px;\n' +
      '  background: rgba(255,255,255,0.10); flex-shrink: 0;\n' +
      '}\n' +
      '.btn-plus {\n' +
      '  font-size: 11px; font-weight: 500; letter-spacing: 0.1em;\n' +
      '  color: #B8944A; padding: 6px 14px;\n' +
      '  border: 1px solid rgba(184,148,74,0.45); border-radius: 4px;\n' +
      '  background: transparent; cursor: pointer;\n' +
      '  transition: background 0.2s, color 0.2s;\n' +
      '  font-family: inherit;\n' +
      '}\n' +
      '.btn-plus:hover { background: rgba(184,148,74,0.1); color: #d4aa6a; }\n' +
      '#nvd-session-pill {\n' +
      '  display: flex; align-items: center; min-width: 120px;\n' +
      '  transition: opacity 150ms ease;\n' +
      '}\n' +
      /* Shimmer — also defined by nevado-session-widget.js (ID-guarded), harmless duplication */
      '.nvd-pill-shimmer {\n' +
      '  display: inline-flex; align-items: center; padding: 6px 16px;\n' +
      '  border-radius: 999px; border: 1px solid rgba(255,255,255,0.08);\n' +
      '  background: linear-gradient(90deg, #1a1a1a 25%, #2a2a2a 50%, #1a1a1a 75%);\n' +
      '  background-size: 200% 100%; animation: nvd-shimmer 1.2s linear infinite;\n' +
      '  min-width: 110px; height: 32px; user-select: none;\n' +
      '}\n' +
      '@keyframes nvd-shimmer {\n' +
      '  0% { background-position: 200% 0; }\n' +
      '  100% { background-position: -200% 0; }\n' +
      '}\n' +
      'body { padding-top: var(--topbar-h) !important; }\n' +
      /* ── Footer ── */
      '#nvd-footer {\n' +
      '  background: #05050A;\n' +
      '  border-top: 1px solid rgba(255,255,255,0.06);\n' +
      '  padding: 52px 10vw 0;\n' +
      '  font-family: "Geist", system-ui, sans-serif;\n' +
      '  color: rgba(255,255,255,0.5);\n' +
      '  margin-top: 48px;\n' +
      '}\n' +
      '.nvd-footer-grid {\n' +
      '  display: grid; grid-template-columns: 1fr 1fr 1fr;\n' +
      '  gap: 48px; padding-bottom: 48px;\n' +
      '}\n' +
      '.nvd-footer-logo {\n' +
      '  display: block; margin-bottom: 14px;\n' +
      '  font-family: "Cormorant Garamond", Georgia, serif;\n' +
      '  font-size: 16px; font-weight: 400; letter-spacing: 0.2em;\n' +
      '  color: rgba(232,228,220,0.7); text-decoration: none;\n' +
      '}\n' +
      '.nvd-footer-logo span { color: #B8944A; }\n' +
      '.nvd-footer-tagline {\n' +
      '  font-size: 12px; line-height: 1.7;\n' +
      '  color: rgba(255,255,255,0.3); max-width: 240px;\n' +
      '}\n' +
      '.nvd-footer-col-title {\n' +
      '  font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase;\n' +
      '  color: rgba(255,255,255,0.28); margin-bottom: 18px;\n' +
      '}\n' +
      '.nvd-footer-links { display: flex; flex-direction: column; gap: 10px; }\n' +
      '.nvd-footer-links a {\n' +
      '  font-size: 13px; color: rgba(255,255,255,0.42);\n' +
      '  text-decoration: none; transition: color 0.2s;\n' +
      '}\n' +
      '.nvd-footer-links a:hover { color: rgba(255,255,255,0.8); }\n' +
      '.nvd-footer-tricolor {\n' +
      '  height: 3px;\n' +
      '  background: linear-gradient(90deg, #F4D03F 33.33%, #2980B9 33.33% 66.66%, #E74C3C 66.66%);\n' +
      '}\n' +
      '@media (max-width: 900px) { .topbar-nav { display: none; } }\n' +
      '@media (max-width: 768px) {\n' +
      '  .nvd-footer-grid { grid-template-columns: 1fr; gap: 28px; }\n' +
      '  #nvd-footer { padding: 36px 20px 0; }\n' +
      '}\n' +
      '#nvd-lang-toggle button, #nvd-lang-toggle span, .nvd-lang-btn {\n' +
      '  background: transparent !important;\n' +
      '  border: none !important;\n' +
      '  border-radius: 0 !important;\n' +
      '  box-shadow: none !important;\n' +
      '  appearance: none;\n' +
      '  -webkit-appearance: none;\n' +
      '  padding: 2px 4px;\n' +
      '  cursor: pointer;\n' +
      '  font-size: 12px;\n' +
      '  font-weight: 400;\n' +
      '  letter-spacing: 0.08em;\n' +
      '}\n' +
      '#nvd-lang-toggle .lang-active {\n' +
      '  color: #ffffff;\n' +
      '  font-weight: 600;\n' +
      '}\n' +
      '#nvd-lang-toggle .lang-inactive {\n' +
      '  color: rgba(255,255,255,0.45);\n' +
      '}\n' +
      '#nvd-lang-toggle .lang-sep {\n' +
      '  color: rgba(255,255,255,0.25);\n' +
      '  margin: 0 2px;\n' +
      '  pointer-events: none;\n' +
      '}\n';
    document.head.appendChild(st);
  }

  // ── Build nav HTML ─────────────────────────────────────────────────────────
  var linksHtml = LINKS.map(function (l) {
    return '<a class="nav-item' + (l.re.test(PATH) ? ' active' : '') + '" href="' + l.href + '">' + l.label + '</a>';
  }).join('');

  var navHTML =
    '<a class="topbar-logo" href="/">N<span>·</span>EVADO</a>' +
    '<nav class="topbar-nav">' + linksHtml + '</nav>' +
    '<div class="topbar-actions">' +
      '<div class="topbar-divider"></div>' +
      '<button class="btn-plus" data-nevado-plus>Nevado Plus</button>' +
      '<div id="nvd-session-pill"><span class="nvd-pill-shimmer"></span></div>' +
    '</div>';

  // ── Inject / replace #topbar ───────────────────────────────────────────────
  function buildNav() {
    var tb = document.getElementById('topbar');
    if (tb) {
      tb.innerHTML = navHTML;
    } else {
      tb = document.createElement('header');
      tb.id = 'topbar';
      var first = document.body.firstChild;
      if (first) {
        document.body.insertBefore(tb, first);
      } else {
        document.body.appendChild(tb);
      }
      tb.innerHTML = navHTML;
    }
    window.addEventListener('scroll', function () {
      tb.classList.toggle('nvd-scrolled', window.pageYOffset > 20);
    }, { passive: true });
  }

  // ── Inject footer ──────────────────────────────────────────────────────────
  function buildFooter() {
    if (document.getElementById('nvd-footer')) return;
    var ft = document.createElement('footer');
    ft.id = 'nvd-footer';
    ft.innerHTML =
      '<div class="nvd-footer-grid">' +
        '<div>' +
          '<a class="nvd-footer-logo" href="/">N<span>·</span>EVADO</a>' +
          '<p class="nvd-footer-tagline">Infraestructura digital para reconstruir el capital humano venezolano.</p>' +
        '</div>' +
        '<div>' +
          '<div class="nvd-footer-col-title">Ecosistema</div>' +
          '<div class="nvd-footer-links">' +
            '<a href="/talento.html">Capital Humano</a>' +
            '<a href="/avila.html">ÁVILA</a>' +
            '<a href="/nodo.html">NODO</a>' +
            '<a href="/enterate.html">Titulares</a>' +
            '<a href="/corazon-tricolor.html">Corazón Tricolor</a>' +
            '<a href="/servicios.html">Servicios</a>' +
          '</div>' +
        '</div>' +
        '<div>' +
          '<div class="nvd-footer-col-title">Fundación Puente Sur</div>' +
          '<div class="nvd-footer-links">' +
            '<a href="/transparencia.html">Transparencia</a>' +
            '<a href="/colabora.html">Contacto</a>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="nvd-footer-tricolor"></div>';
    document.body.appendChild(ft);
  }

  // ── Execute synchronously (script is at end of body — DOM available) ───────
  if (document.body) {
    buildNav();
    buildFooter();
    document.documentElement.style.visibility = '';
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      buildNav();
      buildFooter();
      document.documentElement.style.visibility = '';
    });
  }
})();
