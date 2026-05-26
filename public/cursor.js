(function () {
  if (window.__nevadoCursorInit) return;
  window.__nevadoCursorInit = true;

  if (!document.getElementById('nevado-cursor-style')) {
    const s = document.createElement('style');
    s.id = 'nevado-cursor-style';
    s.textContent = `
      body { cursor: none !important; }
      .cursor-dot {
        position: fixed; top: 0; left: 0;
        width: 7px; height: 7px; border-radius: 50%;
        background: #E8E4DC;
        pointer-events: none; z-index: 10001;
        mix-blend-mode: difference;
        will-change: transform;
      }
      .click-ripple {
        position: fixed;
        width: 40px; height: 40px;
        border: 1.5px solid rgba(255,255,255,0.85);
        border-radius: 50%;
        pointer-events: none; z-index: 10001;
        transform: translate(-50%, -50%) scale(0);
        opacity: 0.8;
        transition: transform 0.5s cubic-bezier(0.15,0,0.35,1), opacity 0.5s ease;
      }
      .click-ripple.active {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0;
      }
    `;
    document.head.appendChild(s);
  }

  let dot = document.querySelector('.cursor-dot');
  if (!dot) {
    dot = document.createElement('div');
    dot.className = 'cursor-dot';
    document.body.appendChild(dot);
  }

  document.querySelectorAll('.n-cursor, .n-cursor-dot').forEach(el => el.remove());

  // Actualización directa en el evento — sin rAF, sin lerp, sin lag
  document.addEventListener('mousemove', e => {
    dot.style.transform = `translate3d(${e.clientX - 3.5}px,${e.clientY - 3.5}px,0)`;
  }, { passive: true });

  function createRipple(x, y) {
    const el = document.createElement('div');
    el.className = 'click-ripple';
    el.style.left = x + 'px';
    el.style.top  = y + 'px';
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('active'));
    setTimeout(() => el.remove(), 520);
  }
  document.addEventListener('click',       e => createRipple(e.clientX, e.clientY));
  document.addEventListener('contextmenu', e => createRipple(e.clientX, e.clientY));
})();
