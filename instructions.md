# TagStrip — Implementation Guidelines for AI Coding Agent

These guidelines are intended to be read alongside the **TagStrip Technical Specification** document (spec.md). They are not a spec — they are engineering recommendations to help you make good decisions while implementing the encoder, decoder, and scanner pipeline.

***

## 1. Project Setup

### Package manager and tooling

Use **npm**. Do not use yarn or pnpm unless explicitly requested.

Initialize the project with the following `package.json`:

```json
{
  "name": "TagStrip",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/tagstrip.cjs",
  "module": "./dist/tagstrip.js",
  "browser": "./dist/tagstrip.umd.js",
  "exports": {
    ".": {
      "import": "./dist/tagstrip.js",
      "require": "./dist/tagstrip.cjs"
    }
  },
  "scripts": {
    "build": "vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vite": "^6.x",
    "vitest": "^3.x",
    "@vitest/coverage-v8": "^3.x"
  }
}
```

### Build tool

Use **Vite** for the build. Configure it to produce three outputs: ESM, CJS, and UMD (browser-ready).

```js
// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
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
```

The UMD build is the browser-usable script. It exposes `window.TagStrip` when loaded via `<script>` tag.

### Test configuration

```js
// vitest.config.js
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
```

Note: scanner tests that require a DOM/canvas environment should use `environment: 'jsdom'` in a per-file override:

```js
// tests/scanner/pipeline.test.js
// @vitest-environment jsdom
```

***

## 2. Project Structure

```
TagStrip/
├── src/
│   ├── core/
│   │   ├── crc.js          # CRC-3 and CRC-4 algorithms
│   │   ├── encoder.js      # Bitstream builder and text encoder
│   │   ├── decoder.js      # Bitstream validator and ID extractor
│   │   └── constants.js    # All fixed patterns, polynomials, format params
│   ├── scanner/
│   │   ├── worker.js       # OffscreenCanvas Web Worker
│   │   ├── pipeline.js     # Frame capture, preprocessing, decoding
│   │   ├── binarize.js     # Adaptive thresholding (Otsu)
│   │   ├── project.js      # 1D projection from image band
│   │   └── locator.js      # Tag region detection
│   └── index.js            # Public API surface
├── tests/
│   ├── core/
│   │   ├── crc.test.js
│   │   ├── encoder.test.js
│   │   └── decoder.test.js
│   └── scanner/
│       └── pipeline.test.js   # @vitest-environment jsdom
├── dist/                      # Built output — gitignored
├── package.json
├── vite.config.js
└── vitest.config.js
```

Keep `src/core/` completely free of any DOM or browser API dependencies. It must run in pure Node.js. The scanner modules (`src/scanner/`) may use browser APIs but must be excluded from the Node test environment.

***

## 3. npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm run build` | `vite build` | Produces `dist/TagStrip.js` (ESM), `dist/TagStrip.cjs` (CJS), `dist/TagStrip.umd.js` (browser `<script>`) |
| `npm test` | `vitest run` | Runs all tests once (CI-friendly) |
| `npm run test:watch` | `vitest` | Interactive watch mode during development |
| `npm run test:coverage` | `vitest run --coverage` | Coverage report via V8 |

***

## 4. Start with the Core, Not the Scanner

Implement and fully test `crc.js` → `encoder.js` → `decoder.js` **before writing a single line of scanner code**.

The reason: the scanner is the hardest part to test deterministically. If your encoder and decoder are solid and mutually verified, debugging the scanner becomes much easier — you know any failure is in the vision pipeline, not in the bit logic.

### CRC implementation

Implement a generic `computeCRC(bits, polynomial, crcBits)` function that works for both CRC-3 and CRC-4. Do not hardcode separate functions for each variant — parameterize them.

```js
// bits: Uint8Array of 0/1 values
// polynomial: integer (e.g., 0b1011 for CRC-3)
// crcBits: integer (3 or 4)
// returns: Uint8Array of CRC bits
export function computeCRC(bits, polynomial, crcBits) { ... }
```

Test vectors: for any known payload, manually compute the expected CRC with pencil and paper (or an online CRC calculator), then verify your function against it. Do not skip this step.

### Encoder

The encoder's output is a plain string like `###.#....#.#.#.#.###`. It must be deterministic: same inputs always produce the same string.

```js
// Returns the printable TagStrip code string
export function encode(boxId, variant = 'long', options = {}) {
  // options.darkChar  default '#'
  // options.lightChar default '.'
}
```

### Decoder (pure bitstream)

The decoder receives a `Uint8Array` of 0/1 values and returns the decoded result. It must not know anything about images.

```js
// bits: Uint8Array of raw 0/1 values (exact length of short or long tag)
// returns: { success: boolean, variant: string, boxId: number } | { success: false }
export function decodeBits(bits) { ... }
```

***

## 5. Testing Strategy

### Core tests (Vitest, Node environment)

```js
// tests/core/encoder.test.js
import { describe, it, expect } from 'vitest';
import { encode } from '../../src/core/encoder.js';
import { decodeBits } from '../../src/core/decoder.js';
import { SHORT_MAX_ID, LONG_MAX_ID } from '../../src/core/constants.js';

describe('encoder/decoder round-trip — short tag', () => {
  it('round-trips all short IDs', () => {
    for (let id = 0; id <= SHORT_MAX_ID; id++) {
      const str = encode(id, 'short');
      const bits = Uint8Array.from(str, c => c === '#' ? 1 : 0);
      const result = decodeBits(bits);
      expect(result.success).toBe(true);
      expect(result.boxId).toBe(id);
    }
  });
});

describe('CRC rejection', () => {
  it('rejects a single flipped bit in payload', () => {
    const str = encode(42, 'short');
    const bits = Uint8Array.from(str, c => c === '#' ? 1 : 0);
    // Flip payload bit at position 5 (first payload bit)
    bits[5] ^= 1;
    expect(decodeBits(bits).success).toBe(false);
  });
});
```

- Run the full ID range for both short (1024 IDs) and long (65536 IDs) variants.
- Flip every payload bit individually and assert CRC rejection each time.
- Test edge cases: `boxId = 0`, `boxId = 1`, `boxId = SHORT_MAX_ID`, `boxId = LONG_MAX_ID`.

### Scanner tests (Vitest, jsdom environment)

Generate synthetic test images programmatically — render a known tag string onto a canvas and run it through the full pipeline. Never rely on real-world photos as your primary test suite.

***

## 6. Scanner Pipeline — Key Recommendations

### Use OffscreenCanvas + Web Worker

The scanner must run in a Web Worker using `OffscreenCanvas`. Never process frames on the main thread.

```js
// main thread
const worker = new Worker(new URL('./scanner/worker.js', import.meta.url), { type: 'module' });
worker.postMessage({ type: 'frame', bitmap: videoFrame }, [videoFrame]);
worker.onmessage = ({ data }) => {
  if (data.type === 'result') handleResult(data);
};
```

Note: when bundled by Vite, Web Workers must be imported using the `new URL(..., import.meta.url)` pattern for Rollup to correctly handle the worker entry point.

### Adaptive thresholding, not a fixed threshold

**Do not use a single fixed luminance threshold.** Use Otsu's method or a local adaptive threshold. A fixed value of 128 will fail in poor or uneven lighting.

### 1D projection

Once you have a candidate horizontal band, reduce it to a 1D signal by summing foreground pixel counts per column. Smooth with a box filter (window of 3–5 samples) before segmentation.

### Guard pattern detection drives everything

Do not attempt module boundary detection without first finding the LEFT_GUARD (`111`). The guard gives you:
1. The starting x position.
2. The estimated module width in pixels (guard pixel width / 3).

Reject any frame where the guard cannot be confidently identified.

### Module width estimation

LetraTag output is not guaranteed monospaced. Use center-of-mass resampling: for each module position, sample a window of ±30% around the nominal center and threshold the average. Do not use a rigid fixed-step sampler.

### Multi-frame voting

Never emit a result from a single frame. Keep a rolling buffer of the last 3–5 decoded bit arrays. Only emit when the majority agree on the same ID and all pass CRC.

### Variant auto-detection

Read ORIENT bits (positions 3–4 after LEFT_GUARD):
- `01` → short tag, expect 20 bits total.
- `10` → long tag, expect 28 bits total.
- Neither → reject frame.

### Handle reversed scans

If guards are found but CRC fails, retry with the bit array reversed. Emit the result if the reversed read passes CRC.

***

## 7. Camera Handling

```js
const stream = await navigator.mediaDevices.getUserMedia({
  video: {
    facingMode: 'environment',
    width: { ideal: 1920 },
    height: { ideal: 1080 }
  }
});
```

Request full resolution. The tag is physically small and needs as many pixels as possible. Use `requestVideoFrameCallback` where available instead of `requestAnimationFrame`.

***

## 8. Public API Design

Keep the public API minimal. Three entry points exposed from `src/index.js`:

```ts
// Encoder — works in Node and browser
encode(boxId: number, variant?: 'short' | 'long', options?: EncodeOptions): string

// Decoder (pure bitstream — for testing and manual use)
decodeBits(bits: Uint8Array): DecodeResult

// Scanner — browser only
createScanner(videoElement: HTMLVideoElement, onResult: (result: ScanResult) => void): Scanner
scanner.start(): void
scanner.stop(): void
```

Everything else is internal. Do not expose CRC functions, pipeline internals, or constants in the public API surface.

***

## 9. Character and Symbol Choice

Implement `DARK_CHAR` and `LIGHT_CHAR` as configurable constants in `constants.js`, defaulting to `'#'` and `'.'`. Do not hardcode them outside of that file.

```js
// src/core/constants.js
export const DEFAULT_DARK_CHAR  = '#';
export const DEFAULT_LIGHT_CHAR = '.';
```

If the user's DYMO model supports a filled square symbol (`■`), they can change the constant without touching any other code. The scanner pipeline does not care about the character — it only cares about luminance.

***

## 10. Performance Targets

| Operation | Target |
|-----------|--------|
| `encode()` | < 1ms |
| `decodeBits()` | < 1ms |
| Full frame processing (1080p) | < 80ms |
| End-to-end scan latency (3-frame vote) | < 1s |

If frame processing exceeds 80ms: first try restricting the search area with a UI overlay guide, then try downsampling before binarization. Only consider WASM as a last resort.

***

## 11. Error Reasons

Return structured reason codes from the scanner, never raw exceptions:

```js
{ success: false, reason: 'NO_GUARD_FOUND' }
{ success: false, reason: 'CRC_MISMATCH' }
{ success: false, reason: 'AMBIGUOUS_ORIENTATION' }
{ success: false, reason: 'FRAME_TOO_DARK' }
{ success: false, reason: 'UNKNOWN_VARIANT' }
```

***

## 12. What NOT to Do

- **Do not use any OCR library.** The scanner reads luminance bands, not characters.
- **Do not use a QR/barcode library** (ZXing, jsQR, etc.) — they will not recognize a custom symbology.
- **Do not process frames on the main thread.**
- **Do not emit a result from a single frame** — always use multi-frame voting.
- **Do not hardcode module pixel width** — always estimate it from the guard pattern.
- **Do not use `localStorage` or `sessionStorage`** if running in a sandboxed iframe.
- **Do not expose internal CRC or pipeline functions** in the public API.
- **Do not import scanner modules in core tests** — keep environments strictly separated.
