// Character encoding defaults
export const DEFAULT_DARK_CHAR  = '#';
export const DEFAULT_LIGHT_CHAR = '.';

// Short tag specification (20 bits total)
export const SHORT_TAG = {
  TOTAL_BITS: 20,
  LEFT_GUARD: [1, 1, 1],           // 3 bits: 111
  ORIENT: [0, 1],                   // 2 bits: 01
  PAYLOAD_BITS: 10,                 // 10 bits payload
  CRC_BITS: 3,                      // 3 bits CRC
  RIGHT_GUARD: [1, 1],              // 2 bits: 11
  CRC_POLYNOMIAL: 0b1011,           // x^3 + x + 1
  MAX_ID: 1023                      // 2^10 - 1
};

// Long tag specification (28 bits total)
export const LONG_TAG = {
  TOTAL_BITS: 28,
  LEFT_GUARD: [1, 1, 1],           // 3 bits: 111
  ORIENT: [1, 0],                   // 2 bits: 10
  PAYLOAD_BITS: 16,                 // 16 bits payload
  CRC_BITS: 4,                      // 4 bits CRC
  RIGHT_GUARD: [1, 1, 1],           // 3 bits: 111
  CRC_POLYNOMIAL: 0b10011,          // x^4 + x + 1 (CRC-4-ITU)
  MAX_ID: 65535                     // 2^16 - 1
};

// Bit layout indices for short tag
export const SHORT_LAYOUT = {
  LEFT_GUARD_START: 0,
  LEFT_GUARD_END: 2,
  ORIENT_START: 3,
  ORIENT_END: 4,
  PAYLOAD_START: 5,
  PAYLOAD_END: 14,
  CRC_START: 15,
  CRC_END: 17,
  RIGHT_GUARD_START: 18,
  RIGHT_GUARD_END: 19
};

// Bit layout indices for long tag
export const LONG_LAYOUT = {
  LEFT_GUARD_START: 0,
  LEFT_GUARD_END: 2,
  ORIENT_START: 3,
  ORIENT_END: 4,
  PAYLOAD_START: 5,
  PAYLOAD_END: 20,
  CRC_START: 21,
  CRC_END: 24,
  RIGHT_GUARD_START: 25,
  RIGHT_GUARD_END: 27
};

// Helper to get max ID for variant
export const SHORT_MAX_ID = SHORT_TAG.MAX_ID;
export const LONG_MAX_ID = LONG_TAG.MAX_ID;
