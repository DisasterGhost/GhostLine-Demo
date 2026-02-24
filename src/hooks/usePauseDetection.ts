import { useState, useCallback, useRef } from 'react';

export interface PauseState {
  isPaused: boolean;
  pauseDuration: number;  // count of consecutive high-entropy tokens
  pauseIntensity: number; // 0-1, smoothed intensity
  entropy: number;        // raw entropy value
  tokenProb: number;      // C1: top-1 token probability
}

interface EntropyPauseConfig {
  entropyThreshold: number;    // entropy above this = "thinking"
  maxEntropy: number;          // entropy at which intensity = 1.0
  decayRate: number;           // how quickly intensity fades (0-1, lower = slower)
  riseRate: number;            // how quickly intensity rises (0-1, lower = slower)
}

const DEFAULT_CONFIG: EntropyPauseConfig = {
  entropyThreshold: 1.5,       // only flag genuinely uncertain tokens
  maxEntropy: 4.0,             // high entropy cap
  decayRate: 0.4,              // faster decay so ring fades quickly
  riseRate: 0.5,               // fast rise so it responds quickly
};

export function usePauseDetection(config: Partial<EntropyPauseConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  
  const [pauseState, setPauseState] = useState<PauseState>({
    isPaused: false,
    pauseDuration: 0,
    pauseIntensity: 0,
    entropy: 0,
    tokenProb: 1,
  });
  
  const smoothedIntensity = useRef(0);
  
  // Called when a new token arrives with its entropy/tokenProb
  const recordToken = useCallback((entropy: number, tokenProb: number) => {
    const isHighEntropy = entropy > cfg.entropyThreshold;
    
    // Calculate raw intensity: 0 at threshold, 1 at maxEntropy
    const rawIntensity = isHighEntropy 
      ? Math.min(1, (entropy - cfg.entropyThreshold) / (cfg.maxEntropy - cfg.entropyThreshold))
      : 0;
    
    // Asymmetric smoothing: rise fast, decay slow
    const rate = rawIntensity > smoothedIntensity.current ? cfg.riseRate : cfg.decayRate;
    smoothedIntensity.current += (rawIntensity - smoothedIntensity.current) * rate;
    
    // Consider "paused" if smoothed intensity is meaningful
    const isPaused = smoothedIntensity.current > 0.05;
    
    setPauseState(prev => ({
      isPaused,
      pauseDuration: isPaused ? prev.pauseDuration + 1 : 0,
      pauseIntensity: smoothedIntensity.current,
      entropy,
      tokenProb,
    }));
    
    // Log every token's entropy so we can tune thresholds
    console.log('[Entropy]', entropy.toFixed(2), isHighEntropy ? '← HIGH' : '');
  }, [cfg.entropyThreshold, cfg.maxEntropy, cfg.riseRate, cfg.decayRate]);
  
  // Called when generation starts
  const startTracking = useCallback(() => {
    smoothedIntensity.current = 0;
    setPauseState({
      isPaused: false,
      pauseDuration: 0,
      pauseIntensity: 0,
      entropy: 0,
      tokenProb: 1,
    });
  }, []);
  
  // Called when generation ends
  const stopTracking = useCallback(() => {
    // Don't immediately zero - let it fade naturally on next renders
    // But mark as not paused
    setPauseState(prev => ({
      ...prev,
      isPaused: false,
    }));
  }, []);
  
  return {
    pauseState,
    recordToken,
    startTracking,
    stopTracking,
  };
}
