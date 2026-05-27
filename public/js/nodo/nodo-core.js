/* NEVADO — NODO Core v2.0
   window.NODO: sb helpers, auth via Clerk+profiles, utilidades. */
(function () {
  'use strict';

  var SB_URL = window.NEVADO_SUPABASE_URL  || 'https://icxrduatkbazvwysvxrg.supabase.co';
  var SB_KEY = window.NEVADO_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeHJkdWF0a2JhenZ3eXN2eHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDQ3NTEsImV4cCI6MjA5NTMyMDc1MX0.dKNGHz9jEmtVn7hmruzNp2KipMq9BDFb0ABRmlGgqNE';

  /* ── Supabase client singleton — asignado en window.NODO.sb inmediatamente ── */
  window.NODO = window.NODO || {};
  var sb = window.supabase ? window.supabase.createClient(SB_URL, SB_KEY) : null;
  window.NODO.sb = sb;
  if (typeof (sb && sb.from) !== 'function') {
    console.error('[NODO] Supabase no inicializado correctamente — window.supabase:', typeof window.supabase);
  }

  /* ── Session UI ─────────────────────────────────────────────────────────── */
  function updateSessionUI(user) {
    document.querySelectorAll('[data-show="logged-in"]').forEach(function (el) {
      el.style.display = user ? '' : 'none';
    });
    document.querySelectorAll('[data-show="logged-out"]').forEach(function (el) {
      el.style.display = user ? 'none' : '';
    });
    var nameEl   = document.getElementById('nodo-user-name');
    var avatarEl = document.getElementById('nodo-user-avatar');
    if (nameEl   && user) nameEl.textContent = user.display_name;
    if (avatarEl && user) avatarEl.src        = user.avatar_url;
  }

  /* ── Clerk session init ─────────────────────────────────────────────────── */
  async function initClerkSession() {
    await new Promise(function (resolve) {
      if (window.Clerk) { resolve(); return; }
      var check = setInterval(function () {
        if (window.Clerk) { clearInterval(check); resolve(); }
      }, 80);
    });

    await window.Clerk.load();
    window.NODO_USER = null;

    var clerkUser = window.Clerk.user;
    if (clerkUser && sb) {
      var email = (clerkUser.primaryEmailAddress && clerkUser.primaryEmailAddress.emailAddress) ||
                  (clerkUser.emailAddresses && clerkUser.emailAddresses[0] && clerkUser.emailAddresses[0].emailAddress) || '';
      try {
        var result = await sb
          .from('profiles')
          .select('id,display_name,avatar_url,rank_key,level,croquetas,role,is_founder,is_banned')
          .eq('clerk_id', clerkUser.id)
          .limit(1);
        var profile = result.data && result.data[0];
        if (profile) {
          window.NODO_USER = {
            clerk_id:     clerkUser.id,
            profile_id:   profile.id,
            display_name: profile.display_name || clerkUser.fullName || email,
            avatar_url:   profile.avatar_url   || clerkUser.imageUrl || '',
            rank_key:     profile.rank_key     || 'cachorro',
            level:        profile.level        || 1,
            croquetas:    profile.croquetas    || 0,
            role:         profile.role         || 'USER',
            is_founder:   profile.is_founder   || false,
            is_banned:    profile.is_banned    || false,
            email:        email,
          };
        }
      } catch (_) {}
    }

    updateSessionUI(window.NODO_USER);

    window.Clerk.addListener(function (ev) {
      if (!ev.user) { window.NODO_USER = null; updateSessionUI(null); }
    });

    document.dispatchEvent(new CustomEvent('nodo:ready', { detail: { user: window.NODO_USER } }));
    return window.NODO_USER;
  }

  /* ── Logout ─────────────────────────────────────────────────────────────── */
  async function nodoLogout() {
    await window.Clerk.signOut();
    window.NODO_USER = null;
    updateSessionUI(null);
    window.location.href = '/';
  }

  /* ── Permission helpers ─────────────────────────────────────────────────── */
  function canPost() {
    var user = window.NODO_USER;
    if (!user) return { ok: false, reason: 'Sin sesión. Inicia sesión para participar.' };
    if (user.is_banned) return { ok: false, reason: 'Tu cuenta tiene restricciones de publicación.' };
    return { ok: true };
  }

  /* ── Utilities ─────────────────────────────────────────────────────────── */
  function formatTime(iso) {
    var d    = new Date(iso);
    var diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60)     return 'hace ' + diff + 's';
    if (diff < 3600)   return 'hace ' + Math.floor(diff / 60) + 'min';
    if (diff < 86400)  return 'hace ' + Math.floor(diff / 3600) + 'h';
    if (diff < 604800) return 'hace ' + Math.floor(diff / 86400) + 'd';
    return d.toLocaleDateString('es');
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
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
      aporte: 'Aporte', anuncio: 'Anuncio', evento: 'Evento',
    };
    return map[tipo] || tipo;
  }

  function tipoBadgeClass(tipo) {
    var map = {
      insight: 'badge-insight', pregunta: 'badge-pregunta', recurso: 'badge-recurso',
      experiencia: 'badge-experiencia', oportunidad: 'badge-oportunidad',
      aporte: 'badge-insight', anuncio: 'badge-oportunidad', evento: 'badge-recurso',
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

  /* ── Public API ─────────────────────────────────────────────────────────── */
  window.NODO = {
    sb:               sb,
    initClerkSession: initClerkSession,
    updateSessionUI:  updateSessionUI,
    nodoLogout:       nodoLogout,
    canPost:          canPost,
    formatTime:       formatTime,
    escapeHtml:       escapeHtml,
    initials:         initials,
    tipoLabel:        tipoLabel,
    tipoBadgeClass:   tipoBadgeClass,
    showToast:        showToast,
  };
})();
