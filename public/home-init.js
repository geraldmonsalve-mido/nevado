(function () {
  function inject() {
    if (document.getElementById('home-bg')) return;
    var bg = document.createElement('div');
    bg.id = 'home-bg';
    document.body.appendChild(bg);
    document.body.classList.add('home');
  }
  // Run synchronously when body is already parsed (prevents FOUC).
  // Fall back to DOMContentLoaded if body isn't ready yet.
  if (document.body) {
    inject();
  } else {
    document.addEventListener('DOMContentLoaded', inject);
  }
})();
