(function () {
  function buildFooter() {
    if (document.getElementById('home-footer')) return;

    var ticker = document.getElementById('ticker');
    var sysbar = document.getElementById('sysbar');
    if (!ticker) return;

    var footer = document.createElement('footer');
    footer.id = 'home-footer';
    document.body.appendChild(footer);

    /* Franja tricolor — separador visual entre contenido y footer */
    var tricolor = document.createElement('div');
    tricolor.id = 'footer-tricolor';
    footer.appendChild(tricolor);

    /* Mover ticker al footer */
    footer.appendChild(ticker);

    /* Mover sysbar al footer solo en desktop */
    if (sysbar && window.innerWidth > 768) {
      footer.appendChild(sysbar);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildFooter);
  } else {
    buildFooter();
  }
})();
