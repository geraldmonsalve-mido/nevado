// Nevado Plus — modal global inyectable en cualquier página
(function () {
  const PLUS_STYLES = `
    #nevado-plus-overlay {
      position:fixed;inset:0;z-index:10000;
      background:rgba(5,5,10,0.93);backdrop-filter:blur(16px);
      display:flex;align-items:center;justify-content:center;
      opacity:0;pointer-events:none;transition:opacity 0.25s ease;
    }
    #nevado-plus-overlay.active{opacity:1;pointer-events:all;}
    #nevado-plus-panel{
      background:linear-gradient(145deg,#111118,#0C0C14);
      border:1px solid rgba(184,148,74,0.22);border-radius:22px;
      padding:44px 40px;max-width:480px;width:calc(100% - 40px);
      position:relative;font-family:'Geist',-apple-system,sans-serif;
      animation:nplus-in 0.3s cubic-bezier(0.4,0,0.2,1) forwards;
    }
    @keyframes nplus-in{from{transform:scale(0.96) translateY(12px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
    .nplus-close{position:absolute;top:18px;right:20px;background:none;border:none;cursor:pointer;color:rgba(255,255,255,0.3);font-size:18px;transition:color 0.2s;}
    .nplus-close:hover{color:rgba(255,255,255,0.7);}
    .nplus-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(184,148,74,0.1);border:1px solid rgba(184,148,74,0.28);border-radius:100px;padding:4px 12px;font-size:10px;letter-spacing:0.18em;color:rgba(184,148,74,0.8);text-transform:uppercase;margin-bottom:18px;}
    .nplus-title{font-size:26px;font-weight:700;letter-spacing:-0.03em;color:#F0EDE8;margin-bottom:8px;line-height:1.2;}
    .nplus-sub{font-size:13px;color:rgba(255,255,255,0.38);line-height:1.6;margin-bottom:28px;}
    .nplus-features{display:flex;flex-direction:column;gap:11px;margin-bottom:28px;}
    .nplus-feature{display:flex;align-items:center;gap:11px;font-size:13px;color:rgba(255,255,255,0.6);}
    .nplus-feature-dot{width:5px;height:5px;border-radius:50%;background:rgba(184,148,74,0.65);flex-shrink:0;}
    .nplus-cta{width:100%;background:rgba(184,148,74,0.12);border:1px solid rgba(184,148,74,0.35);border-radius:12px;padding:13px;color:#B8944A;font-size:14px;font-weight:600;letter-spacing:0.05em;cursor:pointer;transition:background 0.2s;font-family:'Geist',-apple-system,sans-serif;}
    .nplus-cta:hover{background:rgba(184,148,74,0.22);}
    .nplus-note{text-align:center;font-size:11px;color:rgba(255,255,255,0.18);margin-top:10px;}
  `;

  function injectStyles() {
    if (document.getElementById('nplus-styles')) return;
    const s = document.createElement('style');
    s.id = 'nplus-styles';
    s.textContent = PLUS_STYLES;
    document.head.appendChild(s);
  }

  function openNevadoPlus() {
    injectStyles();
    if (document.getElementById('nevado-plus-overlay')) {
      document.getElementById('nevado-plus-overlay').classList.add('active');
      return;
    }
    const overlay = document.createElement('div');
    overlay.id = 'nevado-plus-overlay';
    overlay.innerHTML = `
      <div id="nevado-plus-panel">
        <button class="nplus-close" id="nplus-close">✕</button>
        <div class="nplus-badge">✦ Próximamente</div>
        <div class="nplus-title">Nevado Plus</div>
        <div class="nplus-sub">Acceso completo al ecosistema para venezolanos que construyen en serio.</div>
        <div class="nplus-features">
          <div class="nplus-feature"><div class="nplus-feature-dot"></div>CV verificado y perfil destacado en Capital Humano</div>
          <div class="nplus-feature"><div class="nplus-feature-dot"></div>Acceso ilimitado a rutas ÁVILA con certificación</div>
          <div class="nplus-feature"><div class="nplus-feature-dot"></div>Publicar servicios en el mercado verificado</div>
          <div class="nplus-feature"><div class="nplus-feature-dot"></div>Nevado IA sin límites — tu asistente personal</div>
          <div class="nplus-feature"><div class="nplus-feature-dot"></div>Insignia de miembro fundador del ecosistema</div>
        </div>
        <button class="nplus-cta" id="nplus-waitlist">Unirse a la lista de espera</button>
        <div class="nplus-note">Lanzamiento Q3 2026 · Precio especial para fundadores</div>
      </div>
    `;
    document.body.appendChild(overlay);

    function closeNevadoPlus() {
      overlay.classList.remove('active');
      overlay.style.pointerEvents = 'none';
      setTimeout(() => overlay.remove(), 260);
    }

    document.getElementById('nplus-close').onclick = closeNevadoPlus;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeNevadoPlus(); });

    document.getElementById('nplus-waitlist').onclick = function () {
      this.textContent = '✓ Anotado — te avisamos al lanzar';
      this.style.cssText += 'background:rgba(39,174,96,0.12);border-color:rgba(39,174,96,0.35);color:#27AE60;';
      this.disabled = true;
    };

    const escFn = e => { if (e.key === 'Escape') { closeNevadoPlus(); document.removeEventListener('keydown', escFn); } };
    document.addEventListener('keydown', escFn);

    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('active')));
  }

  function bindButtons() {
    document.querySelectorAll('.btn-plus, [data-nevado-plus]').forEach(btn => {
      if (!btn.dataset.npBound) {
        btn.addEventListener('click', openNevadoPlus);
        btn.dataset.npBound = '1';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindButtons);
  } else {
    bindButtons();
  }

  window.NevadoPlus = { open: openNevadoPlus };
})();
