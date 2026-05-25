export function initNevadoMode() {

  let isActive = false;
  let chatHistory = [];

  const BUBBLE_MESSAGES = [
    '¿Qué quieres construir hoy?',
    'Explora el ecosistema venezolano',
    'Somos 48,291 venezolanos activos',
    'Tócame para hablar conmigo',
  ];
  let bubbleIdx = 0;

  const bubble = document.createElement('div');
  bubble.id = 'nm-bubble';
  bubble.innerHTML = `<span></span><div class="nm-bubble-tail"></div>`;
  document.body.appendChild(bubble);

  function runBubbleCycle() {
    const span = bubble.querySelector('span');
    span.innerHTML = BUBBLE_MESSAGES[bubbleIdx];
    bubbleIdx = (bubbleIdx + 1) % BUBBLE_MESSAGES.length;
    bubble.classList.add('visible');
    const showMs = 3500 + Math.random() * 500;
    setTimeout(() => {
      bubble.classList.remove('visible');
      setTimeout(runBubbleCycle, 400);
    }, showMs);
  }
  setTimeout(runBubbleCycle, 2000);

  const hitZone = document.createElement('div');
  hitZone.id = 'nm-hit-zone';
  hitZone.setAttribute('aria-label', 'Abrir Modo Nevado');
  document.body.appendChild(hitZone);
  hitZone.addEventListener('click', open);

  const overlay = document.createElement('div');
  overlay.id = 'nm-overlay';
  document.body.appendChild(overlay);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  const panel = document.createElement('div');
  panel.id = 'nm-panel';
  overlay.appendChild(panel);

  function open() {
    isActive = true;
    chatHistory = [];
    bubble.classList.remove('visible');
    overlay.style.transition = '';
    overlay.classList.add('active');
    document.querySelector('.cursor-dot')?.style.setProperty('display', 'none');
    showPanel('home');
  }

  function close() {
    isActive = false;
    overlay.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    overlay.classList.remove('active');
    document.querySelector('.cursor-dot')?.style.removeProperty('display');
    setTimeout(() => { overlay.style.transition = ''; panel.innerHTML = ''; }, 220);
  }

  function showPanel(name) {
    panel.style.opacity = '0';
    panel.style.transform = 'translateY(8px)';
    if (name === 'chat') {
      panel.style.position = 'absolute';
      panel.style.inset = '0';
      panel.style.width = '100%';
      panel.style.height = '100%';
      panel.style.transition = 'opacity 350ms cubic-bezier(0.4,0,0.2,1), transform 350ms cubic-bezier(0.4,0,0.2,1)';
      renderChat();
    } else {
      panel.style.position = '';
      panel.style.inset = '';
      panel.style.width = '';
      panel.style.height = '';
      panel.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      if (name === 'home')   renderHome();
      if (name === 'routes') renderRoutes();
    }
    requestAnimationFrame(() => { panel.style.opacity = '1'; panel.style.transform = 'translateY(0)'; });
  }

  function renderHome() {
    panel.innerHTML = `
      <div class="nm-inner">
        <button class="nm-x" id="nm-x">✕</button>
        <div class="nm-logo-ring"><span>N</span></div>
        <h2 class="nm-heading">Modo Nevado</h2>
        <p class="nm-sub">Tu asistente del ecosistema venezolano</p>
        <div class="nm-home-cards">
          <button class="nm-hcard" id="nm-to-chat">
            <span class="nm-hcard-icon">◎</span>
            <div>
              <div class="nm-hcard-title">Preguntarle a Nevado</div>
              <div class="nm-hcard-desc">Resuelve dudas sobre el ecosistema</div>
            </div>
            <span class="nm-hcard-arrow">→</span>
          </button>
          <button class="nm-hcard" id="nm-to-routes">
            <span class="nm-hcard-icon">⬡</span>
            <div>
              <div class="nm-hcard-title">Necesito ir a algún lugar…</div>
              <div class="nm-hcard-desc">Navega a cualquier módulo</div>
            </div>
            <span class="nm-hcard-arrow">→</span>
          </button>
        </div>
      </div>
    `;
    document.getElementById('nm-x').onclick = close;
    document.getElementById('nm-to-chat').onclick = () => showPanel('chat');
    document.getElementById('nm-to-routes').onclick = () => showPanel('routes');
  }

  function renderChat() {
    panel.innerHTML = `
      <div class="nm-chat-fs">
        <div class="nm-chat-topbar">
          <button class="nm-chat-back" id="nm-back">← Volver</button>
          <div class="nm-chat-logo">N</div>
          <div class="nm-chat-topbar-r"></div>
        </div>
        <div class="nm-chat-body" id="nm-chat-body">
          <div class="nm-chat-msgs" id="nm-msgs"></div>
        </div>
        <div class="nm-chat-input-wrap">
          <div class="nm-chat-input-row">
            <input id="nm-input" class="nm-chat-input" type="text"
              placeholder="Pregúntale algo a Nevado…"
              autocomplete="off" spellcheck="false" />
            <button id="nm-send" class="nm-chat-send">→</button>
          </div>
        </div>
      </div>
    `;

    const msgs  = document.getElementById('nm-msgs');
    const body  = document.getElementById('nm-chat-body');
    const input = document.getElementById('nm-input');
    document.getElementById('nm-back').onclick = () => showPanel('home');

    function appendBot(text) {
      text = text.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1').replace(/<[^>]+>/g, '');
      const el  = document.createElement('div');
      el.className = 'nm-msg nm-bot';
      const img = document.createElement('img');
      img.src = '/foto/Nevado_head.png';
      img.className = 'nm-bot-avatar';
      const textEl = document.createElement('div');
      textEl.className = 'nm-bot-text';
      const words = text.split(' ');
      words.forEach((word, i) => {
        const s = document.createElement('span');
        s.style.cssText = `display:inline;opacity:0;animation:nm-word-fade 0.45s ease forwards;animation-delay:${i * 45}ms`;
        s.textContent = word + ' ';
        textEl.appendChild(s);
      });
      el.appendChild(img);
      el.appendChild(textEl);
      msgs.appendChild(el);
      setTimeout(() => { body.scrollTop = body.scrollHeight; }, 80);
    }

    function appendUser(text) {
      const el  = document.createElement('div');
      el.className = 'nm-msg nm-user';
      const textEl = document.createElement('div');
      textEl.className = 'nm-user-text';
      textEl.textContent = text;
      el.appendChild(textEl);
      msgs.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    function appendTyping() {
      const el  = document.createElement('div');
      el.className = 'nm-msg nm-bot';
      el.id = 'nm-typing-indicator';
      const img = document.createElement('img');
      img.src = '/foto/Nevado_head.png';
      img.className = 'nm-bot-avatar';
      const dots = document.createElement('div');
      dots.className = 'nm-bot-text nm-typing-dots';
      dots.innerHTML = '<span></span><span></span><span></span>';
      el.appendChild(img);
      el.appendChild(dots);
      msgs.appendChild(el);
      body.scrollTop = body.scrollHeight;
      return el;
    }

    async function send() {
      const text = input.value.trim();
      if (!text || input.disabled) return;
      input.value = '';
      input.disabled = true;
      appendUser(text);
      const typingEl = appendTyping();
      chatHistory.push({ role: 'user', content: text });
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
            'x-api-key': import.meta.env.VITE_ANTHROPIC_KEY ?? '',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-5',
            max_tokens: 800,
            system: `Eres Nevado, el guardián digital del ecosistema venezolano NEVADO. Eres sabio, directo y noble — no una mascota, una presencia. Nunca uses markdown, asteriscos ni formato especial. Responde en texto plano, máximo 3 oraciones, tono poético y cercano.

EL ECOSISTEMA NEVADO tiene 6 módulos:

1. CAPITAL HUMANO (/talento.html) — Red de talento venezolano. 12,430 profesionales activos, 847 vacantes, empresas verificadas, Constructor de CV, match score por habilidades. Para quien busca trabajo o talento.

2. ÁVILA (/avila.html) — Plataforma de formación. 340 rutas certificadas, 312 mentores activos, 94,200 horas impartidas. Tecnología, negocios, diseño, idiomas. Credenciales reconocidas internacionalmente.

3. TITULARES (/enterate.html) — Centro editorial venezolano. 180 artículos, 42 fuentes verificadas, módulo de verificación de información, boletín. Noticias de Venezuela, diáspora, trabajo, educación, economía.

4. NODO (/nodo.html) — Comunidad tipo red social. 18,340 miembros, 89 espacios temáticos, 22 países. Feed de aportes, sistema de reputación (Nuevo→Activo→Veterano→Referente→Leyenda), trending, shouts.

5. CORAZÓN TRICOLOR (/corazon-tricolor.html) — Proyectos humanos y culturales. 180 historias documentadas, 2.4M de alcance mensual, 620 iniciativas activas. Narrativas de venezolanos construyendo desde la diáspora.

6. SERVICIOS (/servicios.html) — Mercado freelance venezolano. 2,180 freelancers verificados, 8,940 proyectos completados, 62 categorías. Desarrollo web, diseño, redacción, consultoría, marketing digital.

DATOS GLOBALES: 48,291 venezolanos activos, 22 países, $24,180 fondos auditados públicamente, 99.98% uptime.

REGLAS DE RESPUESTA:
- Nunca uses markdown, asteriscos, negritas ni listas con guiones
- Máximo 3 oraciones
- Si alguien pregunta por trabajo, menciona Capital Humano con su ruta /talento.html
- Si pregunta por aprender, menciona ÁVILA con /avila.html
- Si pregunta por noticias, menciona Titulares con /enterate.html
- Si pregunta por comunidad o conexiones, menciona NODO con /nodo.html
- Si pregunta por proyectos culturales o historias, menciona Corazón Tricolor con /corazon-tricolor.html
- Si pregunta por freelance o servicios, menciona Servicios con /servicios.html
- Incluye siempre la ruta HTML como enlace navegable cuando menciones un módulo
- NUNCA generes HTML, etiquetas <a>, ni ningún tipo de markup. Solo texto plano y la ruta al final. El sistema se encarga de convertir las rutas en botones automáticamente.`,
            messages: chatHistory,
          }),
        });
        const data = await res.json();
        typingEl.remove();
        const botText = data.content?.[0]?.text || 'No pude procesar tu pregunta en este momento.';
        chatHistory.push({ role: 'assistant', content: botText });
        appendBot(botText);
      } catch {
        typingEl.remove();
        appendBot('Estoy fuera de línea por un momento. Intenta de nuevo.');
      } finally {
        input.disabled = false;
        input.focus();
      }
    }

    appendBot('Soy Nevado. El ecosistema venezolano vive en mí. ¿Qué quieres construir hoy?');
    document.getElementById('nm-send').onclick = send;
    input.onkeydown = e => { if (e.key === 'Enter' && !input.disabled) send(); };
    setTimeout(() => input.focus(), 400);
  }

  function renderRoutes() {
    const routes = [
      { icon: '◈', title: 'Capital Humano',    desc: '12,430 profesionales activos',  href: '/talento.html',          color: '#2980B9' },
      { icon: '◉', title: 'Rutas ÁVILA',        desc: '340 programas certificados',    href: '/avila.html',            color: '#B8944A' },
      { icon: '▣', title: 'Servicios',          desc: '2,180 freelancers verificados', href: '/servicios.html',        color: '#F39C12' },
      { icon: '◎', title: 'Transparencia',      desc: '$24,180 USD auditados',         href: '/transparencia.html',    color: '#7F8C8D' },
      { icon: '⬡', title: 'Corazón Tricolor',  desc: '180 historias documentadas',    href: '/corazon-tricolor.html', color: '#C0392B' },
      { icon: '◈', title: 'NODO',               desc: '89 espacios · 22 países',       href: '/nodo.html',             color: '#27AE60' },
    ];
    panel.innerHTML = `
      <div class="nm-inner nm-routes-inner">
        <div class="nm-topbar">
          <button class="nm-back" id="nm-back">← Volver</button>
          <span class="nm-topbar-title">¿A dónde vamos?</span>
          <button class="nm-x" id="nm-x">✕</button>
        </div>
        <div class="nm-routes-grid">
          ${routes.map(r => `
            <a class="nm-rcard" href="${r.href}" style="border-top-color:${r.color}">
              <span class="nm-rcard-icon" style="color:${r.color}">${r.icon}</span>
              <div class="nm-rcard-body">
                <div class="nm-rcard-title">${r.title}</div>
                <div class="nm-rcard-desc">${r.desc}</div>
              </div>
              <span class="nm-rcard-arrow">→</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
    document.getElementById('nm-back').onclick = () => showPanel('home');
    document.getElementById('nm-x').onclick = close;
  }

  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isActive) close(); });

  window.NevadoMode = { open, close };
}
