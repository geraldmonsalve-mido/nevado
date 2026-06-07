/* NEVADO Lang Selector — inyecta EN | ES en .topbar-actions */
(function () {
  function injectLangStyles() {
    if (document.getElementById('nvd-lang-css')) return;
    var st = document.createElement('style');
    st.id = 'nvd-lang-css';
    st.textContent =
      '#nvd-lang-selector { display: inline-flex; align-items: center; }\n' +
      '.nvd-lang-btn {\n' +
      '  background: transparent !important;\n' +
      '  border: none !important;\n' +
      '  border-radius: 0 !important;\n' +
      '  box-shadow: none !important;\n' +
      '  appearance: none;\n' +
      '  -webkit-appearance: none;\n' +
      '  padding: 2px 4px;\n' +
      '  cursor: pointer;\n' +
      '  font-size: 12px;\n' +
      '  font-weight: 400;\n' +
      '  letter-spacing: 0.08em;\n' +
      '  color: rgba(255,255,255,0.45);\n' +
      '  font-family: inherit;\n' +
      '}\n' +
      '.nvd-lang-btn.active { color: #ffffff; font-weight: 600; }\n' +
      '.nvd-lang-sep {\n' +
      '  color: rgba(255,255,255,0.25);\n' +
      '  margin: 0 2px;\n' +
      '  pointer-events: none;\n' +
      '  font-size: 12px;\n' +
      '  user-select: none;\n' +
      '}\n';
    document.head.appendChild(st);
  }

  function injectSelector() {
    injectLangStyles();
    var actionsEl = document.querySelector('.topbar-actions');
    if (!actionsEl) return;
    if (document.getElementById('nvd-lang-selector')) return;

    var currentLang = window.i18n ? window.i18n.getLang() : 'en';

    var selector = document.createElement('div');
    selector.id = 'nvd-lang-selector';
    selector.innerHTML =
      '<button class="nvd-lang-btn' + (currentLang === 'en' ? ' active' : '') + '"' +
        ' data-lang="en" onclick="window.i18n&&window.i18n.setLang(\'en\')"' +
        ' title="English">EN</button>' +
      '<span class="nvd-lang-sep">|</span>' +
      '<button class="nvd-lang-btn' + (currentLang === 'es' ? ' active' : '') + '"' +
        ' data-lang="es" onclick="window.i18n&&window.i18n.setLang(\'es\')"' +
        ' title="Español">ES</button>';

    var btnPlus = actionsEl.querySelector('.btn-plus, [data-nevado-plus]');
    if (btnPlus) {
      actionsEl.insertBefore(selector, btnPlus);
    } else {
      actionsEl.appendChild(selector);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectSelector);
  } else {
    injectSelector();
  }
})();
