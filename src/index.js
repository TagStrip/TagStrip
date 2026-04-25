// Public API for TagStrip library

export { encode } from './core/encoder.js';
export { decodeBits } from './core/decoder.js';

export { SHORT_MAX_ID, LONG_MAX_ID } from './core/constants.js';

export { toGrayscale, binarizeOtsu, binarizeSimple } from './scanner/binarize.js';
export {
  detectTagInSignal,
  searchBandsGrayscale,
  searchBands,
} from './scanner/locator.js';
export { processFrame, VotingBuffer, Scanner, createScanner } from './scanner/pipeline.js';
