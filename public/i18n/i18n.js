/* NEVADO i18n Engine v1.0
   window.i18n.t('key') · window.i18n.setLang('en')
   Default: 'en' — persistencia: localStorage.nvd_lang */
(function () {
  'use strict';

  var DEFAULT_LANG = 'en';
  var SUPPORTED    = ['es', 'en'];
  var _lang        = null;

  function getLang() {
    if (_lang) return _lang;
    var saved = localStorage.getItem('nvd_lang');
    if (saved && SUPPORTED.indexOf(saved) !== -1) return saved;
    return DEFAULT_LANG;
  }

  function t(key, fallback) {
    var lang = getLang();
    var translations = window.NEVADO_TRANSLATIONS || {};
    var dict = translations[lang] || {};
    var defDict = translations[DEFAULT_LANG] || {};
    return dict[key] || defDict[key] || fallback || key;
  }

  function applyToDOM() {
    var lang = getLang();
    document.documentElement.lang = lang;

    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (val !== key) el.textContent = val;
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-placeholder');
      var val = t(key);
      if (val !== key) el.placeholder = val;
    });

    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      var key = el.getAttribute('data-i18n-title');
      var val = t(key);
      if (val !== key) el.setAttribute('title', val);
    });

    document.querySelectorAll('.nvd-lang-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.lang === lang);
    });

    document.dispatchEvent(new CustomEvent('nvd:langchange', { detail: { lang: lang } }));
  }

  function setLang(lang) {
    if (SUPPORTED.indexOf(lang) === -1) return;
    _lang = lang;
    localStorage.setItem('nvd_lang', lang);
    applyToDOM();
  }

  function init() {
    _lang = getLang();
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', applyToDOM);
    } else {
      applyToDOM();
    }
  }

  window.i18n = {
    t:         t,
    setLang:   setLang,
    getLang:   getLang,
    apply:     applyToDOM,
    supported: SUPPORTED,
  };

  init();
})();
