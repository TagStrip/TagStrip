import { describe, it, expect } from 'vitest';
import { computeCRC, verifyCRC } from '../../src/core/crc.js';
import { SHORT_TAG, LONG_TAG } from '../../src/core/constants.js';

describe('CRC-3 computation', () => {
  it('computes CRC-3 for all zeros', () => {
    const bits = new Uint8Array(10).fill(0);
    const crc = computeCRC(bits, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    expect(crc.length).toBe(3);
    expect(Array.from(crc)).toEqual([0, 0, 0]);
  });
  
  it('computes CRC-3 for all ones', () => {
    const bits = new Uint8Array(10).fill(1);
    const crc = computeCRC(bits, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    expect(crc.length).toBe(3);
    // CRC of all 1s should not be all zeros
    expect(Array.from(crc)).not.toEqual([0, 0, 0]);
  });
  
  it('computes different CRCs for different inputs', () => {
    const bits1 = new Uint8Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 0]); // 42
    const bits2 = new Uint8Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 1]); // 43
    
    const crc1 = computeCRC(bits1, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    const crc2 = computeCRC(bits2, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    
    expect(Array.from(crc1)).not.toEqual(Array.from(crc2));
  });
});

describe('CRC-4 computation', () => {
  it('computes CRC-4 for all zeros', () => {
    const bits = new Uint8Array(16).fill(0);
    const crc = computeCRC(bits, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS);
    expect(crc.length).toBe(4);
    expect(Array.from(crc)).toEqual([0, 0, 0, 0]);
  });
  
  it('computes CRC-4 for all ones', () => {
    const bits = new Uint8Array(16).fill(1);
    const crc = computeCRC(bits, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS);
    expect(crc.length).toBe(4);
    expect(Array.from(crc)).not.toEqual([0, 0, 0, 0]);
  });
});

describe('CRC verification', () => {
  it('verifies correct CRC-3', () => {
    const bits = new Uint8Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 0]); // 42
    const crc = computeCRC(bits, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    const valid = verifyCRC(bits, crc, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    expect(valid).toBe(true);
  });
  
  it('rejects incorrect CRC-3', () => {
    const bits = new Uint8Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 0]); // 42
    const wrongCrc = new Uint8Array([1, 1, 1]); // wrong CRC
    const valid = verifyCRC(bits, wrongCrc, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    expect(valid).toBe(false);
  });
  
  it('verifies correct CRC-4', () => {
    const bits = new Uint8Array(16).fill(0);
    bits[15] = 1; // ID = 1
    const crc = computeCRC(bits, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS);
    const valid = verifyCRC(bits, crc, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS);
    expect(valid).toBe(true);
  });
  
  it('rejects incorrect CRC-4', () => {
    const bits = new Uint8Array(16).fill(0);
    bits[15] = 1; // ID = 1
    const wrongCrc = new Uint8Array([1, 1, 1, 1]); // wrong CRC
    const valid = verifyCRC(bits, wrongCrc, LONG_TAG.CRC_POLYNOMIAL, LONG_TAG.CRC_BITS);
    expect(valid).toBe(false);
  });

  it('rejects CRC with wrong length', () => {
    const bits = new Uint8Array([0, 0, 0, 0, 1, 0, 1, 0, 1, 0]); // 42
    const crc = computeCRC(bits, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS); // 3 bits
    const wrongLengthCrc = new Uint8Array([crc[0], crc[1]]); // 2 bits instead of 3
    const valid = verifyCRC(bits, wrongLengthCrc, SHORT_TAG.CRC_POLYNOMIAL, SHORT_TAG.CRC_BITS);
    expect(valid).toBe(false);
  });
});
