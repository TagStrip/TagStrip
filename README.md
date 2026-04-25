# TagStrip

A JavaScript specification and library for encoding and decoding DYMO LetraTag strip codes. TagStrip can both **scan** tags using your device camera and **generate** new tags programmatically.

## Overview

TagStrip implements the encoding and decoding logic for DYMO LetraTag strip codes, consisting of guard patterns, orientation bits, payload (box ID), and CRC error-checking.

### Tag Variants

| Variant | Total Bits | Payload Bits | ID Range | Description |
|---------|------------|--------------|----------|-------------|
| Short   | 20 bits    | 10 bits      | 0-1023   | For smaller deployments |
| Long    | 28 bits    | 16 bits      | 0-65535  | For larger-scale use |

Each tag contains:
- **Left Guard** - Sync pattern for detection
- **Orientation** - 2 bits to identify variant and scan direction
- **Payload** - The actual box ID
- **CRC** - Error detection bits
- **Right Guard** - End marker

## Quick Start

### CDN (Script Tag)

The CDN provides core encoding/decoding functions:

```html
<script src="https://cdn.jsdelivr.net/gh/tagstrip/tagstrip/dist/tagstrip.umd.js"></script>

<script>
  // Encode a box ID into a tag string
  const tag = TagStrip.encode(42, 'short');
  console.log(tag); // ###.#####.#.##
</script>
```

### NPM - Scan Tags with Camera

The main feature: scan and decode DYMO LetraTag strips using your camera:

```bash
npm install @lelenaic/tagstrip
```

```javascript
import { createScanner } from '@lelenaic/tagstrip/scanner/pipeline.js';

// Get video element with camera stream
const video = document.getElementById('video');
const stream = await navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'environment' }
});
video.srcObject = stream;

// Create scanner - calls callback with decoded results
const scanner = createScanner(video, (result) => {
  if (result.success) {
    console.log(`Detected ${result.variant} tag: ID ${result.boxId}`);
  }
});

scanner.start();

// Stop when done
scanner.stop();
stream.getTracks().forEach(t => t.stop());
```

For complete working examples, see [`demo.html`](demo.html).

## API Reference

### encode(boxId, variant, options)

Encodes a numeric ID into a TagStrip code string.

**Parameters:**

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `boxId` | number | Yes | - | The ID to encode (integer) |
| `variant` | string | No | `'long'` | `'short'` (0-1023) or `'long'` (0-65535) |
| `options` | object | No | `{}` | Encoding options |

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `darkChar` | string | `'#'` | Character representing bit 1 |
| `lightChar` | string | `'.'` | Character representing bit 0 |

**Returns:** `string` - The encoded TagStrip code

**Example:**
```javascript
// Short tag (10-bit payload, 0-1023)
const shortTag = encode(42, 'short');
// Result: ###.#####.#.##

// Long tag (16-bit payload, 0-65535)
const longTag = encode(1000, 'long');
// Result: ###.##########.#.###

// Custom characters
const customTag = encode(42, 'short', { darkChar: '1', lightChar: '0' });
// Result: 1110111110010111
```

### decodeBits(bits)

Decodes a bit array back to a box ID.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `bits` | Uint8Array | Yes | Array of 0/1 values |

**Returns:** `Object` with the following structure:
- `success` (boolean) - Whether decoding succeeded
- `boxId` (number) - The decoded ID (if success)
- `variant` (string) - `'short'` or `'long'` (if success)
- `reason` (string) - Failure reason (if not success)

**Possible failure reasons:**
- `EMPTY_BITSTREAM` - Input was empty
- `INVALID_LENGTH` - Bit count didn't match either variant
- `NO_GUARD_FOUND` - Guard pattern not detected
- `CRC_MISMATCH` - CRC check failed

**Example:**
```javascript
// Decode from tag string
const bits = Uint8Array.from('###.#####.#.##', c => c === '#' ? 1 : 0);
const result = decodeBits(bits);
// { success: true, boxId: 42, variant: 'short' }

// Handle failure
const failed = decodeBits(new Uint8Array([0, 1, 0]));
if (!failed.success) {
  console.log(failed.reason); // 'NO_GUARD_FOUND'
}
```

### Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `SHORT_MAX_ID` | 1023 | Maximum ID for short tags |
| `LONG_MAX_ID` | 65535 | Maximum ID for long tags |

**Example:**
```javascript
import { SHORT_MAX_ID, LONG_MAX_ID } from '@lelenaic/tagstrip';

console.log(SHORT_MAX_ID); // 1023
console.log(LONG_MAX_ID);  // 65535
```

### Scanner (Browser Only, NPM Only)

The scanner module provides camera-based tag detection using multi-frame voting for robust results. Note: Scanner is only available via NPM/esbuild bundling, not via CDN script tag.

```javascript
// NPM/ES Module only
import { createScanner } from '@lelenaic/tagstrip/scanner/pipeline.js';

// Get video element with camera stream
const video = document.getElementById('my-video');

// Create scanner instance
const scanner = createScanner(video, (result) => {
  if (result.success) {
    console.log(`Detected: ${result.variant} tag, ID: ${result.boxId}`);
    console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
  }
});

// Start scanning
scanner.start();

// Stop scanning when done
scanner.stop();
```

**Scanner Features:**
- Multi-frame voting (5 frames, 60% consensus required)
- Automatic orientation detection (reads left-to-right or right-to-left)
- Supports both short and long tag variants
- Returns confidence score based on voting agreement

#### VotingBuffer Class

For custom implementations, the `VotingBuffer` class manages the multi-frame consensus logic:

```javascript
import { VotingBuffer } from '@lelenaic/tagstrip/scanner/pipeline.js';

const buffer = new VotingBuffer(5); // Buffer size

// Add decode results
buffer.add({ success: true, variant: 'short', boxId: 42 });

// Get consensus result
const consensus = buffer.getConsensus();
if (consensus) {
  console.log(`Winner: ${consensus.boxId} (${consensus.variant})`);
  console.log(`Confidence: ${consensus.confidence}`);
}

// Check buffer fill level
console.log(`Buffer: ${buffer.length}/5`);
```

## Usage Example

See [`demo.html`](demo.html) for a complete end-user implementation with both scanning and generation functionality. Note that the demo uses direct source imports (`./src/scanner/pipeline.js`) for the scanner since it's not bundled in the UMD export.

### Basic Generation

```javascript
import { encode, decodeBits, SHORT_MAX_ID, LONG_MAX_ID } from '@lelenaic/tagstrip';

// Generate a short tag
const tag = encode(123, 'short');
console.log(tag); // ###.#.######.##

// Generate a long tag
const tag2 = encode(45678, 'long');
console.log(tag2); // ###.###########.#.###

// Verify round-trip
const bits = Uint8Array.from(tag, c => c === '#' ? 1 : 0);
const decoded = decodeBits(bits);
console.log(decoded.boxId === 123); // true
```

### Browser Scanner Integration

```javascript
import { createScanner } from '@lelenaic/tagstrip/scanner/pipeline.js';

async function startCamera() {
  const video = document.getElementById('video');
  
  // Request camera access
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: 'environment' }
  });
  
  video.srcObject = stream;
  
  // Create scanner with result callback
  const scanner = createScanner(video, (result) => {
    if (result.success) {
      console.log(`Detected ${result.variant} tag: ID ${result.boxId}`);
    }
  });
  
  scanner.start();
  
  // Clean up later
  return () => {
    scanner.stop();
    stream.getTracks().forEach(t => t.stop());
  };
}
```

## Requirements

- **Browser scanning**: HTTPS or localhost required for camera access
- **Modern browser** with `navigator.mediaDevices.getUserMedia` support
- ES modules support for import-based usage

## Tag Format

Tags are represented as strings of `#` (dark/1) and `.` (light/0) characters. The structure is:

```
SHORT TAG (20 bits):
[LEFT_GUARD 3][ORIENT 2][PAYLOAD 10][CRC 3][RIGHT_GUARD 2]
      111         01     [10-bit ID]   [3]       11

LONG TAG (28 bits):
[LEFT_GUARD 3][ORIENT 2][PAYLOAD 16][CRC 4][RIGHT_GUARD 3]
      111         10     [16-bit ID]   [4]       111
```

The orientation bits also identify the variant:
- `01` = Short tag
- `10` = Long tag

This allows the decoder to automatically detect the tag variant and validate accordingly.
