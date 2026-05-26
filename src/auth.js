// NEVADO — Auth v1.0 · Clerk + Supabase
import Clerk from '@clerk/clerk-js';
import { createClient } from '@supabase/supabase-js';

const CLERK_KEY  = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const SB_URL     = import.meta.env.VITE_SUPABASE_URL;
const SB_ANON    = import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(SB_URL, SB_ANON);
const clerk    = new Clerk(CLERK_KEY);

let _nvUser = null; // row cacheado de Supabase

// ── Supabase sync ──────────────────────────────────────────
async function syncToSupabase(clerkUser) {
  const payload = {
    clerk_id: clerkUser.id,
    nombre:   clerkUser.fullName || clerkUser.firstName || 'Venezolano',
    email:    clerkUser.primaryEmailAddress?.emailAddress || '',
    ultima_actividad: new Date().toISOString(),
  };
  const { data } = await supabase
    .from('usuarios')
    .upsert(payload, { onConflict: 'clerk_id' })
    .select().single();
  return data;
}

async function addCroquetasDB(clerk_id, cantidad, motivo) {
  const { data: current } = await supabase
    .from('usuarios').select('croquetas').eq('clerk_id', clerk_id).single();
  const nuevas = (current?.croquetas || 0) + cantidad;
  const rango  = window.NEVADO_CROQUETAS?.getRango(nuevas)?.nombre || 'Cachorro';
  const nivel  = _calcNivel(nuevas);
  const { data } = await supabase
    .from('usuarios')
    .update({ croquetas: nuevas, rango, nivel, ultima_actividad: new Date().toISOString() })
    .eq('clerk_id', clerk_id).select().single();
  await supabase.from('croquetas_log').insert({ clerk_id, cantidad, motivo });
  return data;
}

function _calcNivel(pts) {
  if (pts < 100)  return 1;
  if (pts < 300)  return 2;
  if (pts < 700)  return 3;
  if (pts < 1500) return 4;
  if (pts < 3000) return 5;
  if (pts < 6000) return 6;
  return 7;
}

// ── Nav UI ─────────────────────────────────────────────────
function _injectAuthBtn() {
  const actions = document.querySelector('.topbar-actions');
  if (!actions || document.getElementById('nv-auth-btn')) return;

  const divider = document.createElement('div');
  divider.style.cssText = 'width:1px;height:20px;background:rgba(255,255,255,0.10);margin:0 4px;';

  const btn = document.createElement('button');
  btn.id = 'nv-auth-btn';
  btn.style.cssText = [
    'font-size:10px', 'letter-spacing:0.12em', 'text-transform:uppercase',
    'padding:5px 12px', 'border-radius:6px', 'cursor:none',
    'background:transparent', 'border:1px solid rgba(184,148,74,0.35)',
    'transition:all 0.2s', 'font-family:inherit',
    'display:flex', 'align-items:center', 'gap:6px', 'white-space:nowrap',
  ].join(';');

  actions.insertBefore(divider, actions.firstChild);
  actions.insertBefore(btn, divider);
  _refreshNavBtn();
}

function _refreshNavBtn() {
  const btn = document.getElementById('nv-auth-btn');
  if (!btn) return;

  if (clerk.user && _nvUser) {
    const pts   = _nvUser.croquetas || 0;
    const rango = window.NEVADO_CROQUETAS?.getRango(pts) || { emoji: '🐾', color: '#8B9DC3' };
    btn.innerHTML = `<span>${rango.emoji}</span><span style="color:${rango.color}">${_nvUser.nombre?.split(' ')[0] || 'Tú'}</span>`;
    btn.title     = `${pts.toLocaleString('es')} Croquetas · Cerrar sesión`;
    btn.onclick   = () => clerk.signOut();
  } else {
    btn.innerHTML = 'Entrar';
    btn.style.color = '#B8944A';
    btn.title = '';
    btn.onclick = () => clerk.openSignIn();
  }
}

// ── Panel talento.html ─────────────────────────────────────
function _refreshTalentoPanel() {
  const signedIn  = document.getElementById('perfil-signed-in');
  const noSession = document.getElementById('perfil-no-session');

  if (clerk.user && _nvUser) {
    if (signedIn)  signedIn.style.display  = '';
    if (noSession) noSession.style.display = 'none';

    const pts   = _nvUser.croquetas || 0;
    const rango = window.NEVADO_CROQUETAS?.getRango(pts) || window.NEVADO_CROQUETAS?.rangos?.[0];

    const photo  = document.getElementById('perfil-clerk-photo');
    const badge  = document.getElementById('perfil-rango-badge');
    const img    = document.getElementById('perfil-rango-img');
    const nom    = document.getElementById('perfil-rango-nombre');
    const cnt    = document.getElementById('perfil-croquetas-count');
    const nombre = document.getElementById('perfil-nombre-display');
    const email  = document.getElementById('perfil-email-display');

    if (photo)           photo.src = clerk.user.imageUrl || '';
    if (badge  && rango) { badge.src = rango.img; badge.alt = rango.nombre; }
    if (img    && rango) { img.src   = rango.img; img.alt   = rango.nombre; }
    if (nom    && rango) nom.textContent  = rango.nombre;
    if (cnt)             cnt.textContent  = `🦴 ${pts.toLocaleString('es')} Croquetas`;
    if (nombre)          nombre.textContent = _nvUser.nombre || 'Venezolano';
    if (email)           email.textContent  = _nvUser.email  || '';
  } else {
    if (signedIn)  signedIn.style.display  = 'none';
    if (noSession) noSession.style.display = '';
  }
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  await clerk.load();

  const ready = () => {
    _injectAuthBtn();
    _refreshTalentoPanel();
  };
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', ready)
    : ready();

  clerk.addListener(async ({ user }) => {
    if (user) {
      _nvUser = await syncToSupabase(user);
      _refreshNavBtn();
      _refreshTalentoPanel();
      // Sincroniza croquetas con localStorage para modo offline
      if (window.NEVADO_CROQUETAS && _nvUser) {
        window.NEVADO_CROQUETAS._syncFromDB(_nvUser.croquetas || 0);
      }
    } else {
      _nvUser = null;
      _refreshNavBtn();
      _refreshTalentoPanel();
    }
  });

  // API pública global
  window.NEVADO_AUTH = {
    clerk,
    supabase,
    getUser:    () => _nvUser,
    getClerkUser: () => clerk.user,
    signIn:     () => clerk.openSignIn(),
    signOut:    () => clerk.signOut(),
    isSignedIn: () => !!clerk.user,
    refreshPanel: _refreshTalentoPanel,

    updateNombre: async (nuevoNombre) => {
      if (!clerk.user || !_nvUser) return;
      const { data } = await supabase.from('usuarios')
        .update({ nombre: nuevoNombre })
        .eq('clerk_id', clerk.user.id).select().single();
      if (data) { _nvUser = data; _refreshNavBtn(); _refreshTalentoPanel(); }
      return data;
    },

    // Otorgar croquetas desde el panel Fundador
    otorgarCroquetas: async (clerk_id, cantidad, motivo = 'Otorgado por Fundador') => {
      const updated = await addCroquetasDB(clerk_id, cantidad, motivo);
      if (clerk.user?.id === clerk_id && updated) {
        _nvUser = updated;
        _refreshNavBtn();
        _refreshTalentoPanel();
        window.NEVADO_CROQUETAS?._syncFromDB(updated.croquetas);
        window.NEVADO_CROQUETAS?._showToast(cantidad, motivo);
      }
      return updated;
    },
  };
}

init();
