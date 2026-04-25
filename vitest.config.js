import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',   // core tests run in Node — no DOM needed
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'istanbul',
      include: ['src/**'],
      exclude: ['src/scanner/**'], // Browser-only code, not testable in Node.js
      reporter: ['text', 'html']
    }
  }
});
