/* NEVADO — NODO Hilo Page v1.0
   Lógica para nodo-hilo.html — vista individual de hilo + respuestas. */
(function () {
  'use strict';

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.state.ready) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  var HILO_ID = new URLSearchParams(window.location.search).get('id');

  async function loadAndRender() {
    if (!HILO_ID) {
      document.getElementById('hilo-content').innerHTML = '<p class="hilo-error">ID de hilo inválido.</p>';
      return;
    }

    /* Load hilo */
    var hilos = await window.NODO.sb.select('foro_hilos',
      'id=eq.' + HILO_ID + '&eliminado=eq.false'
    );
    var hilo = hilos && hilos[0];
    if (!hilo) {
      document.getElementById('hilo-content').innerHTML = '<p class="hilo-error">Hilo no encontrado.</p>';
      return;
    }

    /* Increment views */
    window.NODO.sb.update('foro_hilos', 'id=eq.' + HILO_ID, {
      vistas: (hilo.vistas || 0) + 1,
    }).catch(function () {});

    /* Load author */
    var author = window.NODO.foro
      ? await window.NODO.foro.loadAuthor(hilo.autor_clerk_id)
      : { nombre: 'Usuario', rango: 'Cachorro' };

    var e = window.NODO.escapeHtml;

    /* Render hilo header */
    var hiloEl = document.getElementById('hilo-content');
    hiloEl.innerHTML = [
      '<div class="hilo-header">',
        '<div class="hilo-author-row">',
          '<div class="hilo-avatar">' + e(window.NODO.initials(author.nombre)) + '</div>',
          '<div class="hilo-author-info">',
            '<div class="hilo-author-name">' + e(author.nombre) +
              ' <span class="nodo-post-badge ' + window.NODO.tipoBadgeClass(hilo.tipo) + '">' +
              window.NODO.tipoLabel(hilo.tipo) + '</span></div>',
            '<div class="hilo-author-meta">' + e(author.rango || 'Cachorro') + ' · ' + window.NODO.formatTime(hilo.creado_en) + '</div>',
          '</div>',
        '</div>',
        '<div class="hilo-body">' + e(hilo.contenido).replace(/\n/g, '<br>') + '</div>',
        (hilo.tags && hilo.tags.length
          ? '<div class="nodo-post-tags">' + hilo.tags.map(function (t) {
              return '<span class="nodo-post-tag">#' + e(t) + '</span>';
            }).join('') + '</div>'
          : ''),
        '<div class="hilo-actions">',
          '<button class="nodo-post-action hilo-like-btn' + '" id="hilo-like-btn">',
            '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
            '<span id="hilo-like-count">' + (hilo.likes || 0) + '</span>',
          '</button>',
          '<span class="hilo-stat"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 2H3a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg> ' +
            '<span id="hilo-resp-count">' + (hilo.respuestas_count || 0) + '</span> respuestas</span>',
          '<span class="hilo-stat">' + (hilo.vistas || 1) + ' vistas</span>',
        '</div>',
      '</div>',
    ].join('');

    /* Like button */
    var likeBtn = document.getElementById('hilo-like-btn');
    var likeCount = document.getElementById('hilo-like-count');
    likeBtn.addEventListener('click', async function () {
      if (window.NODO.foro) {
        var liked = await window.NODO.foro.toggleLike(HILO_ID);
        var n = parseInt(likeCount.textContent) || 0;
        likeCount.textContent = liked ? n + 1 : Math.max(0, n - 1);
        likeBtn.classList.toggle('active', liked);
      }
    });

    /* Load replies */
    await renderRespuestas();
  }

  async function renderRespuestas() {
    var container = document.getElementById('hilo-respuestas');
    if (!container) return;

    var respuestas = window.NODO.foro
      ? await window.NODO.foro.loadRespuestas(HILO_ID)
      : [];

    if (!respuestas.length) {
      container.innerHTML = '<div class="hilo-no-resp">Sé el primero en responder.</div>';
      return;
    }

    var e = window.NODO.escapeHtml;
    var myId = window.NODO.state.user ? window.NODO.state.user.clerk_id : null;

    var authorProm = respuestas.map(function (r) {
      return window.NODO.foro ? window.NODO.foro.loadAuthor(r.autor_clerk_id) : Promise.resolve({ nombre: 'Usuario' });
    });
    var authors = await Promise.all(authorProm);

    container.innerHTML = respuestas.map(function (r, i) {
      var a = authors[i] || { nombre: 'Usuario', rango: 'Cachorro' };
      var isOwn = r.autor_clerk_id === myId;
      return [
        '<div class="hilo-resp" data-resp-id="' + r.id + '">',
          '<div class="hilo-resp-author-row">',
            '<div class="hilo-resp-avatar' + (isOwn ? ' hilo-resp-own' : '') + '">' + e(window.NODO.initials(a.nombre)) + '</div>',
            '<div class="hilo-resp-info">',
              '<span class="hilo-resp-name">' + e(a.nombre) + '</span>',
              '<span class="hilo-resp-rank">' + e(a.rango || 'Cachorro') + '</span>',
              '<span class="hilo-resp-time">' + window.NODO.formatTime(r.creado_en) + '</span>',
            '</div>',
          '</div>',
          '<div class="hilo-resp-body">' + e(r.contenido).replace(/\n/g, '<br>') + '</div>',
          '<div class="hilo-resp-actions">',
            '<button class="nodo-post-action hilo-resp-like" data-resp="' + r.id + '">',
              '<svg width="12" height="12" viewBox="0 0 14 14" fill="none"><path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>',
              '<span>' + (r.likes || 0) + '</span>',
            '</button>',
            '<button class="nodo-post-action hilo-resp-reply-btn" data-resp="' + r.id + '">Responder</button>',
          '</div>',
        '</div>',
      ].join('');
    }).join('');

    /* Bind reply buttons */
    container.querySelectorAll('.hilo-resp-reply-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var respId = btn.dataset.resp;
        var input = document.getElementById('hilo-reply-input');
        if (input) {
          input.focus();
          input.dataset.parentId = respId;
          input.placeholder = 'Respondiendo…';
        }
      });
    });
  }

  /* ── Reply form ─────────────────────────────────────────────────────── */
  function bindReplyForm() {
    var form    = document.getElementById('hilo-reply-form');
    var input   = document.getElementById('hilo-reply-input');
    var sendBtn = document.getElementById('hilo-reply-send');
    if (!form || !input || !sendBtn) return;

    sendBtn.addEventListener('click', async function () {
      var text     = input.value.trim();
      var parentId = input.dataset.parentId || null;
      if (!text) return;
      if (!window.NODO.state.user) { window.NODO.showToast('Inicia sesión para responder.', 'error'); return; }

      sendBtn.disabled = true;
      sendBtn.textContent = 'Enviando…';
      var resp = await window.NODO.foro.createRespuesta(HILO_ID, text, parentId);
      sendBtn.disabled = false;
      sendBtn.textContent = 'Responder';

      if (resp) {
        input.value = '';
        input.dataset.parentId = '';
        input.placeholder = 'Escribe tu respuesta…';
        /* Update count */
        var countEl = document.getElementById('hilo-resp-count');
        if (countEl) countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
        /* Re-render */
        await renderRespuestas();
      }
    });

    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) sendBtn.click();
      });
    }
  }

  waitForNodo(function () {
    loadAndRender();
    bindReplyForm();
  });
})();
