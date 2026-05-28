/* NEVADO — NODO Chat v2.0
   Chat en tiempo real con Supabase Realtime + polling fallback.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  var activeChannel = null;
  var activeSub     = null;
  var pollingTimer  = null;
  var lastMsgTime   = null;

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.sb && window.NODO_USER !== undefined) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  function sb() { return window.NODO && window.NODO.sb; }

  /* ── Realtime client (separate instance for subscriptions) ──────────── */
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

  /* ── Load messages ───────────────────────────────────────────────────── */
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
    var u = window.CHAT_USER || window.NODO_USER;
    if (!u) { window.NODO.showToast('Sin sesión. Inicia sesión para chatear.', 'error'); return null; }
    if (u.is_banned) { window.NODO.showToast('Tu cuenta tiene restricciones de publicación.', 'error'); return null; }
    if (!String(contenido || '').trim()) return null;

    var payload = {
      canal_id:       canal_id,
      profile_id:     u.profile_id,
      autor_nombre:   u.display_name || 'Usuario',
      autor_username: u.username || null,
      autor_rank:     u.rank_key || 'cachorro',
      contenido:      String(contenido).trim().slice(0, 500),
      tipo:           'texto',
    };
    console.log('[chat] enviando:', { canal_id: canal_id, profile_id: u.profile_id, contenido: payload.contenido });
    try {
      var { data, error } = await sb().from('chat_mensajes').insert(payload).select().single();
      console.log('[chat] resultado INSERT:', data, error);
      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[chat] error INSERT:', err);
      window.NODO.showToast('Error al enviar. Inténtalo de nuevo.', 'error');
      return null;
    }
  }

  /* ── Limit check: mark oldest 50 as deleted if > 300 ────────────────── */
  async function verificarLimite(canalId) {
    try {
      var countRes = await sb()
        .from('chat_mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('canal_id', canalId)
        .eq('eliminado', false);
      if ((countRes.count || 0) > 300) {
        var oldest = await sb()
          .from('chat_mensajes')
          .select('id')
          .eq('canal_id', canalId)
          .eq('eliminado', false)
          .order('created_at', { ascending: true })
          .limit(50);
        if (oldest.data && oldest.data.length) {
          var ids = oldest.data.map(function (m) { return m.id; });
          await sb().from('chat_mensajes').update({ eliminado: true }).in('id', ids);
        }
      }
    } catch (err) {
      console.warn('[chat] verificarLimite error:', err);
    }
  }

  /* ── Rank image map (sm) ─────────────────────────────────────────────── */
  var RANK_SM = {
    cachorro:       '/rangos/rango1-cachorro-bronce-sm.webp',
    explorador:     '/rangos/rango2-explorador-bronce-sm.webp',
    guardian:       '/rangos/rango3-guardian-plata-sm.webp',
    montanista:     '/rangos/rango4-montanista-plata-sm.webp',
    guia:           '/rangos/rango5-guia-plata-sm.webp',
    protector:      '/rangos/rango6-protector-oro-sm.webp',
    leyenda_andina: '/rangos/rango7-leyendaandina-oro-joyas-sm.webp',
  };

  /* ── Render a single message as HTML string ──────────────────────────── */
  function renderMensaje(msg, isOwn) {
    var e       = window.NODO.escapeHtml;
    var nombre  = e(msg.autor_nombre || 'Usuario');
    var rango   = e(msg.autor_rank   || '');
    var usr     = msg.autor_username ? '<span class="nodo-chat-username">@' + e(msg.autor_username) + '</span>' : '';
    var time    = window.NODO.formatTime(msg.created_at || msg.creado_en);
    var rankSrc = RANK_SM[msg.autor_rank] || RANK_SM.cachorro;

    return '<div class="nodo-chat-msg' + (isOwn ? ' nodo-chat-msg-own' : '') + '" data-msg-id="' + msg.id + '">' +
      (!isOwn ? '<img class="nodo-chat-rank-img" src="' + rankSrc + '" alt="' + rango + '" />' : '') +
      '<div class="nodo-chat-bubble">' +
        (!isOwn ? '<div class="nodo-chat-author"><span class="nodo-chat-author-name">' + nombre + '</span>' + usr + '<span class="nodo-chat-author-rank">' + rango + '</span></div>' : '') +
        '<div class="nodo-chat-text">' + e(msg.contenido) + '</div>' +
        '<div class="nodo-chat-time">' + time + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ── Append a message with data-msg-id deduplication ────────────────── */
  function appendMensaje(msg, scroll) {
    var msgArea = document.getElementById('nodo-chat-messages');
    if (!msgArea) return;
    if (msgArea.querySelector('[data-msg-id="' + msg.id + '"]')) return;
    var curUser     = window.CHAT_USER || window.NODO_USER;
    var myProfileId = curUser ? curUser.profile_id : null;
    var isOwn       = !!(myProfileId && msg.profile_id === myProfileId);
    msgArea.insertAdjacentHTML('beforeend', renderMensaje(msg, isOwn));
    var placeholder = msgArea.querySelector('.nodo-chat-empty, .nodo-chat-loading');
    if (placeholder) placeholder.remove();
    if (scroll) msgArea.scrollTop = msgArea.scrollHeight;
  }

  /* ── Polling fallback (3 s interval) ────────────────────────────────── */
  function startPolling(canalId) {
    if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }
    pollingTimer = setInterval(async function () {
      if (!lastMsgTime) return;
      try {
        var result = await sb()
          .from('chat_mensajes')
          .select('*')
          .eq('canal_id', canalId)
          .eq('eliminado', false)
          .gt('created_at', lastMsgTime)
          .order('created_at', { ascending: true });
        if (result.data && result.data.length) {
          result.data.forEach(function (msg) {
            appendMensaje(msg, true);
            if (msg.created_at > lastMsgTime) lastMsgTime = msg.created_at;
          });
        }
      } catch (err) {
        console.warn('[chat] polling error:', err);
      }
    }, 3000);
  }

  /* ── Realtime subscription ───────────────────────────────────────────── */
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
      .subscribe(function (status) {
        console.log('[chat] realtime status:', status);
      });

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

  /* ── Chat page UI ────────────────────────────────────────────────────── */
  async function initChatPage() {
    var canalesList = document.getElementById('nodo-canales-list');
    var msgArea     = document.getElementById('nodo-chat-messages');
    var input       = document.getElementById('nodo-chat-input');
    var sendBtn     = document.getElementById('nodo-chat-send');
    var chanTitle   = document.getElementById('nodo-chan-title');
    if (!canalesList || !msgArea) return;

    var canales  = await loadCanales();
    var curCanal = null;

    canalesList.innerHTML = canales.map(function (c) {
      return '<button class="nodo-canal-item' + (c.tipo === 'anuncio' ? ' nodo-canal-anuncio' : '') +
        '" data-canal-id="' + c.id + '" data-canal-slug="' + window.NODO.escapeHtml(c.slug || '') + '">' +
        '# ' + window.NODO.escapeHtml(c.nombre) + '</button>';
    }).join('') || '<div style="padding:12px 16px;font-size:12px;color:rgba(255,255,255,0.28);">Sin canales disponibles.</div>';

    async function openCanal(canal) {
      curCanal    = canal;
      lastMsgTime = null;
      if (pollingTimer) { clearInterval(pollingTimer); pollingTimer = null; }

      canalesList.querySelectorAll('.nodo-canal-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.canalId === canal.id);
      });
      if (chanTitle) chanTitle.textContent = '# ' + canal.nombre;
      msgArea.innerHTML = '<div class="nodo-chat-loading">Cargando mensajes…</div>';

      var msgs = await loadMensajes(canal.id, 60);
      msgArea.innerHTML = '';

      if (!msgs.length) {
        msgArea.innerHTML = '<div class="nodo-chat-empty">Sé el primero en escribir algo.</div>';
        lastMsgTime = new Date().toISOString();
      } else {
        msgs.forEach(function (m) { appendMensaje(m, false); });
        msgArea.scrollTop = msgArea.scrollHeight;
        lastMsgTime = msgs[msgs.length - 1].created_at;
      }

      /* Realtime — receives new INSERTs instantly (requires REPLICA IDENTITY FULL) */
      subscribeToCanal(canal.id, function (newMsg) {
        appendMensaje(newMsg, true);
        if (!lastMsgTime || newMsg.created_at > lastMsgTime) lastMsgTime = newMsg.created_at;
      });

      /* Polling fallback — always active as safety net */
      startPolling(canal.id);

      verificarLimite(canal.id);
    }

    canalesList.addEventListener('click', function (e) {
      var btn = e.target.closest('.nodo-canal-item');
      if (!btn) return;
      var canal = canales.find(function (c) { return c.id === btn.dataset.canalId; });
      if (canal) openCanal(canal);
    });

    /* ── Typing indicator ──────────────────────────────────────────── */
    var typingEl   = document.getElementById('chat-typing-indicator');
    var typingTimer = null;
    function showTyping() {
      if (!typingEl || !window.NODO_USER) return;
      typingEl.textContent = 'Escribiendo...';
      clearTimeout(typingTimer);
      typingTimer = setTimeout(function () { typingEl.textContent = ''; }, 2000);
    }

    /* ── Emoji bar ─────────────────────────────────────────────────── */
    var emojiBar = document.getElementById('chat-emoji-bar');
    if (emojiBar) {
      emojiBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.chat-emoji-btn');
        if (!btn || !input) return;
        input.value += btn.dataset.emoji || btn.textContent;
        input.focus();
      });
    }

    async function doSend() {
      if (!curCanal) { window.NODO.showToast('Selecciona un canal.', 'error'); return; }
      var chatUser = window.CHAT_USER || window.NODO_USER;
      if (!chatUser) { window.NODO.showToast('Inicia sesión para chatear.', 'error'); return; }
      var text = input ? input.value.trim() : '';
      if (!text) return;

      if (sendBtn) sendBtn.disabled = true;
      if (typingEl) typingEl.textContent = '';
      clearTimeout(typingTimer);

      var result = await sendMensaje(curCanal.id, text);

      if (sendBtn) sendBtn.disabled = false;

      if (result) {
        if (input) input.value = '';
        /* Update baseline so polling skips this message */
        if (result.created_at) lastMsgTime = result.created_at;
        /* Render immediately — appendMensaje dedup prevents double-render from realtime/polling */
        appendMensaje(result, true);
      }
      if (input) input.focus();
    }

    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (input) {
      input.addEventListener('input', showTyping);
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
    appendMensaje:    appendMensaje,
  };
})();
