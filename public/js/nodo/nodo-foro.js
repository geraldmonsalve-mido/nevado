/* NEVADO — NODO Foro v2.0
   Schema v2: profile_id, autor_rank, likes, respuestas, created_at. */
(function () {
  'use strict';

  function esc(str) {
    return window.NODO
      ? window.NODO.escapeHtml(str)
      : String(str || '').replace(/[&<>"']/g, function (c) {
          return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
        });
  }

  function sb() { return window.NODO && window.NODO.sb; }

  /* ── Load feed ──────────────────────────────────────────────────────────── */
  async function loadHilos(tab, categoriaId) {
    try {
      var client = sb();
      if (!client) return [];
      var query;
      if (tab === 'destacado') {
        query = client
          .from('foro_hilos')
          .select('*,foro_categorias(nombre,slug,icono,color)')
          .eq('estado', 'activo')
          .eq('es_destacado', true)
          .order('likes', { ascending: false })
          .limit(20);
      } else {
        query = client
          .from('foro_hilos')
          .select('*,foro_categorias(nombre,slug,icono,color)')
          .eq('estado', 'activo')
          .order('created_at', { ascending: false })
          .limit(20);
      }
      if (categoriaId) query = query.eq('categoria_id', categoriaId);
      var result = await query;
      return Array.isArray(result.data) ? result.data : [];
    } catch (_) { return []; }
  }

  /* ── Tipo mapping: UI names → valid DB enum values ─────────────────────── */
  var TIPO_DB_MAP = {
    insight:     'aporte',
    recurso:     'aporte',
    experiencia: 'aporte',
    oportunidad: 'anuncio',
    pregunta:    'pregunta',
    aporte:      'aporte',
    anuncio:     'anuncio',
    evento:      'evento',
  };

  /* ── Create hilo ────────────────────────────────────────────────────────── */
  async function createHilo(data) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }

    var u = window.NODO_USER;
    var contenido = String(data.contenido || '').trim();
    if (!contenido || contenido.length < 3) { window.NODO.showToast('Escribe al menos 3 caracteres.', 'error'); return null; }
    if (contenido.length > 1200) { window.NODO.showToast('Máximo 1,200 caracteres.', 'error'); return null; }

    var tipoRaw = data.tipo || 'aporte';
    var tipoDB  = TIPO_DB_MAP[tipoRaw] || 'aporte';

    var payload = {
      profile_id:   u.profile_id,
      autor_nombre: u.display_name || 'Usuario',
      autor_avatar: u.avatar_url || null,
      autor_rank:   u.rank_key || 'cachorro',
      contenido:    contenido,
      tipo:         tipoDB,
      categoria_id: data.categoria_id || null,
      estado:       'activo',
    };

    try {
      var result = await sb().from('foro_hilos').insert(payload).select().single();
      if (result.error) throw result.error;
      window.NODO.showToast('Aporte publicado.');
      return result.data;
    } catch (_) {
      window.NODO.showToast('Error al publicar. Inténtalo de nuevo.', 'error');
      return null;
    }
  }

  /* ── Local like tracking (no junction table in schema) ──────────────────── */
  var _likedSet = new Set();

  /* ── Toggle like ────────────────────────────────────────────────────────── */
  async function toggleLike(hilo_id) {
    if (!window.NODO_USER) { window.NODO.showToast('Inicia sesión para reaccionar.', 'error'); return false; }
    var liked = _likedSet.has(hilo_id);
    try {
      if (liked) {
        _likedSet.delete(hilo_id);
        await sb().rpc('decrement_hilo_likes', { p_hilo_id: hilo_id });
        return false;
      } else {
        _likedSet.add(hilo_id);
        await sb().rpc('increment_hilo_likes', { p_hilo_id: hilo_id });
        return true;
      }
    } catch (_) {
      if (liked) _likedSet.add(hilo_id); else _likedSet.delete(hilo_id);
      return liked;
    }
  }

  /* ── Get my likes (session-only, no junction table) ─────────────────────── */
  async function getMyLikes(hilo_ids) {
    return hilo_ids.filter(function (id) { return _likedSet.has(id); });
  }

  /* ── Report ─────────────────────────────────────────────────────────────── */
  async function reportHilo(hilo_id, motivo) {
    if (!window.NODO_USER) { window.NODO.showToast('Debes iniciar sesión para reportar.', 'error'); return; }
    try {
      await sb().from('foro_reportes').insert({
        reportante_id: window.NODO_USER.profile_id,
        hilo_id:       hilo_id,
        motivo:        motivo,
      });
      window.NODO.showToast('Reporte enviado.');
    } catch (_) { window.NODO.showToast('Error al enviar reporte.', 'error'); }
  }

  /* ── Load respuestas ────────────────────────────────────────────────────── */
  async function loadRespuestas(hilo_id) {
    try {
      var result = await sb()
        .from('foro_respuestas')
        .select('*')
        .eq('hilo_id', hilo_id)
        .eq('estado', 'activo')
        .order('created_at', { ascending: true });
      return Array.isArray(result.data) ? result.data : [];
    } catch (_) { return []; }
  }

  /* ── Create respuesta ───────────────────────────────────────────────────── */
  async function createRespuesta(hilo_id, contenido, parent_id) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }
    if (!String(contenido || '').trim()) { window.NODO.showToast('Respuesta vacía.', 'error'); return null; }
    var u = window.NODO_USER;
    try {
      var payload = {
        hilo_id:      hilo_id,
        profile_id:   u.profile_id,
        autor_nombre: u.display_name || 'Usuario',
        autor_avatar: u.avatar_url || null,
        autor_rank:   u.rank_key || 'cachorro',
        contenido:    String(contenido).trim(),
        estado:       'activo',
      };
      // parent_id not in DB schema — omitted
      var result = await sb().from('foro_respuestas').insert(payload).select().single();
      if (result.error) throw result.error;
      try { await sb().rpc('increment_hilo_respuestas', { p_hilo_id: hilo_id }); } catch (_) {}
      return result.data;
    } catch (_) {
      window.NODO.showToast('Error al responder.', 'error');
      return null;
    }
  }

  /* ── Render post card ───────────────────────────────────────────────────── */
  function renderPost(hilo, myLikedIds, idx) {
    var nombre = esc(hilo.autor_nombre || 'Usuario');
    var rank   = esc(hilo.autor_rank   || 'cachorro');
    var ti     = (hilo.autor_nombre || '?').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
    var badgeClass = window.NODO.tipoBadgeClass(hilo.tipo);
    var tipoLbl    = window.NODO.tipoLabel(hilo.tipo);
    var time       = window.NODO.formatTime(hilo.created_at);
    var liked      = myLikedIds.indexOf(hilo.id) !== -1;
    var catPart = hilo.foro_categorias ? esc(hilo.foro_categorias.nombre) + ' · ' : '';

    return '<article class="nodo-post" style="--post-i:' + idx + '" data-hilo-id="' + hilo.id + '">' +
      '<div class="nodo-post-header">' +
        '<div class="nodo-post-avatar">' + esc(ti) + '</div>' +
        '<div class="nodo-post-meta">' +
          '<div class="nodo-post-name">' + nombre +
            ' <span class="nodo-post-badge ' + badgeClass + '">' + tipoLbl + '</span>' +
          '</div>' +
          '<div class="nodo-post-sub">' + rank + ' · ' + catPart + time + '</div>' +
        '</div>' +
        '<button class="nodo-post-follow" data-autor="' + esc(hilo.profile_id || '') + '">+ Seguir</button>' +
      '</div>' +
      '<div class="nodo-post-body"><p>' + esc(hilo.contenido).replace(/\n/g, '</p><p>') + '</p></div>' +
      '<div class="nodo-post-footer">' +
        '<button class="nodo-post-action nodo-action-like' + (liked ? ' active' : '') + '" data-hilo="' + hilo.id + '">' +
          (liked
            ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z"/></svg>'
            : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 12S1.5 8.5 1.5 4.5a3 3 0 015.5-1.6A3 3 0 0112.5 4.5C12.5 8.5 7 12 7 12z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>'
          ) +
          '<span>' + (hilo.likes || 0) + '</span>' +
        '</button>' +
        '<button class="nodo-post-action nodo-action-reply" data-hilo="' + hilo.id + '">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11 2H3a1 1 0 00-1 1v6a1 1 0 001 1h2l2 2 2-2h2a1 1 0 001-1V3a1 1 0 00-1-1z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>' +
          '<span>' + (hilo.respuestas || 0) + '</span>' +
        '</button>' +
        '<button class="nodo-post-action nodo-action-share" data-hilo="' + hilo.id + '">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<span>Compartir</span>' +
        '</button>' +
        '<button class="nodo-post-action nodo-action-report" data-hilo="' + hilo.id + '">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 5v3M7 10h.01" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M3.5 12.5l-1-10 4.5 2.5 4.5-2.5-1 10h-7z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>' +
          '<span>Reportar</span>' +
        '</button>' +
      '</div>' +
    '</article>';
  }

  /* ── Render feed ────────────────────────────────────────────────────────── */
  async function renderFeed(hilos) {
    var container = document.getElementById('feed-principal') || document.querySelector('.nodo-posts');
    if (!container) return;

    var sentinel = container.querySelector('#feed-sentinel');
    var loadMore = container.querySelector('.nodo-load-more');
    Array.from(container.children).forEach(function (el) {
      if (el.id !== 'feed-sentinel' && !el.classList.contains('nodo-load-more')) el.remove();
    });

    if (!hilos.length) {
      var empty = document.createElement('div');
      empty.className = 'feed-vacio';
      empty.textContent = 'Sé el primero en publicar un aporte en NODO.';
      if (sentinel) container.insertBefore(empty, sentinel);
      else if (loadMore) container.insertBefore(empty, loadMore);
      else container.appendChild(empty);
      return;
    }

    var hilo_ids   = hilos.map(function (h) { return h.id; });
    var myLikedIds = await getMyLikes(hilo_ids);

    var html = '';
    for (var i = 0; i < hilos.length; i++) {
      html += renderPost(hilos[i], myLikedIds, i);
    }
    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) {
      if (sentinel) container.insertBefore(tmp.firstChild, sentinel);
      else if (loadMore) container.insertBefore(tmp.firstChild, loadMore);
      else container.appendChild(tmp.firstChild);
    }
    bindFeedEvents(container);
  }

  /* ── Bind feed events ───────────────────────────────────────────────────── */
  function bindFeedEvents(container) {
    /* Like */
    container.querySelectorAll('.nodo-action-like[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var hilo_id = btn.getAttribute('data-hilo');
        var liked   = await toggleLike(hilo_id);
        var span    = btn.querySelector('span');
        var n       = parseInt(span.textContent.replace(/,/g, '')) || 0;
        span.textContent = liked ? n + 1 : Math.max(0, n - 1);
        btn.classList.toggle('active', liked);
        var svg  = btn.querySelector('svg');
        var path = btn.querySelector('path');
        if (liked) {
          svg.setAttribute('fill', 'currentColor');
          if (path) { path.removeAttribute('stroke'); path.removeAttribute('stroke-width'); }
        } else {
          svg.setAttribute('fill', 'none');
          if (path) { path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.1'); }
        }
      });
    });

    /* Reply — inline panel */
    container.querySelectorAll('.nodo-action-reply[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var hilo_id = btn.getAttribute('data-hilo');
        var article = btn.closest('article.nodo-post');
        if (!article) return;
        var existing = article.querySelector('.post-comentarios-panel');
        if (existing) { existing.classList.toggle('open'); return; }

        var panel = document.createElement('div');
        panel.className = 'post-comentarios-panel open';
        var canP = window.NODO.canPost();
        panel.innerHTML =
          '<div class="comentarios-lista"><div class="feed-loading">Cargando comentarios…</div></div>' +
          (canP.ok
            ? '<div class="comentario-composer"><div class="comentario-input-row">' +
              '<textarea class="comentario-textarea" placeholder="Escribe un comentario…"></textarea>' +
              '<button class="comentario-btn-publicar">Enviar</button>' +
              '</div></div>'
            : '<p class="feed-vacio" style="padding:8px 12px;font-size:12px">' +
              esc(canP.reason || 'Inicia sesión para comentar.') + '</p>'
          );
        article.appendChild(panel);

        var respuestas = await loadRespuestas(hilo_id);
        var lista = panel.querySelector('.comentarios-lista');
        if (respuestas.length) {
          lista.innerHTML = respuestas.map(function (r) {
            var ini = (r.autor_nombre || '?').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
            return '<div class="comentario-item">' +
              '<div class="comentario-avatar-mini">' + esc(ini) + '</div>' +
              '<div class="comentario-contenido">' +
                '<div class="comentario-meta"><strong>' + esc(r.autor_nombre || 'Usuario') + '</strong> · ' +
                window.NODO.formatTime(r.created_at) + '</div>' +
                '<p>' + esc(r.contenido) + '</p>' +
              '</div></div>';
          }).join('');
        } else {
          lista.innerHTML = '<div class="feed-vacio">Sin comentarios aún. ¡Sé el primero!</div>';
        }

        var publishBtn = panel.querySelector('.comentario-btn-publicar');
        if (publishBtn) {
          publishBtn.addEventListener('click', async function () {
            var ta  = panel.querySelector('.comentario-textarea');
            var txt = ta ? ta.value.trim() : '';
            if (!txt) return;
            publishBtn.disabled = true;
            var resp = await createRespuesta(hilo_id, txt);
            if (resp) {
              ta.value = '';
              var u   = window.NODO_USER;
              var ini = (u ? u.display_name : '?').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
              var newItem = document.createElement('div');
              newItem.className = 'comentario-item actividad-nueva';
              newItem.innerHTML =
                '<div class="comentario-avatar-mini">' + esc(ini) + '</div>' +
                '<div class="comentario-contenido"><div class="comentario-meta"><strong>' +
                esc(u ? u.display_name : 'Tú') + '</strong> · ahora</div><p>' + esc(txt) + '</p></div>';
              lista.appendChild(newItem);
              var rcSpan = btn.querySelector('span');
              if (rcSpan) rcSpan.textContent = parseInt(rcSpan.textContent || '0') + 1;
            }
            publishBtn.disabled = false;
          });
        }
      });
    });

    /* Share */
    container.querySelectorAll('.nodo-action-share[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var url = location.origin + '/nodo-hilo.html?id=' + btn.getAttribute('data-hilo');
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url).then(function () { window.NODO.showToast('URL copiada al portapapeles.'); });
        } else {
          window.NODO.showToast(url);
        }
      });
    });

    /* Report */
    container.querySelectorAll('.nodo-action-report[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hilo_id = btn.getAttribute('data-hilo');
        var motivos = ['Spam', 'Contenido inapropiado', 'Desinformación', 'Acoso', 'Otro'];
        var sel = prompt('¿Por qué reportas?\n' + motivos.map(function (m, i) { return (i + 1) + '. ' + m; }).join('\n'));
        if (!sel) return;
        var idx = parseInt(sel) - 1;
        reportHilo(hilo_id, motivos[idx] || sel);
      });
    });

    /* Follow */
    container.querySelectorAll('.nodo-post-follow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        btn.textContent = btn.classList.toggle('following') ? '✓ Siguiendo' : '+ Seguir';
      });
    });
  }

  /* ── Bind composer ──────────────────────────────────────────────────────── */
  function bindComposer() {
    var submitBtn = document.getElementById('btn-composer-publicar') || document.querySelector('.nodo-composer-submit');
    if (!submitBtn || submitBtn.dataset.bound) return;
    submitBtn.dataset.bound = '1';

    submitBtn.addEventListener('click', async function () {
      if (!window.NODO_USER) {
        window.location.href = '/auth.html?redirect=/nodo.html';
        return;
      }
      var textarea    = document.getElementById('composer-textarea') || document.querySelector('.nodo-composer-textarea');
      var activeType  = document.querySelector('.nodo-type-btn.active');
      var activeSpace = document.querySelector('#sidebar-espacios .nodo-space-item.active');
      var categoriaId = activeSpace ? activeSpace.getAttribute('data-cat-id') : null;
      var contenido   = textarea ? textarea.value.trim() : '';
      if (!contenido) { window.NODO.showToast('Escribe algo antes de publicar.', 'error'); return; }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Publicando…';
      var hilo = await createHilo({
        contenido:    contenido,
        tipo:         activeType ? activeType.dataset.type : 'insight',
        categoria_id: categoriaId,
      });
      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar';

      if (hilo) {
        if (textarea) textarea.value = '';
        var expanded = document.getElementById('composerExpanded');
        if (expanded) expanded.classList.remove('open');
        var container = document.getElementById('feed-principal') || document.querySelector('.nodo-posts');
        if (container) {
          var html = renderPost(hilo, [], 0);
          var tmp  = document.createElement('div');
          tmp.innerHTML = html;
          var sentinel = container.querySelector('#feed-sentinel');
          var lm       = container.querySelector('.nodo-load-more');
          while (tmp.firstChild) {
            if (sentinel) container.insertBefore(tmp.firstChild, sentinel);
            else if (lm) container.insertBefore(tmp.firstChild, lm);
            else container.prepend(tmp.firstChild);
          }
          bindFeedEvents(container);
        }
      }
    });
  }

  /* ── Update composer avatar ─────────────────────────────────────────────── */
  function updateComposerAvatar() {
    var avatar = document.getElementById('composer-avatar') || document.querySelector('.nodo-composer-avatar');
    if (!avatar || !window.NODO_USER) return;
    avatar.textContent = window.NODO.initials(window.NODO_USER.display_name);
  }

  /* ── Tab switching ──────────────────────────────────────────────────────── */
  var currentTab = 'inicio';
  var currentCat = null;

  function bindTabs() {
    document.querySelectorAll('.nodo-tab').forEach(function (tab) {
      if (tab.dataset.fbound) return;
      tab.dataset.fbound = '1';
      tab.addEventListener('click', async function () {
        document.querySelectorAll('.nodo-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        currentTab = tab.dataset.tab;
        var container = document.getElementById('feed-principal') || document.querySelector('.nodo-posts');
        if (container) {
          var s  = container.querySelector('#feed-sentinel');
          var lm = container.querySelector('.nodo-load-more');
          container.innerHTML = '';
          if (s)  container.appendChild(s);
          if (lm) container.appendChild(lm);
          var loading = document.createElement('div');
          loading.className = 'feed-loading';
          loading.textContent = 'Cargando…';
          container.insertBefore(loading, container.firstChild);
        }
        var hilos = await loadHilos(currentTab, currentCat);
        await renderFeed(hilos);
      });
    });
  }

  /* ── Load more ──────────────────────────────────────────────────────────── */
  var loadedOffset = 0;

  function bindLoadMore() {
    var btn = document.querySelector('.nodo-load-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async function () {
      btn.textContent = 'Cargando…';
      loadedOffset += 20;
      try {
        var query = sb()
          .from('foro_hilos')
          .select('*,foro_categorias(nombre,slug,icono,color)')
          .eq('estado', 'activo')
          .order('created_at', { ascending: false })
          .range(loadedOffset, loadedOffset + 19);
        if (currentCat) query = query.eq('categoria_id', currentCat);
        var result = await query;
        var rows = result.data;
        if (rows && rows.length) {
          var container  = document.getElementById('feed-principal') || document.querySelector('.nodo-posts');
          var myLikedIds = await getMyLikes(rows.map(function (h) { return h.id; }));
          var html = '';
          for (var i = 0; i < rows.length; i++) html += renderPost(rows[i], myLikedIds, loadedOffset + i);
          var tmp = document.createElement('div');
          tmp.innerHTML = html;
          var sentinel = container.querySelector('#feed-sentinel');
          var lm       = container.querySelector('.nodo-load-more');
          while (tmp.firstChild) {
            if (sentinel) container.insertBefore(tmp.firstChild, sentinel);
            else if (lm) container.insertBefore(tmp.firstChild, lm);
            else container.appendChild(tmp.firstChild);
          }
          bindFeedEvents(container);
        } else {
          window.NODO.showToast('No hay más aportes.');
        }
      } catch (_) { window.NODO.showToast('Error al cargar más.', 'error'); }
      btn.textContent = 'Cargar más aportes';
    });
  }

  /* ── Main init ──────────────────────────────────────────────────────────── */
  async function initForo() {
    var container = document.getElementById('feed-principal') || document.querySelector('.nodo-posts');
    if (container) {
      var s  = container.querySelector('#feed-sentinel');
      var lm = container.querySelector('.nodo-load-more');
      container.innerHTML = '<div class="feed-loading">Cargando aportes…</div>';
      if (s)  container.appendChild(s);
      if (lm) container.appendChild(lm);
    }
    var hilos = await loadHilos('inicio');
    await renderFeed(hilos);
    updateComposerAvatar();
    bindComposer();
    bindTabs();
    bindLoadMore();
  }

  window.NODO = window.NODO || {};
  window.NODO.foro = {
    loadHilos:       loadHilos,
    createHilo:      createHilo,
    toggleLike:      toggleLike,
    reportHilo:      reportHilo,
    loadRespuestas:  loadRespuestas,
    createRespuesta: createRespuesta,
    renderFeed:      renderFeed,
    renderPost:      renderPost,
    initForo:        initForo,
  };
})();
