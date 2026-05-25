/* =================================================================
   NEVADO — PANEL DEL FUNDADOR · founder-panel.js
   Estado compartido vía localStorage (clave: nvd_ecosystem)
   ================================================================= */

/* ---- ESTADO DEL ECOSISTEMA ---------------------------------------- */

const STORAGE_KEY = 'nvd_ecosystem';

const DEFAULT_STATE = {
  usuarios: {
    total: 128420,
    activos: 15842,
    incremento24h: 2341,
    activosDelta: 1205
  },
  croquetas: {
    enCirculacion: 2450879250,
    delta24h: 85210450
  },
  evaluaciones: {
    pendientes: 377,
    lista: [
      { id: 'ev1', usuario: '@ValleAndino', rango: 'Protector', tipo: 'requiere revisión del Fundador', dificultad: 'alta' },
      { id: 'ev2', usuario: '@RutaAlpina', rango: 'Guía', tipo: 'evaluación por videollamada', dificultad: 'media' },
      { id: 'ev3', usuario: '@CumbreDigital', rango: 'Guardián', tipo: 'evaluación documental', dificultad: 'baja' }
    ]
  },
  ascensos: {
    pendientes: 5,
    historial: []
  },
  reportes: {
    pendientes: 7,
    lista: []
  },
  moderacion: {
    sanciones: []
  },
  actividad: {
    feed: [
      { usuario: '@ValleAndino', accion: 'envió evaluación para Protector', hace: '2 min', tipo: 'evaluacion' },
      { usuario: '@PicoNevado', accion: 'fue ascendido a Montañista', hace: '5 min', tipo: 'ascenso' },
      { usuario: '@AndesVzla', accion: 'recibió 10.000 croquetas', hace: '7 min', tipo: 'croquetas' },
      { usuario: '@MontanaLibre', accion: 'fue sancionado por 24h', hace: '12 min', tipo: 'sancion' },
      { usuario: '@RutaAlpina', accion: 'Nueva evaluación pendiente', hace: '15 min', tipo: 'evaluacion' },
      { usuario: '@GuardianDelSur', accion: 'fue ascendido a Guardián', hace: '18 min', tipo: 'ascenso' }
    ]
  },
  niveles: {
    distribucion: [
      { nombre: 'Cachorro', rango: '1-10', total: 38721, porcentaje: 30 },
      { nombre: 'Explorador', rango: '11-20', total: 27312, porcentaje: 21 },
      { nombre: 'Guardián', rango: '21-32', total: 18945, porcentaje: 15 },
      { nombre: 'Montañista', rango: '33-47', total: 9632, porcentaje: 7 },
      { nombre: 'Guía', rango: '48-67', total: 4125, porcentaje: 3 },
      { nombre: 'Protector', rango: '68-107', total: 1256, porcentaje: 1 },
      { nombre: 'Leyenda Andina', rango: '108-170', total: 429, porcentaje: 0.5 }
    ]
  },
  configuracion: {
    nombreEcosistema: 'NEVADO',
    modoMantenimiento: false,
    registroAbierto: true,
    evaluacionesActivas: true,
    notificacionesActivas: true,
    mensajeGlobal: '',
    umbralCroquetas: 100000,
    nivelMaximo: 170
  },
  salud: {
    servidores: 'operativo',
    baseDatos: 'operativo',
    sistemaPagos: 'operativo',
    sistemaCroquetas: 'operativo',
    sistemaNotificaciones: 'operativo',
    estadoGeneral: 'ESTABLE'
  },
  logs: [
    { hora: '09:41', mensaje: 'Autenticación 2FA exitosa — sesión iniciada' },
    { hora: '09:38', mensaje: 'Sincronización de métricas ejecutada' },
    { hora: '09:30', mensaje: 'Respaldo automático completado' },
    { hora: '09:15', mensaje: 'Sistema de evaluaciones verificado' }
  ],
  ultimaActualizacion: new Date().toISOString()
};

/* ---- FUNCIONES DE ESTADO ------------------------------------------ */

function loadEcosystemState() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_STATE;
    const parsed = JSON.parse(stored);
    // Merge with defaults to handle new fields
    return deepMerge(DEFAULT_STATE, parsed);
  } catch (e) {
    console.warn('[NEVADO] Error al cargar estado, usando por defecto', e);
    return DEFAULT_STATE;
  }
}

function saveEcosystemState(state) {
  try {
    state.ultimaActualizacion = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Dispatch event so other open pages can react
    window.dispatchEvent(new CustomEvent('nvd:ecosystem-update', { detail: state }));
  } catch (e) {
    console.error('[NEVADO] Error al guardar estado', e);
  }
}

function deepMerge(defaults, stored) {
  const result = Object.assign({}, defaults);
  for (const key in stored) {
    if (stored[key] && typeof stored[key] === 'object' && !Array.isArray(stored[key])) {
      result[key] = deepMerge(defaults[key] || {}, stored[key]);
    } else {
      result[key] = stored[key];
    }
  }
  return result;
}

// Global state
let founderState = loadEcosystemState();

/* ---- RELOJ --------------------------------------------------------- */

function updateClock() {
  const now = new Date();
  const time = now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('es-VE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const clock = document.getElementById('founder-clock');
  const dateEl = document.getElementById('founder-date');
  if (clock) clock.textContent = time;
  if (dateEl) dateEl.textContent = capitalize(date);
}

setInterval(updateClock, 1000);
updateClock();

/* ---- HELPERS ------------------------------------------------------- */

function capitalize(v) { return v.charAt(0).toUpperCase() + v.slice(1); }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function formatNumber(n) { return n.toLocaleString('es-VE'); }

function playSoftClick() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {}
}

/* ---- TOAST --------------------------------------------------------- */

function showToast(message, type = 'success') {
  const existing = document.querySelector('.founder-toast');
  if (existing) existing.remove();
  const icons = { success: '✦', error: '⚠', info: '◈', warning: '◇' };
  const toast = document.createElement('div');
  toast.className = 'founder-toast toast-' + type;
  toast.innerHTML = '<span class="toast-icon">' + (icons[type] || '✦') + '</span><span>' + message + '</span>';
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-12px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

/* ---- RENDERIZADO DE DATOS ------------------------------------------ */

function renderKPIs() {
  const s = founderState;
  const kpis = document.querySelectorAll('.kpi-card');
  const data = [
    { label: 'Usuarios totales', value: formatNumber(s.usuarios.total), delta: '↑ ' + formatNumber(s.usuarios.incremento24h) + ' en 24h' },
    { label: 'Usuarios activos', value: formatNumber(s.usuarios.activos), delta: '↑ ' + formatNumber(s.usuarios.activosDelta) + ' en 24h' },
    { label: 'Croquetas en circulación', value: formatNumber(s.croquetas.enCirculacion), delta: '↑ ' + formatNumber(s.croquetas.delta24h) + ' en 24h' },
    { label: 'Evaluaciones pendientes', value: formatNumber(s.evaluaciones.pendientes), delta: null },
    { label: 'Reportes pendientes', value: formatNumber(s.reportes.pendientes), delta: null }
  ];
  kpis.forEach((card, i) => {
    if (!data[i]) return;
    const strong = card.querySelector('strong');
    const small = card.querySelector('small');
    if (strong) strong.textContent = data[i].value;
    if (small && data[i].delta) small.textContent = data[i].delta;
  });

  // Update sidebar badges
  const badges = { evaluaciones: s.evaluaciones.pendientes, ascensos: s.ascensos.pendientes, reportes: s.reportes.pendientes };
  Object.entries(badges).forEach(([key, val]) => {
    document.querySelectorAll('.nav-badge').forEach(badge => {
      const parent = badge.closest('a');
      if (parent && parent.href && parent.href.includes(key)) badge.textContent = val;
    });
  });
}

function renderEvaluaciones() {
  const list = document.querySelector('.evaluation-list');
  if (!list) return;
  list.innerHTML = '';
  founderState.evaluaciones.lista.forEach(ev => {
    const row = document.createElement('article');
    row.className = 'evaluation-row';
    row.dataset.id = ev.id;
    const diffClass = ev.dificultad === 'alta' ? 'high' : ev.dificultad === 'media' ? 'medium' : 'low';
    const diffLabel = ev.dificultad === 'alta' ? 'Alta' : ev.dificultad === 'media' ? 'Media' : 'Inicial';
    row.innerHTML = `
      <div>
        <strong>${ev.usuario}</strong>
        <p>${ev.rango} · ${ev.tipo}</p>
      </div>
      <span class="difficulty ${diffClass}">${diffLabel}</span>
      <div class="eval-actions">
        <button type="button" class="btn-eval-aprobar" data-id="${ev.id}">Aprobar</button>
        <button type="button" class="btn-eval-rechazar" data-id="${ev.id}">Rechazar</button>
      </div>`;
    list.appendChild(row);
  });
  attachEvaluationListeners();
}

function renderActividad() {
  const list = document.querySelector('.activity-list');
  if (!list) return;
  list.innerHTML = '';
  founderState.actividad.feed.slice(0, 8).forEach(item => {
    const initials = item.usuario.replace('@', '').substring(0, 2).toUpperCase();
    const isAlert = item.tipo === 'sancion';
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="activity-avatar${isAlert ? ' alert' : ''}">${initials}</span>
      <div>
        <p><strong>${item.usuario}</strong> ${item.accion}</p>
        <time>Hace ${item.hace}</time>
      </div>`;
    list.appendChild(li);
  });
}

function renderNiveles() {
  const rankList = document.querySelector('.rank-list');
  if (!rankList) return;
  rankList.innerHTML = '';
  founderState.niveles.distribucion.forEach((nivel, i) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span class="rank-number">${i + 1}</span>
      <div class="rank-copy"><strong>${nivel.nombre}</strong><span>${nivel.rango}</span></div>
      <div class="rank-bar"><span style="width:${nivel.porcentaje}%"></span></div>
      <strong class="rank-total">${formatNumber(nivel.total)}</strong>`;
    rankList.appendChild(li);
  });
}

function renderSalud() {
  const items = {
    servidores: 'Servidores',
    baseDatos: 'Base de datos',
    sistemaPagos: 'Sistema de pagos',
    sistemaCroquetas: 'Sistema de croquetas',
    sistemaNotificaciones: 'Sistema de notificaciones'
  };
  const healthList = document.querySelector('.health-list');
  if (!healthList) return;
  healthList.innerHTML = '';
  const salud = founderState.salud;
  Object.entries(items).forEach(([key, label]) => {
    const estado = salud[key] || 'operativo';
    const li = document.createElement('li');
    li.className = 'health-item-' + estado;
    li.innerHTML = `<span>${label}</span><strong class="health-${estado}">${capitalize(estado)}</strong>`;
    healthList.appendChild(li);
  });
  const orbStrong = document.querySelector('.orb-ring strong');
  if (orbStrong) orbStrong.textContent = salud.estadoGeneral;
  const orbP = document.querySelector('.health-orb p');
  if (orbP) orbP.textContent = salud.estadoGeneral === 'ESTABLE' ? 'Todo en orden' : 'Requiere atención';
}

function renderLogs() {
  const logList = document.querySelector('.log-list');
  if (!logList) return;
  logList.innerHTML = '';
  founderState.logs.slice(0, 8).forEach(log => {
    const li = document.createElement('li');
    li.innerHTML = `<time>${log.hora}</time><span>${log.mensaje}</span>`;
    logList.appendChild(li);
  });
}

function renderConfiguracion() {
  const cfg = founderState.configuracion;
  const toggles = {
    'toggle-mantenimiento': 'modoMantenimiento',
    'toggle-registro': 'registroAbierto',
    'toggle-evaluaciones': 'evaluacionesActivas',
    'toggle-notificaciones': 'notificacionesActivas'
  };
  Object.entries(toggles).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.checked = cfg[key];
  });
  const msgEl = document.getElementById('mensaje-global');
  if (msgEl) msgEl.value = cfg.mensajeGlobal;
}

/* ---- NAVEGACIÓN ---------------------------------------------------- */

function initializeNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', () => {
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');
      playSoftClick();
      const href = item.getAttribute('href') || '';
      const section = href.replace('#', '');
      if (section) {
        showToast('Abriendo ' + capitalize(section.replace('-', ' ')), 'info');
      }
    });
  });
}

/* ---- QUICK ACTIONS ------------------------------------------------- */

function initializeQuickActions() {
  document.querySelectorAll('.quick-action').forEach(button => {
    button.addEventListener('click', () => {
      const panel = button.dataset.panel || 'módulo';
      playSoftClick();
      const target = document.getElementById(panel) || document.querySelector('#' + panel);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      showToast('Accediendo a ' + capitalize(panel), 'info');
    });
  });
}

/* ---- FORMULARIO: OTORGAR CROQUETAS --------------------------------- */

function initializeFormCroquetas() {
  const form = document.querySelector('[data-form="grant-croquetas"]');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    playSoftClick();
    const usuario = form.querySelector('[name="user"]')?.value?.trim();
    const cantidad = parseInt(form.querySelector('[name="amount"]')?.value || '0', 10);
    const motivo = form.querySelector('[name="reason"]')?.value?.trim() || 'Sin motivo especificado';
    if (!usuario) { showToast('Ingresa el nombre de usuario', 'warning'); return; }
    if (!cantidad || cantidad <= 0) { showToast('La cantidad debe ser mayor a 0', 'warning'); return; }

    // Update ecosystem state
    founderState.croquetas.enCirculacion += cantidad;
    founderState.croquetas.delta24h += cantidad;

    // Add to activity feed
    agregarActividad(usuario, 'recibió ' + formatNumber(cantidad) + ' croquetas', 'croquetas');

    // Log the action
    agregarLog('Croquetas otorgadas: ' + formatNumber(cantidad) + ' → ' + usuario + ' · ' + motivo);

    saveEcosystemState(founderState);
    renderKPIs();
    renderActividad();
    renderLogs();

    form.reset();
    showToast(formatNumber(cantidad) + ' croquetas otorgadas a ' + usuario, 'success');
    console.log('[NEVADO][CROQUETAS]', { usuario, cantidad, motivo, timestamp: new Date().toISOString() });
  });

  // Botón de máximo
  const infiniteBtn = form.querySelector('[data-action="set-infinite"]');
  if (infiniteBtn) {
    infiniteBtn.addEventListener('click', () => {
      const amountInput = form.querySelector('[name="amount"]');
      if (amountInput) amountInput.value = '999999999';
      playSoftClick();
      showToast('Límite ceremonial desbloqueado', 'info');
    });
  }
}

/* ---- FORMULARIO: ASCENSO ------------------------------------------- */

function initializeFormAscenso() {
  const form = document.querySelector('[data-form="promotion"]');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    playSoftClick();
    const usuario = form.querySelector('[name="promotionUser"]')?.value?.trim();
    const nuevoRango = form.querySelector('[name="newRank"]')?.value;
    const rangoNombre = form.querySelector('[name="newRank"]') ? form.querySelector('[name="newRank"] option:checked')?.text : nuevoRango;
    if (!usuario) { showToast('Ingresa el nombre de usuario', 'warning'); return; }
    if (!nuevoRango) { showToast('Selecciona el nuevo rango', 'warning'); return; }

    // Update ecosystem state
    founderState.ascensos.pendientes = Math.max(0, founderState.ascensos.pendientes - 1);
    founderState.ascensos.historial.unshift({
      usuario, nuevoRango, rangoNombre, timestamp: new Date().toISOString()
    });

    // Add to activity feed
    agregarActividad(usuario, 'fue ascendido a ' + rangoNombre, 'ascenso');
    agregarLog('Ascenso ceremonial: ' + usuario + ' → ' + rangoNombre);

    saveEcosystemState(founderState);
    renderKPIs();
    renderActividad();
    renderLogs();

    form.reset();
    showToast('Proceso ceremonial completado: ' + usuario + ' → ' + rangoNombre, 'success');
    console.log('[NEVADO][ASCENSO]', { usuario, nuevoRango, timestamp: new Date().toISOString() });
  });
}

/* ---- LISTENERS DE EVALUACIONES ------------------------------------- */

function attachEvaluationListeners() {
  document.querySelectorAll('.btn-eval-aprobar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ev = founderState.evaluaciones.lista.find(e => e.id === id);
      if (!ev) return;
      playSoftClick();

      // Remove from list
      founderState.evaluaciones.lista = founderState.evaluaciones.lista.filter(e => e.id !== id);
      founderState.evaluaciones.pendientes = Math.max(0, founderState.evaluaciones.pendientes - 1);

      // Add to activity
      agregarActividad(ev.usuario, 'fue aprobado para ' + ev.rango, 'ascenso');
      agregarLog('Evaluación APROBADA: ' + ev.usuario + ' → ' + ev.rango);

      saveEcosystemState(founderState);
      renderEvaluaciones();
      renderKPIs();
      renderActividad();
      renderLogs();
      showToast('Evaluación de ' + ev.usuario + ' aprobada', 'success');
    });
  });

  document.querySelectorAll('.btn-eval-rechazar').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const ev = founderState.evaluaciones.lista.find(e => e.id === id);
      if (!ev) return;
      playSoftClick();

      founderState.evaluaciones.lista = founderState.evaluaciones.lista.filter(e => e.id !== id);
      founderState.evaluaciones.pendientes = Math.max(0, founderState.evaluaciones.pendientes - 1);

      agregarActividad(ev.usuario, 'fue rechazado en evaluación para ' + ev.rango, 'sancion');
      agregarLog('Evaluación RECHAZADA: ' + ev.usuario + ' → ' + ev.rango);

      saveEcosystemState(founderState);
      renderEvaluaciones();
      renderKPIs();
      renderActividad();
      renderLogs();
      showToast('Evaluación de ' + ev.usuario + ' rechazada', 'warning');
    });
  });
}

/* ---- CONFIGURACIÓN ------------------------------------------------- */

function initializeConfiguracion() {
  const toggleConfigs = [
    { id: 'toggle-mantenimiento', key: 'modoMantenimiento', label: 'Modo mantenimiento' },
    { id: 'toggle-registro', key: 'registroAbierto', label: 'Registro abierto' },
    { id: 'toggle-evaluaciones', key: 'evaluacionesActivas', label: 'Evaluaciones activas' },
    { id: 'toggle-notificaciones', key: 'notificacionesActivas', label: 'Notificaciones activas' }
  ];
  toggleConfigs.forEach(({ id, key, label }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      founderState.configuracion[key] = el.checked;
      saveEcosystemState(founderState);
      agregarLog(label + ': ' + (el.checked ? 'ACTIVADO' : 'DESACTIVADO'));
      renderLogs();
      showToast(label + ' ' + (el.checked ? 'activado' : 'desactivado'), el.checked ? 'success' : 'warning');
    });
  });

  const msgBtn = document.getElementById('btn-mensaje-global');
  if (msgBtn) {
    msgBtn.addEventListener('click', () => {
      const msgEl = document.getElementById('mensaje-global');
      const msg = msgEl ? msgEl.value.trim() : '';
      founderState.configuracion.mensajeGlobal = msg;
      saveEcosystemState(founderState);
      agregarLog('Mensaje global actualizado: ' + (msg || '(vacío)'));
      renderLogs();
      showToast(msg ? 'Mensaje global publicado' : 'Mensaje global eliminado', 'success');
    });
  }

  // Botón reset de datos
  const resetBtn = document.getElementById('btn-reset-datos');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (!confirm('¿Restaurar todos los datos del ecosistema a los valores por defecto? Esta acción no se puede deshacer.')) return;
      localStorage.removeItem(STORAGE_KEY);
      founderState = loadEcosystemState();
      renderAll();
      showToast('Datos del ecosistema restaurados', 'info');
    });
  }
}

/* ---- MODERACIÓN ---------------------------------------------------- */

function initializeModeracion() {
  const form = document.querySelector('[data-form="moderation"]');
  if (!form) return;
  form.addEventListener('submit', e => {
    e.preventDefault();
    playSoftClick();
    const usuario = form.querySelector('[name="modUser"]')?.value?.trim();
    const accion = form.querySelector('[name="modAction"]')?.value;
    const motivo = form.querySelector('[name="modReason"]')?.value?.trim() || 'Sin motivo';
    if (!usuario) { showToast('Ingresa el nombre de usuario', 'warning'); return; }
    if (!accion) { showToast('Selecciona una acción', 'warning'); return; }

    const acciones = {
      'warn': 'recibió una advertencia',
      'ban-24h': 'fue sancionado por 24h',
      'ban-7d': 'fue sancionado por 7 días',
      'ban-perm': 'fue suspendido permanentemente',
      'unlock': 'fue desbloqueado'
    };

    founderState.moderacion.sanciones.unshift({ usuario, accion, motivo, timestamp: new Date().toISOString() });
    agregarActividad(usuario, acciones[accion] || accion, 'sancion');
    agregarLog('Moderación: ' + usuario + ' · ' + (acciones[accion] || accion) + ' · ' + motivo);

    saveEcosystemState(founderState);
    renderActividad();
    renderLogs();
    form.reset();
    showToast('Acción aplicada a ' + usuario + ': ' + (acciones[accion] || accion), 'warning');
  });
}

/* ---- HELPERS DE ESTADO -------------------------------------------- */

function agregarActividad(usuario, accion, tipo) {
  const ahora = new Date();
  const hora = ahora.getHours() + ':' + String(ahora.getMinutes()).padStart(2, '0');
  founderState.actividad.feed.unshift({ usuario: '@' + usuario.replace('@', ''), accion, hace: 'Ahora', tipo });
  if (founderState.actividad.feed.length > 20) founderState.actividad.feed.pop();
}

function agregarLog(mensaje) {
  const ahora = new Date();
  const hora = String(ahora.getHours()).padStart(2, '0') + ':' + String(ahora.getMinutes()).padStart(2, '0');
  founderState.logs.unshift({ hora, mensaje });
  if (founderState.logs.length > 20) founderState.logs.pop();
}

/* ---- SEGURIDAD ----------------------------------------------------- */

function initializeSecurityLayer() {
  // Detect DevTools (basic heuristic)
  let devToolsOpened = false;
  const threshold = 160;
  setInterval(() => {
    const widthDiff = window.outerWidth - window.innerWidth > threshold;
    const heightDiff = window.outerHeight - window.innerHeight > threshold;
    if ((widthDiff || heightDiff) && !devToolsOpened) {
      devToolsOpened = true;
      agregarLog('Herramientas de inspección detectadas — sesión en revisión');
      saveEcosystemState(founderState);
      renderLogs();
    } else if (!widthDiff && !heightDiff) {
      devToolsOpened = false;
    }
  }, 3000);
}

/* ---- PULSO EN VIVO (SIMULADO) -------------------------------------- */

function initializeLivePulse() {
  const mensajes = [
    () => { const u = '@Usuario' + randomBetween(100,999); const c = randomBetween(500, 50000); agregarActividad(u, 'recibió ' + formatNumber(c) + ' croquetas', 'croquetas'); founderState.croquetas.enCirculacion += c; },
    () => { const u = '@Miembro' + randomBetween(100,999); const rangos = ['Guardián','Montañista','Guía','Protector']; const r = rangos[randomBetween(0, rangos.length-1)]; agregarActividad(u, 'fue ascendido a ' + r, 'ascenso'); },
    () => { const u = '@Usuario' + randomBetween(100,999); agregarActividad(u, 'envió evaluación para verificación', 'evaluacion'); founderState.evaluaciones.pendientes++; },
    () => { founderState.usuarios.total += randomBetween(1, 5); founderState.usuarios.activos += randomBetween(1, 3); }
  ];

  setInterval(() => {
    const fn = mensajes[randomBetween(0, mensajes.length - 1)];
    fn();
    saveEcosystemState(founderState);
    renderKPIs();
    renderActividad();
    renderLogs();
  }, 15000);
}

/* ---- EFECTOS VISUALES ---------------------------------------------- */

function initializeDepthEffects() {
  document.querySelectorAll('.glass-card, .kpi-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const rx = (y - cy) / cy * -4;
      const ry = (x - cx) / cx * 4;
      card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(4px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
    });
  });
}

/* ---- CERRAR SESIÓN ------------------------------------------------- */

function initializeLogout() {
  const logoutBtn = document.querySelector('[data-action="logout"]');
  if (!logoutBtn) return;
  logoutBtn.addEventListener('click', () => {
    playSoftClick();
    agregarLog('Sesión cerrada por el Fundador');
    saveEcosystemState(founderState);
    showToast('Sesión cerrada. Hasta pronto, Fundador.', 'info');
    setTimeout(() => { window.location.href = './index.html'; }, 1800);
  });
}

/* ---- RENDER TOTAL -------------------------------------------------- */

function renderAll() {
  renderKPIs();
  renderEvaluaciones();
  renderActividad();
  renderNiveles();
  renderSalud();
  renderLogs();
  renderConfiguracion();
}

/* ---- BOOT ---------------------------------------------------------- */

function bootFounderPanel() {
  console.log('[NEVADO][PANEL DEL FUNDADOR] Iniciando...');

  founderState = loadEcosystemState();
  renderAll();

  initializeNavigation();
  initializeQuickActions();
  initializeFormCroquetas();
  initializeFormAscenso();
  initializeModeracion();
  initializeConfiguracion();
  initializeSecurityLayer();
  initializeLivePulse();
  initializeDepthEffects();
  initializeLogout();

  // Listen for cross-tab ecosystem updates
  window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) {
      founderState = loadEcosystemState();
      renderAll();
    }
  });

  setTimeout(() => {
    showToast('Panel del Fundador conectado al ecosistema', 'success');
  }, 1200);

  console.log('[NEVADO][PANEL DEL FUNDADOR] Listo. Estado:', founderState);
}

document.addEventListener('DOMContentLoaded', bootFounderPanel);
