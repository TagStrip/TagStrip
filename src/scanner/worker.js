/**
 * Web Worker for TagStrip frame processing using OffscreenCanvas
 * Handles frame processing off the main thread
 */

import { processFrame } from './pipeline.js';

/**
 * Worker message handler
 */
self.onmessage = function(event) {
  const { type, data } = event.data;
  
  switch (type) {
    case 'frame':
      handleFrame(data);
      break;
      
    case 'stop':
      // Worker cleanup if needed
      self.postMessage({ type: 'stopped' });
      break;
      
    default:
      self.postMessage({ 
        type: 'error', 
        error: `Unknown message type: ${type}` 
      });
  }
};

/**
 * Process a frame received from main thread
 * 
 * @param {ImageBitmap|ImageData} frameData - Frame data to process
 */
function handleFrame(frameData) {
  try {
    // Convert ImageBitmap to ImageData if needed
    let imageData;
    
    if (frameData instanceof ImageBitmap) {
      // Create OffscreenCanvas and draw ImageBitmap
      const canvas = new OffscreenCanvas(frameData.width, frameData.height);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(frameData, 0, 0);
      imageData = ctx.getImageData(0, 0, frameData.width, frameData.height);
    } else {
      // Already ImageData
      imageData = frameData;
    }
    
    // Process the frame
    const result = processFrame(imageData);
    
    // Send result back to main thread
    self.postMessage({
      type: 'result',
      result
    });
    
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error.message
    });
  }
}

/**
 * Worker initialization
 */
self.postMessage({ type: 'ready' });
