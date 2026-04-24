/**
 * Integration test: read pictures/1.jpg and decode the TagStrip tag.
 * The tag in the photo encodes ID 42 (short variant).
 *
 * This test exercises the full pipeline:
 *   JPEG → grayscale pixel data → binarize → projection → locator → decodeBits
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---------- Inline pure-Node JPEG decoder using sharp ----------
async function loadImageAsRGBA(filePath) {
  const sharp = (await import('sharp')).default;
  const { data, info } = await sharp(filePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data: new Uint8ClampedArray(data.buffer), width: info.width, height: info.height };
}

// ---------- Re-use scanner modules (they are pure JS, no DOM) ----------
import { toGrayscale } from '../../src/scanner/binarize.js';
import { searchBandsGrayscale } from '../../src/scanner/locator.js';
import { decodeBits } from '../../src/core/decoder.js';

// ---------- Thin ImageData shim for Node ----------
function makeImageData(data, width, height) {
  return { data, width, height };
}

describe('Image decode — pictures/1.jpg', () => {
  it('reads the JPEG, processes the pipeline, and decodes ID 42', async () => {
    const imagePath = resolve(__dirname, '../../pictures/1.jpg');

    // Load image as raw RGBA bytes
    const { data, width, height } = await loadImageAsRGBA(imagePath);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);

    // Build a lightweight ImageData-like object
    const imageData = makeImageData(data, width, height);

    // Convert to grayscale
    const grayscale = toGrayscale(imageData);

    // Search for tag in horizontal bands using grayscale directly
    const detected = searchBandsGrayscale(grayscale, width, height);
    expect(detected, 'tag region should be found in the image').not.toBeNull();

    // Decode the extracted bits
    const result = decodeBits(detected.bits);
    expect(result.success, `decodeBits failed: ${result.reason}`).toBe(true);
    expect(result.boxId).toBe(42);
  });
});
