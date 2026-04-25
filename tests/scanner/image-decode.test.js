/**
 * Integration test: validate scanner against real-world photo fixtures.
 * Each fixture in tests/fixtures/fixtures.json defines a photo to test.
 * Adding a new test only requires adding the image file and a new fixtures.json entry.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, '../fixtures');
const FIXTURES_JSON = resolve(FIXTURES_DIR, 'fixtures.json');
const PHOTOS_DIR = resolve(FIXTURES_DIR, 'photos');

async function loadImageAsRGBA(filePath) {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer), width: info.width, height: info.height };
}

import { toGrayscale } from '../../src/scanner/binarize.js';
import { searchBandsGrayscale } from '../../src/scanner/locator.js';
import { decodeBits } from '../../src/core/decoder.js';

function makeImageData(data, width, height) {
  return { data, width, height };
}

const fixtures = JSON.parse(readFileSync(FIXTURES_JSON, 'utf-8'));

describe('Image decode — photo fixtures', () => {
  it.each(fixtures.map((f, i) => ({
    ...f,
    index: i,
    testName: `${f.file} (variant: ${f.variant})${f.shouldPass ? '' : ' — negative'}`
  })))('$testName', async ({ file, expectedId, shouldPass }) => {
    const imagePath = resolve(PHOTOS_DIR, file);
    const { data, width, height } = await loadImageAsRGBA(imagePath);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    const imageData = makeImageData(data, width, height);
    const grayscale = toGrayscale(imageData);
    const detected = searchBandsGrayscale(grayscale, width, height);

    if (shouldPass) {
      expect(detected, `${file}: tag region should be found`).not.toBeNull();
      const result = decodeBits(detected.bits);
      expect(result.success, `${file}: decodeBits failed: ${result.reason}`).toBe(true);
      expect(result.boxId).toBe(expectedId);
    } else {
      if (detected) {
        const result = decodeBits(detected.bits);
        expect(result.success, `${file}: decodeBits should fail for this fixture`).toBe(false);
      }
    }
  });
});
