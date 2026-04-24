import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(process.cwd(), 'src/index.js'),
      name: 'TagStrip',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        if (format === 'es')  return 'tagstrip.js';
        if (format === 'cjs') return 'tagstrip.cjs';
        if (format === 'umd') return 'tagstrip.umd.js';
      }
    },
    rollupOptions: {
      // No external dependencies — the library is self-contained
    }
  }
});
