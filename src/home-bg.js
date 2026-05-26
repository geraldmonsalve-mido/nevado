import './home-mobile.css';
// Fondo home — inyección directa sin depender de CSS externo
const style = document.createElement('style');
style.textContent = `
  body { background: transparent !important; }
  html { background: #05050A; }
`;
document.head.appendChild(style);

const bg = document.createElement('div');
bg.style.cssText = [
  'position:fixed',
  'top:0',
  'left:0',
  'width:100vw',
  'height:100vh',
  'z-index:-1',
  'background-image:url(/fondo-home.webp)',
  'background-size:cover',
  'background-position:center center',
  'background-repeat:no-repeat',
  'opacity:0.76',
  'pointer-events:none'
].join(';');
document.documentElement.appendChild(bg);
