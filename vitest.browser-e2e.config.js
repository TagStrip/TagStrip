import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

export default defineConfig({
  test: {
    name: 'browser-e2e',
    include: ['tests/browser-e2e/**/*.test.js'],
    coverage: {
      provider: 'istanbul',
      include: ['src/scanner/**'],
      exclude: [
        'src/scanner/worker.js', // Web Worker functionality - cannot be tested in browser automation
        'src/scanner/project.js', // Complex image projection algorithms - require specific test images
      ],
      reporter: ['json', 'text', 'html'],
      reportsDirectory: 'coverage-reports/browser-e2e'
    },
    browser: {
      provider: webdriverio(),
      enabled: true,
      instances: [
        { browser: 'chrome' },
        { browser: 'firefox' },
        { browser: 'safari' },
      ],
    },
  }
});