/* NEVADO — NODO Hilo Page v2.0
   Vista individual de hilo + respuestas. Usa API actual (Supabase JS v2,
   window.NODO_USER, evento nodo:ready, columnas reales). */
(function () {
  'use strict';

  var HILO_ID = new URLSearchParams(window.location.search).get('id');

  function sb() { return window.NODO && window.NODO.sb; }
  function e(s) { return window.NODO ? window.NODO.escapeHtml(String(s || '')) : String(s || ''); }
  function fmt(iso) { return window.NODO ? window.NODO.formatTime(iso) : iso; }
  function rankImg(rk) { return window.NODO.foro ? window.NODO.foro.rankImg(rk) : ''; }
  function rankToLevel(rk) { return window.NODO.foro ? window.NODO.foro.rankToLevel(rk) : 1; }

  /* ── Main load ─────────────────────────────────────────────────────────── */
  async function loadAndRender() {
    if (!HILO_ID) {
      document.getElementById('hilo-content').innerHTML = '<p class="hilo-error">ID de hilo inválido.</p>';
      hideRespuestas();
      return;
    }

    var { data, error } = await sb()
      .from('foro_hilos')
      .select('*')
      .eq('id', HILO_ID)
      .neq('estado', 'eliminado')
      .single();

    if (error || !data) {
      document.getElementById('hilo-content').innerHTML = '<p class="hilo-error">Hilo no encontrado.</p>';
      hideRespuestas();
      return;
    }

    renderHilo(data);

    if (data.tipo === 'regla') {
      hideRespuestas();
    } else {
      await renderRespuestas();
    }
  }

  /* ── Render hilo header ────────────────────────────────────────────────── */
  function renderHilo(hilo) {
    var rankKey  = hilo.autor_rank || 'cachorro';
    var imgSrc   = rankImg(rankKey);
    var nivel    = hilo.autor_nivel || rankToLevel(rankKey);
    var nombre   = hilo.autor_nombre || 'Usuario';
    var username = hilo.autor_username ? '@' + hilo.autor_username : '';

    var avatarHtml = imgSrc
      ? '<img src="' + imgSrc + '" alt="' + e(rankKey) + '" style="width:40px;height:40px;border-radius:50%;object-fit:cover;">'
      : '<div class="hilo-avatar">' + e(window.NODO.initials(nombre)) + '</div>';

    var tituloHtml = hilo.titulo
      ? '<h1 style="font-size:22px;font-weight:600;color:#E8E8E0;margin:0 0 14px;line-height:1.3;">' + e(hilo.titulo) + '</h1>'
      : '';

    var badgeClass = window.NODO.tipoBadgeClass(hilo.tipo);
    var badgeLabel = window.NODO.tipoLabel(hilo.tipo);

    document.getElementById('hilo-content').innerHTML = [
      '<div class="hilo-header">',
        '<div class="hilo-author-row">',
          avatarHtml,
          '<div class="hilo-author-info">',
            '<div class="hilo-author-name">',
              e(nombre),
              username ? ' <span style="font-size:12px;color:rgba(255,255,255,.38);">' + e(username) + '</span>' : '',
              ' <span class="nodo-post-badge ' + badgeClass + '">' + badgeLabel + '</span>',
            '</div>',
            '<div class="hilo-author-meta">',
              'Lvl.' + nivel + ' · ' + fmt(hilo.created_at),
              (hilo.updated_at ? ' <span style="color:rgba(255,255,255,.25);">(editado)</span>' : ''),
            '</div>',
          '</div>',
        '</div>',
        tituloHtml,
        '<div class="hilo-body">' + e(hilo.contenido).replace(/\n/g, '<br>') + '</div>',
        '<div class="hilo-actions">',
          '<button class="nodo-post-action hilo-like-btn" id="hilo-like-btn">',
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
            ' <span id="hilo-like-count">' + (hilo.likes || 0) + '</span>',
          '</button>',
          '<span class="hilo-stat">',
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 2H3a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
            ' <span id="hilo-resp-count">' + (hilo.respuestas || 0) + '</span> respuestas',
          '</span>',
        '</div>',
      '</div>',
    ].join('');

    var likeBtn   = document.getElementById('hilo-like-btn');
    var likeCount = document.getElementById('hilo-like-count');
    likeBtn.addEventListener('click', async function () {
      if (!window.NODO_USER) { window.NODO.showToast('Inicia sesión para dar like.', 'error'); return; }
      likeBtn.disabled = true;
      try {
        await window.NODO.foro.toggleLike(HILO_ID, likeBtn);
        var { data: d } = await sb().from('foro_hilos').select('likes').eq('id', HILO_ID).single();
        if (d) likeCount.textContent = d.likes || 0;
      } catch (_) {}
      likeBtn.disabled = false;
    });
  }

  /* ── Render respuestas ─────────────────────────────────────────────────── */
  async function renderRespuestas() {
    var container = document.getElementById('hilo-respuestas');
    var label     = document.getElementById('hilo-resp-label');
    if (!container) return;

    var { data: respuestas } = await sb()
      .from('foro_respuestas')
      .select('*')
      .eq('hilo_id', HILO_ID)
      .eq('estado', 'activo')
      .order('created_at', { ascending: true });

    respuestas = respuestas || [];

    if (label) label.textContent = 'Respuestas (' + respuestas.length + ')';

    if (!respuestas.length) {
      container.innerHTML = '<div class="hilo-no-resp">Sé el primero en responder.</div>';
      return;
    }

    var myProfileId = window.NODO_USER ? window.NODO_USER.profile_id : null;

    container.innerHTML = respuestas.map(function (r) {
      var rk      = r.autor_rank || 'cachorro';
      var imgSrc  = rankImg(rk);
      var nivel   = r.autor_nivel || rankToLevel(rk);
      var nombre  = r.autor_nombre || 'Usuario';
      var isOwn   = r.profile_id && r.profile_id === myProfileId;

      var avatarHtml = imgSrc
        ? '<img src="' + imgSrc + '" alt="' + e(rk) + '" style="width:30px;height:30px;border-radius:50%;object-fit:cover;flex-shrink:0;">'
        : '<div class="hilo-resp-avatar' + (isOwn ? ' hilo-resp-own' : '') + '">' + e(window.NODO.initials(nombre)) + '</div>';

      return [
        '<div class="hilo-resp" data-resp-id="' + r.id + '">',
          '<div class="hilo-resp-author-row">',
            avatarHtml,
            '<div class="hilo-resp-info">',
              '<span class="hilo-resp-name">' + e(nombre) + '</span>',
              '<span class="hilo-resp-rank"> Lvl.' + nivel + '</span>',
              '<span class="hilo-resp-time">' + fmt(r.created_at) + '</span>',
            '</div>',
          '</div>',
          '<div class="hilo-resp-body">' + e(r.contenido).replace(/\n/g, '<br>') + '</div>',
          '<div class="hilo-resp-actions">',
            '<button class="nodo-post-action hilo-resp-reply-btn" data-resp="' + r.id + '">Responder</button>',
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    container.querySelectorAll('.hilo-resp-reply-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var input = document.getElementById('hilo-reply-input');
        if (input) {
          input.focus();
          input.placeholder = 'Respondiendo…';
        }
      });
    });
  }

  /* ── Hide replies section ──────────────────────────────────────────────── */
  function hideRespuestas() {
    var wrap = document.getElementById('hilo-respuestas-wrap');
    var form = document.getElementById('hilo-reply-form');
    if (wrap) wrap.style.display = 'none';
    if (form) form.style.display = 'none';
  }

  /* ── Reply form ────────────────────────────────────────────────────────── */
  function bindReplyForm() {
    var input   = document.getElementById('hilo-reply-input');
    var sendBtn = document.getElementById('hilo-reply-send');
    if (!input || !sendBtn) return;

    sendBtn.addEventListener('click', async function () {
      var text = input.value.trim();
      if (!text) return;
      if (!window.NODO_USER) { window.NODO.showToast('Inicia sesión para responder.', 'error'); return; }

      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando…';
      var resp = await window.NODO.foro.createRespuesta(HILO_ID, text);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Responder';

      if (resp) {
        input.value = '';
        input.placeholder = 'Escribe tu respuesta… (Cmd+Enter para enviar)';
        var countEl = document.getElementById('hilo-resp-count');
        if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
        await renderRespuestas();
      }
    });

    input.addEventListener('keydown', function (ev) {
      if (ev.key === 'Enter' && (ev.metaKey || ev.ctrlKey)) sendBtn.click();
    });
  }

  /* ── Boot ──────────────────────────────────────────────────────────────── */
  function boot() {
    loadAndRender();
    bindReplyForm();
  }

  if (window.NODO && window.NODO.sb) {
    boot();
  } else {
    document.addEventListener('nodo:ready', boot, { once: true });
  }
})();
