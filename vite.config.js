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
            '</head>'
          )
          .replace(
            '<script type="module" src="/src/main.js">',
            '<script src="/home-init.js"></script>\n  <script type="module" src="/src/main.js">'
          )
          .replace(
            '</body>',
            '  <script src="/home-mobile-ui.js" defer></script>\n' +
            '  <script src="/home-footer.js" defer></script>\n</body>'
          );
      },
    },
  ],
});
