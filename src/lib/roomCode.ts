// =============================================================================
// CopyPasta — Room Code Generator
// =============================================================================
// Generates human-readable, sufficiently random room codes of the form:
//   word-word-word   e.g.  tiger-river-amber
//
// Entropy: With ~90 words, 3 slots → 90³ ≈ 729,000 combinations.
// That's enough for a temporary clipboard with short TTLs. If more entropy
// is needed, increase WORD_COUNT or append a random numeric suffix.
// =============================================================================

import { WORD_LIST } from './constants';

const WORD_COUNT = 3;

/**
 * Generates a cryptographically random room code using the Web Crypto API.
 * Works in both browser and Node.js (Node 19+ has globalThis.crypto).
 */
export function generateRoomCode(): string {
  const words: string[] = [];
  for (let i = 0; i < WORD_COUNT; i++) {
    const index = cryptoRandInt(WORD_LIST.length);
    words.push(WORD_LIST[index]);
  }
  return words.join('-');
}

/**
 * Returns a cryptographically random integer in [0, max).
 */
function cryptoRandInt(max: number): number {
  // Use rejection sampling to avoid modulo bias
  const bitsNeeded = Math.ceil(Math.log2(max));
  const bytesNeeded = Math.ceil(bitsNeeded / 8);
  const maxValid = Math.pow(256, bytesNeeded);
  const limit = maxValid - (maxValid % max);

  while (true) {
    const bytes = new Uint8Array(bytesNeeded);
    globalThis.crypto.getRandomValues(bytes);
    let value = 0;
    for (const byte of bytes) {
      value = value * 256 + byte;
    }
    if (value < limit) {
      return value % max;
    }
    // Retry if value would cause bias
  }
}

/**
 * Validates that a room code matches the expected format.
 * Only allows lowercase letters and hyphens — no injection risk.
 */
export function isValidRoomCodeFormat(code: string): boolean {
  return /^[a-z]+-[a-z]+-[a-z]+$/.test(code);
}
