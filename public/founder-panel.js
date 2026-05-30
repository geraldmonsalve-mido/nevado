/* NEVADO — Founder Panel · founder-panel.js
   Lógica del panel: métricas, croquetas, logs.
   Se activa cuando nvd:founder-ready se dispara desde founder-functional.js */

// ── SUPABASE CLIENT ───────────────────────────────────────────────────────

var fpSb = null;

async function initFpSb() {
  if (fpSb) return fpSb;
  if (!window.supabase) { console.error('[FOUNDER] window.supabase no disponible'); return null; }
  var url = window.NEVADO_SUPABASE_URL || 'https://icxrduatkbazvwysvxrg.supabase.co';
  var key = window.NEVADO_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImljeHJkdWF0a2JhenZ3eXN2eHJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NDQ3NTEsImV4cCI6MjA5NTMyMDc1MX0.dKNGHz9jEmtVn7hmruzNp2KipMq9BDFb0ABRmlGgqNE';
  fpSb = window.supabase.createClient(url, key);
  window.FP_SB = fpSb;
  console.log('[FOUNDER] fpSb inicializado:', !!fpSb);
  return fpSb;
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

function nivelPorCroquetas(croquetas) {
  var c = Number(croquetas || 0);
  if (c >= 29050) return 108 + Math.min(62, Math.floor((c - 29050) / 200));
  if (c >= 16450) return 68  + Math.floor((c - 16450) / 200);
  if (c >= 8450)  return 48  + Math.floor((c - 8450)  / 150);
  if (c >= 5450)  return 33  + Math.floor((c - 5450)  / 150);
  if (c >= 3200)  return 21  + Math.floor((c - 3200)  / 100);
  if (c >= 1000)  return 11  + Math.floor((c - 1000)  / 100);
  return Math.max(1, Math.floor(c / 100) + 1);
}

function rangoAutomaticoPorCroquetas(croquetas, rangoActual) {
  var c = Number(croquetas || 0);
  var rangosAltos = ['montanista', 'guia', 'protector', 'leyenda_andina'];
  if (rangosAltos.includes(rangoActual)) return rangoActual;
  if (c >= 2000) return 'guardian';
  if (c >= 1000) return 'explorador';
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

  var { data: profile } = await fpSb.from('profiles').select('croquetas,level,rank_key').eq('id', profileId).single();
  if (!profile) throw new Error('Perfil no encontrado');

  var nuevasCroquetas = tipo === 'sumar'
    ? profile.croquetas + cantidad
    : Math.max(0, profile.croquetas - cantidad);

  var nuevoNivel  = nivelPorCroquetas(nuevasCroquetas);
  var nuevoRango  = rangoAutomaticoPorCroquetas(nuevasCroquetas, profile.rank_key);

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

  /* Ban / Verify action buttons */
  var actionsEl = document.getElementById('fp-user-actions');
  if (actionsEl) {
    var btnStyle = 'padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;';
    actionsEl.innerHTML =
      '<button id="fp-btn-verify" style="' +
        'background:' + (user.is_verified ? 'rgba(39,174,96,.15)' : 'rgba(255,255,255,.06)') + ';' +
        'border:1px solid ' + (user.is_verified ? 'rgba(39,174,96,.4)' : 'rgba(255,255,255,.12)') + ';' +
        'color:' + (user.is_verified ? '#27AE60' : 'rgba(255,255,255,.6)') + ';' + btnStyle +
      '">' + (user.is_verified ? '✓ Verificado' : 'Verificar') + '</button>' +
      '<button id="fp-btn-ban" style="' +
        'background:' + (user.is_banned ? 'rgba(231,76,60,.15)' : 'rgba(255,255,255,.06)') + ';' +
        'border:1px solid ' + (user.is_banned ? 'rgba(231,76,60,.4)' : 'rgba(255,255,255,.12)') + ';' +
        'color:' + (user.is_banned ? '#E74C3C' : 'rgba(255,255,255,.6)') + ';' + btnStyle +
      '">' + (user.is_banned ? 'Desbanear' : 'Banear') + '</button>' +
      '<button id="fp-btn-nota" style="' +
        'background:rgba(184,148,74,.1);border:1px solid rgba(184,148,74,.3);' +
        'color:rgba(184,148,74,.9);' + btnStyle +
      '">📝 Nota founder</button>';

    var verifyBtn = document.getElementById('fp-btn-verify');
    var banBtn    = document.getElementById('fp-btn-ban');
    var notaBtn   = document.getElementById('fp-btn-nota');

    if (verifyBtn) {
      verifyBtn.onclick = async function () {
        verifyBtn.disabled = true;
        var ok = await toggleVerify(user.id, user.is_verified);
        if (ok) { user.is_verified = !user.is_verified; showUserCard(user); }
        else { verifyBtn.disabled = false; }
      };
    }
    if (banBtn) {
      banBtn.onclick = async function () {
        banBtn.disabled = true;
        var ok = await toggleBan(user.id, user.is_banned);
        if (ok) { user.is_banned = !user.is_banned; showUserCard(user); }
        else { banBtn.disabled = false; }
      };
    }
    if (notaBtn) {
      notaBtn.onclick = function () { window.founderAgregarNota(user.id); };
    }
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

// ── TOAST ALIAS ──────────────────────────────────────────────────────────

function fpMostrarToast(msg, type) { showToast(msg, type || 'success'); }

// ── TIME AGO ──────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—';
  var diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return 'hace ' + diff + 's';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + 'm';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
  return 'hace ' + Math.floor(diff / 86400) + 'd';
}

// ── NODO COMMUNITY STATS ─────────────────────────────────────────────────

async function cargarMetricasComunidad() {
  if (!fpSb) return;
  try {
    const [hilos, resp, msgs, likes, espacios, canales] = await Promise.all([
      fpSb.from('foro_hilos').select('*', { count: 'exact', head: true }).neq('estado', 'eliminado'),
      fpSb.from('foro_respuestas').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
      fpSb.from('chat_mensajes').select('*', { count: 'exact', head: true }),
      fpSb.from('foro_likes').select('*', { count: 'exact', head: true }),
      fpSb.from('foro_categorias').select('*', { count: 'exact', head: true }).eq('activo', true),
      fpSb.from('chat_canales').select('*', { count: 'exact', head: true }).eq('activo', true),
    ]);
    console.log('[FOUNDER] métricas:', { hilos: hilos.count, resp: resp.count, msgs: msgs.count, likes: likes.count, espacios: espacios.count, canales: canales.count });
    var set = function (id, val) { var el = document.getElementById(id); if (el) el.textContent = fmt(val || 0); };
    set('fp-hilos-count',      hilos.count);
    set('fp-respuestas-count', resp.count);
    set('fp-mensajes-count',   msgs.count);
    set('fp-likes-count',      likes.count);
    set('fp-espacios-count',   espacios.count);
    set('fp-canales-count',    canales.count);
    /* Badge NODO */
    var nodoBadge = document.getElementById('fp-nodo-badge');
    if (nodoBadge) nodoBadge.textContent = fmt(hilos.count || 0) + ' aportes';
  } catch (err) {
    console.error('[FOUNDER] cargarMetricasComunidad:', err);
  }
}

// ── LOGS RECIENTES DIRECTO DESDE SUPABASE ────────────────────────────────

var _logsLoading = false;

async function cargarLogsRecientes() {
  if (!fpSb) return;
  if (_logsLoading) return;
  _logsLoading = true;
  const wrap = document.getElementById('fp-logs-wrap');
  if (!wrap) { _logsLoading = false; return; }

  try {
    const { data: logs, error } = await fpSb
      .from('croquetas_log')
      .select('clerk_id, cantidad, motivo, creado_en')
      .order('creado_en', { ascending: false })
      .limit(20);

    if (error) throw error;
    if (!logs || !logs.length) {
      wrap.innerHTML = '<p class="fp-empty">Sin movimientos registrados aún.</p>';
      return;
    }

    /* Batch profile lookup — one query for all clerk_ids */
    const clerkIds = [...new Set(logs.map(function (l) { return l.clerk_id; }).filter(Boolean))];
    const { data: profiles } = await fpSb
      .from('profiles')
      .select('clerk_id, display_name, username')
      .in('clerk_id', clerkIds);

    const profileMap = {};
    (profiles || []).forEach(function (p) { profileMap[p.clerk_id] = p; });

    const rows = logs.map(function (l) {
      const prof  = profileMap[l.clerk_id] || {};
      const quien = prof.username
        ? '@' + prof.username
        : (prof.display_name || (l.clerk_id ? l.clerk_id.slice(0, 8) + '…' : '—'));
      const signo   = l.cantidad >= 0 ? '+' : '';
      const opClass = l.cantidad >= 0 ? 'fp-op-suma' : 'fp-op-resta';
      return '<tr>' +
        '<td>' + fmtDate(l.creado_en) + '</td>' +
        '<td class="fp-log-email">' + quien + '</td>' +
        '<td class="' + opClass + '">' + signo + fmt(Math.abs(l.cantidad)) + '</td>' +
        '<td>' + (l.motivo || '—') + '</td>' +
        '<td style="color:rgba(255,255,255,.35);font-size:11px;">' + timeAgo(l.creado_en) + '</td>' +
      '</tr>';
    }).join('');

    wrap.innerHTML =
      '<table class="fp-logs-table">' +
        '<thead><tr>' +
          '<th>Fecha</th><th>Usuario</th><th>Croquetas</th><th>Motivo</th><th>Hace</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>';
    /* Badge del summary */
    var logsBadge = document.getElementById('fp-logs-badge');
    if (logsBadge) logsBadge.textContent = logs.length;
  } catch (err) {
    console.error('[FOUNDER] cargarLogsRecientes:', err);
    wrap.innerHTML = '<p class="fp-empty">Error al cargar logs.</p>';
  } finally {
    _logsLoading = false;
  }
}

// ── CONTROL DE CANALES DE CHAT ────────────────────────────────────────────

async function cargarCanales() {
  if (!fpSb) return;
  const container = document.getElementById('fp-canales-list');
  if (!container) return;
  container.innerHTML = '<p class="fp-empty">Cargando…</p>';

  try {
    const { data: canales, error } = await fpSb
      .from('chat_canales')
      .select('id, nombre, slug, activo, estado, orden')
      .order('orden', { ascending: true });

    if (error) throw error;
    if (!canales || !canales.length) {
      container.innerHTML = '<p class="fp-empty">No hay canales configurados.</p>';
      return;
    }

    const canalesConCount = await Promise.all(canales.map(async function (c) {
      const total  = await fpSb.from('chat_mensajes').select('*', { count: 'exact', head: true }).eq('canal_id', c.id);
      const hoy    = await fpSb.from('chat_mensajes').select('*', { count: 'exact', head: true })
        .eq('canal_id', c.id)
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());
      return Object.assign({}, c, { total: total.count || 0, hoy: hoy.count || 0 });
    }));

    const estadoBadges = {
      activo:    '<span style="color:#27AE60;font-size:11px;">● ACTIVO</span>',
      congelado: '<span style="color:#3498DB;font-size:11px;">❄ CONGELADO</span>',
      solo_mod:  '<span style="color:#F39C12;font-size:11px;">⭐ SOLO MOD</span>',
    };

    const bStyle = 'padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;';

    container.innerHTML = canalesConCount.map(function (c) {
      const estado = c.estado || 'activo';
      const badge  = estadoBadges[estado] || estadoBadges.activo;
      const oculto = !c.activo
        ? '<span style="color:#E74C3C;font-size:11px;margin-left:8px;">👁 OCULTO</span>'
        : '';
      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:12px;">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">' +
          '<div>' +
            '<span style="color:#fff;font-size:16px;font-weight:600;"># ' + c.nombre + '</span> ' +
            badge + oculto +
            '<div style="color:rgba(255,255,255,.4);font-size:12px;margin-top:4px;">' +
              c.total + ' mensajes totales · ' + c.hoy + ' hoy' +
              ' <a href="/nodo-chat.html" target="_blank" style="color:#B8944A;margin-left:8px;font-size:11px;">→ Abrir canal</a>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="fpCanalEstado(\'' + c.id + '\',\'' + estado + '\')" style="' + bStyle + 'background:rgba(52,152,219,.15);border:1px solid #3498DB;color:#3498DB;">' +
            (estado === 'congelado' ? '▶ Descongelar' : '❄ Congelar') +
          '</button>' +
          '<button onclick="fpCanalOcultar(\'' + c.id + '\',' + c.activo + ')" style="' + bStyle + 'background:rgba(231,76,60,.15);border:1px solid #E74C3C;color:#E74C3C;">' +
            (c.activo ? '👁 Ocultar' : '👁 Mostrar') +
          '</button>' +
          '<button onclick="fpCanalSoloMod(\'' + c.id + '\',\'' + estado + '\')" style="' + bStyle + 'background:rgba(243,156,18,.15);border:1px solid #F39C12;color:#F39C12;">' +
            (estado === 'solo_mod' ? '👥 Abrir a todos' : '⭐ Solo Mod') +
          '</button>' +
          '<button onclick="fpCanalVaciar(\'' + c.id + '\',\'' + c.nombre + '\')" style="' + bStyle + 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);">' +
            '🗑 Vaciar canal' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('[FOUNDER] cargarCanales:', err);
    container.innerHTML = '<p class="fp-empty">Error al cargar canales.</p>';
  }
}

window.fpCanalEstado = async function (canalId, estadoActual) {
  console.log('[FOUNDER] fpCanalEstado:', canalId, estadoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  const nuevoEstado = estadoActual === 'congelado' ? 'activo' : 'congelado';
  await fpSb.from('chat_canales').update({ estado: nuevoEstado }).eq('id', canalId);
  fpMostrarToast(nuevoEstado === 'congelado' ? 'Canal congelado ❄' : 'Canal activado ▶');
  cargarCanales();
};

window.fpCanalOcultar = async function (canalId, activoActual) {
  console.log('[FOUNDER] fpCanalOcultar:', canalId, activoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  await fpSb.from('chat_canales').update({ activo: !activoActual }).eq('id', canalId);
  fpMostrarToast(!activoActual ? 'Canal visible' : 'Canal oculto 👁');
  cargarCanales();
};

window.fpCanalSoloMod = async function (canalId, estadoActual) {
  console.log('[FOUNDER] fpCanalSoloMod:', canalId, estadoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  const nuevoEstado = estadoActual === 'solo_mod' ? 'activo' : 'solo_mod';
  await fpSb.from('chat_canales').update({ estado: nuevoEstado }).eq('id', canalId);
  fpMostrarToast(nuevoEstado === 'solo_mod' ? 'Solo moderadores pueden escribir' : 'Abierto a todos');
  cargarCanales();
};

window.fpCanalVaciar = async function (canalId, nombre) {
  console.log('[FOUNDER] fpCanalVaciar:', canalId, nombre, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  if (!confirm('¿Vaciar TODOS los mensajes de #' + nombre + '? Esta acción no se puede deshacer.')) return;
  const { error } = await fpSb.from('chat_mensajes').delete().eq('canal_id', canalId);
  if (!error) { fpMostrarToast('Canal #' + nombre + ' vaciado 🗑'); cargarCanales(); }
  else { fpMostrarToast('Error al vaciar canal.', 'error'); }
};

// ── CONTROL DE ESPACIOS (FORO) ────────────────────────────────────────────

async function cargarEspacios() {
  if (!fpSb) return;
  const container = document.getElementById('fp-espacios-list');
  if (!container) return;
  container.innerHTML = '<p class="fp-empty">Cargando…</p>';

  try {
    const { data: espacios, error } = await fpSb
      .from('foro_categorias')
      .select('id, nombre, slug, activo, estado, orden')
      .order('orden', { ascending: true });

    if (error) throw error;
    if (!espacios || !espacios.length) {
      container.innerHTML = '<p class="fp-empty">No hay espacios configurados.</p>';
      return;
    }

    const espaciosConCount = await Promise.all(espacios.map(async function (e) {
      const total    = await fpSb.from('foro_hilos').select('*', { count: 'exact', head: true })
        .eq('categoria_id', e.id).neq('estado', 'eliminado');
      const recientes = await fpSb.from('foro_hilos').select('*', { count: 'exact', head: true })
        .eq('categoria_id', e.id).neq('estado', 'eliminado')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());
      const ultimo = await fpSb.from('foro_hilos').select('autor_nombre, contenido, created_at')
        .eq('categoria_id', e.id).neq('estado', 'eliminado')
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      return Object.assign({}, e, {
        total: total.count || 0,
        recientes: recientes.count || 0,
        ultimo: ultimo.data || null,
      });
    }));

    const estadoBadges = {
      activo:    '<span style="color:#27AE60;font-size:11px;">● ACTIVO</span>',
      congelado: '<span style="color:#3498DB;font-size:11px;">❄ CONGELADO</span>',
      solo_mod:  '<span style="color:#F39C12;font-size:11px;">⭐ SOLO MOD</span>',
    };

    const bStyle = 'padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;';

    container.innerHTML = espaciosConCount.map(function (e) {
      const estado = e.estado || 'activo';
      const badge  = estadoBadges[estado] || estadoBadges.activo;
      const ultimoTexto = e.ultimo
        ? 'Último: "' + (e.ultimo.contenido || '').substring(0, 40) + '…" por ' + e.ultimo.autor_nombre
        : 'Sin aportes aún';
      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:20px;margin-bottom:12px;">' +
        '<div style="margin-bottom:12px;">' +
          '<span style="color:#fff;font-size:16px;font-weight:600;">' + e.nombre + '</span> ' +
          badge +
          (!e.activo ? ' <span style="color:#E74C3C;font-size:11px;">OCULTO</span>' : '') +
          '<div style="color:rgba(255,255,255,.4);font-size:12px;margin-top:4px;">' +
            e.total + ' aportes · ' + e.recientes + ' hoy' +
          '</div>' +
          '<div style="color:rgba(255,255,255,.3);font-size:11px;margin-top:2px;font-style:italic;">' +
            ultimoTexto +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
          '<button onclick="fpEspacioEstado(\'' + e.id + '\',\'' + estado + '\')" style="' + bStyle + 'background:rgba(52,152,219,.15);border:1px solid #3498DB;color:#3498DB;">' +
            (estado === 'congelado' ? '▶ Descongelar' : '❄ Congelar') +
          '</button>' +
          '<button onclick="fpEspacioOcultar(\'' + e.id + '\',' + e.activo + ')" style="' + bStyle + 'background:rgba(231,76,60,.15);border:1px solid #E74C3C;color:#E74C3C;">' +
            (e.activo ? '👁 Ocultar' : '👁 Mostrar') +
          '</button>' +
          '<button onclick="fpEspacioSoloMod(\'' + e.id + '\',\'' + estado + '\')" style="' + bStyle + 'background:rgba(243,156,18,.15);border:1px solid #F39C12;color:#F39C12;">' +
            (estado === 'solo_mod' ? '👥 Abrir a todos' : '⭐ Solo Mod') +
          '</button>' +
          '<button onclick="fpEspacioVaciar(\'' + e.id + '\',\'' + e.nombre + '\')" style="' + bStyle + 'background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.15);color:rgba(255,255,255,.5);">' +
            '🗑 Vaciar espacio' +
          '</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('[FOUNDER] cargarEspacios:', err);
    container.innerHTML = '<p class="fp-empty">Error al cargar espacios.</p>';
  }
}

window.fpEspacioEstado = async function (id, estadoActual) {
  console.log('[FOUNDER] fpEspacioEstado:', id, estadoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  const nuevoEstado = estadoActual === 'congelado' ? 'activo' : 'congelado';
  await fpSb.from('foro_categorias').update({ estado: nuevoEstado }).eq('id', id);
  fpMostrarToast(nuevoEstado === 'congelado' ? 'Espacio congelado ❄' : 'Espacio activado');
  cargarEspacios();
};

window.fpEspacioOcultar = async function (id, activoActual) {
  console.log('[FOUNDER] fpEspacioOcultar:', id, activoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  await fpSb.from('foro_categorias').update({ activo: !activoActual }).eq('id', id);
  fpMostrarToast(!activoActual ? 'Espacio visible' : 'Espacio oculto');
  cargarEspacios();
};

window.fpEspacioSoloMod = async function (id, estadoActual) {
  console.log('[FOUNDER] fpEspacioSoloMod:', id, estadoActual, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  const nuevoEstado = estadoActual === 'solo_mod' ? 'activo' : 'solo_mod';
  await fpSb.from('foro_categorias').update({ estado: nuevoEstado }).eq('id', id);
  fpMostrarToast(nuevoEstado === 'solo_mod' ? 'Solo moderadores' : 'Abierto a todos');
  cargarEspacios();
};

window.fpEspacioVaciar = async function (id, nombre) {
  console.log('[FOUNDER] fpEspacioVaciar:', id, nombre, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  if (!confirm('¿Eliminar TODOS los aportes de "' + nombre + '"? No se puede deshacer.')) return;
  await fpSb.from('foro_hilos').update({ estado: 'eliminado' }).eq('categoria_id', id);
  fpMostrarToast('Espacio "' + nombre + '" vaciado');
  cargarEspacios();
};

// ── ASCENSOS PENDIENTES ───────────────────────────────────────────────────

var UMBRALES_ASCENSO  = { guardian: 3200, montanista: 5450, guia: 8450, protector: 16450 };
var SIGUIENTE_RANGO   = { guardian: 'montanista', montanista: 'guia', guia: 'protector', protector: 'leyenda_andina' };

async function cargarAscensosPendientes() {
  if (!fpSb) return;
  const container = document.getElementById('fp-ascensos-list');
  if (!container) return;
  container.innerHTML = '<p class="fp-empty">Cargando…</p>';

  try {
    const { data: candidatos, error } = await fpSb
      .from('profiles')
      .select('id, clerk_id, display_name, username, rank_key, croquetas')
      .gte('croquetas', 3200)
      .in('rank_key', ['guardian', 'montanista', 'guia', 'protector'])
      .order('croquetas', { ascending: false })
      .limit(50);

    if (error) throw error;

    const pendientes = (candidatos || []).filter(function (u) {
      var umbral = UMBRALES_ASCENSO[u.rank_key];
      return umbral && u.croquetas >= umbral;
    });

    /* Badge de ascensos */
    var ascBadge = document.getElementById('fp-ascensos-badge');
    if (ascBadge) {
      ascBadge.textContent = pendientes.length || '0';
      if (pendientes.length > 0) ascBadge.className = 'fp-accordion-badge gold';
    }

    if (!pendientes.length) {
      container.innerHTML = '<p class="fp-empty">Sin solicitudes de ascenso pendientes.</p>';
      return;
    }

    const bStyle = 'padding:7px 14px;border-radius:8px;cursor:pointer;font-size:12px;font-family:inherit;';

    container.innerHTML = pendientes.map(function (u) {
      var siguiente      = SIGUIENTE_RANGO[u.rank_key] || '?';
      var siguienteNombre = RANGO_NOMBRES[siguiente] || siguiente;
      var rankNombre     = RANGO_NOMBRES[u.rank_key] || u.rank_key;
      return '<div style="background:rgba(255,255,255,.04);border:1px solid rgba(184,148,74,.2);border-radius:14px;padding:16px 20px;margin-bottom:10px;display:flex;align-items:center;gap:16px;">' +
        '<div style="flex:1;">' +
          '<strong style="color:#E8E8E0;font-size:14px;">' + (u.display_name || '—') + '</strong>' +
          (u.username ? ' <span style="color:#B8944A;font-size:11px;">@' + u.username + '</span>' : '') +
          '<div style="color:rgba(255,255,255,.4);font-size:12px;margin-top:4px;">' +
            '🦴 ' + fmt(u.croquetas) + ' croquetas · ' +
            rankNombre + ' → <strong style="color:#B8944A;">' + siguienteNombre + '</strong>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;flex-shrink:0;">' +
          '<button onclick="fpAprobarAscenso(\'' + u.id + '\',\'' + u.clerk_id + '\',\'' + siguiente + '\')" style="' + bStyle + 'background:rgba(39,174,96,.15);border:1px solid #27AE60;color:#27AE60;">✓ Aprobar</button>' +
          '<button onclick="fpRechazarAscenso(\'' + u.id + '\')" style="' + bStyle + 'background:rgba(231,76,60,.1);border:1px solid rgba(231,76,60,.3);color:rgba(231,76,60,.7);">✗ Rechazar</button>' +
        '</div>' +
      '</div>';
    }).join('');
  } catch (err) {
    console.error('[FOUNDER] cargarAscensosPendientes:', err);
    container.innerHTML = '<p class="fp-empty">Error al cargar solicitudes.</p>';
  }
}

var NIVEL_BASE_RANGO = { montanista: 33, guia: 48, protector: 68, leyenda_andina: 108 };

window.fpAprobarAscenso = async function (profileId, clerkId, nuevoRango) {
  console.log('[FOUNDER] fpAprobarAscenso:', profileId, clerkId, nuevoRango, 'fpSb:', !!fpSb);
  if (!fpSb) return;
  var nuevoNombre = RANGO_NOMBRES[nuevoRango] || nuevoRango;
  var nivelBase   = NIVEL_BASE_RANGO[nuevoRango] || 1;
  if (!confirm('¿Aprobar ascenso a ' + nuevoNombre + '?')) return;
  try {
    var { error } = await fpSb.from('profiles').update({
      rank_key:   nuevoRango,
      level:      nivelBase,
      updated_at: new Date().toISOString(),
    }).eq('id', profileId);
    if (error) throw error;
    try {
      await fpSb.from('usuarios').update({ rango: nuevoNombre, nivel: nivelBase }).eq('clerk_id', clerkId);
    } catch (_) {}
    fpMostrarToast('Ascenso aprobado: ' + nuevoNombre + ' ✓', 'success');
    cargarAscensosPendientes();
  } catch (err) {
    console.error('[FOUNDER] fpAprobarAscenso error:', err);
    fpMostrarToast('Error al aprobar ascenso.', 'error');
  }
};

window.fpRechazarAscenso = function (profileId) {
  console.log('[FOUNDER] fpRechazarAscenso:', profileId);
  fpMostrarToast('Ascenso marcado como pendiente.', 'success');
};

// ── GLOBAL FOUNDER ACTIONS ────────────────────────────────────────────────

window.founderBanear = async function (profileId) {
  if (!currentUser || currentUser.id !== profileId) return;
  var ok = await toggleBan(profileId, currentUser.is_banned);
  if (ok) { currentUser.is_banned = !currentUser.is_banned; showUserCard(currentUser); }
};

window.founderVerificar = async function (profileId) {
  if (!currentUser || currentUser.id !== profileId) return;
  var ok = await toggleVerify(profileId, currentUser.is_verified);
  if (ok) { currentUser.is_verified = !currentUser.is_verified; showUserCard(currentUser); }
};

window.founderAgregarNota = function (profileId) {
  var overlay   = document.getElementById('fp-nota-overlay');
  var textarea  = document.getElementById('fp-nota-textarea');
  var cancelBtn = document.getElementById('fp-nota-cancel');
  var guardarBtn = document.getElementById('fp-nota-guardar');
  if (!overlay || !textarea) return;

  textarea.value = (currentUser && currentUser.founder_notes) || '';
  overlay.hidden = false;
  textarea.focus();

  function closeNotaModal() {
    overlay.hidden = true;
    if (cancelBtn)  cancelBtn.onclick  = null;
    if (guardarBtn) guardarBtn.onclick = null;
  }

  if (cancelBtn) cancelBtn.onclick = closeNotaModal;
  if (guardarBtn) guardarBtn.onclick = async function () {
    var nota = textarea.value;
    closeNotaModal();
    if (!fpSb) { showToast('Supabase no inicializado.', 'error'); return; }
    try {
      var { error } = await fpSb.from('profiles').update({ founder_notes: nota }).eq('id', profileId);
      if (error) throw error;
      if (currentUser && currentUser.id === profileId) currentUser.founder_notes = nota;
      showToast('Nota guardada.', 'success');
    } catch (err) {
      console.error('[FOUNDER] agregarNota:', err);
      showToast('Error al guardar nota: ' + (err.message || ''), 'error');
    }
  };
};

// ── BAN / VERIFY ──────────────────────────────────────────────────────────

async function toggleBan(profileId, isBanned) {
  if (!fpSb) return false;
  try {
    var { error } = await fpSb.from('profiles').update({ is_banned: !isBanned }).eq('id', profileId);
    if (error) throw error;
    showToast(isBanned ? 'Cuenta desbloqueada.' : 'Cuenta baneada.', 'success');
    return true;
  } catch (err) {
    console.error('[FOUNDER] toggleBan:', err);
    showToast('Error al cambiar estado de ban: ' + (err.message || ''), 'error');
    return false;
  }
}

async function toggleVerify(profileId, isVerified) {
  if (!fpSb) return false;
  try {
    var { error } = await fpSb.from('profiles').update({ is_verified: !isVerified }).eq('id', profileId);
    if (error) throw error;
    showToast(isVerified ? 'Verificación removida.' : 'Usuario verificado.', 'success');
    return true;
  } catch (err) {
    console.error('[FOUNDER] toggleVerify:', err);
    showToast('Error al cambiar verificación: ' + (err.message || ''), 'error');
    return false;
  }
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

// ── BOOT ──────────────────────────────────────────────────────────────────

/* ════════════════════════════════════════════════════════════════
   TITULARES — Cola Editorial (Founder)
   ════════════════════════════════════════════════════════════════ */

var _fpTitEstadoActivo = 'enviado';
var _fpTitEnvioActual  = null;

function fpEsc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

async function cargarTitulares(estado) {
  if (!fpSb) return;
  _fpTitEstadoActivo = estado;
  var list = document.getElementById('fp-titulares-list');
  if (list) list.innerHTML = '<p class="fp-empty">Cargando…</p>';
  try {
    var query = fpSb
      .from('titulares_envios')
      .select('id,titulo,categoria,autor_nombre,autor_username,autor_rank,estado,ia_score,created_at')
      .order('created_at', { ascending: false });
    if (estado !== 'todos') query = query.eq('estado', estado);
    var { data, error } = await query;
    if (error) throw error;

    /* Badges de todos los estados */
    var estados = ['enviado','en_revision','aprobado','publicado','rechazado'];
    await Promise.all(estados.map(async function(est) {
      var { count } = await fpSb
        .from('titulares_envios')
        .select('*', { count: 'exact', head: true })
        .eq('estado', est);
      var badge = document.getElementById('badge-' + est);
      if (badge) badge.textContent = count || 0;
    }));

    if (!list) return;
    if (!data || !data.length) {
      list.innerHTML = '<p class="fp-empty">Sin envíos en esta categoría.</p>';
      return;
    }
    list.innerHTML = data.map(function(e) {
      var fecha = new Date(e.created_at).toLocaleDateString('es', {day:'2-digit',month:'short',year:'numeric'});
      var autor = e.autor_username ? '@' + e.autor_username : (e.autor_nombre || '—');
      var iaHtml = (e.ia_score !== null && e.ia_score !== undefined)
        ? '<span class="fp-tit-card-ia">IA: ' + parseFloat(e.ia_score).toFixed(1) + '/10</span>'
        : '';
      return '<div class="fp-tit-card" onclick="fpAbrirTitular(\'' + e.id + '\')">' +
        '<div style="min-width:0">' +
          '<div class="fp-tit-card-title">' + fpEsc(e.titulo) + '</div>' +
          '<div class="fp-tit-card-meta">' +
            fpEsc(e.categoria) + ' · ' + fpEsc(autor) + ' · ' + fpEsc(e.autor_rank||'') + ' · ' + fecha + iaHtml +
          '</div>' +
        '</div>' +
        '<span class="fp-tit-estado fp-tit-estado-' + e.estado + '">' + e.estado.replace('_',' ') + '</span>' +
      '</div>';
    }).join('');
    /* Badge de titulares: suma enviados + en_revision */
    setTimeout(function() {
      var titBadge = document.getElementById('fp-titulares-badge');
      if (titBadge) {
        var env = parseInt(document.getElementById('badge-enviado') && document.getElementById('badge-enviado').textContent || 0);
        var rev = parseInt(document.getElementById('badge-en_revision') && document.getElementById('badge-en_revision').textContent || 0);
        var total = (env || 0) + (rev || 0);
        titBadge.textContent = total || '—';
        if (total > 0) titBadge.className = 'fp-accordion-badge red';
      }
    }, 50);
  } catch(err) {
    console.error('[FOUNDER] cargarTitulares:', err);
    if (list) list.innerHTML = '<p class="fp-empty">Error: ' + err.message + '</p>';
  }
}

window.fpAbrirTitular = async function(envioId) {
  if (!fpSb) return;
  var overlay = document.getElementById('fp-tit-modal-overlay');
  overlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  try {
    var { data: e, error } = await fpSb.from('titulares_envios').select('*').eq('id', envioId).single();
    if (error) throw error;
    _fpTitEnvioActual = e;

    document.getElementById('fp-tit-modal-titulo').textContent = e.titulo;
    document.getElementById('fp-tit-modal-meta').innerHTML =
      '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:rgba(232,232,224,0.6)">' + fpEsc(e.categoria) + '</span>' +
      '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:rgba(232,232,224,0.6)">' + (e.autor_username ? '@'+fpEsc(e.autor_username) : fpEsc(e.autor_nombre||'')) + '</span>' +
      '<span style="font-size:11px;padding:3px 10px;border-radius:6px;background:rgba(255,255,255,0.05);color:rgba(232,232,224,0.6)">' + fpEsc(e.autor_rank||'') + '</span>' +
      '<span class="fp-tit-estado fp-tit-estado-' + e.estado + '">' + e.estado.replace('_',' ') + '</span>';

    document.getElementById('fp-tit-modal-resumen').textContent = e.resumen || '';
    document.getElementById('fp-tit-modal-cuerpo').textContent  = e.cuerpo  || '';
    document.getElementById('fp-tit-modal-fuentes').innerHTML = (e.fuentes && e.fuentes.length)
      ? '<strong style="color:rgba(255,255,255,0.5);display:block;margin-bottom:6px">Fuentes declaradas:</strong>' +
        e.fuentes.map(function(f){ return '<div>· ' + fpEsc(f) + '</div>'; }).join('')
      : '<span style="color:rgba(255,255,255,0.2)">Sin fuentes declaradas</span>';

    var iaPanel = document.getElementById('fp-tit-modal-ia');
    if (e.ia_score !== null && e.ia_score !== undefined) {
      iaPanel.style.display = 'block';
      var score = parseFloat(e.ia_score);
      var color = score >= 7 ? '#27AE60' : score >= 4 ? '#B8944A' : '#E74C3C';
      document.getElementById('fp-tit-ia-score-num').textContent = score.toFixed(1);
      document.getElementById('fp-tit-ia-score-num').style.color = color;
      document.getElementById('fp-tit-ia-bar').style.width = (score/10*100) + '%';
      document.getElementById('fp-tit-ia-bar').style.background = color;
      document.getElementById('fp-tit-ia-texto').textContent = (e.ia_reporte && e.ia_reporte.analisis) ? e.ia_reporte.analisis : '';
    } else {
      iaPanel.style.display = 'none';
    }

    var notaExist = document.getElementById('fp-tit-modal-nota-existente');
    if (e.nota_editorial) {
      notaExist.style.display = 'block';
      document.getElementById('fp-tit-nota-prev-text').textContent = e.nota_editorial;
    } else {
      notaExist.style.display = 'none';
    }
    document.getElementById('fp-tit-nota-founder').value = '';
    document.getElementById('fp-tit-prog-fecha').value = e.programado_para ? e.programado_para.slice(0,16) : '';
  } catch(err) {
    console.error('[FOUNDER] fpAbrirTitular:', err);
    fpMostrarToast('Error al cargar el titular.', 'error');
    fpCerrarTitModal();
  }
};

window.fpCerrarTitModal = function() {
  var overlay = document.getElementById('fp-tit-modal-overlay');
  if (overlay) overlay.style.display = 'none';
  document.body.style.overflow = '';
  _fpTitEnvioActual = null;
};

window.fpDecidirTitular = async function(nuevoEstado) {
  if (!_fpTitEnvioActual || !fpSb) return;
  var nota = document.getElementById('fp-tit-nota-founder').value.trim();
  var prog = document.getElementById('fp-tit-prog-fecha').value;
  var payload = {
    estado:          nuevoEstado,
    nota_editorial:  nota || _fpTitEnvioActual.nota_editorial || null,
    programado_para: prog ? new Date(prog).toISOString() : null,
  };
  if (nuevoEstado === 'publicado') payload.publicado_en = new Date().toISOString();
  try {
    var { error } = await fpSb.from('titulares_envios').update(payload).eq('id', _fpTitEnvioActual.id);
    if (error) throw error;
    var msgs = { rechazado:'✗ Titular rechazado.', en_revision:'↩ En revisión.', publicado:'✓ Publicado.', aprobado:'✓ Aprobado.' };
    fpMostrarToast(msgs[nuevoEstado] || 'Actualizado.', nuevoEstado === 'rechazado' ? 'error' : 'success');
    fpCerrarTitModal();
    cargarTitulares(_fpTitEstadoActivo);
  } catch(err) {
    console.error('[FOUNDER] fpDecidirTitular:', err);
    fpMostrarToast('Error: ' + err.message, 'error');
  }
};

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape' && _fpTitEnvioActual) fpCerrarTitModal();
});

document.addEventListener('DOMContentLoaded', function() {
  var overlay = document.getElementById('fp-tit-modal-overlay');
  if (overlay) overlay.addEventListener('click', function(e) {
    if (e.target === overlay) fpCerrarTitModal();
  });
  document.querySelectorAll('.fp-tit-tab').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.fp-tit-tab').forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');
      cargarTitulares(btn.dataset.estado);
    });
  });
});

window.addEventListener('nvd:founder-ready', async function () {
  await initFpSb();

  startClock();
  initCroquetasForm();
  initLogout();

  /* Carga inmediata: KPIs, canales y espacios */
  Promise.all([
    loadStats(),
    cargarMetricasComunidad(),
    cargarCanales(),
    cargarEspacios(),
  ]);

  /* ── Carga lazy: logs al abrir el accordion ── */
  var logsAccordion = document.getElementById('fp-logs-accordion');
  if (logsAccordion) {
    var _logsYaCargados = false;
    logsAccordion.addEventListener('toggle', function () {
      if (logsAccordion.open && !_logsYaCargados) {
        _logsYaCargados = true;
        cargarLogsRecientes();
      }
    });
  }

  /* ── Botón Actualizar logs ── */
  var btnRefreshLogs = document.getElementById('fp-logs-refresh-btn');
  if (btnRefreshLogs) {
    btnRefreshLogs.addEventListener('click', function () {
      btnRefreshLogs.classList.add('spinning');
      btnRefreshLogs.disabled = true;
      cargarLogsRecientes().then(function () {
        setTimeout(function () {
          btnRefreshLogs.classList.remove('spinning');
          btnRefreshLogs.disabled = false;
        }, 400);
      });
    });
  }

  /* ── Carga lazy: titulares al abrir ── */
  var titAccordion = document.getElementById('fp-titulares-accordion');
  if (titAccordion) {
    var _titYaCargados = false;
    titAccordion.addEventListener('toggle', function () {
      if (titAccordion.open && !_titYaCargados) {
        _titYaCargados = true;
        if (typeof cargarTitulares === 'function') cargarTitulares('enviado');
      }
    });
  }

  /* ── Carga lazy: ascensos al abrir ── */
  var ascAccordion = document.getElementById('fp-ascensos-accordion');
  if (ascAccordion) {
    ascAccordion.addEventListener('toggle', function () {
      if (ascAccordion.open) cargarAscensosPendientes();
    });
  }

  /* Métricas: refresh cada 5 minutos */
  setInterval(cargarMetricasComunidad, 300000);
});
