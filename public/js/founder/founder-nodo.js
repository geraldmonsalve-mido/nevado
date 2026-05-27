/* NEVADO — Founder NODO Panel v1.0
   Módulo del panel fundador para gestión de NODO.
   Requiere nodo-core.js + Supabase disponibles. */
(function () {
  'use strict';

  var SB_URL = window.NEVADO_SUPABASE_URL || '';
  var SB_KEY = window.NEVADO_SUPABASE_ANON_KEY || '';

  function sbFetch(path, method, body, extra) {
    var opts = {
      method: method || 'GET',
      headers: Object.assign({
        'apikey': SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }, extra || {}),
    };
    if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
    return fetch(SB_URL + '/rest/v1/' + path, opts).then(function (r) {
      return r.json();
    });
  }

  function fmt(n) { return Number(n || 0).toLocaleString('es-VE'); }
  function e(s) { return String(s || '').replace(/[&<>"']/g, function (c) {
    return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
  }); }

  function formatTime(iso) {
    var d = new Date(iso);
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)    return 'hace ' + diff + 's';
    if (diff < 3600)  return 'hace ' + Math.floor(diff / 60) + 'min';
    if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
    return d.toLocaleDateString('es');
  }

  /* ── Load NODO metrics ───────────────────────────────────────────────── */
  async function loadMetrics() {
    var [hilos, respuestas, mensajes, reportes, sanciones] = await Promise.all([
      sbFetch('foro_hilos?select=id&eliminado=eq.false'),
      sbFetch('foro_respuestas?select=id&eliminado=eq.false'),
      sbFetch('chat_mensajes?select=id&eliminado=eq.false'),
      sbFetch('foro_reportes?select=id&estado=eq.pendiente'),
      sbFetch('moderacion_sanciones?select=id&activa=eq.true'),
    ]);
    return {
      total_hilos:      Array.isArray(hilos)     ? hilos.length     : 0,
      total_respuestas: Array.isArray(respuestas) ? respuestas.length : 0,
      total_mensajes:   Array.isArray(mensajes)   ? mensajes.length   : 0,
      reportes_pendientes: Array.isArray(reportes) ? reportes.length  : 0,
      sanciones_activas:   Array.isArray(sanciones) ? sanciones.length : 0,
    };
  }

  /* ── Load pending reports ────────────────────────────────────────────── */
  async function loadReportes() {
    try {
      var rows = await sbFetch('foro_reportes?estado=eq.pendiente&order=creado_en.desc&limit=30');
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Load active sanctions ───────────────────────────────────────────── */
  async function loadSanciones() {
    try {
      var rows = await sbFetch('moderacion_sanciones?activa=eq.true&order=creado_en.desc&limit=30');
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Load recent audit log ───────────────────────────────────────────── */
  async function loadAuditLog() {
    try {
      var rows = await sbFetch('moderacion_log?order=creado_en.desc&limit=40');
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Apply sanction ──────────────────────────────────────────────────── */
  async function aplicarSancion(clerk_id, tipo, motivo, duracion_h, moderador_id) {
    var expira_en = null;
    if (duracion_h) {
      var d = new Date(); d.setHours(d.getHours() + duracion_h);
      expira_en = d.toISOString();
    }
    var row = await sbFetch('moderacion_sanciones', 'POST', {
      usuario_clerk_id:   clerk_id,
      tipo:               tipo,
      motivo:             motivo,
      moderador_clerk_id: moderador_id,
      activa:             true,
      expira_en:          expira_en,
    }, { 'Prefer': 'return=representation' });
    await sbFetch('moderacion_log', 'POST', {
      accion: 'aplicar_sancion',
      objeto_tipo: 'usuario',
      moderador_clerk_id: moderador_id,
      detalles: JSON.stringify({ tipo, motivo, target: clerk_id }),
    }, { 'Prefer': 'return=representation' });
    return Array.isArray(row) ? row[0] : row;
  }

  async function revertirSancion(sancion_id, moderador_id) {
    await sbFetch('moderacion_sanciones?id=eq.' + sancion_id, 'PATCH', { activa: false });
    await sbFetch('moderacion_log', 'POST', {
      accion: 'revertir_sancion',
      objeto_tipo: 'sancion',
      objeto_id: sancion_id,
      moderador_clerk_id: moderador_id,
      detalles: '{}',
    }, { 'Prefer': 'return=representation' });
  }

  async function resolverReporte(id, estado, moderador_id) {
    await sbFetch('foro_reportes?id=eq.' + id, 'PATCH', { estado });
    await sbFetch('moderacion_log', 'POST', {
      accion: 'resolver_reporte',
      objeto_tipo: 'reporte',
      objeto_id: id,
      moderador_clerk_id: moderador_id,
      detalles: JSON.stringify({ estado }),
    }, { 'Prefer': 'return=representation' });
  }

  /* ── Render NODO section in founder panel ────────────────────────────── */
  async function render(container, moderador_clerk_id) {
    container.innerHTML = '<div class="fp-loading">Cargando NODO…</div>';

    var metrics = await loadMetrics();

    container.innerHTML = [
      '<!-- NODO METRICS -->',
      '<div class="fp-nodo-metrics">',
        '<div class="fp-kpi-card"><div class="fp-kpi-val">' + fmt(metrics.total_hilos) + '</div><div class="fp-kpi-label">Hilos publicados</div></div>',
        '<div class="fp-kpi-card"><div class="fp-kpi-val">' + fmt(metrics.total_respuestas) + '</div><div class="fp-kpi-label">Respuestas</div></div>',
        '<div class="fp-kpi-card"><div class="fp-kpi-val">' + fmt(metrics.total_mensajes) + '</div><div class="fp-kpi-label">Mensajes de chat</div></div>',
        '<div class="fp-kpi-card fp-kpi-warn"><div class="fp-kpi-val">' + fmt(metrics.reportes_pendientes) + '</div><div class="fp-kpi-label">Reportes pendientes</div></div>',
        '<div class="fp-kpi-card fp-kpi-warn"><div class="fp-kpi-val">' + fmt(metrics.sanciones_activas) + '</div><div class="fp-kpi-label">Sanciones activas</div></div>',
      '</div>',

      '<!-- TABS -->',
      '<div class="fp-nodo-tabs">',
        '<button class="fp-nodo-tab active" data-ntab="reportes">Reportes (' + metrics.reportes_pendientes + ')</button>',
        '<button class="fp-nodo-tab" data-ntab="sanciones">Sanciones</button>',
        '<button class="fp-nodo-tab" data-ntab="sancionar">+ Sancionar</button>',
        '<button class="fp-nodo-tab" data-ntab="auditoria">Auditoría</button>',
      '</div>',

      '<div id="fp-nodo-tab-content" class="fp-nodo-tab-content">',
        '<div class="fp-loading">Cargando…</div>',
      '</div>',
    ].join('');

    var tabContent = document.getElementById('fp-nodo-tab-content');

    async function showTab(tab) {
      container.querySelectorAll('.fp-nodo-tab').forEach(function (t) {
        t.classList.toggle('active', t.dataset.ntab === tab);
      });

      if (tab === 'reportes') {
        tabContent.innerHTML = '<div class="fp-loading">Cargando reportes…</div>';
        var reportes = await loadReportes();
        if (!reportes.length) {
          tabContent.innerHTML = '<p class="fp-empty">No hay reportes pendientes.</p>';
          return;
        }
        tabContent.innerHTML = '<div class="fp-nodo-list">' +
          reportes.map(function (r) {
            return [
              '<div class="fp-nodo-reporte" data-id="' + r.id + '">',
                '<div class="fp-nodo-reporte-meta">',
                  '<span class="fp-nodo-badge">Reporte</span>',
                  '<span class="fp-nodo-time">' + formatTime(r.creado_en) + '</span>',
                '</div>',
                '<div class="fp-nodo-reporte-motivo"><strong>' + e(r.motivo) + '</strong></div>',
                (r.descripcion ? '<div class="fp-nodo-reporte-desc">' + e(r.descripcion) + '</div>' : ''),
                '<div class="fp-nodo-reporte-id">ID hilo: ' + (r.hilo_id || 'N/A') + '</div>',
                '<div class="fp-nodo-reporte-actions">',
                  '<button class="fp-btn fp-btn-sm" data-resolve="resuelto" data-rid="' + r.id + '">✓ Resolver</button>',
                  '<button class="fp-btn fp-btn-sm fp-btn-danger" data-resolve="descartado" data-rid="' + r.id + '">✗ Descartar</button>',
                  (r.hilo_id ? '<a class="fp-btn fp-btn-sm" href="/nodo-hilo.html?id=' + r.hilo_id + '" target="_blank">Ver hilo</a>' : ''),
                '</div>',
              '</div>',
            ].join('');
          }).join('') +
        '</div>';

        tabContent.querySelectorAll('[data-resolve]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            var estado = btn.dataset.resolve;
            var rid    = btn.dataset.rid;
            btn.disabled = true;
            btn.textContent = 'Procesando…';
            await resolverReporte(rid, estado, moderador_clerk_id);
            btn.closest('.fp-nodo-reporte').style.opacity = '0.4';
          });
        });

      } else if (tab === 'sanciones') {
        tabContent.innerHTML = '<div class="fp-loading">Cargando sanciones…</div>';
        var sanciones = await loadSanciones();
        if (!sanciones.length) {
          tabContent.innerHTML = '<p class="fp-empty">No hay sanciones activas.</p>';
          return;
        }
        var LABELS = {
          advertencia:'Advertencia', mute_1h:'Silencio 1h', mute_24h:'Silencio 24h',
          mute_7d:'Silencio 7d', ban_temp:'Ban temporal', ban_perm:'Ban permanente',
          shadow_ban:'Shadow ban',
        };
        tabContent.innerHTML = '<div class="fp-nodo-list">' +
          sanciones.map(function (s) {
            return [
              '<div class="fp-nodo-sancion" data-id="' + s.id + '">',
                '<div class="fp-nodo-sancion-row">',
                  '<span class="fp-nodo-badge fp-badge-sancion">' + (LABELS[s.tipo] || s.tipo) + '</span>',
                  '<span class="fp-nodo-time">' + formatTime(s.creado_en) + '</span>',
                  (s.expira_en ? '<span class="fp-nodo-expiry">Expira: ' + new Date(s.expira_en).toLocaleString('es') + '</span>' : '<span class="fp-nodo-expiry">Permanente</span>'),
                '</div>',
                '<div class="fp-nodo-sancion-user">Usuario: <code>' + e(s.usuario_clerk_id.slice(0,16)) + '…</code></div>',
                '<div class="fp-nodo-sancion-motivo">' + e(s.motivo) + '</div>',
                '<button class="fp-btn fp-btn-sm" data-revert="' + s.id + '">Revertir</button>',
              '</div>',
            ].join('');
          }).join('') +
        '</div>';

        tabContent.querySelectorAll('[data-revert]').forEach(function (btn) {
          btn.addEventListener('click', async function () {
            btn.disabled = true;
            btn.textContent = 'Revirtiendo…';
            await revertirSancion(btn.dataset.revert, moderador_clerk_id);
            btn.closest('.fp-nodo-sancion').style.opacity = '0.4';
            btn.textContent = 'Revertido';
          });
        });

      } else if (tab === 'sancionar') {
        tabContent.innerHTML = [
          '<div class="fp-nodo-sancion-form">',
            '<label class="fp-form-label">Clerk ID del usuario</label>',
            '<input id="fp-sancion-uid" class="fp-input" type="text" placeholder="user_...">',
            '<label class="fp-form-label">Tipo de sanción</label>',
            '<select id="fp-sancion-tipo" class="fp-motivo-select">',
              '<option value="advertencia">Advertencia</option>',
              '<option value="mute_1h">Silencio 1h</option>',
              '<option value="mute_24h">Silencio 24h</option>',
              '<option value="mute_7d">Silencio 7 días</option>',
              '<option value="ban_temp">Suspensión temporal (7d)</option>',
              '<option value="ban_perm">Suspensión permanente</option>',
              '<option value="shadow_ban">Shadow ban</option>',
            '</select>',
            '<label class="fp-form-label">Motivo</label>',
            '<input id="fp-sancion-motivo" class="fp-input" type="text" placeholder="Descripción del motivo">',
            '<button class="fp-btn" id="fp-sancion-apply">Aplicar sanción</button>',
            '<div id="fp-sancion-result" class="fp-nodo-result"></div>',
          '</div>',
        ].join('');

        document.getElementById('fp-sancion-apply').addEventListener('click', async function () {
          var uid    = (document.getElementById('fp-sancion-uid').value || '').trim();
          var tipo   = document.getElementById('fp-sancion-tipo').value;
          var motivo = (document.getElementById('fp-sancion-motivo').value || '').trim();
          var result = document.getElementById('fp-sancion-result');
          if (!uid || !motivo) { result.textContent = 'Completa todos los campos.'; return; }

          var duraciones = { mute_1h:1, mute_24h:24, mute_7d:168, ban_temp:168 };
          result.textContent = 'Aplicando…';
          var row = await aplicarSancion(uid, tipo, motivo, duraciones[tipo] || null, moderador_clerk_id);
          result.textContent = row ? '✓ Sanción aplicada.' : '✗ Error.';
        });

      } else if (tab === 'auditoria') {
        tabContent.innerHTML = '<div class="fp-loading">Cargando auditoría…</div>';
        var logs = await loadAuditLog();
        if (!logs.length) {
          tabContent.innerHTML = '<p class="fp-empty">No hay registros de auditoría.</p>';
          return;
        }
        tabContent.innerHTML = '<div class="fp-nodo-list fp-nodo-audit">' +
          logs.map(function (l) {
            return '<div class="fp-nodo-audit-row">' +
              '<span class="fp-nodo-badge">' + e(l.accion) + '</span> ' +
              '<code>' + e(l.moderador_clerk_id.slice(0,12)) + '…</code> ' +
              '<span class="fp-nodo-time">' + formatTime(l.creado_en) + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }
    }

    container.querySelectorAll('.fp-nodo-tab').forEach(function (tab) {
      tab.addEventListener('click', function () { showTab(tab.dataset.ntab); });
    });

    showTab('reportes');
  }

  window.FOUNDER_NODO = { render: render };
})();
