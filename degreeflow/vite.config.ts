import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable (GitHub Pages, any static host, or a file preview).
export default defineConfig({
  base: './',
  plugins: [react()],
});
