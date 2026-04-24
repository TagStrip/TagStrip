/**
 * Tag region detection and guard pattern location
 */

import { SHORT_TAG, LONG_TAG } from '../core/constants.js';

/**
 * Find runs of consecutive 1s in a binary signal
 * 
 * @param {Uint8Array} signal - Binary 1D signal
 * @param {number} minLength - Minimum run length to report
 * @returns {Array<{start: number, length: number}>} - List of runs
 */
function findRuns(signal, minLength = 3) {
  const runs = [];
  let inRun = false;
  let runStart = 0;
  
  for (let i = 0; i < signal.length; i++) {
    if (signal[i] === 1) {
      if (!inRun) {
        inRun = true;
        runStart = i;
      }
    } else {
      if (inRun) {
        const length = i - runStart;
        if (length >= minLength) {
          runs.push({ start: runStart, length });
        }
        inRun = false;
      }
    }
  }
  
  // Handle run extending to end of signal
  if (inRun) {
    const length = signal.length - runStart;
    if (length >= minLength) {
      runs.push({ start: runStart, length });
    }
  }
  
  return runs;
}

/**
 * Find LEFT_GUARD pattern (111) in binary signal
 * Returns the starting position and estimated module width
 * 
 * @param {Uint8Array} signal - Binary 1D signal
 * @returns {Object|null} - { position: number, moduleWidth: number } or null
 */
export function findLeftGuard(signal) {
  const runs = findRuns(signal, 3);
  
  // Look for a run of 1s that could be the LEFT_GUARD (111)
  // The guard pattern is 3 consecutive 1-bits
  for (const run of runs) {
    // Estimate module width from this run
    const moduleWidth = run.length / 3;
    
    // Module width should be reasonable (at least 1 pixel, at most 50 pixels)
    if (moduleWidth >= 1 && moduleWidth <= 50) {
      return {
        position: run.start,
        moduleWidth
      };
    }
  }
  
  return null;
}

/**
 * Sample bits from signal using estimated module width
 * Uses center-of-mass approach with ±30% window around nominal centers
 * 
 * @param {Uint8Array} signal - Binary 1D signal  
 * @param {number} startPos - Starting position
 * @param {number} moduleWidth - Estimated module width in pixels
 * @param {number} numBits - Number of bits to sample
 * @returns {Uint8Array|null} - Sampled bits or null if out of bounds
 */
export function sampleBits(signal, startPos, moduleWidth, numBits) {
  const bits = new Uint8Array(numBits);
  const windowPercent = 0.3; // ±30% sampling window
  
  for (let i = 0; i < numBits; i++) {
    // Calculate nominal center of this module
    const centerPos = startPos + (i + 0.5) * moduleWidth;
    
    // Sample window around center
    const windowSize = Math.max(1, Math.floor(moduleWidth * windowPercent));
    const windowStart = Math.floor(centerPos - windowSize);
    const windowEnd = Math.floor(centerPos + windowSize);
    
    // Check bounds
    if (windowStart < 0 || windowEnd >= signal.length) {
      return null; // Out of bounds
    }
    
    // Average samples in window
    let sum = 0;
    let count = 0;
    for (let j = windowStart; j <= windowEnd; j++) {
      sum += signal[j];
      count++;
    }
    
    // Threshold at 0.5
    bits[i] = (sum / count) >= 0.5 ? 1 : 0;
  }
  
  return bits;
}

/**
 * Detect tag in signal and extract bits
 * Attempts both short and long tag variants
 * 
 * @param {Uint8Array} signal - Binary 1D signal from projection
 * @returns {Object|null} - { bits: Uint8Array, variant: string, moduleWidth: number } or null
 */
export function detectTag(signal) {
  // Find LEFT_GUARD
  const guard = findLeftGuard(signal);
  if (!guard) {
    return null;
  }
  
  const { position, moduleWidth } = guard;
  
  // Try short tag first (20 bits total)
  const shortBits = sampleBits(signal, position, moduleWidth, SHORT_TAG.TOTAL_BITS);
  if (shortBits) {
    // Quick check: verify it starts with LEFT_GUARD pattern
    if (shortBits[0] === 1 && shortBits[1] === 1 && shortBits[2] === 1) {
      // Check ORIENT pattern for short tag (01 at positions 3-4)
      if (shortBits[3] === 0 && shortBits[4] === 1) {
        return {
          bits: shortBits,
          variant: 'short',
          moduleWidth
        };
      }
    }
  }
  
  // Try long tag (28 bits total)
  const longBits = sampleBits(signal, position, moduleWidth, LONG_TAG.TOTAL_BITS);
  if (longBits) {
    // Quick check: verify it starts with LEFT_GUARD pattern
    if (longBits[0] === 1 && longBits[1] === 1 && longBits[2] === 1) {
      // Check ORIENT pattern for long tag (10 at positions 3-4)
      if (longBits[3] === 1 && longBits[4] === 0) {
        return {
          bits: longBits,
          variant: 'long',
          moduleWidth
        };
      }
    }
  }
  
  return null;
}

/**
 * Search for tag in multiple horizontal bands of an image
 * 
 * @param {Uint8Array} binary - Binary image (row-major)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} bandHeight - Height of each scanning band
 * @returns {Object|null} - Detected tag or null
 */
export function searchBands(binary, width, height, bandHeight = 10) {
  // Try multiple horizontal bands
  const step = Math.max(1, Math.floor(bandHeight / 2));
  
  for (let y = 0; y < height - bandHeight; y += step) {
    // Extract band and project to 1D
    const band = new Uint8Array(bandHeight * width);
    for (let by = 0; by < bandHeight; by++) {
      const srcOffset = (y + by) * width;
      const dstOffset = by * width;
      band.set(binary.subarray(srcOffset, srcOffset + width), dstOffset);
    }
    
    // Project vertically
    const projection = new Uint32Array(width);
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let by = 0; by < bandHeight; by++) {
        sum += band[by * width + x];
      }
      projection[x] = sum;
    }
    
    // Normalize and binarize projection
    let max = 0;
    for (let i = 0; i < projection.length; i++) {
      if (projection[i] > max) max = projection[i];
    }
    
    const signal = new Uint8Array(width);
    const threshold = max * 0.5;
    for (let i = 0; i < width; i++) {
      signal[i] = projection[i] >= threshold ? 1 : 0;
    }
    
    // Try to detect tag in this band
    const result = detectTag(signal);
    if (result) {
      return result;
    }
  }
  
  return null;
}
