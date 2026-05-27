/* NEVADO — NODO Foro v1.0
   Maneja hilos, respuestas, reacciones y reportes del foro.
   Requiere nodo-core.js cargado antes. */
(function () {
  'use strict';

  function waitForNodo(cb) {
    if (window.NODO && window.NODO.state.ready) { cb(); return; }
    document.addEventListener('nodo:ready', cb, { once: true });
  }

  /* ── Author cache ────────────────────────────────────────────────────── */
  var authorCache = {};

  async function loadAuthor(clerk_id) {
    if (authorCache[clerk_id]) return authorCache[clerk_id];
    try {
      var res = await fetch('/api/usuario?clerk_id=' + encodeURIComponent(clerk_id));
      if (res.ok) {
        var u = await res.json();
        authorCache[clerk_id] = u;
        return u;
      }
    } catch (_) {}
    return { nombre: 'Usuario', rango: 'Cachorro', clerk_id: clerk_id };
  }

  /* ── Load feed ──────────────────────────────────────────────────────── */
  async function loadHilos(tab, espacio) {
    var params = 'eliminado=eq.false&order=creado_en.desc&limit=20';
    if (espacio) params += '&espacio=eq.' + encodeURIComponent(espacio);
    if (tab === 'destacado') params = 'eliminado=eq.false&order=likes.desc&limit=20';
    if (tab === 'reciente')  params = 'eliminado=eq.false&order=creado_en.desc&limit=20';
    if (tab === 'siguiendo') params = 'eliminado=eq.false&order=creado_en.desc&limit=20';

    try {
      var hilos = await window.NODO.sb.select('foro_hilos', params);
      return Array.isArray(hilos) ? hilos : [];
    } catch (_) {
      return [];
    }
  }

  /* ── Create hilo ────────────────────────────────────────────────────── */
  async function createHilo(data) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }

    var payload = {
      autor_clerk_id: window.NODO.state.user.clerk_id,
      contenido:      String(data.contenido || '').trim(),
      tipo:           data.tipo || 'insight',
      tags:           Array.isArray(data.tags) ? data.tags : [],
      espacio:        data.espacio || null,
    };
    if (!payload.contenido) { window.NODO.showToast('El contenido no puede estar vacío.', 'error'); return null; }
    if (payload.contenido.length > 3000) { window.NODO.showToast('Máximo 3,000 caracteres.', 'error'); return null; }

    try {
      var row = await window.NODO.sb.insert('foro_hilos', payload);
      var hilo = Array.isArray(row) ? row[0] : row;
      await window.NODO.addReputacion('publicar_hilo');
      window.NODO.showToast('Aporte publicado.');
      return hilo;
    } catch (e) {
      window.NODO.showToast('Error al publicar. Inténtalo de nuevo.', 'error');
      return null;
    }
  }

  /* ── Toggle like ────────────────────────────────────────────────────── */
  async function toggleLike(hilo_id) {
    if (!window.NODO.state.user) { window.NODO.showToast('Inicia sesión para reaccionar.', 'error'); return false; }
    var clerk_id = window.NODO.state.user.clerk_id;

    /* Check existing */
    try {
      var existing = await window.NODO.sb.select('foro_reacciones',
        'clerk_id=eq.' + encodeURIComponent(clerk_id) +
        '&tipo=eq.like&hilo_id=eq.' + hilo_id
      );
      if (Array.isArray(existing) && existing.length > 0) {
        /* Unlike */
        await window.NODO.sb.delete('foro_reacciones',
          'clerk_id=eq.' + encodeURIComponent(clerk_id) +
          '&tipo=eq.like&hilo_id=eq.' + hilo_id
        );
        await window.NODO.sb.update('foro_hilos', 'id=eq.' + hilo_id, {
          likes: Math.max(0, (existing[0].hilo_likes || 1) - 1),
        });
        return false;
      } else {
        /* Like */
        await window.NODO.sb.insert('foro_reacciones', { clerk_id, tipo: 'like', hilo_id });
        /* Increment likes counter via RPC or update */
        var hilos = await window.NODO.sb.select('foro_hilos', 'id=eq.' + hilo_id + '&select=likes');
        var cur = (hilos && hilos[0] && hilos[0].likes) || 0;
        await window.NODO.sb.update('foro_hilos', 'id=eq.' + hilo_id, { likes: cur + 1 });
        await window.NODO.addReputacion('recibir_like');
        return true;
      }
    } catch (_) {
      return false;
    }
  }

  /* ── Check my like ──────────────────────────────────────────────────── */
  async function getMyLikes(hilo_ids) {
    if (!window.NODO.state.user || !hilo_ids.length) return [];
    try {
      var rows = await window.NODO.sb.select('foro_reacciones',
        'clerk_id=eq.' + encodeURIComponent(window.NODO.state.user.clerk_id) +
        '&tipo=eq.like' +
        '&hilo_id=in.(' + hilo_ids.join(',') + ')'
      );
      return Array.isArray(rows) ? rows.map(function (r) { return r.hilo_id; }) : [];
    } catch (_) { return []; }
  }

  /* ── Report ─────────────────────────────────────────────────────────── */
  async function reportHilo(hilo_id, motivo) {
    if (!window.NODO.state.user) { window.NODO.showToast('Debes iniciar sesión para reportar.', 'error'); return; }
    try {
      await window.NODO.sb.insert('foro_reportes', {
        reportante_clerk_id: window.NODO.state.user.clerk_id,
        hilo_id: hilo_id,
        motivo: motivo,
      });
      window.NODO.showToast('Reporte enviado. El equipo lo revisará.');
    } catch (_) {
      window.NODO.showToast('Error al enviar reporte.', 'error');
    }
  }

  /* ── Load respuestas ────────────────────────────────────────────────── */
  async function loadRespuestas(hilo_id) {
    try {
      var rows = await window.NODO.sb.select('foro_respuestas',
        'hilo_id=eq.' + hilo_id + '&eliminado=eq.false&order=creado_en.asc'
      );
      return Array.isArray(rows) ? rows : [];
    } catch (_) { return []; }
  }

  /* ── Create respuesta ───────────────────────────────────────────────── */
  async function createRespuesta(hilo_id, contenido, parent_id) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }
    if (!String(contenido || '').trim()) { window.NODO.showToast('Respuesta vacía.', 'error'); return null; }

    try {
      var payload = {
        hilo_id: hilo_id,
        autor_clerk_id: window.NODO.state.user.clerk_id,
        contenido: String(contenido).trim(),
      };
      if (parent_id) payload.parent_id = parent_id;
      var row = await window.NODO.sb.insert('foro_respuestas', payload);
      /* Increment counter */
      var h = await window.NODO.sb.select('foro_hilos', 'id=eq.' + hilo_id + '&select=respuestas_count');
      var cur = (h && h[0] && h[0].respuestas_count) || 0;
      await window.NODO.sb.update('foro_hilos', 'id=eq.' + hilo_id, { respuestas_count: cur + 1 });
      await window.NODO.addReputacion('responder');
      return Array.isArray(row) ? row[0] : row;
    } catch (_) {
      window.NODO.showToast('Error al responder.', 'error');
      return null;
    }
  }

  /* ── Render post card ──────────────────────────────────────────────── */
  async function renderPost(hilo, author, myLikedIds, idx) {
    var e  = window.NODO.escapeHtml;
    var ti = window.NODO.initials(author ? author.nombre : '?');
    var badgeClass = window.NODO.tipoBadgeClass(hilo.tipo);
    var tipoLbl    = window.NODO.tipoLabel(hilo.tipo);
    var time       = window.NODO.formatTime(hilo.creado_en);
    var liked      = myLikedIds.indexOf(hilo.id) !== -1;
    var tags       = (hilo.tags || []).map(function (t) {
      return '<span class="nodo-post-tag">#' + e(t) + '</span>';
    }).join('');

    var nombre = author ? e(author.nombre) : 'Usuario';
    var rango  = author ? e(author.rango || 'Cachorro') : 'Cachorro';
    var espacio = hilo.espacio ? e(hilo.espacio) + ' · ' : '';

    return '<article class="nodo-post" style="--post-i:' + idx + '" data-hilo-id="' + hilo.id + '">' +
      '<div class="nodo-post-header">' +
        '<div class="nodo-post-avatar">' + e(ti) + '</div>' +
        '<div class="nodo-post-meta">' +
          '<div class="nodo-post-name">' + nombre +
            ' <span class="nodo-post-badge ' + badgeClass + '">' + tipoLbl + '</span>' +
          '</div>' +
          '<div class="nodo-post-sub">' + rango + ' · ' + espacio + time + '</div>' +
        '</div>' +
        '<button class="nodo-post-follow" data-clerk="' + e(hilo.autor_clerk_id) + '">+ Seguir</button>' +
      '</div>' +
      '<div class="nodo-post-body"><p>' + e(hilo.contenido).replace(/\n/g, '</p><p>') + '</p></div>' +
      (tags ? '<div class="nodo-post-tags">' + tags + '</div>' : '') +
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
          '<span>' + (hilo.respuestas_count || 0) + '</span>' +
        '</button>' +
        '<a class="nodo-post-action" href="/nodo-hilo.html?id=' + hilo.id + '">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
          '<span>Ver hilo</span>' +
        '</a>' +
        '<button class="nodo-post-action nodo-action-report" data-hilo="' + hilo.id + '">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 5v3M7 10h.01" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/><path d="M3.5 12.5l-1-10 4.5 2.5 4.5-2.5-1 10h-7z" stroke="currentColor" stroke-width="1.1" stroke-linejoin="round"/></svg>' +
          '<span>Reportar</span>' +
        '</button>' +
      '</div>' +
    '</article>';
  }

  /* ── Render feed ────────────────────────────────────────────────────── */
  async function renderFeed(hilos) {
    var container = document.querySelector('.nodo-posts');
    if (!container) return;

    if (!hilos.length) {
      container.innerHTML = '<div class="nodo-empty-feed">' +
        '<p>Sé el primero en publicar un aporte.</p>' +
        '</div>';
      return;
    }

    var hilo_ids    = hilos.map(function (h) { return h.id; });
    var myLikedIds  = await getMyLikes(hilo_ids);
    var authorProm  = hilos.map(function (h) { return loadAuthor(h.autor_clerk_id); });
    var authors     = await Promise.all(authorProm);

    var loadMore = container.querySelector('.nodo-load-more');
    /* Remove existing posts but keep load-more */
    Array.from(container.children).forEach(function (el) {
      if (!el.classList.contains('nodo-load-more')) el.remove();
    });

    var html = '';
    for (var i = 0; i < hilos.length; i++) {
      html += await renderPost(hilos[i], authors[i], myLikedIds, i);
    }

    var tmp = document.createElement('div');
    tmp.innerHTML = html;
    while (tmp.firstChild) {
      if (loadMore) container.insertBefore(tmp.firstChild, loadMore);
      else container.appendChild(tmp.firstChild);
    }

    bindFeedEvents(container);
  }

  /* ── Bind feed events ───────────────────────────────────────────────── */
  function bindFeedEvents(container) {
    /* Like */
    container.querySelectorAll('.nodo-action-like[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var hilo_id = btn.getAttribute('data-hilo');
        var liked = await toggleLike(hilo_id);
        var span  = btn.querySelector('span');
        var n     = parseInt(span.textContent) || 0;
        span.textContent = liked ? n + 1 : Math.max(0, n - 1);
        btn.classList.toggle('active', liked);
        var svg = btn.querySelector('svg');
        if (liked) {
          svg.setAttribute('fill', 'currentColor');
          svg.querySelector('path').removeAttribute('stroke');
        } else {
          svg.setAttribute('fill', 'none');
          svg.querySelector('path').setAttribute('stroke', 'currentColor');
          svg.querySelector('path').setAttribute('stroke-width', '1.1');
        }
      });
    });

    /* Report */
    container.querySelectorAll('.nodo-action-report[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var hilo_id = btn.getAttribute('data-hilo');
        var motivos = ['Spam','Contenido inapropiado','Desinformación','Acoso','Otro'];
        var sel = prompt('¿Por qué reportas este aporte?\n' + motivos.map(function (m, i) { return (i+1) + '. ' + m; }).join('\n'));
        if (!sel) return;
        var idx = parseInt(sel) - 1;
        var motivo = motivos[idx] || sel;
        reportHilo(hilo_id, motivo);
      });
    });

    /* Follow */
    container.querySelectorAll('.nodo-post-follow').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var following = btn.classList.toggle('following');
        btn.textContent = following ? '✓ Siguiendo' : '+ Seguir';
      });
    });
  }

  /* ── Bind composer ──────────────────────────────────────────────────── */
  function bindComposer() {
    var submitBtn = document.querySelector('.nodo-composer-submit');
    if (!submitBtn || submitBtn.dataset.bound) return;
    submitBtn.dataset.bound = '1';

    submitBtn.addEventListener('click', async function () {
      var textarea = document.querySelector('.nodo-composer-textarea');
      var activeType = document.querySelector('.nodo-type-btn.active');
      var tags = Array.from(document.querySelectorAll('.nodo-tag-pill')).map(function (t) {
        return t.textContent.replace(/^#/, '').trim();
      });
      var espacio = document.querySelector('.nodo-space-item.active .nodo-space-name');

      var contenido = textarea ? textarea.value.trim() : '';
      if (!contenido) {
        window.NODO.showToast('Escribe algo antes de publicar.', 'error');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Publicando…';

      var hilo = await createHilo({
        contenido: contenido,
        tipo:   activeType ? activeType.dataset.type : 'insight',
        tags:   tags,
        espacio: espacio ? espacio.textContent.trim() : null,
      });

      submitBtn.disabled = false;
      submitBtn.textContent = 'Publicar';

      if (hilo) {
        if (textarea) textarea.value = '';
        var expanded = document.getElementById('composerExpanded');
        if (expanded) expanded.classList.remove('open');
        /* Prepend new post to feed */
        var user = window.NODO.state.user;
        var container = document.querySelector('.nodo-posts');
        var loadMore  = container ? container.querySelector('.nodo-load-more') : null;
        var html = await renderPost(hilo, user, [], 0);
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        while (tmp.firstChild) {
          if (loadMore) container.insertBefore(tmp.firstChild, loadMore);
          else container.appendChild(tmp.firstChild);
        }
        bindFeedEvents(container);
      }
    });
  }

  /* ── Update composer avatar ─────────────────────────────────────────── */
  function updateComposerAvatar() {
    var avatar = document.querySelector('.nodo-composer-avatar');
    if (!avatar || !window.NODO.state.user) return;
    avatar.textContent = window.NODO.initials(window.NODO.state.user.nombre);
  }

  /* ── Tab switching ──────────────────────────────────────────────────── */
  function bindTabs() {
    document.querySelectorAll('.nodo-tab').forEach(function (tab) {
      if (tab.dataset.bound) return;
      tab.dataset.bound = '1';
      tab.addEventListener('click', async function () {
        document.querySelectorAll('.nodo-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        var loadMoreBtn = document.querySelector('.nodo-load-btn');
        if (loadMoreBtn) loadMoreBtn.textContent = 'Cargando…';
        var hilos = await loadHilos(tab.dataset.tab);
        await renderFeed(hilos);
        if (loadMoreBtn) loadMoreBtn.textContent = 'Cargar más aportes';
      });
    });
  }

  /* ── Space selection ────────────────────────────────────────────────── */
  function bindSpaces() {
    document.querySelectorAll('.nodo-space-item').forEach(function (item) {
      if (item.dataset.bound) return;
      item.dataset.bound = '1';
      item.addEventListener('click', async function () {
        document.querySelectorAll('.nodo-space-item').forEach(function (s) { s.classList.remove('active'); });
        item.classList.add('active');
        var name = item.querySelector('.nodo-space-name');
        var hilos = await loadHilos('inicio', name ? name.textContent.trim() : null);
        await renderFeed(hilos);
      });
    });
  }

  /* ── Load more ──────────────────────────────────────────────────────── */
  var loadedCount = 20;
  function bindLoadMore() {
    var btn = document.querySelector('.nodo-load-btn');
    if (!btn || btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', async function () {
      btn.textContent = 'Cargando…';
      loadedCount += 20;
      try {
        var rows = await window.NODO.sb.select('foro_hilos',
          'eliminado=eq.false&order=creado_en.desc&limit=20&offset=' + (loadedCount - 20)
        );
        if (rows && rows.length) await renderFeed(rows);
        else window.NODO.showToast('No hay más aportes.');
      } catch (_) {
        window.NODO.showToast('Error al cargar más.', 'error');
      }
      btn.textContent = 'Cargar más aportes';
    });
  }

  /* ── Main init ──────────────────────────────────────────────────────── */
  async function initForo() {
    var hilos = await loadHilos('inicio');
    await renderFeed(hilos);
    updateComposerAvatar();
    bindComposer();
    bindTabs();
    bindSpaces();
    bindLoadMore();
  }

  waitForNodo(function () {
    if (document.querySelector('.nodo-posts')) initForo();
  });

  /* ── Public API ─────────────────────────────────────────────────────── */
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
    loadAuthor:      loadAuthor,
  };
})();
