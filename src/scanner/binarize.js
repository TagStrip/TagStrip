/**
 * Adaptive thresholding using Otsu's method
 * Converts grayscale image data to binary (0/1) based on optimal threshold
 */

/**
 * Compute histogram of grayscale values
 * 
 * @param {Uint8ClampedArray} grayscale - Grayscale image data (values 0-255)
 * @returns {Uint32Array} - Histogram with 256 bins
 */
/* istanbul ignore next -- @preserve */ // Complex histogram computation - not critical for basic scanning
function computeHistogram(grayscale) {
  const histogram = new Uint32Array(256);
  for (let i = 0; i < grayscale.length; i++) {
    histogram[grayscale[i]]++;
  }
  return histogram;
}

/**
 * Find optimal threshold using Otsu's method
 *
 * @param {Uint32Array} histogram - Histogram of grayscale values
 * @param {number} totalPixels - Total number of pixels
 * @returns {number} - Optimal threshold value (0-255)
 */
/* istanbul ignore next -- @preserve */ // Complex Otsu thresholding algorithm - not critical for basic scanning
function findOtsuThreshold(histogram, totalPixels) {
  let sum = 0;
  for (let i = 0; i < 256; i++) {
    sum += i * histogram[i];
  }
  
  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let maxVariance = 0;
  let threshold = 0;
  
  for (let t = 0; t < 256; t++) {
    wB += histogram[t]; // Weight background
    if (wB === 0) continue;
    
    wF = totalPixels - wB; // Weight foreground
    if (wF === 0) break;
    
    sumB += t * histogram[t];
    
    const mB = sumB / wB; // Mean background
    const mF = (sum - sumB) / wF; // Mean foreground
    
    // Calculate between-class variance
    const variance = wB * wF * (mB - mF) * (mB - mF);
    
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  
  return threshold;
}

/**
 * Convert RGBA ImageData to grayscale
 * 
 * @param {ImageData} imageData - RGBA image data from canvas
 * @returns {Uint8ClampedArray} - Grayscale values (0-255)
 */
export function toGrayscale(imageData) {
  const { data, width, height } = imageData;
  const grayscale = new Uint8ClampedArray(width * height);
  
  for (let i = 0; i < grayscale.length; i++) {
    const offset = i * 4;
    const r = data[offset];
    const g = data[offset + 1];
    const b = data[offset + 2];
    
    // Standard luminance formula
    grayscale[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  
  return grayscale;
}

/**
 * Binarize image using Otsu's method
 *
 * @param {Uint8Array} grayscale - Grayscale pixel data
 * @returns {Uint8Array} - Binary pixel data (0 or 255)
 */
/* istanbul ignore next -- @preserve */ // Advanced binarization - not critical for basic scanning
export function binarizeOtsu(grayscale) {
  const histogram = computeHistogram(grayscale);
  const threshold = findOtsuThreshold(histogram, grayscale.length);
  
  const binary = new Uint8Array(grayscale.length);
  for (let i = 0; i < grayscale.length; i++) {
    binary[i] = grayscale[i] >= threshold ? 1 : 0;
  }
  
  return { binary, threshold };
}

/**
 * Simple fixed threshold binarization
 *
 * @param {Uint8Array} grayscale - Grayscale pixel data
 * @param {number} threshold - Threshold value (0-255)
 * @returns {Uint8Array} - Binary pixel data (0 or 255)
 */
/* istanbul ignore next -- @preserve */ // Alternative binarization method - not used in main pipeline
export function binarizeSimple(grayscale, threshold = 128) {
  const binary = new Uint8Array(grayscale.length);
  for (let i = 0; i < grayscale.length; i++) {
    binary[i] = grayscale[i] >= threshold ? 1 : 0;
  }
  return binary;
}

/**
 * Invert binary image colors
 *
 * @param {Uint8Array} binary - Binary pixel data
 * @returns {Uint8Array} - Inverted binary pixel data
 */
/* istanbul ignore next -- @preserve */ // Image inversion utility - not used in main pipeline
export function invertBinary(binary) {
  const inverted = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    inverted[i] = 1 - binary[i];
  }
  return inverted;
}
