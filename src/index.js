// Public API for TagStrip library

// Core encoding/decoding functions
export { encode } from './core/encoder.js';
export { decodeBits } from './core/decoder.js';

// Constants for external use
export { SHORT_MAX_ID, LONG_MAX_ID } from './core/constants.js';

// Scanner API (browser only)
// Note: Scanner modules are not exported here as they require browser APIs
// They will be imported separately when needed in browser environments
