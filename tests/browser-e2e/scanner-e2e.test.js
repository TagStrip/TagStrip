/**
 * Browser E2E Test: Test scanner with real browser ImageData
 * This tests the scanner pipeline using actual browser APIs
 */

import { describe, it, expect } from 'vitest';
import { toGrayscale } from '../../src/scanner/binarize.js';
import { searchBandsGrayscale } from '../../src/scanner/locator.js';
import { processFrame, VotingBuffer, Scanner, createScanner } from '../../src/scanner/pipeline.js';
import { decodeBits } from '../../src/core/decoder.js';

describe('Scanner E2E — Browser Image Processing', () => {
  it('processes real ImageData through full scanner pipeline', async () => {
    // Create a canvas and load test image data
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Create a simple test pattern that resembles a TagStrip
    // This creates a 20x20 image with a pattern that should be detectable
    canvas.width = 20;
    canvas.height = 20;

    // Draw a simple pattern (this is a placeholder - you'd load a real image)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 20, 20);

    // Add some white areas to create contrast
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(5, 0, 10, 20); // Vertical white bar

    // Get real ImageData from canvas
    const imageData = ctx.getImageData(0, 0, 20, 20);

    expect(imageData).toBeInstanceOf(ImageData);
    expect(imageData.width).toBe(20);
    expect(imageData.height).toBe(20);
    expect(imageData.data).toBeInstanceOf(Uint8ClampedArray);

    // Test grayscale conversion with real ImageData
    const grayscale = toGrayscale(imageData);
    expect(grayscale).toBeDefined();
    expect(grayscale.length).toBe(20 * 20); // 400 pixels

    // Test band searching (this will likely fail with our simple pattern,
    // but tests that the function can handle real browser data)
    const detected = searchBandsGrayscale(grayscale, 20, 20);

    // The result might be null (no valid tag found), but the function should not crash
    // This validates that browser ImageData works with the scanner functions
    expect(typeof detected).toBe('object'); // Either null or detection result
  });

  it('handles browser Canvas API correctly', () => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Verify we have real browser Canvas APIs
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(ctx).toBeInstanceOf(CanvasRenderingContext2D);
    expect(typeof ctx.getImageData).toBe('function');

    // Test that we can create and manipulate ImageData
    const testData = new ImageData(10, 10);
    expect(testData).toBeInstanceOf(ImageData);
    expect(testData.width).toBe(10);
    expect(testData.height).toBe(10);
  });

  it('tests processFrame with real ImageData', () => {
    // Create test ImageData
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = 20;
    canvas.height = 20;

    // Fill with black (will be processed as no valid tag)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 20, 20);

    const imageData = ctx.getImageData(0, 0, 20, 20);

    // Test processFrame function
    const result = processFrame(imageData);
    expect(result).toBeDefined();
    expect(result.success).toBe(false); // Should fail with our test pattern
    expect(result.reason).toBe('NO_GUARD_FOUND');
  });

  it('tests VotingBuffer in browser environment', () => {
    const buffer = new VotingBuffer(3);

    expect(buffer.length).toBe(0);

    // Add results
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });

    expect(buffer.length).toBe(3);

    // Test consensus
    const consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus.success).toBe(true);
    expect(consensus.boxId).toBe(42);
    expect(consensus.variant).toBe('short');
  });

  it('tests Scanner class instantiation', () => {
    // Create a mock video element
    const videoElement = document.createElement('video');
    videoElement.width = 640;
    videoElement.height = 480;

    // Create scanner instance
    const scanner = new Scanner(videoElement, (result) => {
      // Mock callback
    });

    expect(scanner).toBeInstanceOf(Scanner);
    expect(scanner.video).toBe(videoElement);
    expect(typeof scanner.onResult).toBe('function');
  });

  it('tests createScanner factory function', () => {
    const videoElement = document.createElement('video');
    const mockCallback = () => {};

    const scanner = createScanner(videoElement, mockCallback);

    expect(scanner).toBeInstanceOf(Scanner);
    expect(scanner.video).toBe(videoElement);
    expect(scanner.onResult).toBe(mockCallback);
  });

  it('tests Scanner initialization methods', () => {
    const videoElement = document.createElement('video');
    const scanner = new Scanner(videoElement, () => {});

    // Test initCanvas
    scanner.initCanvas();
    expect(scanner.canvas).toBeInstanceOf(HTMLCanvasElement);
    expect(scanner.ctx).toBeInstanceOf(CanvasRenderingContext2D);

    // Test clear method
    scanner.votingBuffer.add({ success: true, boxId: 42, variant: 'short' });
    expect(scanner.votingBuffer.length).toBe(1);
    scanner.votingBuffer.clear();
    expect(scanner.votingBuffer.length).toBe(0);
  });
});