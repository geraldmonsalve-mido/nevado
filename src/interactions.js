// Spotlight, context menu, cursor

export function initInteractions() {
  initCursor();
  initSpotlight();
  initContextMenu();
}

// ─── Custom Cursor ───────────────────────────────────────────────────────────

function initCursor() {
  const dot = document.createElement('div');
  dot.className = 'cursor-dot';
  document.body.appendChild(dot);

  let mx = -100, my = -100;

  document.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
  });

  function loop() {
    dot.style.transform = `translate3d(${mx - 3.5}px, ${my - 3.5}px, 0)`;
    requestAnimationFrame(loop);
  }
  loop();

  function createRipple(x, y) {
    const el = document.createElement('div');
    el.className = 'click-ripple';
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
    setTimeout(() => el.remove(), 520);
  }

  document.addEventListener('click', e => createRipple(e.clientX, e.clientY));
  document.addEventListener('contextmenu', e => createRipple(e.clientX, e.clientY));
}

// ─── Spotlight ───────────────────────────────────────────────────────────────

const SPOTLIGHT_RESULTS = [
  { icon: '◈', name: 'Talento Venezolano', sub: 'Directorio de 12,430 profesionales', tag: 'Módulo' },
  { icon: '◉', name: 'Rutas Educativas', sub: '340 programas certificados activos', tag: 'Educación' },
  { icon: '▣', name: 'Transparencia Financiera', sub: '$24,180 auditados este trimestre', tag: 'Auditoría' },
  { icon: '◎', name: 'Historias de Comunidad', sub: '180 narrativas documentadas', tag: 'Media' },
  { icon: '⬡', name: 'Espacios Comunitarios', sub: '89 nodos activos en 22 países', tag: 'Red' },
];

function initSpotlight() {
  const overlay = document.createElement('div');
  overlay.className = 'spotlight-overlay';
  overlay.innerHTML = `
    <div class="spotlight-panel">
      <div class="spotlight-search-wrap">
        <span class="spotlight-icon">⌕</span>
        <input class="spotlight-input" type="text" placeholder="Buscar en NEVADO…" autocomplete="off" spellcheck="false" />
        <span class="spotlight-esc">ESC</span>
      </div>
      <div class="spotlight-results"></div>
      <div class="spotlight-footer">
        <span><kbd>↑↓</kbd> navegar</span>
        <span><kbd>↵</kbd> abrir</span>
        <span><kbd>ESC</kbd> cerrar</span>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.spotlight-input');
  const resultsEl = overlay.querySelector('.spotlight-results');
  let active = -1;

  function open() {
    overlay.classList.add('open');
    input.value = '';
    renderResults('');
    setTimeout(() => input.focus(), 40);
  }

  function close() {
    overlay.classList.remove('open');
    active = -1;
  }

  function renderResults(query) {
    const filtered = query
      ? SPOTLIGHT_RESULTS.filter(r =>
          r.name.toLowerCase().includes(query.toLowerCase()) ||
          r.sub.toLowerCase().includes(query.toLowerCase()) ||
          r.tag.toLowerCase().includes(query.toLowerCase())
        )
      : SPOTLIGHT_RESULTS;

    resultsEl.innerHTML = filtered
      .map((r, i) => `
        <div class="spotlight-item ${i === active ? 'active' : ''}" data-index="${i}">
          <span class="spotlight-item-icon">${r.icon}</span>
          <div class="spotlight-item-body">
            <div class="spotlight-item-name">${r.name}</div>
            <div class="spotlight-item-sub">${r.sub}</div>
          </div>
          <span class="spotlight-item-tag">${r.tag}</span>
        </div>
      `).join('');

    resultsEl.querySelectorAll('.spotlight-item').forEach(el => {
      el.addEventListener('mouseenter', () => {
        active = +el.dataset.index;
        highlightActive();
      });
      el.addEventListener('click', close);
    });
  }

  function highlightActive() {
    resultsEl.querySelectorAll('.spotlight-item').forEach((el, i) => {
      el.classList.toggle('active', i === active);
    });
  }

  input.addEventListener('input', () => {
    active = -1;
    renderResults(input.value);
  });

  overlay.addEventListener('keydown', (e) => {
    const items = resultsEl.querySelectorAll('.spotlight-item');
    if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % items.length; highlightActive(); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); active = (active - 1 + items.length) % items.length; highlightActive(); }
    if (e.key === 'Enter')     { close(); }
    if (e.key === 'Escape')    { close(); }
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      overlay.classList.contains('open') ? close() : open();
    }
    if (e.key === 'Escape' && overlay.classList.contains('open')) close();
  });

  // Expose open for context menu
  window.__openSpotlight = open;
}

// ─── Context Menu ─────────────────────────────────────────────────────────────

const CTX_ITEMS = [
  { icon: '◈', label: 'Estado del ecosistema', kbd: '⌘E' },
  { icon: '▣', label: 'Transparencia',          kbd: '⌘T', action: () => { window.location.href = '/transparencia.html'; } },
  { icon: '◎', label: 'Actividad global',       kbd: '⌘A' },
  { sep: true },
  { icon: '⬡', label: 'Modo Nevado',            kbd: '⌘N', action: () => document.getElementById('nm-hit-zone')?.click() },
  { icon: '⌕', label: 'Búsqueda',              kbd: '⌘K', action: () => window.__openSpotlight?.() },
  { sep: true },
  { icon: '◉', label: 'Métricas',              kbd: '⌘M' },
  { icon: '⊕', label: 'Configuración',          kbd: '⌘,' },
];

function initContextMenu() {
  const menu = document.createElement('div');
  menu.className = 'ctx-menu';
  document.body.appendChild(menu);

  function buildMenu() {
    menu.innerHTML = CTX_ITEMS.map(item => {
      if (item.sep) return '<div class="ctx-sep"></div>';
      return `
        <div class="ctx-item" data-label="${item.label}">
          <span class="ctx-item-icon">${item.icon}</span>
          <span class="ctx-item-label">${item.label}</span>
          <span class="ctx-item-kbd">${item.kbd}</span>
        </div>`;
    }).join('');

    menu.querySelectorAll('.ctx-item').forEach(el => {
      el.addEventListener('click', () => {
        const label = el.dataset.label;
        const found = CTX_ITEMS.find(i => i.label === label);
        if (found?.action) found.action();
        closeMenu();
      });
    });
  }

  function openMenu(x, y) {
    buildMenu();
    menu.style.left = `${x}px`;
    menu.style.top  = `${y}px`;
    menu.classList.add('open');
    requestAnimationFrame(() => {
      const r = menu.getBoundingClientRect();
      if (r.right  > window.innerWidth)  menu.style.left = `${x - r.width}px`;
      if (r.bottom > window.innerHeight) menu.style.top  = `${y - r.height}px`;
    });
  }

  function closeMenu() {
    menu.classList.remove('open');
  }

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (e.target.closest('.module-card')) return;
    openMenu(e.clientX, e.clientY);
  });

  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target)) closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}
