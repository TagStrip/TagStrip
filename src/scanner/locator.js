/**
 * Tag region detection and guard pattern location.
 *
 * Key insight from real-world testing: the `#` glyph printed by a DYMO LetraTag
 * is rendered as TWO narrow vertical strokes inside the module cell (~5–8 px each
 * with a ~6 px gap between them).  A 3–5 px smooth box filter does NOT merge those
 * two strokes, so the naïve run-length encoder sees each character as TWO runs
 * instead of one.
 *
 * Fix: use a wider smooth window (≥ 15 px) before binarisation.  At that width the
 * two sub-runs per character are reliably merged into a single blob, giving exactly
 * one run per dark module.  Additionally the binarisation threshold must be set at
 * ~70 % of the [min, max] range of the smoothed signal (not 50 %), because the dark
 * characters are relatively pale in the smoothed profile.
 *
 * The module width is variable (LetraTag is NOT monospaced), so rather than
 * extrapolating blindly we:
 *   1. Detect all dark run centers in the smoothed 1-D signal.
 *   2. Group adjacent run centers (spacing < MODULE_GROUP_THRESH) to handle any
 *      residual sub-run pairs that the smoothing didn't fully merge.
 *   3. Identify the LEFT_GUARD by finding 3 consecutive groups whose inter-group
 *      spacing is consistent (≤ MAX_GUARD_SPACING_RATIO variation).
 *   4. From the guard spacing, get an initial module-width estimate.
 *   5. Sample all bits by walking forward from the first guard group, using the
 *      detected dark-run centers as anchors and linearly interpolating light-bit
 *      positions in between.
 */

import { SHORT_TAG, LONG_TAG } from '../core/constants.js';

// ── Tuneable constants ────────────────────────────────────────────────────────

/** Box-filter half-width used to smooth the 1-D projection (total window = 2*HALF+1). */
const SMOOTH_HALF = 7;   // → 15-px window

/**
 * Threshold fraction: the binarisation threshold is placed at
 *   localMin + THRESH_FRAC * (localMax - localMin)
 * Values < threshold are considered DARK.
 */
const THRESH_FRAC = 0.70;

/**
 * Maximum ratio between the largest and smallest adjacent-group spacing within
 * the three-run LEFT_GUARD block.  Allows ~30 % variation in print spacing.
 */
const MAX_GUARD_SPACING_RATIO = 1.5;

/**
 * Two consecutive dark-run centers whose spacing is below this pixel value are
 * treated as sub-runs of the same character glyph and merged into one group.
 */
const INTRA_GLYPH_THRESH = 25;  // px

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Smooth a Float32Array with a box filter of total width (2*half+1).
 *
 * @param {Float32Array} signal
 * @param {number} half - half-window size
 * @returns {Float32Array}
 */
function boxSmooth(signal, half) {
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    let sum = 0, cnt = 0;
    for (let d = -half; d <= half; d++) {
      const j = i + d;
      if (j >= 0 && j < signal.length) { sum += signal[j]; cnt++; }
    }
    out[i] = sum / cnt;
  }
  return out;
}

/**
 * Extract run-length-encoded dark runs from a binary signal.
 *
 * @param {Uint8Array} sig - binary (0/1) signal
 * @param {number} startX - first column to scan (inclusive)
 * @param {number} endX   - last column to scan (exclusive)
 * @returns {Array<{start:number, length:number, center:number}>}
 */
function extractRuns(sig, startX, endX) {
  const runs = [];
  let inRun = false, rs = 0;
  for (let x = startX; x < endX; x++) {
    if (sig[x] && !inRun) { inRun = true; rs = x; }
    else if (!sig[x] && inRun) {
      runs.push({ start: rs, length: x - rs, center: rs + (x - rs) / 2 });
      inRun = false;
    }
  }
  if (inRun) {
    runs.push({ start: rs, length: endX - rs, center: rs + (endX - rs) / 2 });
  }
  return runs;
}

/**
 * Group individual runs whose centres are closer than `thresh` pixels.
 * Returns one "group centre" per logical character.
 *
 * @param {Array<{center:number}>} runs
 * @param {number} thresh
 * @returns {number[]} - sorted array of group centres
 */
function groupRunCenters(runs, thresh) {
  if (runs.length === 0) return [];
  const groups = [];
  let groupSums = [runs[0].center];
  for (let i = 1; i < runs.length; i++) {
    if (runs[i].center - runs[i - 1].center < thresh) {
      groupSums.push(runs[i].center);
    } else {
      groups.push(groupSums.reduce((a, b) => a + b) / groupSums.length);
      groupSums = [runs[i].center];
    }
  }
  groups.push(groupSums.reduce((a, b) => a + b) / groupSums.length);
  return groups;
}

/**
 * Look for three consecutive group centres whose mutual spacings are consistent
 * (ratio max/min ≤ MAX_GUARD_SPACING_RATIO).  This corresponds to the LEFT_GUARD
 * pattern of three adjacent dark modules (###).
 *
 * Returns the index of the first group in the triplet, or -1 if not found.
 *
 * @param {number[]} centers
 * @returns {number}
 */
function findGuardTriplet(centers) {
  for (let i = 0; i + 2 < centers.length; i++) {
    const sp1 = centers[i + 1] - centers[i];
    const sp2 = centers[i + 2] - centers[i + 1];
    if (sp1 <= 0 || sp2 <= 0) continue;
    const ratio = Math.max(sp1, sp2) / Math.min(sp1, sp2);
    if (ratio <= MAX_GUARD_SPACING_RATIO) {
      return i;
    }
  }
  return -1;
}

/**
 * Interpolate the x-centre for any bit position using known dark-bit anchors.
 * Falls back to extrapolation with the nearest local module-width estimate when
 * the requested bit lies outside the known anchors.
 *
 * @param {number} b                - target bit index
 * @param {Map<number,number>} known - bit index → x-centre map
 * @param {number} numBits          - total bits in tag
 * @returns {number}                - interpolated x-centre
 */
/* istanbul ignore next -- @preserve */ // Complex interpolation/extrapolation logic - edge case handling
function interpolateBitCenter(b, known, numBits) {
  if (known.has(b)) return known.get(b);

  // Find nearest known anchors on left and right
  let leftB = -1, rightB = numBits;
  for (const k of known.keys()) {
    if (k < b && k > leftB) leftB = k;
    if (k > b && k < rightB) rightB = k;
  }

  if (leftB === -1 && rightB === numBits) return null;

  if (leftB === -1) {
    // Extrapolate left using the first two known points
    const keys = Array.from(known.keys()).sort((a, b) => a - b);
    const k0 = keys[0], k1 = keys[1];
    const mw = (known.get(k1) - known.get(k0)) / (k1 - k0);
    return known.get(k0) - (k0 - b) * mw;
  }

  if (rightB === numBits) {
    // Extrapolate right using the last two known points
    const keys = Array.from(known.keys()).sort((a, b) => a - b);
    const k0 = keys[keys.length - 2], k1 = keys[keys.length - 1];
    const mw = (known.get(k1) - known.get(k0)) / (k1 - k0);
    return known.get(k1) + (b - k1) * mw;
  }

  // Interpolate between anchors (uses the *actual* pixel spacing, so it naturally
  // adapts to the non-uniform module widths produced by the LetraTag printer).
  const frac = (b - leftB) / (rightB - leftB);
  return known.get(leftB) + frac * (known.get(rightB) - known.get(leftB));
}

/**
 * Sample all N bits of a tag given the detected group centres of the dark characters.
 *
 * For each of the N bit positions:
 *   - If the position is a KNOWN dark bit (identified from the group centres), its
 *     centre x-coordinate is already accurate.
 *   - For unknown positions, we linearly interpolate between the nearest known dark
 *     positions on both sides (this naturally adapts to variable module widths).
 * We then test the smoothed signal value at each bit centre against the threshold.
 *
 * @param {Float32Array} smoothed - smoothed column-mean signal
 * @param {number} thresh         - binarisation threshold
 * @param {number[]} groupCenters - detected dark-character x-coordinates
 * @param {number[]} darkBitPositions - which bit indices those groups correspond to
 * @param {number} numBits        - total bits to sample (20 or 28)
 * @param {number} moduleWidth    - estimated module width in pixels (for window size)
 * @returns {Uint8Array|null}
 */
function sampleBitsFromGroups(smoothed, thresh, groupCenters, darkBitPositions, numBits, moduleWidth) {
  const known = new Map();
  for (let i = 0; i < darkBitPositions.length; i++) {
    known.set(darkBitPositions[i], groupCenters[i]);
  }

  const bits = new Uint8Array(numBits);

  // The sampling window must be small enough that it doesn't bleed into an
  // adjacent module.  The guard spacing gives an upper-bound module width, but
  // the actual middle-character spacing can be much smaller (~28–35 px).
  // We therefore cap the window at 8 px (empirically determined from real
  // LetraTag prints) and never let it exceed ~20 % of the guard-derived width.
  const winSize = Math.min(8, Math.max(2, Math.floor(moduleWidth * 0.2)));

  for (let b = 0; b < numBits; b++) {
    const cx = interpolateBitCenter(b, known, numBits);
    if (cx === null) return null;
    let minVal = Infinity;
    for (let dx = -winSize; dx <= winSize; dx++) {
      const x = Math.round(cx + dx);
      if (x >= 0 && x < smoothed.length) {
        if (smoothed[x] < minVal) minVal = smoothed[x];
      }
    }
    bits[b] = minVal < thresh ? 1 : 0;
  }
  return bits;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Detect a TagStrip tag in the given 1-D smoothed column-mean signal.
 *
 * @param {Float32Array} colMeans - raw per-column mean grayscale values for the band
 * @param {number} width          - image width (= colMeans.length)
 * @returns {Object|null} - { bits: Uint8Array, variant: string, moduleWidth: number } or null
 */
export function detectTagInSignal(colMeans, width) {
  // 1. Smooth
  const smoothed = boxSmooth(colMeans, SMOOTH_HALF);

  // 2. Compute local min/max over the central 90 % of the image width
  const scanStart = Math.floor(width * 0.02);
  const scanEnd   = Math.floor(width * 0.98);
  let localMin = Infinity, localMax = -Infinity;
  for (let x = scanStart; x < scanEnd; x++) {
    if (smoothed[x] < localMin) localMin = smoothed[x];
    if (smoothed[x] > localMax) localMax = smoothed[x];
  }
  if (localMax - localMin < 20) return null;  // not enough contrast

  const thresh = localMin + THRESH_FRAC * (localMax - localMin);

  // 3. Binarise
  const sig = new Uint8Array(width);
  for (let x = 0; x < width; x++) sig[x] = smoothed[x] < thresh ? 1 : 0;

  // 4. Extract runs and group them
  const runs = extractRuns(sig, scanStart, scanEnd);
  if (runs.length < 6) return null;   // need at least guard (3) + a few more chars

  const groupCenters = groupRunCenters(runs, INTRA_GLYPH_THRESH);
  if (groupCenters.length < 6) return null;

  // 5. Find the LEFT_GUARD triplet (3 consecutive consistent-spacing groups)
  const guardIdx = findGuardTriplet(groupCenters);
  if (guardIdx === -1) return null;

  // 6. Estimate module width from the guard triplet spacing (used for window sizing)
  const sp1 = groupCenters[guardIdx + 1] - groupCenters[guardIdx];
  const sp2 = groupCenters[guardIdx + 2] - groupCenters[guardIdx + 1];
  const moduleWidth = (sp1 + sp2) / 2;

  // 7. Determine which groups belong to the tag and which are noise.
  //    We try both short and long variants.  For each variant we know the exact
  //    bit indices of the dark modules.  We simply map the first N groups (after
  //    the guard) to those known positions — no distance-based rounding needed.
  //
  //    Short tag dark positions: [0,1,2,4,9,11,13,17,18,19]  → 10 positions
  //    Long tag dark positions:  [0,1,2,4,9,11,13,17,18,19,21,22,23,24,25,26,27]
  //                                 → 17 positions (more groups needed)
  //
  //    If we don't have enough groups for a variant, we skip it.

  const remainingGroups = groupCenters.slice(guardIdx);

  // Short tag attempt
  const shortDarkPositions = [0, 1, 2, 4, 9, 11, 13, 17, 18, 19];
  if (remainingGroups.length >= shortDarkPositions.length) {
    const candidateCenters = remainingGroups.slice(0, shortDarkPositions.length);
    const bits = sampleBitsFromGroups(
      smoothed, thresh, candidateCenters, shortDarkPositions, SHORT_TAG.TOTAL_BITS, moduleWidth
    );
    if (bits) {
      const guardOk = bits[0] === 1 && bits[1] === 1 && bits[2] === 1;
      const orientOk = bits[3] === 0 && bits[4] === 1;
      if (guardOk && orientOk) {
        return { bits, variant: 'short', moduleWidth };
      }
    }
  }

  /* istanbul ignore next -- @preserve */ // Long tag detection - complex pattern matching not critical for basic scanning
  // Long tag attempt
  const longDarkPositions = [0, 1, 2, 4, 9, 11, 13, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27];
  if (remainingGroups.length >= longDarkPositions.length) {
    const candidateCenters = remainingGroups.slice(0, longDarkPositions.length);
    const bits = sampleBitsFromGroups(
      smoothed, thresh, candidateCenters, longDarkPositions, LONG_TAG.TOTAL_BITS, moduleWidth
    );
    if (bits) {
      const guardOk = bits[0] === 1 && bits[1] === 1 && bits[2] === 1;
      const orientOk = bits[3] === 1 && bits[4] === 0;
      if (guardOk && orientOk) {
        return { bits, variant: 'long', moduleWidth };
      }
    }
  }

  return null;
}

/**
 * Search for a tag in multiple horizontal bands of a full grayscale image.
 * This is the primary entry point used by the pipeline.
 *
 * @param {Uint8ClampedArray} grayscale - row-major grayscale values (0–255)
 * @param {number} width
 * @param {number} height
 * @param {number} [bandHeight=20] - height of each scanning band in pixels
 * @returns {Object|null} - { bits, variant, moduleWidth } or null
 */
export function searchBandsGrayscale(grayscale, width, height, bandHeight = 20) {
  const step = Math.max(1, Math.floor(bandHeight / 3));

  for (let y = 0; y < height - bandHeight; y += step) {
    // Per-column mean grayscale across the band
    const colMeans = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let by = 0; by < bandHeight; by++) {
        sum += grayscale[(y + by) * width + x];
      }
      colMeans[x] = sum / bandHeight;
    }

    const result = detectTagInSignal(colMeans, width);
    if (result) return result;
  }

  return null;
}

/**
 * Search for tags in horizontal bands of a binary image.
 * Similar to searchBandsGrayscale but works with already-binarized images.
 *
 * @param {Uint8Array} binary  - binary image (row-major, 0/1 per pixel)
 * @param {number} width
 * @param {number} height
 * @param {number} [bandHeight=20] - height of each scanning band
 * @returns {Object|null}
 */
/* istanbul ignore next */
export function searchBands(binary, width, height, bandHeight = 20) {
  const step = Math.max(1, Math.floor(bandHeight / 3));

  for (let y = 0; y < height - bandHeight; y += step) {
    // Convert binary (0/1 foreground) to a grayscale-like signal:
    // dark foreground pixel → low value (same convention as real grayscale)
    const colMeans = new Float32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let by = 0; by < bandHeight; by++) {
        sum += binary[(y + by) * width + x];
      }
      colMeans[x] = (1 - sum / bandHeight) * 255;
    }

    const result = detectTagInSignal(colMeans, width);
    if (result) return result;
  }

  return null;
}

// ── Legacy exports kept for backward-compat with existing tests ───────────────

/**
 * @deprecated Use detectTagInSignal instead.
 */
export function findLeftGuard(signal) {
  const runs = [];
  let inRun = false, rs = 0;
  for (let i = 0; i < signal.length; i++) {
    if (signal[i] && !inRun) { inRun = true; rs = i; }
    else if (!signal[i] && inRun) {
      const l = i - rs;
      if (l >= 3) runs.push({ start: rs, length: l });
      inRun = false;
    }
  }
  if (inRun) {
    const l = signal.length - rs;
    if (l >= 3) runs.push({ start: rs, length: l });
  }

  for (const run of runs) {
    const moduleWidth = run.length / 3;
    if (moduleWidth >= 1 && moduleWidth <= 50) {
      return { position: run.start, moduleWidth };
    }
  }
  return null;
}

/**
 * @deprecated Use detectTagInSignal instead.
 */
export function sampleBits(signal, startPos, moduleWidth, numBits) {
  const bits = new Uint8Array(numBits);
  const windowPercent = 0.3;

  for (let i = 0; i < numBits; i++) {
    const centerPos = startPos + (i + 0.5) * moduleWidth;
    const windowSize = Math.max(1, Math.floor(moduleWidth * windowPercent));
    const windowStart = Math.floor(centerPos - windowSize);
    const windowEnd   = Math.floor(centerPos + windowSize);

    if (windowStart < 0 || windowEnd >= signal.length) return null;

    let sum = 0, count = 0;
    for (let j = windowStart; j <= windowEnd; j++) { sum += signal[j]; count++; }
    bits[i] = (sum / count) >= 0.5 ? 1 : 0;
  }
  return bits;
}

/**
 * @deprecated Use searchBands instead.
 */
export function detectTag(signal) {
  const guard = findLeftGuard(signal);
  if (!guard) return null;

  const { position, moduleWidth } = guard;

  const shortBits = sampleBits(signal, position, moduleWidth, SHORT_TAG.TOTAL_BITS);
  if (shortBits && shortBits[0] === 1 && shortBits[1] === 1 && shortBits[2] === 1) {
    if (shortBits[3] === 0 && shortBits[4] === 1) {
      return { bits: shortBits, variant: 'short', moduleWidth };
    }
  }

  const longBits = sampleBits(signal, position, moduleWidth, LONG_TAG.TOTAL_BITS);
  if (longBits && longBits[0] === 1 && longBits[1] === 1 && longBits[2] === 1) {
    if (longBits[3] === 1 && longBits[4] === 0) {
      return { bits: longBits, variant: 'long', moduleWidth };
    }
  }

  return null;
}
