import './home-bg.js';
import './style.css';
import { initNevado3D } from './nevado3d.js';
import { initInteractions } from './interactions.js';
import { initNevadoMode } from './nevado-mode.js';

// ─── Build DOM ────────────────────────────────────────────────────────────────

document.querySelector('#app').innerHTML = `
  <!-- Particles background -->
  <canvas id="particles-bg"></canvas>

  <!-- Watermark -->
  <div id="watermark">NEVADO</div>

  <!-- Topbar -->
  <header id="topbar">
    <a class="topbar-logo" href="#">N<span>·</span>EVADO</a>

    <div class="topbar-status">
      <div class="status-dot ecosystem-dot"></div>
      <span>Ecosistema activo · 48,291 venezolanos</span>
    </div>

    <nav class="topbar-nav">
      <span class="nav-item" data-hover>Transparencia</span>
      <span class="nav-item" data-hover>Ecosistema</span>
      <span class="nav-item" data-hover>Fundación</span>
      <button class="btn-plus" data-hover>Nevado Plus</button>
      <div id="nvd-session-pill"></div>
    </nav>
  </header>

  <!-- 3D Canvas + Nevado integration layers -->
  <div id="nevado-canvas-container">
    <div id="nevado-ambient"></div>
    <div id="nevado-ground-shadow"></div>
    <canvas id="canvas3d"></canvas>
  </div>

  <!-- SVG Node Lines -->
  <svg id="nodes-svg" xmlns="http://www.w3.org/2000/svg"></svg>

  <!-- Module Cards -->
  <a class="module-card" id="mod-talent" data-module="talento" data-hover href="/talento.html">
    <div class="module-tag">RED DE TALENTO</div>
    <div class="card-accent-line" style="background:#F4D03F"></div>
    <div class="module-name">CAPITAL HUMANO</div>
    <div class="module-stat"><strong>12,430</strong> profesionales activos</div>
  </a>

  <a class="module-card" id="mod-education" data-module="avila" data-hover href="/avila.html">
    <div class="module-tag">FORMACIÓN</div>
    <div class="card-accent-line" style="background:#F4D03F"></div>
    <div class="module-name">ÁVILA</div>
    <div class="module-stat"><strong>340</strong> rutas certificadas</div>
  </a>

  <a class="module-card" id="mod-transparent" data-module="enterate" data-hover href="/enterate.html">
    <div class="module-tag">TITULARES</div>
    <div class="card-accent-line" style="background:#2980B9"></div>
    <div class="module-name">TITULARES</div>
    <div class="module-stat"><strong>180</strong> artículos publicados</div>
  </a>

  <a class="module-card" id="mod-media" data-module="corazon" data-hover href="/corazon-tricolor.html">
    <div class="module-tag">PROYECTOS HUMANOS</div>
    <div class="card-accent-line" style="background:#2980B9"></div>
    <div class="module-name">CORAZÓN TRICOLOR</div>
    <div class="module-stat"><strong>180</strong> historias documentadas</div>
  </a>

  <a class="module-card" id="mod-community" data-module="nodo" data-hover href="/nodo.html">
    <div class="module-tag">COMUNIDAD</div>
    <div class="card-accent-line" style="background:#E74C3C"></div>
    <div class="module-name">NODO</div>
    <div class="module-stat"><strong>89</strong> espacios en 22 países</div>
  </a>

  <a class="module-card" id="mod-services" data-module="servicios" data-hover href="/servicios.html">
    <div class="module-tag">Economía Distribuida</div>
    <div class="card-accent-line" style="background:#E74C3C"></div>
    <div class="module-name">Servicios</div>
    <div class="module-stat"><strong>2,180</strong> freelancers verificados</div>
  </a>

  <!-- Tagline -->
  <div id="tagline">
    Infraestructura digital para <em>reconstruir</em> el capital humano venezolano
  </div>

  <!-- Ticker -->
  <div id="ticker">
    <div class="ticker-track" id="ticker-track"></div>
  </div>

  <!-- System Bar -->
  <div id="sysbar">
    <div class="sysbar-hint">
      <kbd>⌘K</kbd>
      <span>Buscar en el ecosistema</span>
    </div>
    <div class="sysbar-metrics">
      <span class="sysbar-metric">Uptime <span class="val">99.98%</span></span>
      <span class="sysbar-metric">Latencia <span class="val">41ms</span></span>
      <span class="sysbar-metric">Nodos <span class="val">89</span></span>
      <span class="sysbar-metric">v2.4.1</span>
    </div>
  </div>
`;

// ─── Ticker ───────────────────────────────────────────────────────────────────

const TICKER_ITEMS = [
  { label: 'Venezolanos Activos', val: '48,291' },
  { label: 'Rutas ÁVILA', val: '340' },
  { label: 'Nodos Activos', val: '89' },
  { label: 'Iniciativas', val: '1,204' },
  { label: 'Profesionales', val: '12,430' },
  { label: 'Fondos Auditados', val: '$24,180' },
  { label: 'Historias', val: '180' },
  { label: 'Freelancers', val: '2,180' },
  { label: 'Países', val: '22' },
  { label: 'Mentores', val: '312' },
];

function buildTicker() {
  const track = document.getElementById('ticker-track');
  const html = TICKER_ITEMS.map(i =>
    `<span class="ticker-item"><span class="ticker-val">${i.val}</span><span class="ticker-sep">·</span>${i.label}</span>`
  ).join('');
  track.innerHTML = html + html;
}
buildTicker();

// ─── Sesión — dispara inmediatamente tras el DOM, sin esperar el GLB ──────────
if (window.__nvdApplyPill) {
  (function trySession() {
    if (!window.Clerk) { setTimeout(trySession, 80); return; }
    window.Clerk.load().then(function () {
      window.__nvdApplyPill(window.Clerk.user || null);
    }).catch(function () {
      window.__nvdApplyPill(null);
    });
  })();
}

// ─── Particles ────────────────────────────────────────────────────────────────

function initParticles() {
  const canvas = document.getElementById('particles-bg');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const N = 70;
  const pts = Array.from({ length: N }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
  }));

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const dx = pts[i].x - pts[j].x;
        const dy = pts[i].y - pts[j].y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < 150) {
          ctx.beginPath();
          ctx.moveTo(pts[i].x, pts[i].y);
          ctx.lineTo(pts[j].x, pts[j].y);
          ctx.strokeStyle = `rgba(255,255,255,${0.06 * (1 - d / 150)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fill();

      p.vx += (Math.random() - 0.5) * 0.05;
      p.vy += (Math.random() - 0.5) * 0.05;
      p.vx *= 0.95;
      p.vy *= 0.95;
      p.x  += p.vx;
      p.y  += p.vy;

      if (p.x < 0) p.x = canvas.width;
      if (p.x > canvas.width)  p.x = 0;
      if (p.y < 0) p.y = canvas.height;
      if (p.y > canvas.height) p.y = 0;
    });

    requestAnimationFrame(tick);
  }
  tick();
}

// ─── Nebulae ──────────────────────────────────────────────────────────────────

function initNebula() {
  const defs = [
    { id: 'nebula-1' },
    { id: 'nebula-2' },
    { id: 'nebula-3' },
  ];
  defs.forEach(({ id }) => {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
  });
}

// ─── Node SVG Lines ───────────────────────────────────────────────────────────

function initNodesSVG() {
  const svg = document.getElementById('nodes-svg');
  if (!svg) return;

  const CARD_IDS = [
    'mod-talent', 'mod-education', 'mod-transparent',
    'mod-media',  'mod-community', 'mod-services',
  ];

  function draw() {
    svg.innerHTML = '';
    const cx = window.innerWidth  / 2;
    const cy = window.innerHeight / 2;

    CARD_IDS.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('id',  `nl-${id}`);
      line.setAttribute('x1', cx);
      line.setAttribute('y1', cy);
      line.setAttribute('x2', r.left + r.width  / 2);
      line.setAttribute('y2', r.top  + r.height / 2);
      svg.appendChild(line);
    });
  }

  draw();
  window.addEventListener('resize', draw);

  CARD_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('mouseenter', () => document.getElementById(`nl-${id}`)?.classList.add('active'));
    el.addEventListener('mouseleave', () => document.getElementById(`nl-${id}`)?.classList.remove('active'));
  });
}

// ─── 3D Scene ─────────────────────────────────────────────────────────────────

const canvas = document.getElementById('canvas3d');
initNevado3D(canvas);

// ─── Interactions & Overlays ──────────────────────────────────────────────────

initInteractions();
initNevadoMode();

window.__NVD_KEY = import.meta.env.VITE_ANTHROPIC_KEY ?? '';

// ─── Nevado Plus (home) ───────────────────────────────────────────────────────
setTimeout(() => {
  const npScript = document.createElement('script');
  npScript.src = '/nevado-plus.js';
  document.head.appendChild(npScript);
}, 150);
initNebula();
if (window.innerWidth >= 768) initParticles();
initNodesSVG();
