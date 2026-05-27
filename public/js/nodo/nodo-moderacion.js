/* NEVADO — NODO Moderación v1.0
   Sistema de sanciones y moderación.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  var SANCION_LABELS = {
    advertencia:  'Advertencia',
    mute_1h:      'Silencio 1h',
    mute_24h:     'Silencio 24h',
    mute_7d:      'Silencio 7 días',
    ban_temp:     'Suspensión temporal',
    ban_perm:     'Suspensión permanente',
    shadow_ban:   'Shadow ban',
  };

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.state.ready) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  /* ── Check sanctions for any user ───────────────────────────────────── */
  async function checkSanciones(clerk_id) {
    try {
      var now = new Date().toISOString();
      var rows = await window.NODO.sb.select('moderacion_sanciones',
        'usuario_clerk_id=eq.' + encodeURIComponent(clerk_id) +
        '&activa=eq.true' +
        '&or=(expira_en.is.null,expira_en.gt.' + now + ')' +
        '&order=creado_en.desc'
      );
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Apply sanction (founder/mod only) ───────────────────────────────── */
  async function aplicarSancion(target_clerk_id, tipo, motivo, duracion_h) {
    var user = window.NODO.state.user;
    if (!user || (!window.NODO.state.isFounder && !window.NODO.state.isMod)) {
      window.NODO.showToast('Sin permisos para sancionar.', 'error');
      return null;
    }

    var expira_en = null;
    if (duracion_h) {
      var d = new Date();
      d.setHours(d.getHours() + duracion_h);
      expira_en = d.toISOString();
    }

    try {
      var row = await window.NODO.sb.insert('moderacion_sanciones', {
        usuario_clerk_id:   target_clerk_id,
        tipo:               tipo,
        motivo:             motivo,
        moderador_clerk_id: user.clerk_id,
        activa:             true,
        expira_en:          expira_en,
      });
      /* Log */
      await window.NODO.sb.insert('moderacion_log', {
        accion:             'aplicar_sancion',
        objeto_tipo:        'usuario',
        moderador_clerk_id: user.clerk_id,
        detalles:           { tipo, motivo, target: target_clerk_id },
      });
      window.NODO.showToast('Sanción aplicada: ' + (SANCION_LABELS[tipo] || tipo));
      return Array.isArray(row) ? row[0] : row;
    } catch (e) {
      window.NODO.showToast('Error al aplicar sanción.', 'error');
      return null;
    }
  }

  /* ── Revert sanction ─────────────────────────────────────────────────── */
  async function revertirSancion(sancion_id) {
    var user = window.NODO.state.user;
    if (!user || (!window.NODO.state.isFounder && !window.NODO.state.isMod)) {
      window.NODO.showToast('Sin permisos.', 'error');
      return false;
    }
    try {
      await window.NODO.sb.update('moderacion_sanciones', 'id=eq.' + sancion_id, { activa: false });
      await window.NODO.sb.insert('moderacion_log', {
        accion:             'revertir_sancion',
        objeto_tipo:        'sancion',
        objeto_id:          sancion_id,
        moderador_clerk_id: user.clerk_id,
        detalles:           {},
      });
      window.NODO.showToast('Sanción revertida.');
      return true;
    } catch (_) {
      window.NODO.showToast('Error al revertir sanción.', 'error');
      return false;
    }
  }

  /* ── Delete hilo (mod) ───────────────────────────────────────────────── */
  async function eliminarHilo(hilo_id, motivo) {
    var user = window.NODO.state.user;
    if (!user || (!window.NODO.state.isFounder && !window.NODO.state.isMod)) {
      window.NODO.showToast('Sin permisos.', 'error');
      return false;
    }
    try {
      await window.NODO.sb.update('foro_hilos', 'id=eq.' + hilo_id, { eliminado: true });
      await window.NODO.sb.insert('moderacion_log', {
        accion:             'eliminar_hilo',
        objeto_tipo:        'hilo',
        objeto_id:          hilo_id,
        moderador_clerk_id: user.clerk_id,
        detalles:           { motivo: motivo || '' },
      });
      window.NODO.showToast('Hilo eliminado.');
      return true;
    } catch (_) {
      window.NODO.showToast('Error al eliminar hilo.', 'error');
      return false;
    }
  }

  /* ── Delete message ──────────────────────────────────────────────────── */
  async function eliminarMensaje(msg_id) {
    var user = window.NODO.state.user;
    if (!user || (!window.NODO.state.isFounder && !window.NODO.state.isMod)) {
      window.NODO.showToast('Sin permisos.', 'error');
      return false;
    }
    try {
      await window.NODO.sb.update('chat_mensajes', 'id=eq.' + msg_id, { eliminado: true });
      await window.NODO.sb.insert('moderacion_log', {
        accion:             'eliminar_mensaje',
        objeto_tipo:        'mensaje',
        objeto_id:          msg_id,
        moderador_clerk_id: user.clerk_id,
        detalles:           {},
      });
      return true;
    } catch (_) { return false; }
  }

  /* ── Resolve report ──────────────────────────────────────────────────── */
  async function resolverReporte(reporte_id, estado) {
    var user = window.NODO.state.user;
    if (!user || (!window.NODO.state.isFounder && !window.NODO.state.isMod)) return false;
    try {
      await window.NODO.sb.update('foro_reportes', 'id=eq.' + reporte_id, { estado: estado });
      return true;
    } catch (_) { return false; }
  }

  /* ── Add mod controls to feed posts (founder/mod view) ──────────────── */
  function injectModControls() {
    if (!window.NODO.state.isFounder && !window.NODO.state.isMod) return;
    var posts = document.querySelectorAll('.nodo-post[data-hilo-id]');
    posts.forEach(function (post) {
      if (post.querySelector('.nodo-mod-btn')) return;
      var footer = post.querySelector('.nodo-post-footer');
      if (!footer) return;
      var btn = document.createElement('button');
      btn.className = 'nodo-post-action nodo-mod-btn';
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M2 7h7M2 10h5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg><span>Mod</span>';
      footer.appendChild(btn);
      btn.addEventListener('click', function () {
        var hiloId = post.getAttribute('data-hilo-id');
        var action = prompt('Acción de moderación:\n1. Eliminar hilo\n2. Sanción advertencia\n3. Cancelar');
        if (action === '1') {
          var motivo = prompt('Motivo de eliminación:') || 'Incumple normas';
          eliminarHilo(hiloId, motivo).then(function (ok) {
            if (ok) post.remove();
          });
        } else if (action === '2') {
          var clerk_id = post.querySelector('[data-clerk]');
          if (clerk_id) {
            var m = prompt('Motivo de advertencia:') || 'Incumple normas de la comunidad';
            aplicarSancion(clerk_id.dataset.clerk, 'advertencia', m);
          }
        }
      });
    });
  }

  waitForNodo(function () {
    /* Inject mod controls when feed loads */
    document.addEventListener('nodo:feed-loaded', function () {
      setTimeout(injectModControls, 200);
    });
    injectModControls();
  });

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.NODO = window.NODO || {};
  window.NODO.mod = {
    SANCION_LABELS:  SANCION_LABELS,
    checkSanciones:  checkSanciones,
    aplicarSancion:  aplicarSancion,
    revertirSancion: revertirSancion,
    eliminarHilo:    eliminarHilo,
    eliminarMensaje: eliminarMensaje,
    resolverReporte: resolverReporte,
  };
})();
