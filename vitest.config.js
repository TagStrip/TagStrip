import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',   // core tests run in Node — no DOM needed
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**'],
      reporter: ['text', 'html']
    }
  }
});
