import { describe, it, expect } from 'vitest';
import { encode, stringToBits } from '../../src/core/encoder.js';
import { decodeBits } from '../../src/core/decoder.js';
import { SHORT_MAX_ID, LONG_MAX_ID, SHORT_TAG, LONG_TAG } from '../../src/core/constants.js';

describe('encode — short tag', () => {
  it('encodes ID 0 with explicit short variant', () => {
    const str = encode(0, 'short');
    expect(str).toBeDefined();
    expect(str.length).toBe(SHORT_TAG.TOTAL_BITS);
    expect(str.startsWith('###.#')).toBe(true); // LEFT_GUARD + ORIENT = 11101
  });

  it('uses default long variant when not specified', () => {
    const str = encode(0); // Uses default 'long' variant
    expect(str).toBeDefined();
    expect(str.length).toBe(LONG_TAG.TOTAL_BITS);
    expect(str.startsWith('####.')).toBe(true); // LEFT_GUARD + ORIENT = 11110 for long
  });
  
  it('encodes ID 1', () => {
    const str = encode(1, 'short');
    expect(str).toBeDefined();
    expect(str.length).toBe(SHORT_TAG.TOTAL_BITS);
  });
  
  it('encodes ID 42', () => {
    const str = encode(42, 'short');
    expect(str).toBeDefined();
    expect(str.length).toBe(SHORT_TAG.TOTAL_BITS);
  });
  
  it('encodes max ID', () => {
    const str = encode(SHORT_MAX_ID, 'short');
    expect(str).toBeDefined();
    expect(str.length).toBe(SHORT_TAG.TOTAL_BITS);
  });
  
  it('throws on negative ID', () => {
    expect(() => encode(-1, 'short')).toThrow();
  });
  
  it('throws on ID too large', () => {
    expect(() => encode(SHORT_MAX_ID + 1, 'short')).toThrow();
  });
  
  it('throws on non-integer ID', () => {
    expect(() => encode(3.14, 'short')).toThrow();
  });

  it('throws on invalid variant', () => {
    expect(() => encode(42, 'invalid')).toThrow('Invalid variant: invalid. Must be \'short\' or \'long\'.');
  });

  it('supports custom characters', () => {
    const str = encode(0, 'short', { darkChar: '■', lightChar: '·' });
    expect(str).toBeDefined();
    expect(str.includes('#')).toBe(false);
    expect(str.includes('.')).toBe(false);
  });

  it('stringToBits throws on unexpected character', () => {
    expect(() => stringToBits('#.#X#')).toThrow('Unexpected character \'X\' at position 3');
  });
});

describe('encode — long tag', () => {
  it('encodes ID 0', () => {
    const str = encode(0, 'long');
    expect(str).toBeDefined();
    expect(str.length).toBe(LONG_TAG.TOTAL_BITS);
    expect(str.startsWith('####.')).toBe(true); // LEFT_GUARD + ORIENT = 111 + 10 = 11110
  });
  
  it('encodes ID 1', () => {
    const str = encode(1, 'long');
    expect(str).toBeDefined();
    expect(str.length).toBe(LONG_TAG.TOTAL_BITS);
  });
  
  it('encodes ID 1024', () => {
    const str = encode(1024, 'long');
    expect(str).toBeDefined();
    expect(str.length).toBe(LONG_TAG.TOTAL_BITS);
  });
  
  it('encodes max ID', () => {
    const str = encode(LONG_MAX_ID, 'long');
    expect(str).toBeDefined();
    expect(str.length).toBe(LONG_TAG.TOTAL_BITS);
  });
  
  it('throws on negative ID', () => {
    expect(() => encode(-1, 'long')).toThrow();
  });
  
  it('throws on ID too large', () => {
    expect(() => encode(LONG_MAX_ID + 1, 'long')).toThrow();
  });
});

describe('encoder/decoder round-trip — short tag', () => {
  it('round-trips ID 0', () => {
    const str = encode(0, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('short');
    expect(result.boxId).toBe(0);
  });
  
  it('round-trips ID 1', () => {
    const str = encode(1, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('short');
    expect(result.boxId).toBe(1);
  });
  
  it('round-trips ID 42', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('short');
    expect(result.boxId).toBe(42);
  });
  
  it('round-trips max ID', () => {
    const str = encode(SHORT_MAX_ID, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('short');
    expect(result.boxId).toBe(SHORT_MAX_ID);
  });
  
  it('round-trips all short IDs', () => {
    for (let id = 0; id <= SHORT_MAX_ID; id++) {
      const str = encode(id, 'short');
      const bits = stringToBits(str);
      const result = decodeBits(bits);
      expect(result.success).toBe(true);
      expect(result.boxId).toBe(id);
    }
  });
});

describe('encoder/decoder round-trip — long tag', () => {
  it('round-trips ID 0', () => {
    const str = encode(0, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('long');
    expect(result.boxId).toBe(0);
  });
  
  it('round-trips ID 1', () => {
    const str = encode(1, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('long');
    expect(result.boxId).toBe(1);
  });
  
  it('round-trips ID 1024', () => {
    const str = encode(1024, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('long');
    expect(result.boxId).toBe(1024);
  });
  
  it('round-trips max ID', () => {
    const str = encode(LONG_MAX_ID, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('long');
    expect(result.boxId).toBe(LONG_MAX_ID);
  });
  
  it('round-trips sampled long IDs', () => {
    // Test every 64th ID to keep test time reasonable
    for (let id = 0; id <= LONG_MAX_ID; id += 64) {
      const str = encode(id, 'long');
      const bits = stringToBits(str);
      const result = decodeBits(bits);
      expect(result.success).toBe(true);
      expect(result.boxId).toBe(id);
    }
  });
});

describe('deterministic encoding', () => {
  it('produces same output for same input', () => {
    const str1 = encode(42, 'short');
    const str2 = encode(42, 'short');
    expect(str1).toBe(str2);
  });
  
  it('produces different outputs for different IDs', () => {
    const str1 = encode(42, 'short');
    const str2 = encode(43, 'short');
    expect(str1).not.toBe(str2);
  });
});
