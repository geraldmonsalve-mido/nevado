/* NEVADO — NODO Chat v1.0
   Chat en tiempo real con Supabase Realtime.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  var activeChannel = null;
  var activeSub = null;

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.sb) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  function sb() { return window.NODO && window.NODO.sb; }

  /* ── Get or create realtime client ──────────────────────────────────── */
  var rtClient = null;
  function getRealtimeClient() {
    if (rtClient) return rtClient;
    if (!window.supabase || !window.NEVADO_SUPABASE_URL || !window.NEVADO_SUPABASE_ANON_KEY) return null;
    rtClient = window.supabase.createClient(
      window.NEVADO_SUPABASE_URL,
      window.NEVADO_SUPABASE_ANON_KEY,
      { realtime: { params: { eventsPerSecond: 10 } } }
    );
    return rtClient;
  }

  /* ── Load channels ───────────────────────────────────────────────────── */
  async function loadCanales() {
    try {
      var result = await sb()
        .from('chat_canales')
        .select('*')
        .eq('activo', true)
        .order('created_at', { ascending: true });
      return Array.isArray(result.data) ? result.data : [];
    } catch (_) { return []; }
  }

  /* ── Load messages ────────────────────────────────────────────────────── */
  async function loadMensajes(canal_id, limit) {
    try {
      var result = await sb()
        .from('chat_mensajes')
        .select('*')
        .eq('canal_id', canal_id)
        .eq('eliminado', false)
        .order('created_at', { ascending: true })
        .limit(limit || 80);
      return Array.isArray(result.data) ? result.data : [];
    } catch (_) { return []; }
  }

  /* ── Send message ────────────────────────────────────────────────────── */
  async function sendMensaje(canal_id, contenido) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }
    if (!String(contenido || '').trim()) return null;

    var u = window.NODO_USER;
    try {
      var result = await sb().from('chat_mensajes').insert({
        canal_id:       canal_id,
        autor_clerk_id: u.clerk_id,
        autor_nombre:   u.display_name || 'Usuario',
        autor_rank:     u.rank_key || 'cachorro',
        contenido:      String(contenido).trim().slice(0, 500),
        tipo:           'texto',
      }).select().single();
      if (result.error) throw result.error;
      return result.data;
    } catch (_) {
      window.NODO.showToast('Error al enviar. Inténtalo de nuevo.', 'error');
      return null;
    }
  }

  /* ── Render a single message ─────────────────────────────────────────── */
  function renderMensaje(msg, isOwn) {
    var e       = window.NODO.escapeHtml;
    var nombre  = e(msg.autor_nombre || 'Usuario');
    var rango   = e(msg.autor_rank   || '');
    var ti      = window.NODO.initials(msg.autor_nombre || '?');
    var time    = window.NODO.formatTime(msg.created_at || msg.creado_en);

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
  function subscribeToCanal(canal_id, onMessage) {
    var client = getRealtimeClient();
    if (!client) return null;

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
  function unsubscribe() {
    var client = getRealtimeClient();
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

    canalesList.innerHTML = canales.map(function (c) {
      return '<button class="nodo-canal-item' + (c.tipo === 'anuncio' ? ' nodo-canal-anuncio' : '') +
        '" data-canal-id="' + c.id + '" data-canal-slug="' + window.NODO.escapeHtml(c.slug || '') + '">' +
        '# ' + window.NODO.escapeHtml(c.nombre) + '</button>';
    }).join('') || '<div style="padding:12px 16px;font-size:12px;color:rgba(255,255,255,0.28);">Sin canales disponibles.</div>';

    async function openCanal(canal) {
      curCanal = canal;
      canalesList.querySelectorAll('.nodo-canal-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.canalId === canal.id);
      });
      if (chanTitle) chanTitle.textContent = '# ' + canal.nombre;
      msgArea.innerHTML = '<div class="nodo-chat-loading">Cargando mensajes…</div>';

      var msgs = await loadMensajes(canal.id, 60);
      var myId = window.NODO_USER ? window.NODO_USER.clerk_id : null;

      if (!msgs.length) {
        msgArea.innerHTML = '<div class="nodo-chat-empty">Sé el primero en escribir algo.</div>';
      } else {
        msgArea.innerHTML = msgs.map(function (m) {
          return renderMensaje(m, m.autor_clerk_id === myId);
        }).join('');
        msgArea.scrollTop = msgArea.scrollHeight;
      }

      subscribeToCanal(canal.id, function (newMsg) {
        var isOwn = newMsg.autor_clerk_id === myId;
        msgArea.insertAdjacentHTML('beforeend', renderMensaje(newMsg, isOwn));
        msgArea.scrollTop = msgArea.scrollHeight;
        var empty = msgArea.querySelector('.nodo-chat-empty');
        if (empty) empty.remove();
      });
    }

    canalesList.addEventListener('click', function (e) {
      var btn = e.target.closest('.nodo-canal-item');
      if (!btn) return;
      var canal = canales.find(function (c) { return c.id === btn.dataset.canalId; });
      if (canal) openCanal(canal);
    });

    async function doSend() {
      if (!curCanal) { window.NODO.showToast('Selecciona un canal.', 'error'); return; }
      if (!window.NODO_USER) { window.NODO.showToast('Inicia sesión para chatear.', 'error'); return; }
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

    if (canales.length) openCanal(canales[0]);
  }

  /* ── Init ────────────────────────────────────────────────────────────── */
  waitForNodo(function () {
    if (document.getElementById('nodo-chat-messages')) initChatPage();
  });

  /* ── Public API ──────────────────────────────────────────────────────── */
  window.NODO = window.NODO || {};
  window.NODO.chat = {
    loadCanales:      loadCanales,
    loadMensajes:     loadMensajes,
    sendMensaje:      sendMensaje,
    subscribeToCanal: subscribeToCanal,
    unsubscribe:      unsubscribe,
    renderMensaje:    renderMensaje,
  };
})();
