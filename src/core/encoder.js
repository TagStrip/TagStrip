import { computeCRC } from './crc.js';
import {
  SHORT_TAG,
  LONG_TAG,
  SHORT_MAX_ID,
  LONG_MAX_ID,
  DEFAULT_DARK_CHAR,
  DEFAULT_LIGHT_CHAR
} from './constants.js';

/**
 * Encode a box ID into a TagStrip code string
 * 
 * @param {number} boxId - The ID to encode (0 to MAX_ID)
 * @param {string} variant - Tag variant: 'short' or 'long'
 * @param {Object} options - Encoding options
 * @param {string} options.darkChar - Character for bit 1 (default: '#')
 * @param {string} options.lightChar - Character for bit 0 (default: '.')
 * @returns {string} - The encoded TagStrip string
 */
export function encode(boxId, variant = 'long', options = {}) {
  const darkChar = options.darkChar || DEFAULT_DARK_CHAR;
  const lightChar = options.lightChar || DEFAULT_LIGHT_CHAR;
  
  // Validate variant
  if (variant !== 'short' && variant !== 'long') {
    throw new Error(`Invalid variant: ${variant}. Must be 'short' or 'long'.`);
  }
  
  const config = variant === 'short' ? SHORT_TAG : LONG_TAG;
  
  // Validate boxId range
  if (boxId < 0 || boxId > config.MAX_ID) {
    throw new Error(`boxId ${boxId} out of range for ${variant} tag (0-${config.MAX_ID})`);
  }
  
  if (!Number.isInteger(boxId)) {
    throw new Error(`boxId must be an integer, got ${boxId}`);
  }
  
  // Build the bitstream
  const bits = [];
  
  // 1. LEFT_GUARD
  bits.push(...config.LEFT_GUARD);
  
  // 2. ORIENT
  bits.push(...config.ORIENT);
  
  // 3. PAYLOAD - convert boxId to binary (MSB first)
  const payloadBits = new Uint8Array(config.PAYLOAD_BITS);
  for (let i = 0; i < config.PAYLOAD_BITS; i++) {
    const bitPos = config.PAYLOAD_BITS - 1 - i;
    payloadBits[i] = (boxId >> bitPos) & 1;
  }
  bits.push(...payloadBits);
  
  // 4. CRC - compute over payload
  const crcBits = computeCRC(payloadBits, config.CRC_POLYNOMIAL, config.CRC_BITS);
  bits.push(...crcBits);
  
  // 5. RIGHT_GUARD
  bits.push(...config.RIGHT_GUARD);
  
   // Verify total length
  /* istanbul ignore next */ // Unreachable: bits array is built correctly above
  if (bits.length !== config.TOTAL_BITS) {
    throw new Error(`Internal error: expected ${config.TOTAL_BITS} bits, got ${bits.length}`);
  }
  
  // Convert bits to string
  return bits.map(bit => bit === 1 ? darkChar : lightChar).join('');
}

/**
 * Helper to convert a string representation back to bits (for testing)
 * 
 * @param {string} str - The encoded string
 * @param {string} darkChar - Character representing bit 1
 * @param {string} lightChar - Character representing bit 0
 * @returns {Uint8Array} - Array of 0/1 values
 */
export function stringToBits(str, darkChar = DEFAULT_DARK_CHAR, lightChar = DEFAULT_LIGHT_CHAR) {
  const bits = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    if (str[i] === darkChar) {
      bits[i] = 1;
    } else if (str[i] === lightChar) {
      bits[i] = 0;
    } else {
      throw new Error(`Unexpected character '${str[i]}' at position ${i}`);
    }
  }
  return bits;
}
