
// Define a key rotation pool with fallback keys
const FALLBACK_API_KEYS = [
  "AIzaSyBKFsXn9J02iATYPlmDjWN0EmNmTHbVhL0", 
  "AIzaSyD2SN814JxX4hDIpJfQjgSYTezEn-X3I2k",
  "AIzaSyAXYwIl0YNRZhBDedpwyLLZCPp-6nA2XPk",
  "AIzaSyB__UbCBSa_DVE6crSAeNuM6fHg3-NlhiI"
];

// Track the current key index for rotation
let currentKeyIndex = 0;
let attemptedKeys = new Set<number>();

// Rotate to the next available API key when one hits rate limits
export const rotateApiKey = (): string => {
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
};

export const getCurrentApiKey = (): string => {
  return FALLBACK_API_KEYS[currentKeyIndex];
};

export const getFallbackApiKeys = (): string[] => {
  return [...FALLBACK_API_KEYS];
};

export const resetAttemptedKeys = (): void => {
  attemptedKeys.clear();
};

export const hasMoreKeysToTry = (): boolean => {
  return attemptedKeys.size < FALLBACK_API_KEYS.length;
};
