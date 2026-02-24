import React, { useState, useCallback } from 'react';

// ============================================================================
// Types
// ============================================================================

interface QueuedPrompt {
  prompt: string;
  runs: number;
  tokensPerRun: number;
}

interface BatchPanelProps {
  currentPrompt: string;
  isConnected: boolean;
  isGenerating: boolean;
  isBatchRunning: boolean;
  batchProgress: { current: number; total: number };
  onRunBatch: (prompts: string[], tokensPerRun: number) => void;
  onCancelBatch: () => void;
  isOpen: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function BatchPanel({
  currentPrompt,
  isConnected,
  isGenerating,
  isBatchRunning,
  batchProgress,
  onRunBatch,
  onCancelBatch,
  isOpen,
}: BatchPanelProps) {
  const [queue, setQueue] = useState<QueuedPrompt[]>([]);
  const [runs, setRuns] = useState(5);
  const [tokensPerRun, setTokensPerRun] = useState(30);

  const addToQueue = useCallback(() => {
    if (!currentPrompt.trim()) return;
    
    setQueue(prev => [...prev, {
      prompt: currentPrompt.trim(),
      runs,
      tokensPerRun,
    }]);
  }, [currentPrompt, runs, tokensPerRun]);

  const removeFromQueue = useCallback((index: number) => {
    setQueue(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
  }, []);

  const runBatch = useCallback(() => {
    if (queue.length === 0) return;
    
    // Flatten queue into list of prompts
    const allPrompts: string[] = [];
    let maxTokens = 30;
    
    queue.forEach(item => {
      for (let i = 0; i < item.runs; i++) {
        allPrompts.push(item.prompt);
      }
      maxTokens = Math.max(maxTokens, item.tokensPerRun);
    });
    
    // Pass to hook
    onRunBatch(allPrompts, maxTokens);
    
    // Clear queue after starting
    setQueue([]);
  }, [queue, onRunBatch]);

  // Calculate total runs in queue
  const totalRuns = queue.reduce((sum, item) => sum + item.runs, 0);

  if (!isOpen) return null;

  return (
    <div className="batch-panel">
      <div className="batch-header">
        <h3>Batch Generator</h3>
      </div>

      <div className="batch-content">
        {/* Current prompt preview */}
        <div className="batch-section">
          <label>Current Prompt:</label>
          <div className="batch-prompt-preview">
            {currentPrompt || <span className="empty">Enter a prompt in the main input...</span>}
          </div>
        </div>

        {/* Config */}
        <div className="batch-config">
          <div className="batch-field">
            <label>Runs:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={runs}
              onChange={(e) => setRuns(Math.max(1, parseInt(e.target.value) || 1))}
              disabled={isBatchRunning}
            />
          </div>
          <div className="batch-field">
            <label>Tokens:</label>
            <input
              type="number"
              min={10}
              max={200}
              value={tokensPerRun}
              onChange={(e) => setTokensPerRun(Math.max(10, parseInt(e.target.value) || 30))}
              disabled={isBatchRunning}
            />
          </div>
          <button 
            className="batch-add"
            onClick={addToQueue}
            disabled={!currentPrompt.trim() || isBatchRunning}
          >
            + Add
          </button>
        </div>

        {/* Queue */}
        <div className="batch-queue">
          <div className="batch-queue-header">
            <span>Queue ({totalRuns} runs)</span>
            {queue.length > 0 && !isBatchRunning && (
              <button className="batch-clear" onClick={clearQueue}>Clear</button>
            )}
          </div>
          
          {queue.length === 0 && !isBatchRunning ? (
            <div className="batch-empty">No prompts queued</div>
          ) : (
            <div className="batch-list">
              {queue.map((item, i) => (
                <div key={i} className="batch-item">
                  <span className="batch-item-prompt">{item.prompt.slice(0, 30)}...</span>
                  <span className="batch-item-config">×{item.runs} @ {item.tokensPerRun}t</span>
                  {!isBatchRunning && (
                    <button 
                      className="batch-item-remove"
                      onClick={() => removeFromQueue(i)}
                    >×</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Progress */}
        {isBatchRunning && (
          <div className="batch-progress">
            <div className="batch-progress-bar">
              <div 
                className="batch-progress-fill"
                style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
              />
            </div>
            <span>{batchProgress.current} / {batchProgress.total} complete</span>
          </div>
        )}

        {/* Run/Cancel button */}
        {isBatchRunning ? (
          <button className="batch-cancel" onClick={onCancelBatch}>
            Cancel Batch
          </button>
        ) : (
          <button
            className="batch-run"
            onClick={runBatch}
            disabled={queue.length === 0 || !isConnected || isGenerating}
          >
            Run Batch ({totalRuns} generations)
          </button>
        )}

        <p className="batch-hint">
          Results logged to <code>logs/generations/</code><br/>
          Run <code>analyze_logs.py</code> to find clusters
        </p>
      </div>
    </div>
  );
}
