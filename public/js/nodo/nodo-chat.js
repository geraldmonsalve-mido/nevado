/* NEVADO — NODO Chat v2.2
   Chat en tiempo real con Supabase Realtime + polling fallback.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  var typingTimer = null;

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.sb && window.NODO_USER !== undefined) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  /* Main Supabase client — same instance used for everything */
  function sb() { return window.NODO && window.NODO.sb; }

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

    /* BUG 5 — rank_key comes from profiles via CHAT_USER set in nodo:ready */
    console.log('[chat] CHAT_USER.rank_key:', u.rank_key, '| profile_id:', u.profile_id);

    var payload = {
      canal_id:       canal_id,
      profile_id:     u.profile_id,
      autor_nombre:   u.display_name || 'Usuario',
      autor_username: u.username || null,
      autor_rank:     u.rank_key || 'cachorro',
      contenido:      String(contenido).trim().slice(0, 500),
      tipo:           'texto',
    };
    /* Sección 5: verificar estado del canal antes de enviar */
    try {
      var { data: canalCheck } = await sb()
        .from('chat_canales')
        .select('estado, activo')
        .eq('id', canal_id)
        .single();
      if (!canalCheck || !canalCheck.activo) {
        window.NODO.showToast('Este canal no está disponible.', 'error');
        return null;
      }
      if (canalCheck.estado === 'congelado') {
        window.NODO.showToast('❄ Este canal está congelado. Solo lectura.', 'error');
        return null;
      }
      if (canalCheck.estado === 'solo_mod') {
        var rangosPermitidos = ['guardian', 'montanista', 'guia', 'protector', 'leyenda_andina'];
        if (!rangosPermitidos.includes(u.rank_key)) {
          window.NODO.showToast('⭐ Solo moderadores pueden escribir en este canal.', 'error');
          return null;
        }
      }
    } catch (_) { /* si falla el check, continuar */ }

    console.log('[chat] enviando:', payload);
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

  /* ── Rank image map (sm) — BUG 4 ────────────────────────────────────── */
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
    var nombre  = e(msg.autor_nombre  || 'Usuario');
    var usr     = msg.autor_username
      ? '<span class="nodo-chat-username">@' + e(msg.autor_username) + '</span>'
      : '';
    var time    = window.NODO.formatTime(msg.created_at || msg.creado_en);
    /* BUG 4: use -sm.webp image, no text label for rank key */
    var rankSrc = RANK_SM[msg.autor_rank] || RANK_SM.cachorro;

    return (
      '<div class="nodo-chat-msg' + (isOwn ? ' nodo-chat-msg-own' : '') + '" data-msg-id="' + msg.id + '">' +
        '<img class="nodo-chat-rank-img" src="' + rankSrc + '" alt="" />' +
        '<div class="nodo-chat-bubble">' +
          '<div class="nodo-chat-author">' +
            '<span class="nodo-chat-author-name">' + nombre + '</span>' +
            usr +
          '</div>' +
          '<div class="nodo-chat-text">' + e(msg.contenido) + '</div>' +
          '<div class="nodo-chat-time">' + time + '</div>' +
        '</div>' +
      '</div>'
    );
  }

  /* ── Append a message with data-msg-id deduplication ────────────────── */
  function appendMensaje(msg, scroll) {
    var msgArea = document.getElementById('nodo-chat-messages');
    if (!msgArea) return;
    if (document.querySelector('[data-msg-id="' + msg.id + '"]')) return;
    var curUser     = window.CHAT_USER || window.NODO_USER;
    var myProfileId = curUser ? curUser.profile_id : null;
    var isOwn       = !!(myProfileId && msg.profile_id === myProfileId);
    msgArea.insertAdjacentHTML('beforeend', renderMensaje(msg, isOwn));
    var placeholder = msgArea.querySelector('.nodo-chat-empty, .nodo-chat-loading');
    if (placeholder) placeholder.remove();
    if (scroll) msgArea.scrollTop = msgArea.scrollHeight;
  }

  /* ── BUG 1: Polling — fetch last 10 DESC, reverse, dedup by data-msg-id ─ */
  function startPolling(canalId) {
    if (window._chatPollInterval) {
      clearInterval(window._chatPollInterval);
      window._chatPollInterval = null;
    }

    window._chatPollInterval = setInterval(async function () {
      try {
        var result = await sb()
          .from('chat_mensajes')
          .select('id, canal_id, profile_id, autor_nombre, autor_rank, autor_username, contenido, created_at')
          .eq('canal_id', canalId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (result.error) {
          console.error('[poll] error:', result.error.message);
          return;
        }
        if (!result.data || !result.data.length) return;

        var msgs = result.data.slice().reverse();
        msgs.forEach(function (m) { appendMensaje(m, true); });
      } catch (err) {
        console.error('[poll] excepción:', err);
      }
    }, 2000);
  }

  /* ── BUG 2: Realtime — main sb() client, unique channel name ─────────── */
  function startRealtime(canalId, onMessage, onTyping) {
    if (window._chatRealtimeSub) {
      try { sb().removeChannel(window._chatRealtimeSub); } catch (_) {}
      window._chatRealtimeSub = null;
    }

    var ch = sb()
      .channel('chat-' + canalId + '-' + Date.now())
      .on(
        'postgres_changes',
        {
          event:  'INSERT',
          schema: 'public',
          table:  'chat_mensajes',
          filter: 'canal_id=eq.' + canalId,
        },
        function (payload) {
          console.log('[realtime] mensaje recibido:', payload.new);
          appendMensaje(payload.new, true);
          if (onMessage) onMessage(payload.new);
        }
      )
      .on('broadcast', { event: 'typing' }, function (ev) {
        if (onTyping) onTyping(ev.payload);
      })
      .subscribe(function (status, err) {
        console.log('[realtime] status:', status, err || '');
      });

    window._chatRealtimeSub = ch;
    return ch;
  }

  /* ── Unsubscribe all ─────────────────────────────────────────────────── */
  function unsubscribeAll() {
    if (window._chatPollInterval) { clearInterval(window._chatPollInterval); window._chatPollInterval = null; }
    if (window._chatRealtimeSub) {
      try { sb().removeChannel(window._chatRealtimeSub); } catch (_) {}
      window._chatRealtimeSub = null;
    }
    if (window._typingChannel) {
      try { sb().removeChannel(window._typingChannel); } catch (_) {}
      window._typingChannel = null;
    }
  }

  /* ── Chat page UI ────────────────────────────────────────────────────── */
  async function initChatPage() {
    var canalesList = document.getElementById('nodo-canales-list');
    var msgArea     = document.getElementById('nodo-chat-messages');
    var input       = document.getElementById('nodo-chat-input');
    var sendBtn     = document.getElementById('nodo-chat-send');
    var chanTitle   = document.getElementById('nodo-chan-title');
    var typingEl    = document.getElementById('typing-indicator');
    if (!canalesList || !msgArea) return;

    var canales  = await loadCanales();
    var curCanal = null;

    canalesList.innerHTML = canales.map(function (c) {
      return '<button class="nodo-canal-item' + (c.tipo === 'anuncio' ? ' nodo-canal-anuncio' : '') +
        '" data-canal-id="' + c.id + '" data-canal-slug="' + window.NODO.escapeHtml(c.slug || '') + '">' +
        '# ' + window.NODO.escapeHtml(c.nombre) + '</button>';
    }).join('') || '<div style="padding:12px 16px;font-size:12px;color:rgba(255,255,255,0.28);">Sin canales disponibles.</div>';

    /* BUG 3: openCanal order — history → realtime → polling */
    async function openCanal(canal) {
      curCanal = canal;
      unsubscribeAll();
      var tiEl = document.getElementById('typing-indicator');
      if (tiEl) { tiEl.textContent = ''; tiEl.style.display = 'none'; clearTimeout(tiEl._t); }

      canalesList.querySelectorAll('.nodo-canal-item').forEach(function (b) {
        b.classList.toggle('active', b.dataset.canalId === canal.id);
      });
      if (chanTitle) chanTitle.textContent = '# ' + canal.nombre;
      msgArea.innerHTML = '<div class="nodo-chat-loading">Cargando mensajes…</div>';

      /* 1. Cargar historial */
      var msgs = await loadMensajes(canal.id, 60);
      msgArea.innerHTML = '';
      if (!msgs.length) {
        msgArea.innerHTML = '<div class="nodo-chat-empty">Sé el primero en escribir algo.</div>';
      } else {
        msgs.forEach(function (m) { appendMensaje(m, false); });
        msgArea.scrollTop = msgArea.scrollHeight;
      }

      /* 2. Iniciar realtime (postgres_changes) */
      startRealtime(canal.id, null, null);

      /* 3. Canal dedicado de typing via broadcast */
      if (window._typingChannel) {
        try { sb().removeChannel(window._typingChannel); } catch (_) {}
        window._typingChannel = null;
      }
      window._typingChannel = sb()
        .channel('typing-' + canal.id)
        .on('broadcast', { event: 'typing' }, function (ev) {
          var nombre     = (ev.payload && ev.payload.username) ? ev.payload.username : 'Alguien';
          var chatUser   = window.CHAT_USER || window.NODO_USER;
          var myUsername = chatUser ? (chatUser.username || chatUser.display_name) : null;
          if (myUsername && nombre === myUsername) return; /* no mostrar el propio */
          var el = document.getElementById('typing-indicator');
          if (!el) return;
          el.textContent  = nombre + ' está escribiendo...';
          el.style.display = 'block';
          clearTimeout(el._t);
          el._t = setTimeout(function () { el.style.display = 'none'; }, 2000);
        })
        .subscribe();

      /* 4. Iniciar polling como fallback */
      startPolling(canal.id);

      verificarLimite(canal.id);
    }

    canalesList.addEventListener('click', function (e) {
      var btn = e.target.closest('.nodo-canal-item');
      if (!btn) return;
      var canal = canales.find(function (c) { return c.id === btn.dataset.canalId; });
      if (canal) openCanal(canal);
    });

    /* ── Emoji bar ─────────────────────────────────────────────────────── */
    var emojiBar = document.getElementById('chat-emoji-bar');
    if (emojiBar) {
      emojiBar.addEventListener('click', function (e) {
        var btn = e.target.closest('.chat-emoji-btn');
        if (!btn || !input) return;
        input.value += btn.dataset.emoji || btn.textContent;
        input.focus();
      });
    }

    /* ── Typing broadcast via dedicated channel ────────────────────────── */
    function broadcastTyping() {
      if (!window._typingChannel) return;
      var chatUser = window.CHAT_USER || window.NODO_USER;
      if (!chatUser) return;
      window._typingChannel.send({
        type:    'broadcast',
        event:   'typing',
        payload: { username: chatUser.username || chatUser.display_name || 'Alguien' },
      }).catch(function () {});
    }

    async function doSend() {
      if (!curCanal) { window.NODO.showToast('Selecciona un canal.', 'error'); return; }
      var chatUser = window.CHAT_USER || window.NODO_USER;
      if (!chatUser) { window.NODO.showToast('Inicia sesión para chatear.', 'error'); return; }
      var text = input ? input.value.trim() : '';
      if (!text) return;

      if (sendBtn) sendBtn.disabled = true;
      var tiEl2 = document.getElementById('typing-indicator');
      if (tiEl2) { tiEl2.textContent = ''; tiEl2.style.display = 'none'; }

      var result = await sendMensaje(curCanal.id, text);

      if (sendBtn) sendBtn.disabled = false;

      if (result) {
        if (input) input.value = '';
        /* Render immediately — dedup prevents duplicate from realtime/polling */
        appendMensaje(result, true);
      }
      if (input) input.focus();
    }

    if (sendBtn) sendBtn.addEventListener('click', doSend);
    if (input) {
      input.addEventListener('input', broadcastTyping);
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
    loadCanales:   loadCanales,
    loadMensajes:  loadMensajes,
    sendMensaje:   sendMensaje,
    renderMensaje: renderMensaje,
    appendMensaje: appendMensaje,
  };
})();
