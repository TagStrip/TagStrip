# TagStrip

A custom one-dimensional barcode symbology for DYMO LetraTag label makers, with camera-based scanning support.

## Overview

TagStrip is a lightweight, printable encoding system designed for:
- Printing on DYMO LetraTag 200B (and similar) label makers
- Encoding small integer IDs (up to 1024 or 65536)
- Camera-based decoding using smartphones or webcams
- Error detection via CRC

Two variants are available:
- **Short tag**: 20 bits total, 10-bit payload (1024 IDs)
- **Long tag**: 28 bits total, 16-bit payload (65536 IDs)

## Installation

```bash
npm install
```

## Build

```bash
npm run build
```

Produces three output formats:
- `dist/tagstrip.js` - ESM (for modern bundlers)
- `dist/tagstrip.cjs` - CommonJS (for Node.js)
- `dist/tagstrip.umd.js` - UMD (for browser `<script>` tag)

## Demo (Mobile Scanner & Generator)

### Production Demo

Test the final built version:

```bash
# Build and start demo server
npm run demo
```

Then open the displayed network URL on your mobile device (e.g., `http://192.168.x.x:8080`).

### Development Mode (Hot Reload)

For active development with instant updates:

```bash
# Start dev server with HMR
npm run dev
```

Access on mobile via network URL (e.g., `http://192.168.x.x:3000/demo.html`). Code changes in `src/` auto-reload on save - perfect for testing scanner tweaks on mobile while coding on PC.

See [DEMO_INSTRUCTIONS.md](DEMO_INSTRUCTIONS.md) for usage guide and [DEV_GUIDE.md](DEV_GUIDE.md) for development workflow.

## Testing

```bash
# Run tests once
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage
```

## Usage

### Encoding

```javascript
import { encode } from 'TagStrip';

// Encode a short tag (ID 0-1023)
const shortTag = encode(42, 'short');
console.log(shortTag); // "###.#.......##.#.##"

// Encode a long tag (ID 0-65535)
const longTag = encode(1024, 'long');
console.log(longTag); // "####.........#......##.###"

// Custom characters
const customTag = encode(42, 'short', {
  darkChar: '■',
  lightChar: '·'
});
```

### Decoding (Bitstream)

```javascript
import { decodeBits } from 'TagStrip';

// Convert string to bit array
const bits = Uint8Array.from(tagString, c => c === '#' ? 1 : 0);

// Decode
const result = decodeBits(bits);
if (result.success) {
  console.log(`Decoded ID: ${result.boxId}`);
  console.log(`Variant: ${result.variant}`);
} else {
  console.log(`Decode failed: ${result.reason}`);
}
```

### Scanner (Browser Only)

```javascript
import { createScanner } from './src/scanner/pipeline.js';

// Get video stream
const video = document.querySelector('video');
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
});
video.srcObject = stream;

// Create scanner
const scanner = createScanner(video, (result) => {
  console.log(`Scanned ID: ${result.boxId}`);
  console.log(`Variant: ${result.variant}`);
  console.log(`Confidence: ${result.confidence}`);
});

// Start/stop
scanner.start();
// ... later
scanner.stop();
```

## API Reference

### Core Functions

#### `encode(boxId, variant, options)`

Encode an ID into a TagStrip string.

**Parameters:**
- `boxId` (number): ID to encode (0-1023 for short, 0-65535 for long)
- `variant` (string): `'short'` or `'long'`
- `options` (object, optional):
  - `darkChar` (string): Character for bit 1 (default: `'#'`)
  - `lightChar` (string): Character for bit 0 (default: `'.'`)

**Returns:** String representation of the tag

#### `decodeBits(bits)`

Decode a TagStrip bitstream.

**Parameters:**
- `bits` (Uint8Array): Array of 0/1 values

**Returns:** Object with:
- `success` (boolean): Whether decode succeeded
- `boxId` (number): Decoded ID (if success)
- `variant` (string): `'short'` or `'long'` (if success)
- `reason` (string): Error reason (if failed)

### Scanner Functions

#### `createScanner(videoElement, onResult)`

Create a scanner instance for real-time tag detection.

**Parameters:**
- `videoElement` (HTMLVideoElement): Video element with camera stream
- `onResult` (function): Callback for scan results

**Returns:** Scanner instance with `start()` and `stop()` methods

## Project Structure

```
TagStrip/
├── src/
│   ├── core/
│   │   ├── constants.js    # Fixed patterns and polynomials
│   │   ├── crc.js          # CRC-3 and CRC-4 algorithms
│   │   ├── encoder.js      # Bitstream builder and text encoder
│   │   └── decoder.js      # Bitstream validator and ID extractor
│   ├── scanner/
│   │   ├── binarize.js     # Adaptive thresholding (Otsu)
│   │   ├── project.js      # 1D projection from image band
│   │   ├── locator.js      # Tag region detection
│   │   ├── pipeline.js     # Frame capture and decoding
│   │   └── worker.js       # OffscreenCanvas Web Worker
│   └── index.js            # Public API surface
├── tests/
│   ├── core/
│   │   ├── crc.test.js
│   │   ├── encoder.test.js
│   │   └── decoder.test.js
│   └── scanner/
│       └── pipeline.test.js
└── dist/                   # Built output (gitignored)
```

## Technical Details

### Short Tag Format (20 bits)

```
[111][01][10-bit payload][3-bit CRC][11]
 ^    ^         ^              ^      ^
 |    |         |              |      Right Guard
 |    |         |              CRC-3 (polynomial 0b1011)
 |    |         Payload (ID 0-1023)
 |    Orientation (01 = short)
 Left Guard
```

### Long Tag Format (28 bits)

```
[111][10][16-bit payload][4-bit CRC][111]
 ^    ^         ^              ^      ^
 |    |         |              |      Right Guard
 |    |         |              CRC-4 (polynomial 0b10011)
 |    |         Payload (ID 0-65535)
 |    Orientation (10 = long)
 Left Guard
```

### Error Detection

- CRC-3 for short tags (detects single-bit errors)
- CRC-4 for long tags (stronger error detection)
- Guard patterns for start/end detection
- Orientation bits to distinguish variants and handle reversed scans

### Scanner Pipeline

1. **Frame Capture**: Extract frame from video stream
2. **Grayscale Conversion**: Convert RGBA to luminance
3. **Adaptive Binarization**: Otsu's method for threshold
4. **Band Search**: Horizontal projection and guard detection
5. **Bit Sampling**: Center-of-mass resampling with ±30% window
6. **CRC Validation**: Verify payload integrity
7. **Multi-frame Voting**: 3-5 frame consensus for robust detection

## Performance

- `encode()`: < 1ms
- `decodeBits()`: < 1ms
- Full frame processing (1080p): < 80ms
- End-to-end scan latency (3-frame vote): < 1s

## License

See LICENSE file for details.

## References

- [DYMO LetraTag 200B](https://dymo.eu/Dymo-LetraTag-200B-Bluetooth-printer/2172855)
- [Otsu's Method](https://en.wikipedia.org/wiki/Otsu%27s_method)
- [CRC Polynomial Codes](https://en.wikipedia.org/wiki/Cyclic_redundancy_check)
