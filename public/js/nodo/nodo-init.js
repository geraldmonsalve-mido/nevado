/* NEVADO — NODO Init v2.0
   Métricas, categorías, shouts, tendencias, actividad en vivo. */
(function () {
  'use strict';

  var SB_URL = '';
  var SB_KEY = '';

  function initKeys() {
    SB_URL = window.NEVADO_SUPABASE_URL  || '';
    SB_KEY = window.NEVADO_SUPABASE_ANON_KEY || '';
  }

  function sbGet(path) {
    return fetch(SB_URL + '/rest/v1/' + path, {
      headers: {
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Accept':        'application/json',
      },
    }).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  function sbCountHeader(table, filter) {
    var url = SB_URL + '/rest/v1/' + table + '?select=id' + (filter ? '&' + filter : '');
    return fetch(url, {
      headers: {
        'apikey':        SB_KEY,
        'Authorization': 'Bearer ' + SB_KEY,
        'Accept':        'application/json',
        'Prefer':        'count=exact',
      },
    }).then(function (r) {
      var cr = r.headers.get('content-range') || '';
      return parseInt(cr.split('/')[1] || '0', 10) || 0;
    }).catch(function () { return 0; });
  }

  function esc(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* ── loadFeed ────────────────────────────────────────────────────────────── */
  async function loadFeed() {
    if (window.NODO && window.NODO.foro) {
      await window.NODO.foro.initForo();
    }
  }

  /* ── loadStats ───────────────────────────────────────────────────────────── */
  async function loadStats() {
    try {
      var n  = await sbCountHeader('profiles', '');
      var el = document.getElementById('stat-miembros');
      if (el && n) el.textContent = n.toLocaleString('es');
    } catch (_) {}
    try {
      var h   = await sbCountHeader('foro_hilos', 'estado=eq.activo');
      var el2 = document.getElementById('stat-hilos');
      if (el2 && h) el2.textContent = h.toLocaleString('es');
    } catch (_) {}
  }

  /* ── loadEspacios ────────────────────────────────────────────────────────── */
  async function loadEspacios() {
    var lista = document.getElementById('sidebar-espacios');
    if (!lista) return;
    try {
      var cats = await sbGet('foro_categorias?activo=eq.true&order=orden.asc');
      if (!Array.isArray(cats) || !cats.length) return;

      lista.innerHTML = cats.map(function (cat, i) {
        return '<li class="nodo-space-item' + (i === 0 ? ' active' : '') + '"' +
          ' data-cat-id="' + esc(cat.id) + '"' +
          ' data-cat-slug="' + esc(cat.slug) + '">' +
          '<span class="nodo-space-pulse"></span>' +
          '<span class="nodo-space-name">' + esc(cat.nombre) + '</span>' +
          '<span class="nodo-space-count" style="color:' + esc(cat.color || '#E74C3C') + '">' + esc(cat.icono || '◉') + '</span>' +
          '</li>';
      }).join('');

      lista.querySelectorAll('.nodo-space-item').forEach(function (item) {
        item.addEventListener('click', function () {
          lista.querySelectorAll('.nodo-space-item').forEach(function (s) { s.classList.remove('active'); });
          item.classList.add('active');
          var catId = item.getAttribute('data-cat-id');
          if (window.NODO && window.NODO.foro) {
            window.NODO.foro.loadHilos('inicio', catId || null).then(function (hilos) {
              window.NODO.foro.renderFeed(hilos);
            });
          }
        });
      });

      var allItems = lista.querySelectorAll('.nodo-space-item');
      if (allItems.length) {
        allItems[0].addEventListener('dblclick', function () {
          lista.querySelectorAll('.nodo-space-item').forEach(function (s) { s.classList.remove('active'); });
          allItems[0].classList.add('active');
          if (window.NODO && window.NODO.foro) {
            window.NODO.foro.loadHilos('inicio', null).then(function (hilos) {
              window.NODO.foro.renderFeed(hilos);
            });
          }
        });
      }
    } catch (_) {}
  }

  /* ── loadShouts ──────────────────────────────────────────────────────────── */
  async function loadShouts() {
    var track = document.getElementById('shoutsTrack');
    if (!track) return;
    try {
      var hilos = await sbGet(
        'foro_hilos?estado=eq.activo&order=created_at.desc&limit=6' +
        '&select=id,autor_nombre,contenido,tipo'
      );
      if (!Array.isArray(hilos) || !hilos.length) return;
      track.innerHTML = hilos.map(function (h) {
        var ini   = (h.autor_nombre || '?').split(' ').slice(0, 2).map(function (w) { return w[0] || ''; }).join('').toUpperCase();
        var texto = (h.contenido || '').slice(0, 110) + ((h.contenido || '').length > 110 ? '…' : '');
        return '<div class="nodo-shout">' +
          '<div class="nodo-shout-avatar">' + esc(ini) + '</div>' +
          '<div class="nodo-shout-body">' +
            '<div class="nodo-shout-name">' + esc(h.autor_nombre || 'Usuario') + '</div>' +
            '<div class="nodo-shout-text">' + esc(texto) + '</div>' +
          '</div></div>';
      }).join('');
    } catch (_) {}
  }

  /* ── Tendencias (por tipo de aporte, ya que tags no existe en schema) ───── */
  async function cargarTendencias() {
    var lista = document.getElementById('tendencias-lista');
    if (!lista) return;
    try {
      var hilos = await sbGet('foro_hilos?estado=eq.activo&order=created_at.desc&limit=100&select=tipo,likes');
      if (!Array.isArray(hilos) || !hilos.length) return;
      var counts = {};
      var likesMap = {};
      hilos.forEach(function (h) {
        var t = String(h.tipo || 'insight');
        counts[t]   = (counts[t]   || 0) + 1;
        likesMap[t] = (likesMap[t] || 0) + Number(h.likes || 0);
      });
      var labels = {
        insight: 'Insight', pregunta: 'Pregunta', recurso: 'Recurso',
        experiencia: 'Experiencia', oportunidad: 'Oportunidad',
      };
      var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 5);
      if (!sorted.length) return;
      var max = counts[sorted[0]] || 1;
      lista.innerHTML = sorted.map(function (tipo) {
        var pct = Math.round((counts[tipo] / max) * 100);
        return '<li class="nodo-trending-item">' +
          '<div class="nodo-trending-meta">' +
            '<span class="nodo-trending-tag">' + esc(labels[tipo] || tipo) + '</span>' +
            '<span class="nodo-trending-count">' + counts[tipo] + ' aportes</span>' +
          '</div>' +
          '<div class="nodo-trending-bar"><div class="nodo-trending-fill" style="width:' + pct + '%"></div></div>' +
          '</li>';
      }).join('');
    } catch (_) {}
  }

  /* ── Actividad en vivo ───────────────────────────────────────────────────── */
  async function cargarActividadLive() {
    var lista = document.getElementById('actividad-live-lista');
    if (!lista) return;
    try {
      var hilos = await sbGet(
        'foro_hilos?estado=eq.activo&order=created_at.desc&limit=5' +
        '&select=autor_nombre,tipo,created_at,foro_categorias(nombre)'
      );
      if (!Array.isArray(hilos) || !hilos.length) return;
      lista.innerHTML = hilos.map(function (h) {
        var nombre = h.autor_nombre || 'Alguien';
        var cat    = h.foro_categorias ? h.foro_categorias.nombre : 'NODO';
        var tipo   = h.tipo || 'aporte';
        return '<li class="nodo-live-item actividad-nueva">' +
          '<span class="nodo-live-dot"></span> ' +
          esc(nombre) + ' publicó ' + esc(tipo) + ' en ' + esc(cat) +
          '</li>';
      }).join('');
    } catch (_) {}
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', async function () {
    initKeys();
    window.NODO.initClerkSession().then(function () { loadFeed(); });
    loadEspacios();
    loadShouts();
    loadStats();
    cargarTendencias();
    cargarActividadLive();
  });
})();
