import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'node-tests',
    environment: 'node',
    include: ['tests/scanner/**/*.test.js'],
    coverage: {
      provider: 'istanbul',
      include: ['src/scanner/**'],
      exclude: [
        'src/scanner/project.js', // Complex projection algorithms - not testable
        'src/scanner/worker.js', // Web Worker code - not testable in Node.js
        // Exclude specific functions that are complex edge cases
      ],
      reporter: ['json', 'text', 'html'],
      reportsDirectory: 'coverage-reports/node'
    }
  }
});