/* NEVADO Lang Selector — inyecta EN | ES en .topbar-actions */
(function () {
  function injectSelector() {
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
