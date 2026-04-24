/**
 * Frame processing pipeline for TagStrip scanner
 * Coordinates image preprocessing, tag detection, and multi-frame voting
 */

import { toGrayscale } from './binarize.js';
import { searchBandsGrayscale } from './locator.js';
import { decodeBits } from '../core/decoder.js';

/**
 * Process a single frame and attempt tag detection
 *
 * @param {ImageData} imageData - Frame from video/canvas
 * @returns {Object} - { success: boolean, boxId?: number, variant?: string, reason?: string }
 */
export function processFrame(imageData) {
  const { width, height } = imageData;

  // Convert to grayscale (keep full luminance — do NOT binarise globally here;
  // the locator applies a local threshold per band)
  const grayscale = toGrayscale(imageData);

  // Search for tag in horizontal bands using the grayscale signal directly
  const detected = searchBandsGrayscale(grayscale, width, height);
  
  if (!detected) {
    return { success: false, reason: 'NO_GUARD_FOUND' };
  }
  
  // Decode the extracted bits
  const decodeResult = decodeBits(detected.bits);
  
  if (!decodeResult.success) {
    return { 
      success: false, 
      reason: decodeResult.reason || 'DECODE_FAILED'
    };
  }
  
  return {
    success: true,
    boxId: decodeResult.boxId,
    variant: decodeResult.variant
  };
}

/**
 * Multi-frame voting buffer for robust detection
 */
export class VotingBuffer {
  constructor(size = 5) {
    this.size = size;
    this.buffer = [];
  }
  
  /**
   * Add a decode result to the buffer
   * 
   * @param {Object} result - Decode result from processFrame
   */
  add(result) {
    this.buffer.push(result);
    if (this.buffer.length > this.size) {
      this.buffer.shift();
    }
  }
  
  /**
   * Get consensus result if majority agree
   * 
   * @returns {Object|null} - Consensus result or null
   */
  getConsensus() {
    if (this.buffer.length < 3) {
      return null; // Need at least 3 frames
    }
    
    // Count successful decodes by boxId
    const votes = new Map();
    let successCount = 0;
    
    for (const result of this.buffer) {
      if (result.success) {
        successCount++;
        const key = `${result.variant}:${result.boxId}`;
        votes.set(key, (votes.get(key) || 0) + 1);
      }
    }
    
    // Need majority successful decodes
    if (successCount < Math.ceil(this.buffer.length / 2)) {
      return null;
    }
    
    // Find most voted result
    let maxVotes = 0;
    let winner = null;
    
    for (const [key, count] of votes.entries()) {
      if (count > maxVotes) {
        maxVotes = count;
        const [variant, boxId] = key.split(':');
        winner = {
          success: true,
          variant,
          boxId: parseInt(boxId, 10),
          confidence: count / this.buffer.length
        };
      }
    }
    
    // Require at least 60% agreement
    if (winner && winner.confidence >= 0.6) {
      return winner;
    }
    
    return null;
  }
  
  /**
   * Clear the buffer
   */
  clear() {
    this.buffer = [];
  }
  
  /**
   * Get buffer fill level
   * 
   * @returns {number} - Number of frames in buffer
   */
  get length() {
    return this.buffer.length;
  }
}

/**
 * Scanner coordinator class
 * Manages video capture, frame processing, and result callbacks
 */
export class Scanner {
  constructor(videoElement, onResult) {
    this.video = videoElement;
    this.onResult = onResult;
    this.running = false;
    this.canvas = null;
    this.ctx = null;
    this.votingBuffer = new VotingBuffer(5);
    this.frameRequestId = null;
  }
  
  /**
   * Initialize canvas for frame capture
   */
  initCanvas() {
    if (!this.canvas) {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }
  }
  
  /**
   * Start scanning
   */
  start() {
    if (this.running) return;
    
    this.running = true;
    this.initCanvas();
    this.votingBuffer.clear();
    this.processNextFrame();
  }
  
  /**
   * Stop scanning
   */
  stop() {
    this.running = false;
    if (this.frameRequestId) {
      cancelAnimationFrame(this.frameRequestId);
      this.frameRequestId = null;
    }
  }
  
  /**
   * Process next video frame
   */
  processNextFrame() {
    if (!this.running) return;
    
    // Capture frame from video
    if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
      this.ctx.drawImage(this.video, 0, 0);
      
      const imageData = this.ctx.getImageData(
        0, 0, 
        this.canvas.width, 
        this.canvas.height
      );
      
      // Process frame
      const result = processFrame(imageData);
      
      // Add to voting buffer
      this.votingBuffer.add(result);
      
      // Check for consensus
      const consensus = this.votingBuffer.getConsensus();
      if (consensus && this.onResult) {
        this.onResult(consensus);
        // Clear buffer after successful decode
        this.votingBuffer.clear();
      }
    }
    
    // Schedule next frame
    this.frameRequestId = requestAnimationFrame(() => this.processNextFrame());
  }
}

/**
 * Create a scanner instance
 * 
 * @param {HTMLVideoElement} videoElement - Video element with camera stream
 * @param {Function} onResult - Callback for scan results
 * @returns {Scanner}
 */
export function createScanner(videoElement, onResult) {
  return new Scanner(videoElement, onResult);
}
