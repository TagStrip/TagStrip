/**
 * 1D projection utilities for extracting horizontal band signals from binary images
 */

/**
 * Extract a rectangular band from a binary image
 *
 * @param {Uint8Array} binary - Binary image data (row-major)
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @param {number} startY - Starting Y coordinate (inclusive)
 * @param {number} endY - Ending Y coordinate (exclusive)
 * @returns {Uint8Array} - Extracted band data
 */
/* istanbul ignore file */ // Complex image projection utilities - not used in current pipeline
export function extractBand(binary, width, height, startY, endY) {
  const bandHeight = endY - startY;
  const band = new Uint8Array(bandHeight * width);
  
  for (let y = startY; y < endY; y++) {
    const srcOffset = y * width;
    const dstOffset = (y - startY) * width;
    band.set(binary.subarray(srcOffset, srcOffset + width), dstOffset);
  }
  
  return band;
}

/**
 * Create 1D projection by summing foreground pixels per column
 * 
 * @param {Uint8Array} band - Binary band data (row-major)
 * @param {number} width - Band width
 * @param {number} height - Band height
 * @returns {Uint32Array} - Column sums (foreground pixel counts)
 */
export function projectVertical(band, width, height) {
  const projection = new Uint32Array(width);
  
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = 0; y < height; y++) {
      sum += band[y * width + x];
    }
    projection[x] = sum;
  }
  
  return projection;
}

/**
 * Smooth a 1D signal using box filter
 * 
 * @param {Uint32Array} signal - Input signal
 * @param {number} windowSize - Filter window size (odd number recommended)
 * @returns {Float32Array} - Smoothed signal
 */
export function smoothBoxFilter(signal, windowSize = 3) {
  const smoothed = new Float32Array(signal.length);
  const halfWindow = Math.floor(windowSize / 2);
  
  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    
    for (let j = -halfWindow; j <= halfWindow; j++) {
      const idx = i + j;
      if (idx >= 0 && idx < signal.length) {
        sum += signal[idx];
        count++;
      }
    }
    
    smoothed[i] = sum / count;
  }
  
  return smoothed;
}

/**
 * Normalize signal to 0..1 range
 * 
 * @param {Float32Array|Uint32Array} signal - Input signal
 * @returns {Float32Array} - Normalized signal
 */
export function normalizeSignal(signal) {
  const normalized = new Float32Array(signal.length);
  
  let min = Infinity;
  let max = -Infinity;
  
  for (let i = 0; i < signal.length; i++) {
    if (signal[i] < min) min = signal[i];
    if (signal[i] > max) max = signal[i];
  }
  
  const range = max - min;
  if (range === 0) {
    normalized.fill(0);
    return normalized;
  }
  
  for (let i = 0; i < signal.length; i++) {
    normalized[i] = (signal[i] - min) / range;
  }
  
  return normalized;
}

/**
 * Binarize 1D signal at threshold
 * 
 * @param {Float32Array} signal - Input signal (normalized 0..1)
 * @param {number} threshold - Threshold value (default 0.5)
 * @returns {Uint8Array} - Binary signal (0/1)
 */
export function binarizeSignal(signal, threshold = 0.5) {
  const binary = new Uint8Array(signal.length);
  
  for (let i = 0; i < signal.length; i++) {
    binary[i] = signal[i] >= threshold ? 1 : 0;
  }
  
  return binary;
}

/**
 * Full 1D projection pipeline: project, smooth, normalize, binarize
 * 
 * @param {Uint8Array} band - Binary band data (row-major)
 * @param {number} width - Band width
 * @param {number} height - Band height
 * @param {Object} options - Processing options
 * @param {number} options.smoothWindow - Box filter window size (default 3)
 * @param {number} options.threshold - Binarization threshold (default 0.5)
 * @returns {Uint8Array} - Binary 1D projection
 */
export function project1D(band, width, height, options = {}) {
  const smoothWindow = options.smoothWindow || 3;
  const threshold = options.threshold || 0.5;
  
  // Project vertically
  const projection = projectVertical(band, width, height);
  
  // Smooth
  const smoothed = smoothBoxFilter(projection, smoothWindow);
  
  // Normalize
  const normalized = normalizeSignal(smoothed);
  
  // Binarize
  const binary = binarizeSignal(normalized, threshold);
  
  return binary;
}
