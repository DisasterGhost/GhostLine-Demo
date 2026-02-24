// ============================================================================
// Session Recording & Playback
// ============================================================================
// 
// Captures generation sessions and allows replay without re-running inference.
// File format: .ghostline (JSON v1.1, binary planned for v2)
//

export interface GhostwireSession {
  version: string;
  timestamp: string;
  prompt: string;
  model: string;
  config: {
    temperature: number;
    maxTokens: number;
  };
  trajectory: TrajectoryPoint[];
  metadata?: {
    totalTime?: number;
    tokensGenerated?: number;
    recordedBy?: string;
  };
}

export interface LoopStats {
  activation_eff_dim: number;  // E1: entropy-based, per single vector
  direction_change: number | null;
  avg_direction_change: number | null;
}

export interface TrajectoryPoint {
  position: number;
  coords: [number, number, number];
  tokenProb: number;       // C1: top-1 token probability
  entropy: number;
  tokenStr: string;
  timestamp: number;
  tokenId: number;
  residualNorm: number;
  isPrompt?: boolean;
  attentionArcs?: Array<{
    from: number;
    to: number;
    weight: number;
    head: number;
    pattern_type?: string;
  }>;
  loopStats?: LoopStats;  // Backend-computed loop detection stats

  // Geometric state classification
  geometricState?: string;                    // Primary state (DT when available, else LDA)
  stateProbs?: Record<string, number>;        // Probability vector over behavioral states
  ldaState?: string;                          // LDA classifier state (for cross-validation)

  // Per-layer geometric measurements
  layerEffDims?: Record<string, number>;      // E1 per-layer activation effective dimensions
  projectedVelocity?: number;                 // V1: 3D projected velocity
  layerNorms?: Record<string, number>;        // Per-layer residual stream norms
  layerVelocities?: Record<string, number>;   // Per-layer high-dimensional velocity

  // Token prediction state
  crystallized?: boolean;                     // top1_prob >= 0.5

  // Multi-classifier diagnostics
  hallucinationRisk?: number | null;          // Ensemble hallucination probability — P(fabrication) in v7
  refusalProb?: number | null;               // V7 3-class: P(refusal)
  hallucinationCheckpoint?: boolean;          // Whether this token was an ensemble checkpoint
  dtState?: string | null;                    // Decision tree state prediction
  dtProbs?: Record<string, number> | null;    // Decision tree probability vector
  dtConfidence?: number | null;               // Decision tree confidence

  // Per-layer projection coordinates
  layer_coords?: Record<string, [number, number, number]>;  // Pre-computed coords per layer
  _prevCoords?: [number, number, number];  // Previous layer position (for transition animation)
  _transitionKeyframes?: Array<[number, number, number]>;  // Multi-layer transition path
}

// ============================================================================
// Session Recorder
// ============================================================================

export class SessionRecorder {
  private isRecording: boolean = false;
  private session: GhostwireSession | null = null;
  private startTime: number = 0;

  start(prompt: string, model: string, config: { temperature: number; maxTokens: number }) {
    this.isRecording = true;
    this.startTime = Date.now();
    this.session = {
      version: '1.1',
      timestamp: new Date().toISOString(),
      prompt,
      model,
      config,
      trajectory: [],
      metadata: {
        recordedBy: 'GhostLine Client',
      },
    };
    console.log('[Recorder] Started recording session');
  }

  addPromptTokens(tokens: TrajectoryPoint[]) {
    if (!this.isRecording || !this.session) return;
    
    // Add all prompt tokens
    tokens.forEach(token => {
      this.session!.trajectory.push({
        ...token,
        isPrompt: true,
      });
    });
    console.log(`[Recorder] Added ${tokens.length} prompt tokens`);
  }

  addToken(token: TrajectoryPoint) {
    if (!this.isRecording || !this.session) return;
    
    this.session.trajectory.push({
      ...token,
      isPrompt: false,
    });
  }

  stop(): GhostwireSession | null {
    if (!this.isRecording || !this.session) return null;
    
    this.isRecording = false;
    const totalTime = Date.now() - this.startTime;
    
    this.session.metadata = {
      ...this.session.metadata,
      totalTime,
      tokensGenerated: this.session.trajectory.filter(t => !t.isPrompt).length,
    };
    
    console.log(`[Recorder] Stopped recording. ${this.session.trajectory.length} total points`);
    return this.session;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getSession(): GhostwireSession | null {
    return this.session;
  }
}

// ============================================================================
// File Operations
// ============================================================================

export function saveSession(session: GhostwireSession): void {
  const json = JSON.stringify(session, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  // Generate filename from prompt
  const promptSlug = session.prompt
    .slice(0, 30)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+$/, '');
  const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
  const filename = `ghostline-${promptSlug}-${timestamp}.ghostline`;
  
  // Trigger download
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log(`[Recorder] Saved session: ${filename}`);
}

export async function loadSession(file: File): Promise<GhostwireSession> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const json = e.target?.result as string;
        const session = JSON.parse(json) as GhostwireSession;
        
        // Validate
        if (!session.version || !session.trajectory) {
          throw new Error('Invalid .ghostline file format');
        }
        
        console.log(`[Recorder] Loaded session: ${session.trajectory.length} points`);
        resolve(session);
      } catch (err) {
        reject(new Error(`Failed to parse .ghostline file: ${err}`));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

// ============================================================================
// Session Statistics
// ============================================================================

export function getSessionStats(session: GhostwireSession) {
  const promptTokens = session.trajectory.filter(t => t.isPrompt);
  const generatedTokens = session.trajectory.filter(t => !t.isPrompt);
  
  const avgConfidence = generatedTokens.reduce((sum, t) => sum + t.tokenProb, 0) / generatedTokens.length;
  const avgEntropy = generatedTokens.reduce((sum, t) => sum + t.entropy, 0) / generatedTokens.length;
  const maxEntropy = Math.max(...generatedTokens.map(t => t.entropy));
  
  return {
    promptTokens: promptTokens.length,
    generatedTokens: generatedTokens.length,
    totalTokens: session.trajectory.length,
    avgConfidence: avgConfidence.toFixed(3),
    avgEntropy: avgEntropy.toFixed(2),
    maxEntropy: maxEntropy.toFixed(2),
    duration: session.metadata?.totalTime ? `${(session.metadata.totalTime / 1000).toFixed(1)}s` : 'unknown',
  };
}
