/**
 * Generic CRC computation using binary polynomial division
 * 
 * @param {Uint8Array} bits - Array of 0/1 values representing the data bits
 * @param {number} polynomial - CRC polynomial as an integer (e.g., 0b1011 for CRC-3)
 * @param {number} crcBits - Number of CRC bits (3 or 4)
 * @returns {Uint8Array} - Array of CRC bits
 */
export function computeCRC(bits, polynomial, crcBits) {
  // Create extended bit array: original bits + crcBits zeros
  const extended = new Uint8Array(bits.length + crcBits);
  extended.set(bits);
  
  // Get the bit length of the polynomial
  const polyBitLength = crcBits + 1;
  
  // Perform polynomial division
  for (let i = 0; i < bits.length; i++) {
    // If current bit is 1, XOR with polynomial
    if (extended[i] === 1) {
      for (let j = 0; j < polyBitLength; j++) {
        const polyBit = (polynomial >> (crcBits - j)) & 1;
        extended[i + j] ^= polyBit;
      }
    }
  }
  
  // The remainder (last crcBits) is the CRC
  const crc = new Uint8Array(crcBits);
  for (let i = 0; i < crcBits; i++) {
    crc[i] = extended[bits.length + i];
  }
  
  return crc;
}

/**
 * Verify CRC for a given bitstream
 * 
 * @param {Uint8Array} dataBits - The payload bits
 * @param {Uint8Array} crcBits - The CRC bits to verify
 * @param {number} polynomial - CRC polynomial
 * @param {number} crcBitCount - Number of CRC bits
 * @returns {boolean} - True if CRC is valid
 */
export function verifyCRC(dataBits, crcBits, polynomial, crcBitCount) {
  const computed = computeCRC(dataBits, polynomial, crcBitCount);
  
  if (computed.length !== crcBits.length) {
    return false;
  }
  
  for (let i = 0; i < computed.length; i++) {
    if (computed[i] !== crcBits[i]) {
      return false;
    }
  }
  
  return true;
}
