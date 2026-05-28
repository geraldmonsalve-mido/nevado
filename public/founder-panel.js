/* NEVADO — Founder Panel · founder-panel.js
   Lógica del panel: métricas, croquetas, logs.
   Se activa cuando nvd:founder-ready se dispara desde founder-functional.js */

// ── SUPABASE CLIENT ───────────────────────────────────────────────────────

var fpSb = null;

function initFpSb() {
  if (fpSb) return;
  if (!window.supabase || !window.NEVADO_SUPABASE_URL || !window.NEVADO_SUPABASE_ANON_KEY) return;
  fpSb = window.supabase.createClient(window.NEVADO_SUPABASE_URL, window.NEVADO_SUPABASE_ANON_KEY);
}

// ── RANK HELPERS ──────────────────────────────────────────────────────────

var RANGO_NOMBRES = {
  cachorro: 'Cachorro', explorador: 'Explorador', guardian: 'Guardián',
  montanista: 'Montañista', guia: 'Guía', protector: 'Protector',
  leyenda_andina: 'Leyenda Andina',
};

var RANK_IMGS_MD = {
  cachorro:       '/rangos/rango1-cachorro-bronce-md.webp',
  explorador:     '/rangos/rango2-explorador-bronce-md.webp',
  guardian:       '/rangos/rango3-guardian-plata-md.webp',
  montanista:     '/rangos/rango4-montanista-plata-md.webp',
  guia:           '/rangos/rango5-guia-plata-md.webp',
  protector:      '/rangos/rango6-protector-oro-md.webp',
  leyenda_andina: '/rangos/rango7-leyendaandina-oro-joyas-md.webp',
};

function calcularRango(croquetas) {
  var c = Number(croquetas || 0);
  if (c >= 16450) return 'leyenda_andina';
  if (c >= 8450)  return 'protector';
  if (c >= 5450)  return 'guia';
  if (c >= 3200)  return 'montanista';
  if (c >= 2000)  return 'guardian';
  if (c >= 1000)  return 'explorador';
  return 'cachorro';
}

// ── BUSCAR USUARIO (profiles directo) ─────────────────────────────────────

async function buscarUsuario(query) {
  if (!fpSb) return null;
  var q = query.trim().replace(/^@/, '');
  try {
    var result = await fpSb
      .from('profiles')
      .select('id,clerk_id,email,username,display_name,avatar_url,rank_key,level,croquetas,is_founder,is_banned,is_verified,founder_notes')
      .or('email.eq.' + q + ',username.eq.' + q + ',display_name.ilike.%' + q + '%')
      .limit(1)
      .maybeSingle();
    return result.data || null;
  } catch (err) {
    console.error('[FOUNDER] buscarUsuario:', err);
    return null;
  }
}

// ── APLICAR CROQUETAS (profiles + usuarios + log) ─────────────────────────

async function aplicarCroquetasDirecto(profileId, clerkId, cantidad, motivo, tipo) {
  if (!fpSb) throw new Error('Supabase no inicializado');

  var { data: profile } = await fpSb.from('profiles').select('croquetas,level').eq('id', profileId).single();
  if (!profile) throw new Error('Perfil no encontrado');

  var nuevasCroquetas = tipo === 'sumar'
    ? profile.croquetas + cantidad
    : Math.max(0, profile.croquetas - cantidad);

  var nuevoNivel  = Math.max(1, Math.floor(nuevasCroquetas / 100));
  var nuevoRango  = calcularRango(nuevasCroquetas);

  await fpSb.from('profiles').update({
    croquetas:  nuevasCroquetas,
    level:      nuevoNivel,
    rank_key:   nuevoRango,
    updated_at: new Date().toISOString(),
  }).eq('id', profileId);

  /* Sync legacy usuarios table */
  try {
    await fpSb.from('usuarios').update({
      croquetas: nuevasCroquetas,
      nivel:     nuevoNivel,
      rango:     RANGO_NOMBRES[nuevoRango] || nuevoRango,
    }).eq('clerk_id', clerkId);
  } catch (_) {}

  /* Log */
  try {
    await fpSb.from('croquetas_log').insert({
      clerk_id: clerkId,
      cantidad: tipo === 'sumar' ? cantidad : -cantidad,
      motivo:   motivo,
    });
  } catch (_) {}

  return { croquetas: nuevasCroquetas, nivel: nuevoNivel, rango: nuevoRango };
}

// ── HELPERS ──────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null || n === '') return '—';
  return Number(n).toLocaleString('es-VE');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-VE', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  } catch (_) { return iso; }
}

// ── RELOJ ────────────────────────────────────────────────────────────────

function startClock() {
  const el = document.getElementById('fp-clock');
  if (!el) return;
  function tick() {
    el.textContent = new Date().toLocaleTimeString('es-VE', {
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  }
  tick();
  setInterval(tick, 1000);
}

// ── TOAST ────────────────────────────────────────────────────────────────

function showToast(msg, type) {
  type = type || 'success';
  const toast = document.getElementById('fp-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.className = 'fp-toast fp-toast-' + type;
  toast.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(function () { toast.hidden = true; }, 3800);
}

// ── MÉTRICAS ─────────────────────────────────────────────────────────────

function setKpiSkeletons(on) {
  ['kpi-v-usuarios', 'kpi-v-croquetas', 'kpi-v-activos', 'kpi-v-guardian'].forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    if (on) {
      el.classList.add('fp-skeleton');
    } else {
      el.classList.remove('fp-skeleton');
    }
  });
}

async function loadStats() {
  setKpiSkeletons(true);

  var timeout = setTimeout(function () {
    setKpiSkeletons(false);
    ['kpi-v-usuarios', 'kpi-v-croquetas', 'kpi-v-activos', 'kpi-v-guardian'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }, 3000);

  try {
    var res  = await fetch('/api/founder-stats');
    clearTimeout(timeout);
    setKpiSkeletons(false);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    var data = await res.json();

    var kpiUsuarios  = document.getElementById('kpi-v-usuarios');
    var kpiCroquetas = document.getElementById('kpi-v-croquetas');
    var kpiActivos   = document.getElementById('kpi-v-activos');
    var kpiGuardian  = document.getElementById('kpi-v-guardian');

    if (kpiUsuarios)  kpiUsuarios.textContent  = fmt(data.usuarios_total);
    if (kpiCroquetas) kpiCroquetas.textContent = fmt(data.croquetas_total);
    if (kpiActivos)   kpiActivos.textContent   = fmt(data.activos_24h);
    if (kpiGuardian)  kpiGuardian.textContent  = fmt(data.guardian_plus);

    renderLogs(data.logs_recientes || []);
  } catch (_) {
    clearTimeout(timeout);
    setKpiSkeletons(false);
    ['kpi-v-usuarios', 'kpi-v-croquetas', 'kpi-v-activos', 'kpi-v-guardian'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) el.textContent = '—';
    });
  }
}

// ── LOGS ─────────────────────────────────────────────────────────────────

function renderLogs(logs) {
  var wrap = document.getElementById('fp-logs-wrap');
  if (!wrap) return;

  if (!logs || !logs.length) {
    wrap.innerHTML = '<p class="fp-empty">Sin movimientos registrados aún.</p>';
    return;
  }

  var rows = logs.map(function (l) {
    var opClass = l.operacion === 'sumar' ? 'fp-op-suma' : 'fp-op-resta';
    var opSym   = l.operacion === 'sumar' ? '⊕' : '⊖';
    return '<tr>' +
      '<td>' + fmtDate(l.fecha) + '</td>' +
      '<td class="fp-log-email">' + (l.usuario_email || '—') + '</td>' +
      '<td class="' + opClass + '">' + opSym + '</td>' +
      '<td>' + fmt(l.cantidad) + '</td>' +
      '<td>' + (l.motivo || '—') + '</td>' +
      '<td class="fp-log-founder">' + (l.founder_email || '—') + '</td>' +
      '</tr>';
  }).join('');

  wrap.innerHTML =
    '<table class="fp-logs-table">' +
      '<thead><tr>' +
        '<th>Fecha/hora</th>' +
        '<th>Usuario</th>' +
        '<th>Op.</th>' +
        '<th>Cantidad</th>' +
        '<th>Motivo</th>' +
        '<th>Founder</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

// ── MOTIVOS Y CANTIDADES RÁPIDAS ──────────────────────────────────────────

var MOTIVOS_SUMAR = [
  'Premio por participación activa',
  'Recompensa por referido',
  'Bonus de bienvenida',
  'Logro desbloqueado',
  'Contribución al NODO',
  'Campaña Corazón completada',
  'Corrección de saldo',
  'Premio especial founder',
  'Evento comunitario',
  'Reconocimiento de mérito'
];

var MOTIVOS_RESTAR = [
  'Corrección de error',
  'Canje de recompensa',
  'Penalización por incumplimiento',
  'Ajuste administrativo',
  'Reembolso de bonus incorrecto',
  'Revisión de saldo',
  'Sanción por comportamiento',
  'Reversión de operación',
  'Ajuste por campaña',
  'Corrección manual founder'
];

var CANTIDADES_RAPIDAS = [20, 50, 100, 200, 1000];

function updateMotivosDropdown(op) {
  var sel = document.getElementById('fp-motivo-select');
  if (!sel) return;
  var motivos = op === 'restar' ? MOTIVOS_RESTAR : MOTIVOS_SUMAR;
  sel.innerHTML = '<option value="">Seleccionar motivo...</option>' +
    motivos.map(function (m) { return '<option value="' + m + '">' + m + '</option>'; }).join('');
}

function clearQuickActive() {
  var btns = document.querySelectorAll('.fp-quick-btn');
  btns.forEach(function (b) { b.classList.remove('fp-quick-btn-active'); });
}

function updateQuickAmounts(op) {
  var wrap = document.getElementById('fp-quick-amounts');
  if (!wrap) return;
  var prefix = op === 'restar' ? '−' : '+';
  wrap.innerHTML = CANTIDADES_RAPIDAS.map(function (n) {
    return '<button type="button" class="fp-quick-btn" data-amount="' + n + '">' +
      prefix + n.toLocaleString('es-VE') + '</button>';
  }).join('');
  wrap.querySelectorAll('.fp-quick-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cantInput = document.getElementById('fp-op-cantidad');
      if (cantInput) { cantInput.value = btn.dataset.amount; cantInput.dispatchEvent(new Event('input')); }
      clearQuickActive();
      btn.classList.add('fp-quick-btn-active');
    });
  });
}

// ── ESTADO DEL USUARIO ENCONTRADO ────────────────────────────────────────

var currentUser = null;

function showUserCard(user) {
  currentUser = user;
  var badge   = document.getElementById('fp-user-badge');
  var card    = document.getElementById('fp-user-card');
  var form    = document.getElementById('fp-op-form');
  var details = card ? card.querySelector('.fp-user-details') : null;

  var rankKey    = user.rank_key || calcularRango(user.croquetas);
  var rankImg    = RANK_IMGS_MD[rankKey] || '';
  var rankNombre = RANGO_NOMBRES[rankKey] || rankKey;

  if (badge) { badge.src = rankImg; badge.alt = rankNombre; }

  if (details) {
    var badgesHtml = '';
    if (user.is_founder)  badgesHtml += '<span class="fp-badge-role fp-badge-founder">FOUNDER</span>';
    if (user.is_verified) badgesHtml += '<span class="fp-badge-role fp-badge-verified">VERIFICADO</span>';
    if (user.is_banned)   badgesHtml += '<span class="fp-badge-role fp-badge-banned">BANEADO</span>';

    details.innerHTML =
      '<strong id="fp-uc-nombre">' + (user.display_name || '—') + '</strong>' +
      (user.username ? '<span class="fp-uc-username">@' + user.username + '</span>' : '') +
      badgesHtml +
      '<span id="fp-uc-email">' + (user.email || '—') + '</span>' +
      '<span class="fp-uc-croquetas">🦴 <strong id="fp-uc-croquetas">' + fmt(user.croquetas) + '</strong> Croquetas</span>' +
      '<span>Nivel <strong id="fp-uc-nivel">' + (user.level || '—') + '</strong> · <strong id="fp-uc-rango">' + rankNombre + '</strong></span>';
  }

  if (card) card.hidden = false;
  if (form) {
    form.hidden = false;
    form.reset();
    var warning = document.getElementById('fp-op-warning');
    if (warning) warning.hidden = true;
    updateMotivosDropdown('sumar');
    updateQuickAmounts('sumar');
  }
}

function hideUserCard() {
  currentUser = null;
  var card = document.getElementById('fp-user-card');
  var form = document.getElementById('fp-op-form');
  if (card) card.hidden = true;
  if (form) form.hidden = true;
}

// ── MODAL DE CONFIRMACIÓN ────────────────────────────────────────────────

var pendingConfirm = null;

function openModal(msg, motivo, onConfirm) {
  var overlay   = document.getElementById('fp-modal-overlay');
  var msgEl     = document.getElementById('fp-modal-msg');
  var motivoEl  = document.getElementById('fp-modal-motivo');
  if (msgEl)    msgEl.textContent    = msg;
  if (motivoEl) motivoEl.textContent = 'Motivo: ' + motivo;
  if (overlay)  overlay.hidden = false;
  pendingConfirm = onConfirm;
}

function closeModal() {
  var overlay = document.getElementById('fp-modal-overlay');
  if (overlay) overlay.hidden = true;
  pendingConfirm = null;
}

// ── FORMULARIO DE CROQUETAS ───────────────────────────────────────────────

function initCroquetasForm() {
  var searchBtn   = document.getElementById('fp-search-btn');
  var searchInput = document.getElementById('fp-search-email');
  var searchError = document.getElementById('fp-search-error');
  var opForm      = document.getElementById('fp-op-form');
  var cantInput   = document.getElementById('fp-op-cantidad');
  var opWarning   = document.getElementById('fp-op-warning');
  var submitBtn   = document.getElementById('fp-op-submit');
  var cancelBtn   = document.getElementById('fp-modal-cancel');
  var confirmBtn  = document.getElementById('fp-modal-confirm');
  var overlay     = document.getElementById('fp-modal-overlay');

  if (!searchBtn) return;

  // ── PASO A: buscar usuario ──────────────────────────────────────────
  searchBtn.addEventListener('click', async function () {
    var query = searchInput ? searchInput.value.trim() : '';
    if (!query) {
      if (searchError) { searchError.textContent = 'Ingresa un email, @username o nombre.'; searchError.hidden = false; }
      return;
    }
    if (searchError) searchError.hidden = true;
    searchBtn.disabled = true;
    searchBtn.textContent = 'Buscando...';
    hideUserCard();

    try {
      var user = await buscarUsuario(query);
      if (!user) {
        if (searchError) { searchError.textContent = 'Usuario no encontrado.'; searchError.hidden = false; }
      } else {
        showUserCard(user);
      }
    } catch (err) {
      if (searchError) { searchError.textContent = 'Error al buscar: ' + err.message; searchError.hidden = false; }
    } finally {
      searchBtn.disabled = false;
      searchBtn.textContent = 'Validar →';
    }
  });

  // Enter en el input de búsqueda
  if (searchInput) {
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); searchBtn.click(); }
    });
  }

  // ── Warning al cambiar cantidad/operación ───────────────────────────
  function checkWarning() {
    if (!currentUser || !opWarning || !cantInput) return;
    var operacion = opForm ? opForm.querySelector('[name="operacion"]:checked') : null;
    var op  = operacion ? operacion.value : 'sumar';
    var n   = Number(cantInput.value || 0);
    if (op === 'restar' && n > 0) {
      var resultado = currentUser.croquetas - n;
      if (resultado < 0) {
        opWarning.textContent = 'Esto dejaría al usuario con ' + fmt(resultado) + ' croquetas (negativo).';
        opWarning.className = 'fp-op-warning fp-op-warning-danger';
      } else {
        opWarning.textContent = 'El usuario quedaría con ' + fmt(resultado) + ' croquetas.';
        opWarning.className = 'fp-op-warning';
      }
      opWarning.hidden = false;
    } else {
      opWarning.hidden = true;
    }
  }

  if (cantInput) cantInput.addEventListener('input', function () {
    clearQuickActive();
    checkWarning();
  });

  if (opForm) opForm.querySelectorAll('[name="operacion"]').forEach(function (r) {
    r.addEventListener('change', function () {
      var op = r.value;
      updateMotivosDropdown(op);
      updateQuickAmounts(op);
      var motivoInput = document.getElementById('fp-op-motivo');
      if (motivoInput) motivoInput.value = '';
      checkWarning();
    });
  });

  var motivoSel = document.getElementById('fp-motivo-select');
  if (motivoSel) {
    motivoSel.addEventListener('change', function () {
      var motivoInput = document.getElementById('fp-op-motivo');
      if (motivoInput && motivoSel.value) motivoInput.value = motivoSel.value;
    });
  }

  // ── PASO C → D: submit del formulario ──────────────────────────────
  if (opForm) {
    opForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!currentUser) return;

      var opRadio  = opForm.querySelector('[name="operacion"]:checked');
      var operacion = opRadio ? opRadio.value : 'sumar';
      var monto    = Number(cantInput ? cantInput.value : 0);
      var motivoEl = document.getElementById('fp-op-motivo');
      var motivo   = motivoEl ? motivoEl.value.trim() : '';

      if (monto <= 0) { showToast('La cantidad debe ser mayor a 0.', 'warning'); return; }
      if (!motivo)    { showToast('El motivo es obligatorio.', 'warning'); return; }
      if (operacion === 'restar' && monto > currentUser.croquetas) {
        showToast('No se puede restar más de ' + fmt(currentUser.croquetas) + ' croquetas.', 'error');
        return;
      }

      var opLabel    = operacion === 'sumar' ? 'sumar' : 'restar';
      var displayName = currentUser.display_name || currentUser.email;
      openModal(
        '¿Confirmas ' + opLabel + ' ' + fmt(monto) + ' croquetas a ' + displayName + '?',
        motivo,
        async function () {
          closeModal();
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Aplicando...'; }

          try {
            var result = await aplicarCroquetasDirecto(
              currentUser.id,
              currentUser.clerk_id,
              monto,
              motivo,
              operacion
            );
            var verb = operacion === 'sumar' ? 'te ha otorgado' : 'ha retirado';
            showToast(
              '@Nevado ' + verb + ' ' + fmt(monto) + ' Croquetas · ' + motivo +
              ' · ' + displayName + ' ahora tiene ' + fmt(result.croquetas) + ' · ' + RANGO_NOMBRES[result.rango],
              'success'
            );
            currentUser.croquetas = result.croquetas;
            currentUser.level     = result.nivel;
            currentUser.rank_key  = result.rango;
            showUserCard(currentUser);
            loadStats();
          } catch (err) {
            showToast('Error al aplicar cambio: ' + err.message, 'error');
          } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Aplicar cambio'; }
          }
        }
      );
    });
  }

  // ── Modal: botones ──────────────────────────────────────────────────
  if (cancelBtn)  cancelBtn.addEventListener('click', closeModal);
  if (confirmBtn) confirmBtn.addEventListener('click', function () {
    if (pendingConfirm) pendingConfirm();
  });
  if (overlay) overlay.addEventListener('click', function (e) {
    if (e.target === overlay) closeModal();
  });
}

// ── LOGOUT ────────────────────────────────────────────────────────────────

function initLogout() {
  var btn = document.getElementById('fp-logout');
  if (!btn) return;
  btn.addEventListener('click', async function () {
    try { if (window.Clerk && window.Clerk.signOut) await window.Clerk.signOut(); } catch (_) {}
    location.href = '/auth.html';
  });
}

// ── AUTO-REFRESH DE LOGS ──────────────────────────────────────────────────

function startAutoRefresh() {
  setInterval(async function () {
    try {
      var res = await fetch('/api/founder-stats');
      if (!res.ok) return;
      var data = await res.json();
      renderLogs(data.logs_recientes || []);
    } catch (_) {}
  }, 30000);
}

// ── BOOT ──────────────────────────────────────────────────────────────────

function bootPanel() {
  initFpSb();
  startClock();
  loadStats();
  initCroquetasForm();
  initLogout();
  startAutoRefresh();
}

window.addEventListener('nvd:founder-ready', bootPanel);
