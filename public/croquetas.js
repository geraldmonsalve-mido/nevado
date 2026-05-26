// NEVADO — Sistema de Croquetas v2.0 (Supabase + localStorage fallback)
;(function() {
  'use strict';

  let _dbPts = null; // cuando el usuario está logueado, se usa este valor

  window.NEVADO_CROQUETAS = {
    rangos: [
      { nombre: 'Cachorro',       min: 0,       max: 99,       emoji: '🐾', color: '#8B9DC3', img: '/rangos/rango1-cachorro-bronce.png' },
      { nombre: 'Explorador',     min: 100,     max: 299,      emoji: '🧭', color: '#B8944A', img: '/rangos/rango2-explorador-bronce.png' },
      { nombre: 'Guardián',       min: 300,     max: 699,      emoji: '🛡️', color: '#C0C0C0', img: '/rangos/rango3-guardian-plata.png' },
      { nombre: 'Montañista',     min: 700,     max: 1499,     emoji: '⛰️', color: '#A8B4C8', img: '/rangos/rango4-montanista-plata.png' },
      { nombre: 'Guía',           min: 1500,    max: 2999,     emoji: '🗺️', color: '#A8B4C8', img: '/rangos/rango5-guia-plata.png' },
      { nombre: 'Protector',      min: 3000,    max: 5999,     emoji: '🦅', color: '#B8944A', img: '/rangos/rango6-protector-oro.png' },
      { nombre: 'Leyenda Andina', min: 6000,    max: Infinity, emoji: '🏔️', color: '#F4D03F', img: '/rangos/rango7-leyendaandina-oro-joyas.png' },
    ],

    getRango(pts) {
      return this.rangos.find(r => pts >= r.min && pts <= r.max) || this.rangos[0];
    },

    // Lee desde DB si hay sesión, si no desde localStorage
    get puntos() {
      if (_dbPts !== null) return _dbPts;
      return parseInt(localStorage.getItem('nevado_croquetas') || '0');
    },

    // Sincroniza valor desde Supabase (llamado por auth.js al login)
    _syncFromDB(pts) {
      _dbPts = pts;
      localStorage.setItem('nevado_croquetas', pts);
      this._updateBadges();
    },

    agregar(pts, motivo) {
      if (window.NEVADO_AUTH?.isSignedIn()) {
        // Con sesión: escribe en Supabase (auth.js.otorgarCroquetas) y actualiza local
        const clerk_id = window.NEVADO_AUTH.getClerkUser()?.id;
        if (clerk_id) {
          window.NEVADO_AUTH.otorgarCroquetas(clerk_id, pts, motivo);
          return; // auth.js actualiza _dbPts y badges
        }
      }
      // Sin sesión: solo localStorage
      const nuevo = this.puntos + pts;
      localStorage.setItem('nevado_croquetas', nuevo);
      this._showToast(pts, motivo);
      this._updateBadges();
    },

    _showToast(pts, motivo) {
      const existing = document.getElementById('nv-croqueta-toast');
      if (existing) existing.remove();
      const t = document.createElement('div');
      t.id = 'nv-croqueta-toast';
      t.innerHTML = `
        <span style="font-size:20px">🦴</span>
        <div>
          <div style="font-size:13px;font-weight:600;color:#F4D03F">+${pts} Croqueta${pts > 1 ? 's' : ''}</div>
          <div style="font-size:11px;color:rgba(232,228,220,0.45)">${motivo}</div>
        </div>`;
      t.style.cssText = [
        'position:fixed', 'bottom:48px', 'right:24px', 'z-index:99999',
        'background:rgba(8,8,16,0.97)',
        'border:1px solid rgba(184,148,74,0.3)',
        'border-radius:12px', 'padding:12px 18px',
        'display:flex', 'align-items:center', 'gap:10px',
        "font-family:'Geist',system-ui,sans-serif",
        'box-shadow:0 8px 32px rgba(0,0,0,0.5)',
        'animation:croqueta-in 0.3s cubic-bezier(0.4,0,0.2,1)',
      ].join(';');
      document.body.appendChild(t);
      setTimeout(() => {
        t.style.opacity = '0'; t.style.transition = 'opacity .4s';
        setTimeout(() => t.remove(), 400);
      }, 2800);
    },

    _updateBadges() {
      const pts   = this.puntos;
      const rango = this.getRango(pts);
      document.querySelectorAll('#croquetas-display,[data-croquetas-badge]').forEach(el => {
        el.textContent = `🦴 ${pts.toLocaleString('es')} Croquetas · ${rango.emoji} ${rango.nombre}`;
      });
      // Actualiza panel talento si existe
      const img = document.getElementById('perfil-rango-img');
      const nom = document.getElementById('perfil-rango-nombre');
      const cnt = document.getElementById('perfil-croquetas-count');
      if (img) { img.src = rango.img; img.alt = rango.nombre; }
      if (nom) nom.textContent = rango.nombre;
      if (cnt) cnt.textContent = `🦴 ${pts.toLocaleString('es')} Croquetas`;
    },

    init() {
      this._updateBadges();
    }
  };

  // CSS
  const style = document.createElement('style');
  style.textContent = `
    @keyframes croqueta-in {
      from { opacity:0; transform:translateX(20px); }
      to   { opacity:1; transform:translateX(0); }
    }
    .croquetas-badge {
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:100px; font-size:11px; font-weight:600;
      font-family:'Geist',system-ui,sans-serif;
      border:1px solid rgba(184,148,74,0.25);
      background:rgba(184,148,74,0.08);
      color:#B8944A; cursor:default;
    }
  `;
  document.head.appendChild(style);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.NEVADO_CROQUETAS.init());
  } else {
    window.NEVADO_CROQUETAS.init();
  }
})();
