import { verifyCRC } from './crc.js';
import {
  SHORT_TAG,
  LONG_TAG,
  SHORT_LAYOUT,
  LONG_LAYOUT
} from './constants.js';

/**
 * Check if a bit array matches a pattern
 * 
 * @param {Uint8Array} bits - The bit array to check
 * @param {number} startIndex - Starting position
 * @param {Array<number>} pattern - Expected pattern
 * @returns {boolean}
 */
function matchesPattern(bits, startIndex, pattern) {
  /* istanbul ignore next */ // Defensive check: startIndex is always valid from constants
  if (startIndex + pattern.length > bits.length) {
    return false;
  }
  
  for (let i = 0; i < pattern.length; i++) {
    if (bits[startIndex + i] !== pattern[i]) {
      return false;
    }
  }
  
  return true;
}

/**
 * Extract a slice of bits as a Uint8Array
 * 
 * @param {Uint8Array} bits - Source bits
 * @param {number} start - Start index (inclusive)
 * @param {number} end - End index (inclusive)
 * @returns {Uint8Array}
 */
function extractBits(bits, start, end) {
  const length = end - start + 1;
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = bits[start + i];
  }
  return result;
}

/**
 * Convert payload bits to integer (MSB first)
 * 
 * @param {Uint8Array} payloadBits
 * @returns {number}
 */
function bitsToInteger(payloadBits) {
  let value = 0;
  for (let i = 0; i < payloadBits.length; i++) {
    value = (value << 1) | payloadBits[i];
  }
  return value;
}

/**
 * Attempt to decode as a short tag
 * 
 * @param {Uint8Array} bits
 * @returns {Object|null} - { success: true, variant: 'short', boxId: number } or null
 */
function decodeShort(bits) {
  /* istanbul ignore next */ // Unreachable: only called when length matches
  if (bits.length !== SHORT_TAG.TOTAL_BITS) {
    return null;
  }
  
  // Verify LEFT_GUARD
  if (!matchesPattern(bits, SHORT_LAYOUT.LEFT_GUARD_START, SHORT_TAG.LEFT_GUARD)) {
    return null;
  }
  
  // Verify ORIENT
  if (!matchesPattern(bits, SHORT_LAYOUT.ORIENT_START, SHORT_TAG.ORIENT)) {
    return null;
  }
  
  // Verify RIGHT_GUARD
  if (!matchesPattern(bits, SHORT_LAYOUT.RIGHT_GUARD_START, SHORT_TAG.RIGHT_GUARD)) {
    return null;
  }
  
  // Extract payload
  const payloadBits = extractBits(bits, SHORT_LAYOUT.PAYLOAD_START, SHORT_LAYOUT.PAYLOAD_END);
  
  // Extract CRC
  const crcBits = extractBits(bits, SHORT_LAYOUT.CRC_START, SHORT_LAYOUT.CRC_END);
  
  // Verify CRC
  if (!verifyCRC(payloadBits, crcBits, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS)) {
    return null;
  }
  
  // Decode payload to integer
  const boxId = bitsToInteger(payloadBits);
  
  return {
    success: true,
    variant: 'short',
    boxId
  };
}

/**
 * Attempt to decode as a long tag
 * 
 * @param {Uint8Array} bits
 * @returns {Object|null} - { success: true, variant: 'long', boxId: number } or null
 */
function decodeLong(bits) {
  /* istanbul ignore next */ // Unreachable: only called when length matches
  if (bits.length !== LONG_TAG.TOTAL_BITS) {
    return null;
  }
  
  // Verify LEFT_GUARD
  if (!matchesPattern(bits, LONG_LAYOUT.LEFT_GUARD_START, LONG_TAG.LEFT_GUARD)) {
    return null;
  }
  
  // Verify ORIENT
  if (!matchesPattern(bits, LONG_LAYOUT.ORIENT_START, LONG_TAG.ORIENT)) {
    return null;
  }
  
  // Verify RIGHT_GUARD
  if (!matchesPattern(bits, LONG_LAYOUT.RIGHT_GUARD_START, LONG_TAG.RIGHT_GUARD)) {
    return null;
  }
  
  // Extract payload
  const payloadBits = extractBits(bits, LONG_LAYOUT.PAYLOAD_START, LONG_LAYOUT.PAYLOAD_END);
  
  // Extract CRC
  const crcBits = extractBits(bits, LONG_LAYOUT.CRC_START, LONG_LAYOUT.CRC_END);
  
  // Verify CRC
  if (!verifyCRC(payloadBits, crcBits, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS)) {
    return null;
  }
  
  // Decode payload to integer
  const boxId = bitsToInteger(payloadBits);
  
  return {
    success: true,
    variant: 'long',
    boxId
  };
}

/**
 * Decode a TagStrip bitstream
 * 
 * @param {Uint8Array} bits - Array of 0/1 values
 * @returns {Object} - { success: boolean, variant?: string, boxId?: number, reason?: string }
 */
export function decodeBits(bits) {
  if (!bits || bits.length === 0) {
    return { success: false, reason: 'EMPTY_BITSTREAM' };
  }
  
  // Try short tag first
  if (bits.length === SHORT_TAG.TOTAL_BITS) {
    const result = decodeShort(bits);
    if (result) {
      return result;
    }
  }
  
  // Try long tag
  if (bits.length === LONG_TAG.TOTAL_BITS) {
    const result = decodeLong(bits);
    if (result) {
      return result;
    }
  }
  
  // Try reversed (handle scan from right to left)
  const reversed = new Uint8Array(bits.length);
  for (let i = 0; i < bits.length; i++) {
    reversed[i] = bits[bits.length - 1 - i];
  }
  
  if (reversed.length === SHORT_TAG.TOTAL_BITS) {
    const result = decodeShort(reversed);
    if (result) {
      return result;
    }
  }
  
  if (reversed.length === LONG_TAG.TOTAL_BITS) {
    const result = decodeLong(reversed);
    if (result) {
      return result;
    }
  }
  
  // Determine failure reason
  if (bits.length !== SHORT_TAG.TOTAL_BITS && bits.length !== LONG_TAG.TOTAL_BITS) {
    return { success: false, reason: 'INVALID_LENGTH' };
  }
  
  // Check guards
  const hasLeftGuard = matchesPattern(bits, 0, SHORT_TAG.LEFT_GUARD) || 
                       matchesPattern(bits, 0, LONG_TAG.LEFT_GUARD);
  
  if (!hasLeftGuard) {
    return { success: false, reason: 'NO_GUARD_FOUND' };
  }
  
  // If we got here, likely a CRC mismatch
  return { success: false, reason: 'CRC_MISMATCH' };
}
