(function () {
  const BUBBLE = {
    '/talento.html':          'Hay 847 vacantes activas hoy. ¿Te ayudo a encontrar una?',
    '/avila.html':            '340 rutas de aprendizaje esperan. ¿Por dónde empezamos?',
    '/nodo.html':             '18,340 venezolanos conectados. ¿Qué quieres compartir?',
    '/enterate.html':         '42 fuentes verificadas. ¿Qué quieres saber hoy?',
    '/corazon-tricolor.html': '180 historias documentadas. ¿Leemos una?',
    '/servicios.html':        '2,180 freelancers verificados. ¿Buscas o ofreces algo?',
    '/transparencia.html':    'Todos los números, al descubierto. ¿Tienes alguna duda?',
  };

  function getText() {
    const msg = BUBBLE[window.location.pathname] || '¿En qué te puedo ayudar hoy?';
    const nombre = window.NEVADO_AUTH?.getUser?.()?.nombre?.split(' ')[0];
    return nombre ? `${nombre}, ${msg[0].toLowerCase()}${msg.slice(1)}` : msg;
  }

  function show() {
    const wrap = document.getElementById('miniNevadoWrap');
    if (!wrap || document.getElementById('nv-bubble')) return;

    if (!document.getElementById('nv-bubble-style')) {
      const s = document.createElement('style');
      s.id = 'nv-bubble-style';
      s.textContent = `
        @keyframes nv-bi { from{opacity:0;transform:translateY(8px) scale(0.96)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes nv-bo { from{opacity:1;transform:translateY(0) scale(1)} to{opacity:0;transform:translateY(4px) scale(0.97)} }
        #nv-bubble { animation: nv-bi 0.4s cubic-bezier(.4,0,.2,1) forwards; }
        #nv-bubble.hiding { animation: nv-bo 0.4s cubic-bezier(.4,0,.2,1) forwards; }
      `;
      document.head.appendChild(s);
    }

    const b = document.createElement('div');
    b.id = 'nv-bubble';
    b.style.cssText = [
      'position:absolute', 'bottom:calc(100% + 10px)', 'right:0',
      'background:rgba(12,12,14,0.97)', 'border:1px solid rgba(255,255,255,0.09)',
      'border-radius:14px 14px 4px 14px', 'padding:11px 14px',
      'font-size:11.5px', 'color:rgba(232,228,220,0.82)',
      'font-family:Geist,-apple-system,sans-serif', 'line-height:1.55',
      'max-width:210px', 'min-width:150px', 'white-space:normal',
      'backdrop-filter:blur(12px)', 'box-shadow:0 8px 32px rgba(0,0,0,0.55)',
      'z-index:9000', 'cursor:pointer',
    ].join(';');
    b.textContent = getText();
    b.onclick = () => { b.remove(); wrap.click(); };

    wrap.style.position = 'relative';
    wrap.appendChild(b);

    setTimeout(() => {
      if (!b.parentNode) return;
      b.classList.add('hiding');
      setTimeout(() => b.remove(), 420);
    }, 5000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(show, 4000));
  } else {
    setTimeout(show, 4000);
  }
})();
