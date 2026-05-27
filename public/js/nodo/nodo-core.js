/* NEVADO — NODO Core v1.0
   Inicializa window.NODO: estado, auth, Supabase REST helpers, utilidades. */
(function () {
  'use strict';

  var SB_URL     = window.NEVADO_SUPABASE_URL  || '';
  var SB_KEY     = window.NEVADO_SUPABASE_ANON_KEY || '';
  var FOUNDER_EMAIL = 'nevado.pro7@gmail.com';
  var MODERADORES   = [FOUNDER_EMAIL];

  /* ── Supabase REST helpers ──────────────────────────────────────────────── */
  function sbFetch(path, method, body, extra) {
    var opts = {
      method: method || 'GET',
      headers: Object.assign({
        'apikey':          SB_KEY,
        'Authorization':   'Bearer ' + SB_KEY,
        'Content-Type':    'application/json',
        'Accept':          'application/json',
      }, extra || {}),
    };
    if (body !== undefined && body !== null) opts.body = JSON.stringify(body);
    return fetch(SB_URL + '/rest/v1/' + path, opts).then(function (r) {
      if (!r.ok) return r.json().then(function (e) { throw e; });
      var ct = r.headers.get('content-type') || '';
      return ct.includes('json') ? r.json() : null;
    });
  }

  var sb = {
    select: function (table, query) {
      return sbFetch(table + (query ? '?' + query : ''));
    },
    insert: function (table, data) {
      return sbFetch(table, 'POST', data, { 'Prefer': 'return=representation' });
    },
    update: function (table, query, data) {
      return sbFetch(table + '?' + query, 'PATCH', data, { 'Prefer': 'return=representation' });
    },
    delete: function (table, query) {
      return sbFetch(table + '?' + query, 'DELETE');
    },
    rpc: function (fn, params) {
      return sbFetch('rpc/' + fn, 'POST', params || {});
    },
  };

  /* ── State ─────────────────────────────────────────────────────────────── */
  var state = {
    ready:      false,
    user:       null,   /* { clerk_id, nombre, email, croquetas, rango, nivel } */
    clerkUser:  null,   /* window.Clerk.user */
    sanctions:  [],     /* active moderacion_sanciones rows */
    isFounder:  false,
    isMod:      false,
  };

  /* ── Wait for auth ─────────────────────────────────────────────────────── */
  function waitForAuth() {
    return new Promise(function (resolve) {
      if (window.NEVADO_AUTH && window.NEVADO_AUTH.getUser()) { resolve(); return; }
      var t = setInterval(function () {
        if (window.NEVADO_AUTH) {
          /* auth.js sets NEVADO_AUTH, but user may still be loading */
          if (window.NEVADO_AUTH.getClerkUser && window.NEVADO_AUTH.getClerkUser()) {
            clearInterval(t); resolve(); return;
          }
          /* No session — still resolve so NODO shows for guests */
          clearInterval(t); resolve();
        }
      }, 150);
      /* Timeout after 5s regardless */
      setTimeout(function () { clearInterval(t); resolve(); }, 5000);
    });
  }

  /* ── Load user profile ─────────────────────────────────────────────────── */
  async function loadUserProfile() {
    if (!window.NEVADO_AUTH) return;
    var ck = window.NEVADO_AUTH.getClerkUser && window.NEVADO_AUTH.getClerkUser();
    if (!ck) return;
    state.clerkUser = ck;
    try {
      var res = await fetch('/api/usuario?clerk_id=' + encodeURIComponent(ck.id));
      if (res.ok) state.user = await res.json();
    } catch (_) {}
    if (state.user) {
      state.isFounder  = state.user.email === FOUNDER_EMAIL;
      state.isMod      = MODERADORES.includes(state.user.email);
      await loadSanctions(ck.id);
    }
  }

  async function loadSanctions(clerk_id) {
    try {
      var now = new Date().toISOString();
      var rows = await sb.select('moderacion_sanciones',
        'usuario_clerk_id=eq.' + encodeURIComponent(clerk_id) +
        '&activa=eq.true' +
        '&or=(expira_en.is.null,expira_en.gt.' + now + ')' +
        '&order=creado_en.desc'
      );
      state.sanctions = Array.isArray(rows) ? rows : [];
    } catch (_) {
      state.sanctions = [];
    }
  }

  /* ── Permission helpers ─────────────────────────────────────────────────── */
  function canPost() {
    if (!state.user) return { ok: false, reason: 'Sin sesión. Inicia sesión para participar.' };
    var banned = state.sanctions.find(function (s) {
      return s.tipo === 'ban_perm' || s.tipo === 'ban_temp' || s.tipo === 'shadow_ban';
    });
    if (banned) return { ok: false, reason: 'Tu cuenta tiene restricciones de publicación.' };
    var muted = state.sanctions.find(function (s) {
      return s.tipo === 'mute_1h' || s.tipo === 'mute_24h' || s.tipo === 'mute_7d';
    });
    if (muted) return { ok: false, reason: 'Tienes silencio activo hasta que expire.' };
    return { ok: true };
  }

  function isShadowBanned() {
    return state.sanctions.some(function (s) { return s.tipo === 'shadow_ban'; });
  }

  /* ── Reputation ────────────────────────────────────────────────────────── */
  async function addReputacion(tipo) {
    if (!state.user) return;
    var pts = { publicar_hilo: 10, recibir_like: 2, responder: 5, shout: 3 };
    var p = pts[tipo] || 0;
    if (!p) return;
    try {
      await sb.insert('nodo_reputacion_eventos', {
        clerk_id: state.user.clerk_id,
        tipo: tipo,
        puntos: p,
      });
    } catch (_) {}
  }

  /* ── Utilities ─────────────────────────────────────────────────────────── */
  function formatTime(iso) {
    var d = new Date(iso);
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)   return 'hace ' + diff + 's';
    if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'min';
    if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return 'hace ' + Math.floor(diff / 86400) + 'd';
    return d.toLocaleDateString('es');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c];
    });
  }

  function initials(nombre) {
    return String(nombre || '?').split(' ').slice(0, 2).map(function (w) {
      return w[0] || '';
    }).join('').toUpperCase();
  }

  function tipoLabel(tipo) {
    var map = {
      insight: 'Insight', pregunta: 'Pregunta', recurso: 'Recurso',
      experiencia: 'Experiencia', oportunidad: 'Oportunidad',
    };
    return map[tipo] || tipo;
  }

  function tipoBadgeClass(tipo) {
    var map = {
      insight: 'badge-insight', pregunta: 'badge-pregunta', recurso: 'badge-recurso',
      experiencia: 'badge-experiencia', oportunidad: 'badge-oportunidad',
    };
    return map[tipo] || 'badge-insight';
  }

  function showToast(msg, type) {
    var old = document.getElementById('nodo-toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.id = 'nodo-toast';
    t.textContent = msg;
    var bg = type === 'error' ? 'rgba(231,76,60,0.92)' : 'rgba(10,10,18,0.95)';
    t.style.cssText = [
      'position:fixed', 'bottom:48px', 'left:50%',
      'transform:translateX(-50%)',
      'background:' + bg,
      'border:1px solid rgba(255,255,255,0.1)',
      'color:#fff',
      'padding:8px 20px',
      'border-radius:8px',
      'font-size:13px',
      'font-family:Geist,sans-serif',
      'z-index:9000',
      'pointer-events:none',
      'animation:nodo-toast-in 0.2s ease',
    ].join(';');
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2800);
  }

  /* ── Init ──────────────────────────────────────────────────────────────── */
  async function init() {
    await waitForAuth();
    await loadUserProfile();
    state.ready = true;
    document.dispatchEvent(new CustomEvent('nodo:ready', { detail: state }));
  }

  /* ── Public API ─────────────────────────────────────────────────────────── */
  window.NODO = {
    sb:           sb,
    state:        state,
    init:         init,
    canPost:      canPost,
    isShadowBanned: isShadowBanned,
    addReputacion: addReputacion,
    formatTime:   formatTime,
    escapeHtml:   escapeHtml,
    initials:     initials,
    tipoLabel:    tipoLabel,
    tipoBadgeClass: tipoBadgeClass,
    showToast:    showToast,
  };

  /* Auto-init */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
