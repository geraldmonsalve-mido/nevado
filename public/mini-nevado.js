(function () {
  if (!document.getElementById('mn-keyframes')) {
    const s = document.createElement('style');
    s.id = 'mn-keyframes';
    s.textContent = `
      @keyframes mnFloat {
        0%, 100% { transform: translateY(0px); }
        50%       { transform: translateY(-6px); }
      }
      @keyframes mnHaloPulse {
        from { opacity: 0.35; transform: translate(-50%,-50%) scale(0.88); }
        to   { opacity: 0.85; transform: translate(-50%,-50%) scale(1.18); }
      }
      @keyframes mn-overlay-in {
        from { transform: scale(0.97) translateY(8px); opacity: 0; }
        to   { transform: scale(1) translateY(0); opacity: 1; }
      }
    `;
    document.head.appendChild(s);
  }

  function injectMiniNevado() {
    if (document.getElementById('miniNevadoWrap')) return;

    const accentMap = { blue: '#2980B9', gold: '#B8944A', red: '#C0392B', green: '#27AE60' };
    const rawAccent = document.body.dataset.accent || 'gold';
    const accent = accentMap[rawAccent] || rawAccent;

    const wrap = document.createElement('div');
    wrap.id = 'miniNevadoWrap';
    wrap.style.cssText = `
      position: fixed;
      bottom: 44px;
      right: 28px;
      z-index: 600;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      padding: 6px;
    `;

    const halo = document.createElement('div');
    halo.style.cssText = `
      position: absolute;
      width: 88px; height: 88px;
      border-radius: 50%;
      background: radial-gradient(circle, ${accent}28 0%, transparent 70%);
      filter: blur(10px);
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      animation: mnHaloPulse 3.5s ease-in-out infinite alternate;
      pointer-events: none;
      z-index: 0;
    `;

    const img = document.createElement('img');
    img.src = '/foto/Nevado_head.png';
    img.alt = 'Nevado';
    img.style.cssText = `
      height: 62px;
      width: auto;
      object-fit: contain;
      position: relative;
      z-index: 2;
      animation: mnFloat 5s ease-in-out infinite;
      mix-blend-mode: screen;
      filter: brightness(1.08) drop-shadow(0 4px 12px rgba(0,0,0,0.5));
      transition: transform 300ms ease, filter 300ms ease;
      display: block;
    `;

    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 7px;
      letter-spacing: 0.2em;
      color: rgba(255,255,255,0.18);
      text-transform: uppercase;
      margin-top: 4px;
      font-family: 'Geist', sans-serif;
      position: relative;
      z-index: 2;
      transition: color 300ms;
      white-space: nowrap;
    `;
    hint.textContent = 'Modo Nevado';

    wrap.appendChild(halo);
    wrap.appendChild(img);
    wrap.appendChild(hint);

    wrap.addEventListener('mouseenter', () => {
      img.style.transform = 'scale(1.1) translateY(-4px)';
      hint.style.color = 'rgba(255,255,255,0.42)';
    });
    wrap.addEventListener('mouseleave', () => {
      img.style.transform = '';
      hint.style.color = 'rgba(255,255,255,0.18)';
    });

    wrap.addEventListener('click', activateModoNevado);
    document.body.appendChild(wrap);
  }

  const PAGE_CONTEXT_MAP = {
    '/talento.html':          { label: 'Capital Humano',   topic: 'vacantes, CV, talento profesional venezolano' },
    '/nodo.html':             { label: 'NODO',             topic: 'comunidad venezolana, aportes, inteligencia colectiva' },
    '/enterate.html':         { label: 'Titulares',        topic: 'noticias venezolanas, verificación, actualidad' },
    '/avila.html':            { label: 'ÁVILA',            topic: 'formación, rutas de aprendizaje, certificaciones, mentores' },
    '/corazon-tricolor.html': { label: 'Corazón Tricolor', topic: 'historias venezolanas, cultura, identidad, diáspora' },
    '/transparencia.html':    { label: 'Transparencia',    topic: 'auditoría, fondos, trazabilidad, rendición de cuentas' },
    '/servicios.html':        { label: 'Servicios',        topic: 'freelancers venezolanos, economía distribuida, proyectos' },
  };

  function ensureOverlayStyles() {
    if (document.getElementById('mn-inline-style')) return;
    const s = document.createElement('style');
    s.id = 'mn-inline-style';
    s.textContent = `
      #mn-inline-overlay {
        position:fixed;inset:0;z-index:9999;
        background:rgba(5,5,10,0.93);
        display:flex;align-items:center;justify-content:center;
        opacity:0;pointer-events:none;
        transition:opacity 0.25s ease;
        backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
      }
      #mn-inline-overlay.mn-active{opacity:1;pointer-events:all;}
      #mn-inline-panel{
        background:linear-gradient(145deg,#111118,#0C0C14);
        border:1px solid rgba(255,255,255,0.08);
        border-radius:22px;padding:36px 32px 32px;
        width:calc(100% - 40px);max-width:440px;
        box-shadow:0 40px 100px rgba(0,0,0,0.8);
        position:relative;font-family:'Geist',-apple-system,sans-serif;
        transition:max-width 0.3s ease,padding 0.3s ease;
        box-sizing:border-box;
        animation:mn-overlay-in 0.28s cubic-bezier(0.4,0,0.2,1) forwards;
      }
      #mn-inline-close{
        position:absolute;top:16px;right:18px;
        background:none;border:none;cursor:pointer;
        color:rgba(255,255,255,0.3);font-size:18px;line-height:1;
        padding:4px 8px;border-radius:6px;
        transition:color 0.2s,background 0.2s;
      }
      #mn-inline-close:hover{color:rgba(255,255,255,0.8);background:rgba(255,255,255,0.06);}
      .mn-panel-logo{
        width:48px;height:48px;border-radius:50%;
        background:linear-gradient(135deg,rgba(184,148,74,0.18),rgba(184,148,74,0.06));
        border:1px solid rgba(184,148,74,0.22);
        display:flex;align-items:center;justify-content:center;
        font-size:20px;font-weight:700;color:rgba(184,148,74,0.82);
        margin:0 auto 16px;
      }
      .mn-panel-heading{text-align:center;font-size:20px;font-weight:600;color:rgba(255,255,255,0.92);letter-spacing:-0.02em;margin-bottom:6px;}
      .mn-panel-sub{text-align:center;font-size:13px;color:rgba(255,255,255,0.36);margin-bottom:28px;line-height:1.5;}
      .mn-panel-card{
        display:flex;align-items:center;gap:14px;
        background:rgba(255,255,255,0.03);
        border:1px solid rgba(255,255,255,0.07);
        border-radius:14px;padding:16px 18px;
        cursor:pointer;transition:background 0.2s,border-color 0.2s,transform 0.15s;
        margin-bottom:10px;color:inherit;width:100%;text-align:left;
        font-family:'Geist',-apple-system,sans-serif;
        box-sizing:border-box;outline:none;-webkit-appearance:none;
        background-color:rgba(255,255,255,0.03);
      }
      .mn-panel-card:last-child{margin-bottom:0;}
      .mn-panel-card:hover{background:rgba(255,255,255,0.06);border-color:rgba(255,255,255,0.13);transform:translateY(-1px);}
      .mn-panel-card-icon{font-size:18px;color:rgba(255,255,255,0.42);flex-shrink:0;width:32px;text-align:center;}
      .mn-panel-card-body{flex:1;}
      .mn-panel-card-title{font-size:14px;font-weight:600;color:rgba(255,255,255,0.88);margin-bottom:2px;}
      .mn-panel-card-desc{font-size:12px;color:rgba(255,255,255,0.33);}
      .mn-panel-card-arrow{font-size:16px;color:rgba(255,255,255,0.18);transition:color 0.2s,transform 0.2s;}
      .mn-panel-card:hover .mn-panel-card-arrow{color:rgba(255,255,255,0.6);transform:translateX(3px);}
      #nm-messages::-webkit-scrollbar{width:4px;}
      #nm-messages::-webkit-scrollbar-track{background:transparent;}
      #nm-messages::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.08);border-radius:2px;}
      #nm-chat-input:focus{border-color:rgba(184,148,74,0.42)!important;outline:none;}
      #nm-send:hover{background:rgba(184,148,74,0.2)!important;}
      .mn-bot-row{display:flex;align-items:flex-start;gap:10px;}
      .mn-bot-ava{width:26px;height:26px;border-radius:50%;object-fit:cover;flex-shrink:0;mix-blend-mode:screen;filter:brightness(1.05);margin-top:3px;}
      .mn-typing-row{display:flex;align-items:center;gap:5px;padding:6px 0;}
      .mn-typing-row span{width:5px;height:5px;border-radius:50%;background:rgba(184,148,74,0.55);animation:mn-dot 1.2s ease-in-out infinite;display:inline-block;}
      .mn-typing-row span:nth-child(2){animation-delay:0.15s;}
      .mn-typing-row span:nth-child(3){animation-delay:0.30s;}
      @keyframes mn-dot{0%,80%,100%{transform:translateY(0);opacity:0.45}40%{transform:translateY(-5px);opacity:1}}
      .mn-nav-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .mn-nav-card{display:block;padding:14px 16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:12px;text-decoration:none;transition:background 0.2s,transform 0.15s;}
      .mn-nav-card:hover{background:rgba(255,255,255,0.07);transform:translateY(-1px);}
      .mn-nav-tag{font-size:8px;letter-spacing:0.18em;color:rgba(255,255,255,0.26);text-transform:uppercase;margin-bottom:4px;}
      .mn-nav-name{font-size:13px;font-weight:600;color:#F0EDE8;font-family:'Geist',sans-serif;}
    `;
    document.head.appendChild(s);
  }

  let chatHistory = [];

  function activateModoNevado() {
    if (window.NevadoMode && typeof window.NevadoMode.open === 'function') {
      window.NevadoMode.open();
      return;
    }
    ensureOverlayStyles();
    const existing = document.getElementById('mn-inline-overlay');
    if (existing) existing.remove();
    chatHistory = [];

    const overlay = document.createElement('div');
    overlay.id = 'mn-inline-overlay';
    overlay.innerHTML = `
      <div id="mn-inline-panel">
        <button id="mn-inline-close" aria-label="Cerrar">✕</button>
        <div class="mn-panel-logo">N</div>
        <div class="mn-panel-heading">Modo Nevado</div>
        <div class="mn-panel-sub">Tu asistente del ecosistema venezolano</div>
        <button class="mn-panel-card" id="nm-ask">
          <span class="mn-panel-card-icon">◎</span>
          <div class="mn-panel-card-body">
            <div class="mn-panel-card-title">Preguntarle a Nevado</div>
            <div class="mn-panel-card-desc">Resuelve dudas sobre el ecosistema</div>
          </div>
          <span class="mn-panel-card-arrow">→</span>
        </button>
        <button class="mn-panel-card" id="nm-nav">
          <span class="mn-panel-card-icon">⬡</span>
          <div class="mn-panel-card-body">
            <div class="mn-panel-card-title">Explorar el ecosistema</div>
            <div class="mn-panel-card-desc">Navega todos los módulos</div>
          </div>
          <span class="mn-panel-card-arrow">→</span>
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('mn-active')));

    const panel = document.getElementById('mn-inline-panel');

    function closeOverlay() {
      overlay.classList.remove('mn-active');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 260);
      chatHistory = [];
    }

    // ─── Panel Chat ────────────────────────────────────────────────────────────
    overlay.querySelector('#nm-ask').addEventListener('click', () => {
      const ctx = PAGE_CONTEXT_MAP[window.location.pathname] || { label: 'NEVADO', topic: 'el ecosistema venezolano' };
      panel.style.maxWidth = '580px';
      panel.style.padding  = '26px 30px 26px';
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;">
          <button id="nm-back" style="background:none;border:none;color:rgba(255,255,255,0.38);cursor:pointer;font-size:12px;letter-spacing:0.06em;font-family:'Geist',sans-serif;padding:0;">← Volver</button>
          <div style="font-size:9px;letter-spacing:0.22em;color:rgba(255,255,255,0.2);text-transform:uppercase;">${ctx.label}</div>
          <button id="nm-close2" style="background:rgba(255,255,255,0.04);border:none;color:rgba(255,255,255,0.4);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div id="nm-messages" style="min-height:160px;max-height:280px;overflow-y:auto;margin-bottom:16px;display:flex;flex-direction:column;gap:16px;padding-right:2px;"></div>
        <div style="display:flex;gap:8px;">
          <input id="nm-chat-input" type="text" placeholder="Escríbele a Nevado…" autocomplete="off" spellcheck="false"
            style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.09);border-radius:10px;padding:10px 14px;color:#E8E8E0;font-size:13px;outline:none;font-family:'Geist',sans-serif;"/>
          <button id="nm-send"
            style="background:rgba(184,148,74,0.1);border:1px solid rgba(184,148,74,0.28);color:#B8944A;border-radius:10px;padding:10px 15px;cursor:pointer;font-size:14px;transition:background 200ms;font-family:'Geist',sans-serif;">→</button>
        </div>
      `;
      setTimeout(() => document.getElementById('nm-chat-input')?.focus(), 80);
      document.getElementById('nm-close2').onclick = closeOverlay;
      document.getElementById('nm-back').onclick = () => { closeOverlay(); setTimeout(activateModoNevado, 280); };

      const messages = document.getElementById('nm-messages');

      function appendUser(text) {
        const el = document.createElement('div');
        el.style.cssText = 'text-align:right;font-size:12px;color:rgba(255,255,255,0.4);padding:2px 0;';
        el.textContent = text;
        messages.appendChild(el);
        messages.scrollTop = messages.scrollHeight;
      }

      function appendBot(text) {
        const row = document.createElement('div');
        row.className = 'mn-bot-row';

        const ava = document.createElement('img');
        ava.src = '/foto/Nevado_head.png';
        ava.className = 'mn-bot-ava';

        const bubble = document.createElement('div');
        bubble.style.cssText = 'flex:1;';

        const routeMap = {
          '/talento.html':          { label: 'Ir a Capital Humano',   color: '#2980B9' },
          '/avila.html':            { label: 'Ir a ÁVILA',            color: '#B8944A' },
          '/nodo.html':             { label: 'Ir a NODO',             color: '#27AE60' },
          '/enterate.html':         { label: 'Ir a Titulares',        color: '#27AE60' },
          '/corazon-tricolor.html': { label: 'Ir a Corazón Tricolor', color: '#C0392B' },
          '/servicios.html':        { label: 'Ir a Servicios',        color: '#F39C12' },
          '/transparencia.html':    { label: 'Ver Transparencia',     color: '#7F8C8D' },
        };

        text = text.replace(/<a[^>]*>(.*?)<\/a>/gi, '$1').replace(/<[^>]+>/g, '');

        const mentionedRoutes = Object.keys(routeMap).filter(route => text.includes(route));

        let cleanText = text;
        mentionedRoutes.forEach(route => { cleanText = cleanText.replace(route, ''); });
        cleanText = cleanText.replace(/\s{2,}/g, ' ').trim();

        const textEl = document.createElement('div');
        textEl.style.cssText = 'font-size:13px;color:#E8E8E0;line-height:1.75;margin-bottom:' + (mentionedRoutes.length ? '12px' : '0');
        textEl.textContent = cleanText;
        bubble.appendChild(textEl);

        mentionedRoutes.forEach(route => {
          const info = routeMap[route];
          const btn = document.createElement('a');
          btn.href = route;
          btn.textContent = info.label + ' →';
          btn.style.cssText = `
            display: inline-block;
            margin-top: 6px;
            margin-right: 8px;
            padding: 7px 14px;
            background: ${info.color}18;
            border: 1px solid ${info.color}55;
            border-radius: 8px;
            color: ${info.color};
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.04em;
            text-decoration: none;
            font-family: 'Geist', sans-serif;
            transition: background 0.2s;
          `;
          btn.onmouseover = () => btn.style.background = info.color + '30';
          btn.onmouseout  = () => btn.style.background = info.color + '18';
          bubble.appendChild(btn);
        });

        row.appendChild(ava);
        row.appendChild(bubble);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
      }

      function appendTyping() {
        const row = document.createElement('div');
        row.className = 'mn-bot-row'; row.id = 'mn-typing-row';
        const ava = document.createElement('img');
        ava.src = '/foto/Nevado_head.png'; ava.className = 'mn-bot-ava';
        const dots = document.createElement('div');
        dots.className = 'mn-typing-row';
        dots.innerHTML = '<span></span><span></span><span></span>';
        row.appendChild(ava); row.appendChild(dots);
        messages.appendChild(row);
        messages.scrollTop = messages.scrollHeight;
        return row;
      }

      const greeting = ctx.label === 'Capital Humano' ? '¿Buscas trabajo, talento o ayuda con tu CV?' :
                       ctx.label === 'NODO'            ? '¿Qué quieres compartir con la comunidad?' :
                       ctx.label === 'Titulares'       ? '¿Alguna pregunta sobre las noticias o quieres verificar algo?' :
                       ctx.label === 'ÁVILA'           ? '¿Qué quieres aprender o certificar?' :
                       '¿En qué puedo ayudarte?';
      appendBot(`Hola. Estás en ${ctx.label}. ${greeting}`);

      async function sendMessage() {
        const input = document.getElementById('nm-chat-input');
        const text  = input?.value?.trim();
        if (!text || input.disabled) return;
        input.value = ''; input.disabled = true;
        appendUser(text);
        const typingEl = appendTyping();
        chatHistory.push({ role: 'user', content: text });
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true', 'x-api-key': window.__NVD_KEY || '' },
            body: JSON.stringify({
              model: 'claude-sonnet-4-5',
              max_tokens: 500,
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
          const botText = data.content?.[0]?.text || 'No pude procesar tu pregunta.';
          chatHistory.push({ role: 'assistant', content: botText });
          appendBot(botText);
        } catch {
          typingEl.remove();
          appendBot('Estoy fuera de línea un momento. Intenta de nuevo.');
        } finally {
          if (input) { input.disabled = false; input.focus(); }
        }
      }

      document.getElementById('nm-send').onclick = sendMessage;
      document.getElementById('nm-chat-input').onkeydown = e => { if (e.key === 'Enter' && !e.target.disabled) sendMessage(); };
    });

    // ─── Panel Nav ─────────────────────────────────────────────────────────────
    overlay.querySelector('#nm-nav').addEventListener('click', () => {
      panel.style.maxWidth = '520px';
      panel.style.padding  = '26px 26px 22px';
      panel.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <button id="nm-back2" style="background:none;border:none;color:rgba(255,255,255,0.38);cursor:pointer;font-size:12px;letter-spacing:0.06em;font-family:'Geist',sans-serif;padding:0;">← Volver</button>
          <div style="font-size:9px;letter-spacing:0.22em;color:rgba(255,255,255,0.2);text-transform:uppercase;">El ecosistema</div>
          <button id="nm-close3" style="background:rgba(255,255,255,0.04);border:none;color:rgba(255,255,255,0.4);width:28px;height:28px;border-radius:50%;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>
        <div class="mn-nav-grid">
          ${[
            { name:'Capital Humano',   tag:'Red de Talento',    url:'/talento.html',          color:'#2980B9' },
            { name:'ÁVILA',            tag:'Formación',         url:'/avila.html',            color:'#B8944A' },
            { name:'Titulares',        tag:'Actualidad',        url:'/enterate.html',         color:'#27AE60' },
            { name:'NODO',             tag:'Comunidad',         url:'/nodo.html',             color:'#E74C3C' },
            { name:'Corazón Tricolor', tag:'Proyectos Humanos', url:'/corazon-tricolor.html', color:'#C0392B' },
            { name:'Servicios',        tag:'Economía',          url:'/servicios.html',        color:'#F39C12' },
          ].map(m => `
            <a href="${m.url}" class="mn-nav-card" style="border-top:2px solid ${m.color};">
              <div class="mn-nav-tag">${m.tag}</div>
              <div class="mn-nav-name">${m.name}</div>
            </a>
          `).join('')}
        </div>
        <a href="/" style="display:block;margin-top:8px;padding:11px;background:rgba(184,148,74,0.05);border:1px solid rgba(184,148,74,0.16);border-radius:12px;text-decoration:none;text-align:center;color:#B8944A;font-size:12px;letter-spacing:0.08em;font-family:'Geist',sans-serif;transition:background 300ms;"
          onmouseover="this.style.background='rgba(184,148,74,0.1)'"
          onmouseout="this.style.background='rgba(184,148,74,0.05)'">← Ecosistema principal</a>
      `;
      document.getElementById('nm-close3').onclick = closeOverlay;
      document.getElementById('nm-back2').onclick  = () => { closeOverlay(); setTimeout(activateModoNevado, 280); };
    });

    document.getElementById('mn-inline-close').addEventListener('click', closeOverlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) closeOverlay(); });
    const escH = e => { if (e.key === 'Escape') { closeOverlay(); document.removeEventListener('keydown', escH); } };
    document.addEventListener('keydown', escH);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectMiniNevado);
  } else {
    injectMiniNevado();
  }
})();
