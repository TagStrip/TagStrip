import { describe, it, expect, beforeEach } from 'vitest';
import { VotingBuffer } from '../../src/scanner/pipeline.js';

describe('VotingBuffer', () => {
  let buffer;
  
  beforeEach(() => {
    buffer = new VotingBuffer(5);
  });
  
  it('initializes empty', () => {
    expect(buffer.length).toBe(0);
  });
  
  it('adds results', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    expect(buffer.length).toBe(1);
  });
  
  it('maintains max size', () => {
    for (let i = 0; i < 10; i++) {
      buffer.add({ success: true, boxId: 42, variant: 'short' });
    }
    expect(buffer.length).toBe(5);
  });
  
  it('requires at least 3 frames for consensus', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    
    let consensus = buffer.getConsensus();
    expect(consensus).toBeNull();
    
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
  });
  
  it('returns consensus when majority agree', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: false, reason: 'NO_GUARD' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    
    const consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus.success).toBe(true);
    expect(consensus.boxId).toBe(42);
    expect(consensus.variant).toBe('short');
  });
  
  it('returns null when no clear majority', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 43, variant: 'short' });
    buffer.add({ success: true, boxId: 44, variant: 'short' });
    
    const consensus = buffer.getConsensus();
    expect(consensus).toBeNull();
  });
  
  it('includes confidence score in consensus', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    
    const consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus.confidence).toBeDefined();
    expect(consensus.confidence).toBeGreaterThanOrEqual(0.6);
  });
  
  it('clears buffer', () => {
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    
    buffer.clear();
    expect(buffer.length).toBe(0);
  });
  
  it('requires 60% confidence threshold', () => {
    // 5 frames, 3 agreeing = 60% exactly
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: false, reason: 'NO_GUARD' });
    buffer.add({ success: false, reason: 'NO_GUARD' });
    
    const consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus.confidence).toBe(0.6);
  });
});

describe('VotingBuffer — variant consistency', () => {
  it('distinguishes between short and long tags', () => {
    const buffer = new VotingBuffer(5);
    
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'long' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    buffer.add({ success: true, boxId: 42, variant: 'short' });
    
    const consensus = buffer.getConsensus();
    expect(consensus).not.toBeNull();
    expect(consensus.variant).toBe('short');
  });
});
