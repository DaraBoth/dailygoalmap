
// API key management for Gemini API

// Use secure environment variable for API key
const SECURE_API_KEY = Deno.env.get('GEMINI_API_KEY');
const FALLBACK_API_KEYS = SECURE_API_KEY ? [SECURE_API_KEY] : [];

// Track the current key index for rotation
let currentKeyIndex = 0;
let attemptedKeys = new Set<number>();

/**
 * Get the current API key
 */
export function getCurrentApiKey(): string {
  return FALLBACK_API_KEYS[currentKeyIndex];
}

/**
 * Rotate to the next API key
 */
export function rotateApiKey(): string {
  // Mark the current key as attempted
  attemptedKeys.add(currentKeyIndex);
  
  // If we've tried all keys, reset the attempted keys tracking
  if (attemptedKeys.size >= FALLBACK_API_KEYS.length) {
    attemptedKeys.clear();
  }
  
  // Find the next key that hasn't been attempted in this cycle
  let nextKeyFound = false;
  for (let i = 0; i < FALLBACK_API_KEYS.length; i++) {
    const nextIndex = (currentKeyIndex + i + 1) % FALLBACK_API_KEYS.length;
    if (!attemptedKeys.has(nextIndex)) {
      currentKeyIndex = nextIndex;
      nextKeyFound = true;
      break;
    }
  }
  
  // If all keys have been attempted, just move to the next one
  if (!nextKeyFound) {
    currentKeyIndex = (currentKeyIndex + 1) % FALLBACK_API_KEYS.length;
    attemptedKeys.clear(); // Reset for the next round
  }
  
  return FALLBACK_API_KEYS[currentKeyIndex];
}

/**
 * Check if there are more API keys to try
 */
export function hasMoreKeysToTry(): boolean {
  return attemptedKeys.size < FALLBACK_API_KEYS.length;
}

/**
 * Reset attempted keys tracking
 */
export function resetAttemptedKeys(): void {
  attemptedKeys.clear();
}
