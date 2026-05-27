/* NEVADO — NODO Transversal v1.0
   Botón "Conversar en NODO" que aparece en otros módulos del ecosistema.
   Se auto-inyecta en páginas que no sean nodo.html. */
(function () {
  'use strict';

  var NODO_URL = '/nodo-chat.html';

  /* ── Don't inject on nodo pages ──────────────────────────────────────── */
  if (window.location.pathname.indexOf('/nodo') === 0) return;

  /* ── Inject floating NODO button ─────────────────────────────────────── */
  function inject() {
    if (document.getElementById('nvd-nodo-fab')) return;

    var fab = document.createElement('a');
    fab.id   = 'nvd-nodo-fab';
    fab.href = NODO_URL;
    fab.setAttribute('aria-label', 'Conversar en NODO');
    fab.innerHTML = [
      '<svg width="18" height="18" viewBox="0 0 14 14" fill="none">',
        '<path d="M11 2H3a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V3a1 1 0 00-1-1z"',
          ' stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
      '</svg>',
      '<span>NODO</span>',
    ].join('');

    var style = document.createElement('style');
    style.textContent = [
      '#nvd-nodo-fab {',
      '  position: fixed;',
      '  bottom: 52px;',
      '  right: 20px;',
      '  z-index: 8000;',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 6px;',
      '  padding: 8px 14px;',
      '  background: rgba(5,5,10,0.92);',
      '  border: 1px solid rgba(231,76,60,0.35);',
      '  border-radius: 999px;',
      '  color: rgba(231,76,60,0.9);',
      '  font-family: Geist, system-ui, sans-serif;',
      '  font-size: 11px;',
      '  font-weight: 600;',
      '  letter-spacing: 0.06em;',
      '  text-decoration: none;',
      '  backdrop-filter: blur(12px);',
      '  box-shadow: 0 4px 24px rgba(0,0,0,0.5);',
      '  transition: background 0.2s, border-color 0.2s;',
      '  cursor: pointer;',
      '}',
      '#nvd-nodo-fab:hover {',
      '  background: rgba(231,76,60,0.12);',
      '  border-color: rgba(231,76,60,0.6);',
      '}',
      '@keyframes nvd-fab-in {',
      '  from { opacity:0; transform:translateY(8px); }',
      '  to   { opacity:1; transform:translateY(0); }',
      '}',
      '#nvd-nodo-fab { animation: nvd-fab-in 0.3s ease; }',
    ].join('\n');

    document.head.appendChild(style);
    document.body.appendChild(fab);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

  window.NODO = window.NODO || {};
  window.NODO.transversal = { inject: inject };
})();
