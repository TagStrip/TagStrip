import { describe, it, expect } from 'vitest';
import { encode, stringToBits } from '../../src/core/encoder.js';
import { decodeBits } from '../../src/core/decoder.js';
import { SHORT_TAG, LONG_TAG } from '../../src/core/constants.js';

describe('decodeBits — CRC rejection', () => {
  it('rejects single flipped bit in short tag payload', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Flip first payload bit (position 5)
    bits[5] ^= 1;
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
  });
  
  it('rejects every single flipped payload bit in short tag', () => {
    const str = encode(42, 'short');
    const originalBits = stringToBits(str);
    
    // Test flipping each payload bit (positions 5-14)
    for (let i = 5; i <= 14; i++) {
      const bits = new Uint8Array(originalBits);
      bits[i] ^= 1; // Flip bit
      
      const result = decodeBits(bits);
      expect(result.success).toBe(false, `Flipped bit at position ${i} should be rejected`);
    }
  });
  
  it('rejects single flipped bit in long tag payload', () => {
    const str = encode(1024, 'long');
    const bits = stringToBits(str);
    
    // Flip first payload bit (position 5)
    bits[5] ^= 1;
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
  });
  
  it('rejects flipped CRC bit', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Flip first CRC bit (position 15)
    bits[15] ^= 1;
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
  });
});

describe('decodeBits — guard pattern validation', () => {
  it('rejects corrupted left guard', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Corrupt left guard (first bit)
    bits[0] = 0;
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('NO_GUARD_FOUND');
  });
  
  it('rejects corrupted right guard', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Corrupt right guard (last bit)
    bits[19] = 0;
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
  });
  
  it('rejects corrupted orientation pattern', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Corrupt ORIENT (position 3)
    bits[3] = 1; // Change from 0 to 1
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
  });
});

describe('decodeBits — reversed scan handling', () => {
  it('decodes reversed short tag correctly', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    
    // Reverse the bits
    const reversed = new Uint8Array(bits.length);
    for (let i = 0; i < bits.length; i++) {
      reversed[i] = bits[bits.length - 1 - i];
    }
    
    const result = decodeBits(reversed);
    expect(result.success).toBe(true);
    expect(result.boxId).toBe(42);
  });
  
  it('decodes reversed long tag correctly', () => {
    const str = encode(1024, 'long');
    const bits = stringToBits(str);
    
    // Reverse the bits
    const reversed = new Uint8Array(bits.length);
    for (let i = 0; i < bits.length; i++) {
      reversed[i] = bits[bits.length - 1 - i];
    }
    
    const result = decodeBits(reversed);
    expect(result.success).toBe(true);
    expect(result.boxId).toBe(1024);
  });
});

describe('decodeBits — error reasons', () => {
  it('returns EMPTY_BITSTREAM for empty input', () => {
    const result = decodeBits(new Uint8Array(0));
    expect(result.success).toBe(false);
    expect(result.reason).toBe('EMPTY_BITSTREAM');
  });
  
  it('returns INVALID_LENGTH for wrong bit count', () => {
    const result = decodeBits(new Uint8Array(15)); // Wrong length
    expect(result.success).toBe(false);
    expect(result.reason).toBe('INVALID_LENGTH');
  });
  
  it('returns CRC_MISMATCH for corrupted data', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    bits[10] ^= 1; // Flip a payload bit
    
    const result = decodeBits(bits);
    expect(result.success).toBe(false);
    expect(result.reason).toBe('CRC_MISMATCH');
  });
});

describe('decodeBits — edge cases', () => {
  it('decodes ID 0 correctly', () => {
    const str = encode(0, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.boxId).toBe(0);
  });
  
  it('decodes max short ID correctly', () => {
    const str = encode(1023, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.boxId).toBe(1023);
  });
  
  it('decodes max long ID correctly', () => {
    const str = encode(65535, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.boxId).toBe(65535);
  });
});

describe('decodeBits — variant detection', () => {
  it('correctly identifies short tag variant', () => {
    const str = encode(42, 'short');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('short');
  });
  
  it('correctly identifies long tag variant', () => {
    const str = encode(1024, 'long');
    const bits = stringToBits(str);
    const result = decodeBits(bits);
    expect(result.success).toBe(true);
    expect(result.variant).toBe('long');
  });
  
  it('distinguishes short from long by orientation bits', () => {
    const shortStr = encode(0, 'short');
    const longStr = encode(0, 'long');
    
    const shortBits = stringToBits(shortStr);
    const longBits = stringToBits(longStr);
    
    // Verify ORIENT patterns are different
    expect(shortBits[3]).not.toBe(longBits[3]);
    expect(shortBits[4]).not.toBe(longBits[4]);
  });
});
