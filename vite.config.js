import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    {
      name: 'inject-home-assets',
      transformIndexHtml(html) {
        return html
          .replace(
            '</head>',
            '  <link rel="stylesheet" href="/home-overrides.css">\n' +
            '  <link rel="stylesheet" href="/home-mobile.css">\n' +
            '</head>'
          )
          .replace(
            '<script type="module" src="/src/main.js">',
            '<script src="/home-init.js"></script>\n  <script type="module" src="/src/main.js">'
          )
          .replace(
            '</body>',
            '  <script src="/home-mobile-dom.js" defer></script>\n</body>'
          );
      },
    },
  ],
});
