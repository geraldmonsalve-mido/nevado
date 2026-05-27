/* NEVADO — NODO Chat v1.0
   Chat en tiempo real con Supabase Realtime.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  var supabaseLib = null; /* supabase-js client for realtime */
  var activeChannel = null;
  var activeSub = null;

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.state.ready) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  /* ── Load supabase-js for realtime ───────────────────────────────────── */
  function loadSupabaseLib() {
    return new Promise(function (resolve) {
      if (window.supabase) { supabaseLib = window.supabase; resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
      s.onload = function () { supabaseLib = window.supabase; resolve(); };
      s.onerror = function () { resolve(); }; /* fail gracefully */
      document.head.appendChild(s);
    });
  }

  /* ── Get or create realtime client ──────────────────────────────────── */
  var rtClient = null;
  async function getRealtimeClient() {
    if (rtClient) return rtClient;
    await loadSupabaseLib();
    if (!supabaseLib) return null;
    rtClient = supabaseLib.createClient(
      window.NEVADO_SUPABASE_URL,
      window.NEVADO_SUPABASE_ANON_KEY,
      { realtime: { params: { eventsPerSecond: 10 } } }
    );
    return rtClient;
  }

  /* ── Load channels ───────────────────────────────────────────────────── */
  async function loadCanales() {
    try {
      var rows = await window.NODO.sb.select('chat_canales', 'activo=eq.true&order=creado_en.asc');
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Load messages ────────────────────────────────────────────────────── */
  async function loadMensajes(canal_id, limit) {
    try {
      var rows = await window.NODO.sb.select('chat_mensajes',
        'canal_id=eq.' + canal_id +
        '&eliminado=eq.false&order=creado_en.asc&limit=' + (limit || 80)
      );
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Send message ────────────────────────────────────────────────────── */
  async function sendMensaje(canal_id, contenido) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }
    if (!String(contenido || '').trim()) return null;

    try {
      var row = await window.NODO.sb.insert('chat_mensajes', {
        canal_id: canal_id,
        autor_clerk_id: window.NODO.state.user.clerk_id,
        contenido: String(contenido).trim().slice(0, 500),
        tipo: 'texto',
      });
      return Array.isArray(row) ? row[0] : row;
    } catch (_) {
      window.NODO.showToast('Error al enviar. Inténtalo de nuevo.', 'error');
      return null;
    }
  }

  /* ── Render a single message ─────────────────────────────────────────── */
  function renderMensaje(msg, author, isOwn) {
    var e  = window.NODO.escapeHtml;
    var ti = window.NODO.initials(author ? author.nombre : '?');
    var nombre  = author ? e(author.nombre || 'Usuario') : 'Usuario';
    var rango   = author ? e(author.rango || 'Cachorro') : '';
    var time    = window.NODO.formatTime(msg.creado_en);

    return '<div class="nodo-chat-msg' + (isOwn ? ' nodo-chat-msg-own' : '') + '" data-msg-id="' + msg.id + '">' +
      (!isOwn ? '<div class="nodo-chat-avatar">' + e(ti) + '</div>' : '') +
      '<div class="nodo-chat-bubble">' +
        (!isOwn ? '<div class="nodo-chat-author"><span class="nodo-chat-author-name">' + nombre + '</span><span class="nodo-chat-author-rank">' + rango + '</span></div>' : '') +
        '<div class="nodo-chat-text">' + e(msg.contenido) + '</div>' +
        '<div class="nodo-chat-time">' + time + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── Subscribe to realtime ───────────────────────────────────────────── */
  async function subscribeToCanal(canal_id, onMessage) {
    var client = await getRealtimeClient();
    if (!client) return null;

    /* Clean up previous */
    if (activeSub) {
      try { client.removeChannel(activeSub); } catch (_) {}
      activeSub = null;
    }

    var ch = client
      .channel('nodo-chat-' + canal_id)
      .on('postgres_changes', {
        event:  'INSERT',
        schema: 'public',
        table:  'chat_mensajes',
        filter: 'canal_id=eq.' + canal_id,
      }, function (payload) {
        onMessage(payload.new);
      })
      .subscribe();

    activeSub = ch;
    return ch;
  }

  /* ── Unsubscribe ─────────────────────────────────────────────────────── */
  async function unsubscribe() {
    var client = await getRealtimeClient();
    if (!client || !activeSub) return;
    try { client.removeChannel(activeSub); } catch (_) {}
    activeSub = null;
  }

  /* ── Chat panel UI (for nodo-chat.html) ─────────────────────────────── */
  async function initChatPage() {
    var canalesList = document.getElementById('nodo-canales-list');
    var msgArea     = document.getElementById('nodo-chat-messages');
    var input       = document.getElementById('nodo-chat-input');
    var sendBtn     = document.getElementById('nodo-chat-send');
    var chanTitle   = document.getElementById('nodo-chan-title');
    if (!canalesList || !msgArea) return;

    var canales = await loadCanales();
    var curCanal = null;

    /* Render channel list */
    canalesList.innerHTML = canales.map(function (c) {
      return '<button class="nodo-canal-item' + (c.tipo === 'anuncio' ? ' nodo-canal-anuncio' : '') +
        '" data-canal-id="' + c.id + '" data-canal-slug="' + window.NODO.escapeHtml(c.slug) + '">' +
        '# ' + window.NODO.escapeHtml(c.nombre) + '</button>';
    }).join('');

    async function openCanal(canal) {
      curCanal = canal;
      /* Mark active */
      canalesList.querySelectorAll('.nodo-canal-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.canalId === canal.id);
      });
      if (chanTitle) chanTitle.textContent = '# ' + canal.nombre;
      msgArea.innerHTML = '<div class="nodo-chat-loading">Cargando mensajes…</div>';

      /* Load history */
      var msgs = await loadMensajes(canal.id, 60);
      msgArea.innerHTML = '';

      if (!msgs.length) {
        msgArea.innerHTML = '<div class="nodo-chat-empty">Sé el primero en escribir algo.</div>';
      }

      var authorProm = msgs.map(function (m) { return window.NODO.foro ? window.NODO.foro.loadAuthor(m.autor_clerk_id) : Promise.resolve(null); });
      var authors = await Promise.all(authorProm);
      var myId = window.NODO.state.user ? window.NODO.state.user.clerk_id : null;

      var html = msgs.map(function (m, i) {
        return renderMensaje(m, authors[i], m.autor_clerk_id === myId);
      }).join('');
      msgArea.innerHTML = html || '<div class="nodo-chat-empty">Sé el primero en escribir algo.</div>';
      msgArea.scrollTop = msgArea.scrollHeight;

      /* Subscribe to new messages */
      await subscribeToCanal(canal.id, async function (newMsg) {
        var author = window.NODO.foro ? await window.NODO.foro.loadAuthor(newMsg.autor_clerk_id) : null;
        var isOwn  = newMsg.autor_clerk_id === myId;
        msgArea.insertAdjacentHTML('beforeend', renderMensaje(newMsg, author, isOwn));
        msgArea.scrollTop = msgArea.scrollHeight;
        /* Remove empty placeholder */
        var empty = msgArea.querySelector('.nodo-chat-empty');
        if (empty) empty.remove();
      });
    }

    /* Channel click */
    canalesList.addEventListener('click', function (e) {
      var btn = e.target.closest('.nodo-canal-item');
      if (!btn) return;
      var canal = canales.find(function (c) { return c.id === btn.dataset.canalId; });
      if (canal) openCanal(canal);
    });

    /* Send */
    async function doSend() {
      if (!curCanal) { window.NODO.showToast('Selecciona un canal.', 'error'); return; }
      if (!window.NODO.state.user) { window.NODO.showToast('Inicia sesión para chatear.', 'error'); return; }
      var text = input ? input.value.trim() : '';
      if (!text) return;
      input.value = '';
      await sendMensaje(curCanal.id, text);
    }

    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
    }

    /* Open first channel by default */
    if (canales.length) openCanal(canales[0]);
  }

  /* ── Mini chat widget (for nodo.html sidebar) ───────────────────────── */
  function initMiniChat() {
    var widget = document.getElementById('nodo-mini-chat');
    if (!widget) return;
    /* Widget HTML injected by nodo.html */
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  waitForNodo(function () {
    if (document.getElementById('nodo-chat-messages')) initChatPage();
    initMiniChat();
  });

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.NODO = window.NODO || {};
  window.NODO.chat = {
    loadCanales:       loadCanales,
    loadMensajes:      loadMensajes,
    sendMensaje:       sendMensaje,
    subscribeToCanal:  subscribeToCanal,
    unsubscribe:       unsubscribe,
    renderMensaje:     renderMensaje,
  };
})();
