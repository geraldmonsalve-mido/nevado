/* NEVADO — NODO Foro v2.1
   FIX 3A: order by created_at desc (already correct)
   FIX 3B: rank image avatars
   FIX 3C: Lvl.N display next to name
   FIX 3D: likes via foro_likes table
   FIX 3E: inline comments toggle
   FIX 3F: report toast (no prompt/alert) */
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

  /* ── Rank helpers (FIX 3B, 3C) ─────────────────────────────────────────── */
  var RANK_IMGS = {
    cachorro:       '/rangos/rango1-cachorro-bronce-sm.webp',
    explorador:     '/rangos/rango2-explorador-bronce-sm.webp',
    guardian:       '/rangos/rango3-guardian-plata-sm.webp',
    montanista:     '/rangos/rango4-montanista-plata-sm.webp',
    guia:           '/rangos/rango5-guia-plata-sm.webp',
    protector:      '/rangos/rango6-protector-oro-sm.webp',
    leyenda_andina: '/rangos/rango7-leyendaandina-oro-joyas-sm.webp',
  };

  var RANK_LEVELS = {
    cachorro: 1, explorador: 5, guardian: 10,
    montanista: 20, guia: 30, protector: 50, leyenda_andina: 170,
  };

  function rankImg(rankKey) {
    return RANK_IMGS[(rankKey || 'cachorro').toLowerCase()] || RANK_IMGS.cachorro;
  }

  function rankToLevel(rankKey) {
    return RANK_LEVELS[(rankKey || 'cachorro').toLowerCase()] || 1;
  }

  /* ── Load feed (FIX 3A: created_at desc confirmed) ──────────────────────── */
  async function loadHilos(tab, categoriaId) {
    try {
      var client = sb();
      if (!client) return [];
      var query;
      if (tab === 'destacado') {
        query = client
          .from('foro_hilos')
          .select('*,foro_categorias(nombre,slug,icono,color)')
          .neq('estado', 'eliminado')
          .eq('es_destacado', true)
          .order('likes', { ascending: false })
          .limit(20);
      } else {
        query = client
          .from('foro_hilos')
          .select('*,foro_categorias(nombre,slug,icono,color)')
          .neq('estado', 'eliminado')
          .order('created_at', { ascending: false })
          .limit(20);
      }
      if (categoriaId) query = query.eq('categoria_id', categoriaId);
      var result = await query;
      return Array.isArray(result.data) ? result.data : [];
    } catch (_) { return []; }
  }

  /* ── Tipo mapping ───────────────────────────────────────────────────────── */
  var TIPO_DB_MAP = {
    insight: 'aporte', recurso: 'aporte', experiencia: 'aporte',
    oportunidad: 'anuncio', pregunta: 'pregunta',
    aporte: 'aporte', anuncio: 'anuncio', evento: 'evento',
  };

  /* ── Create hilo ────────────────────────────────────────────────────────── */
  async function createHilo(data) {
    var check = window.NODO.canPost();
    if (!check.ok) { window.NODO.showToast(check.reason, 'error'); return null; }
    var u = window.NODO_USER;
    var contenido = String(data.contenido || '').trim();
    if (!contenido || contenido.length < 3) { window.NODO.showToast('Escribe al menos 3 caracteres.', 'error'); return null; }
    if (contenido.length > 1200) { window.NODO.showToast('Máximo 1,200 caracteres.', 'error'); return null; }
    var payload = {
      profile_id:   u.profile_id,
      autor_nombre: u.display_name || 'Usuario',
      autor_avatar: u.avatar_url || null,
      autor_rank:   u.rank_key || 'cachorro',
      contenido:    contenido,
      tipo:         TIPO_DB_MAP[data.tipo || 'aporte'] || 'aporte',
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

  /* ── Toggle like (FIX 6A) — maybeSingle + console.error ───────────────── */
  async function toggleLike(hilo_id, btnEl) {
    if (!window.NODO_USER) {
      window.location.href = '/auth.html?redirect=/nodo.html';
      return;
    }
    var profileId = window.NODO_USER.profile_id;
    try {
      var { data: existing, error: fetchErr } = await sb()
        .from('foro_likes')
        .select('id')
        .eq('profile_id', profileId)
        .eq('hilo_id', hilo_id)
        .maybeSingle();
      if (fetchErr) { console.error('[NODO] toggleLike fetch:', fetchErr); throw fetchErr; }

      var isNowLiked;
      if (existing) {
        var { error: delErr } = await sb().from('foro_likes').delete().eq('id', existing.id);
        if (delErr) { console.error('[NODO] toggleLike delete:', delErr); throw delErr; }
        isNowLiked = false;
      } else {
        var { error: insErr } = await sb().from('foro_likes').insert({ profile_id: profileId, hilo_id: hilo_id });
        if (insErr) { console.error('[NODO] toggleLike insert:', insErr); throw insErr; }
        isNowLiked = true;
      }

      /* Sync count with count=exact,head=true — no row data transferred */
      var { count: likeCount, error: cntErr } = await sb()
        .from('foro_likes')
        .select('*', { count: 'exact', head: true })
        .eq('hilo_id', hilo_id);
      if (cntErr) console.error('[NODO] toggleLike count:', cntErr);
      var newCount = typeof likeCount === 'number' ? likeCount : 0;
      await sb().from('foro_hilos').update({ likes: newCount }).eq('id', hilo_id);

      /* Update DOM */
      if (btnEl) {
        var span = btnEl.querySelector('span');
        if (span) span.textContent = newCount;
        btnEl.classList.toggle('active', isNowLiked);
        var svg  = btnEl.querySelector('svg');
        var path = btnEl.querySelector('path');
        if (svg) svg.setAttribute('fill', isNowLiked ? 'currentColor' : 'none');
        if (path) {
          if (isNowLiked) { path.removeAttribute('stroke'); path.removeAttribute('stroke-width'); }
          else { path.setAttribute('stroke', 'currentColor'); path.setAttribute('stroke-width', '1.1'); }
        }
      }
    } catch (_) {
      window.NODO.showToast('Error al procesar like.', 'error');
    }
  }

  /* ── Get my likes from foro_likes ─────────────────────────────────────── */
  async function getMyLikes(hilo_ids) {
    if (!window.NODO_USER || !hilo_ids.length) return [];
    try {
      var result = await sb()
        .from('foro_likes')
        .select('hilo_id')
        .eq('profile_id', window.NODO_USER.profile_id)
        .in('hilo_id', hilo_ids);
      return (result.data || []).map(function (r) { return r.hilo_id; });
    } catch (_) { return []; }
  }

  /* ── Report (FIX 5B) — modal con motivos ────────────────────────────────── */
  function reportarHilo(hilo_id, btnEl) {
    if (!window.NODO_USER) {
      window.location.href = '/auth.html?redirect=/nodo.html';
      return;
    }

    var MOTIVOS = [
      'Contenido inapropiado',
      'Desinformación o fake news',
      'Spam o publicidad no autorizada',
      'Acoso o contenido ofensivo',
      'Contenido fuera de tema',
      'Otro',
    ];

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);' +
      'z-index:9999;display:flex;align-items:center;justify-content:center;';

    var radioRows = MOTIVOS.map(function (m) {
      return '<label style="display:flex;align-items:center;gap:10px;cursor:pointer;' +
        'padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.08);transition:background .15s;">' +
        '<input type="radio" name="motivo-reporte" value="' + esc(m) + '" style="accent-color:#E74C3C;">' +
        '<span style="color:rgba(255,255,255,.8);font-size:13px;">' + esc(m) + '</span>' +
        '</label>';
    }).join('');

    overlay.innerHTML =
      '<div style="background:#0D0D14;border:1px solid rgba(255,255,255,.12);' +
        'border-radius:18px;padding:32px;max-width:400px;width:90%;font-family:inherit;">' +
        '<h3 style="color:#fff;margin:0 0 8px;font-size:16px;">Reportar publicación</h3>' +
        '<p style="color:rgba(255,255,255,.5);font-size:13px;margin:0 0 20px;">Selecciona el motivo del reporte:</p>' +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-bottom:20px;">' + radioRows + '</div>' +
        '<p id="reporte-error" style="color:#E74C3C;font-size:12px;margin:0 0 12px;display:none;">Selecciona un motivo.</p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="btn-cancelar-reporte" style="background:rgba(255,255,255,.06);' +
            'border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);' +
            'padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;">Cancelar</button>' +
          '<button id="btn-confirmar-reporte" style="background:#E74C3C;border:none;' +
            'color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">Reportar</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancelar-reporte').onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelector('#btn-confirmar-reporte').onclick = async function () {
      var motivoEl = overlay.querySelector('input[name="motivo-reporte"]:checked');
      if (!motivoEl) {
        var errEl = overlay.querySelector('#reporte-error');
        if (errEl) errEl.style.display = '';
        return;
      }
      var motivo = motivoEl.value;
      overlay.remove();

      if (btnEl) {
        var sp = btnEl.querySelector('span');
        if (sp) sp.textContent = '✓ Reportado';
        btnEl.style.color = '#E74C3C';
        btnEl.style.pointerEvents = 'none';
      }

      var toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);' +
        'background:#1a1a1a;border:1px solid rgba(255,255,255,.12);color:#fff;' +
        'padding:12px 24px;border-radius:12px;font-size:13px;z-index:9999;pointer-events:none;';
      toast.textContent = 'Reporte enviado: "' + motivo + '". El equipo lo revisará.';
      document.body.appendChild(toast);
      setTimeout(function () { toast.remove(); }, 3500);

      try {
        await sb().from('foro_reportes').insert({
          reportante_id: window.NODO_USER.profile_id,
          hilo_id:       hilo_id,
          motivo:        motivo,
        });
      } catch (_) {}
    };
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
  async function createRespuesta(hilo_id, contenido) {
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
      var result = await sb().from('foro_respuestas').insert(payload).select().single();
      if (result.error) throw result.error;
      /* FIX 6B: sync respuestas count from DB */
      try {
        var { count: rc, error: rcErr } = await sb()
          .from('foro_respuestas')
          .select('*', { count: 'exact', head: true })
          .eq('hilo_id', hilo_id)
          .eq('estado', 'activo');
        if (rcErr) console.error('[NODO] createRespuesta count:', rcErr);
        if (typeof rc === 'number') {
          await sb().from('foro_hilos').update({ respuestas: rc }).eq('id', hilo_id);
          result.data._respuestasCount = rc;
        }
      } catch (_) {}
      return result.data;
    } catch (_) {
      window.NODO.showToast('Error al responder.', 'error');
      return null;
    }
  }

  /* ── Toggle comments inline (FIX 3E) ───────────────────────────────────── */
  async function toggleComments(hilo_id, articleEl, replyBtn) {
    var existing = articleEl.querySelector('.comments-section');
    if (existing) { existing.remove(); return; }

    var section = document.createElement('div');
    section.className = 'comments-section';
    section.style.cssText = 'padding:16px;border-top:1px solid rgba(255,255,255,.06);';
    articleEl.appendChild(section);

    var respuestas = await loadRespuestas(hilo_id);

    var commentsHtml = respuestas.length
      ? respuestas.map(function (r) {
          return '<div style="display:flex;gap:10px;margin-bottom:12px;">' +
            '<div style="font-size:12px;flex:1;">' +
              '<strong style="color:rgba(232,228,220,.9);">' + esc(r.autor_nombre || 'Usuario') + '</strong>' +
              '<span style="color:rgba(255,255,255,.35);margin-left:6px;font-size:11px;">Lvl.' + (r.autor_nivel || rankToLevel(r.autor_rank)) + '</span>' +
              '<p style="color:rgba(232,228,220,.75);margin:4px 0 0;">' + esc(r.contenido) + '</p>' +
            '</div></div>';
        }).join('')
      : '<p style="color:rgba(255,255,255,.3);font-size:13px;margin:0 0 12px;">Sin comentarios aún.</p>';

    var inputHtml = window.NODO_USER
      ? '<div class="comment-input-row" style="display:flex;gap:8px;margin-top:12px;">' +
          '<input class="comment-input" placeholder="Escribe un comentario…" ' +
            'style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);' +
            'border-radius:8px;padding:8px 12px;color:#fff;font-size:13px;outline:none;" />' +
          '<button class="comment-send" style="background:#E74C3C;border:none;border-radius:8px;' +
            'padding:8px 16px;color:#fff;font-size:13px;cursor:pointer;">Enviar</button>' +
        '</div>'
      : '<p style="color:rgba(255,255,255,.3);font-size:12px;margin:8px 0 0;">Inicia sesión para comentar.</p>';

    section.innerHTML = commentsHtml + inputHtml;

    var sendBtn = section.querySelector('.comment-send');
    var input   = section.querySelector('.comment-input');
    if (sendBtn && input) {
      sendBtn.onclick = async function () {
        var texto = input.value.trim();
        if (texto.length < 3) return;
        sendBtn.disabled = true;
        var resp = await createRespuesta(hilo_id, texto);
        if (resp) {
          input.value = '';
          var item = document.createElement('div');
          item.style.cssText = 'display:flex;gap:10px;margin-bottom:12px;';
          item.innerHTML =
            '<div style="font-size:12px;flex:1;">' +
              '<strong style="color:rgba(232,228,220,.9);">' + esc(window.NODO_USER.display_name) + '</strong>' +
              '<span style="color:rgba(255,255,255,.35);margin-left:6px;font-size:11px;">Lvl.' + (window.NODO_USER.level || rankToLevel(window.NODO_USER.rank_key)) + '</span>' +
              '<p style="color:rgba(232,228,220,.75);margin:4px 0 0;">' + esc(texto) + '</p>' +
            '</div>';
          var inputRow = section.querySelector('.comment-input-row');
          if (inputRow) section.insertBefore(item, inputRow);
          else section.appendChild(item);
          if (replyBtn) {
            var rcSpan = replyBtn.querySelector('span');
            if (rcSpan) {
              rcSpan.textContent = typeof resp._respuestasCount === 'number'
                ? resp._respuestasCount
                : parseInt(rcSpan.textContent || '0') + 1;
            }
          }
        }
        sendBtn.disabled = false;
      };
      input.onkeydown = function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
      };
    }
  }

  /* ── Render post card (FIX 3B, 3C) ─────────────────────────────────────── */
  function renderPost(hilo, myLikedIds, idx) {
    var nombre     = esc(hilo.autor_nombre || 'Usuario');
    var rankKey    = (hilo.autor_rank || 'cachorro').toLowerCase();
    var img        = rankImg(rankKey);
    var lvl        = hilo.autor_nivel || rankToLevel(rankKey);
    var badgeClass = window.NODO.tipoBadgeClass(hilo.tipo);
    var tipoLbl    = window.NODO.tipoLabel(hilo.tipo).toUpperCase();
    var time       = window.NODO.formatTime(hilo.created_at);
    var liked      = myLikedIds.indexOf(hilo.id) !== -1;
    var catPart    = hilo.foro_categorias ? esc(hilo.foro_categorias.nombre) + ' · ' : '';

    var avatarHtml =
      '<img src="' + esc(img) + '" class="nodo-post-avatar-img" ' +
      'style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;" ' +
      'onerror="this.onerror=null;this.style.display=\'none\'" alt="' + esc(rankKey) + '">';

    return '<article class="nodo-post" style="--post-i:' + idx + '" data-hilo-id="' + hilo.id + '">' +
      '<div class="nodo-post-header">' +
        avatarHtml +
        '<div class="nodo-post-meta">' +
          '<div class="nodo-post-name">' + nombre +
            ' <span class="nodo-post-level">Lvl.' + lvl + '</span>' +
            ' <span class="nodo-post-badge ' + badgeClass + '">' + tipoLbl + '</span>' +
          '</div>' +
          '<div class="nodo-post-sub">' + catPart + time + '</div>' +
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
    /* Like (FIX 3D) */
    container.querySelectorAll('.nodo-action-like[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        toggleLike(btn.getAttribute('data-hilo'), btn);
      });
    });

    /* Comments inline (FIX 3E) */
    container.querySelectorAll('.nodo-action-reply[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var article = btn.closest('article.nodo-post');
        if (article) toggleComments(btn.getAttribute('data-hilo'), article, btn);
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

    /* Report (FIX 3F) */
    container.querySelectorAll('.nodo-action-report[data-hilo]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        reportarHilo(btn.getAttribute('data-hilo'), btn);
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

  /* ── Update composer avatar (FIX 4E) ───────────────────────────────────── */
  function updateComposerAvatar() {
    var avatar = document.getElementById('composer-avatar') || document.querySelector('.nodo-composer-avatar');
    if (!avatar || !window.NODO_USER) return;
    var rk = (window.NODO_USER.rank_key || 'cachorro').toLowerCase();
    if (avatar.tagName === 'IMG') {
      avatar.src = rankImg(rk);
      avatar.alt = rk;
    } else {
      avatar.textContent = window.NODO.initials(window.NODO_USER.display_name);
    }
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
          .neq('estado', 'eliminado')
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

  /* ── Modal crear espacio (FIX 6C) ──────────────────────────────────────── */
  function mostrarModalCrearEspacio() {
    if (!window.NODO_USER) {
      window.location.href = '/auth.html?redirect=/nodo.html';
      return;
    }

    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);' +
      'z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);';

    overlay.innerHTML =
      '<div style="background:rgba(13,13,20,.97);border:1px solid rgba(255,255,255,.12);' +
        'border-radius:18px;padding:32px;max-width:380px;width:90%;font-family:Geist,sans-serif;' +
        'backdrop-filter:blur(24px);">' +
        '<h3 style="color:#fff;margin:0 0 6px;font-size:16px;font-weight:600;">Crear espacio</h3>' +
        '<p style="color:rgba(255,255,255,.45);font-size:13px;margin:0 0 20px;">Dale un nombre al nuevo espacio de la comunidad.</p>' +
        '<input id="nuevo-espacio-nombre" placeholder="Nombre del espacio…" maxlength="40" ' +
          'style="width:100%;box-sizing:border-box;background:rgba(255,255,255,.06);' +
          'border:1px solid rgba(255,255,255,.14);color:#fff;border-radius:10px;' +
          'padding:10px 14px;font-size:14px;outline:none;margin-bottom:8px;" />' +
        '<p id="crear-espacio-error" style="color:#E74C3C;font-size:12px;margin:0 0 16px;display:none;"></p>' +
        '<div style="display:flex;gap:10px;justify-content:flex-end;">' +
          '<button id="btn-cancelar-espacio" style="background:rgba(255,255,255,.06);' +
            'border:1px solid rgba(255,255,255,.12);color:rgba(255,255,255,.6);' +
            'padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;">Cancelar</button>' +
          '<button id="btn-confirmar-espacio" style="background:#E74C3C;border:none;' +
            'color:#fff;padding:10px 20px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;">Crear</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);

    var inputEl    = overlay.querySelector('#nuevo-espacio-nombre');
    var errorEl    = overlay.querySelector('#crear-espacio-error');
    var cancelBtn  = overlay.querySelector('#btn-cancelar-espacio');
    var confirmBtn = overlay.querySelector('#btn-confirmar-espacio');

    cancelBtn.onclick = function () { overlay.remove(); };
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    setTimeout(function () { if (inputEl) inputEl.focus(); }, 60);

    confirmBtn.onclick = async function () {
      var nombre = inputEl ? inputEl.value.trim() : '';
      if (nombre.length < 2) {
        errorEl.textContent = 'El nombre debe tener al menos 2 caracteres.';
        errorEl.style.display = '';
        return;
      }
      var slug = nombre.toLowerCase()
        .replace(/[áàä]/g, 'a').replace(/[éèë]/g, 'e').replace(/[íìï]/g, 'i')
        .replace(/[óòö]/g, 'o').replace(/[úùü]/g, 'u').replace(/ñ/g, 'n')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || ('espacio-' + Date.now());

      confirmBtn.disabled = true;
      confirmBtn.textContent = 'Creando…';

      try {
        var { error: insErr } = await sb().from('foro_categorias').insert({
          nombre: nombre,
          slug:   slug,
          activo: true,
        });
        if (insErr) { console.error('[NODO] crear espacio:', insErr); throw insErr; }
        overlay.remove();
        window.NODO.showToast('Espacio "' + nombre + '" creado.');
        /* Optimistic sidebar update — loadEspacios() lives in nodo-init.js */
        var lista = document.getElementById('sidebar-espacios');
        if (lista) {
          var li = document.createElement('li');
          li.className = 'nodo-space-item';
          li.innerHTML = '<span class="nodo-space-pulse"></span>' +
            '<span class="nodo-space-name">' + esc(nombre) + '</span>' +
            '<span class="nodo-space-count" style="color:#E74C3C;">◉</span>';
          lista.appendChild(li);
        }
      } catch (err) {
        errorEl.textContent = (err && err.message) || 'Error al crear el espacio.';
        errorEl.style.display = '';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Crear';
      }
    };

    inputEl.onkeydown = function (e) {
      if (e.key === 'Enter') { e.preventDefault(); confirmBtn.click(); }
    };
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
    loadHilos:                loadHilos,
    createHilo:               createHilo,
    toggleLike:               toggleLike,
    reportarHilo:             reportarHilo,
    loadRespuestas:           loadRespuestas,
    createRespuesta:          createRespuesta,
    renderFeed:               renderFeed,
    renderPost:               renderPost,
    initForo:                 initForo,
    rankToLevel:              rankToLevel,
    rankImg:                  rankImg,
    mostrarModalCrearEspacio: mostrarModalCrearEspacio,
  };
})();
