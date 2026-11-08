import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [
    react(),
    {
      name: "first-paint-intro",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: (html) =>
          // The self-contained intro can paint while the application CSS downloads.
          // React waits for this link below, so application controls never flash unstyled.
          html.replace(
            /<link rel="stylesheet"([^>]+)>/g,
            '<link rel="stylesheet"$1 media="print" data-app-css onload="this.media=\'all\';this.dataset.loaded=\'true\'" onerror="this.dataset.failed=\'true\'">',
          ),
      },
    },
  ],
  base: process.env.BASE_PATH || "./",
  build: { chunkSizeWarningLimit: 900 },
});
