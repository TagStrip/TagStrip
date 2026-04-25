import { defineConfig } from 'vitest/config';
import { webdriverio } from '@vitest/browser-webdriverio';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.js'],
    exclude: ['tests/scanner/**'], // Run scanner tests separately in Node.js
    coverage: {
      provider: 'istanbul',
      include: ['src/core/**'],
      reporter: ['json', 'text', 'html'],
      reportsDirectory: 'coverage-reports/browser'
    },
    browser: {
      provider: webdriverio(),
      enabled: true,
      instances: [
        { browser: 'chrome' },
        { browser: 'firefox' },
      ],
    },
  }
});
