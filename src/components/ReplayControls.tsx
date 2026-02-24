import React, { useCallback, useRef, useEffect, useState } from 'react';

// ============================================================================
// Context Window Range Slider
// ============================================================================
// Replaces simple timeline with dual-handle range selector:
// - Left handle: context start
// - Right handle: context end  
// - Playhead indicator (draggable within range)
// - Out-of-range regions visually dimmed

export interface ContextRange {
  start: number;
  end: number;
}

interface ReplayControlsProps {
  // Playhead position
  currentPosition: number;
  totalTokens: number;
  
  // Context window range
  contextRange: ContextRange;
  onContextRangeChange: (range: ContextRange) => void;
  
  // Playback controls
  isPlaying: boolean;
  onSeek: (position: number) => void;
  onPlayPause: () => void;
  onStepBack: () => void;
  onStepForward: () => void;
  onJumpToStart: () => void;
  onJumpToEnd: () => void;
  
  // Context visibility toggles
  showOutOfRangeTokens: boolean;
  onToggleOutOfRangeTokens: () => void;
  showOutOfRangeArcs: boolean;
  onToggleOutOfRangeArcs: () => void;
  showPromptTokens: boolean;
  onTogglePromptTokens: () => void;
  
  // Quick focus actions
  onFocusAround: (delta: number) => void;
  onShowAll: () => void;
  
  disabled?: boolean;
}

export function ReplayControls({
  currentPosition,
  totalTokens,
  contextRange,
  onContextRangeChange,
  isPlaying,
  onSeek,
  onPlayPause,
  onStepBack,
  onStepForward,
  onJumpToStart,
  onJumpToEnd,
  showOutOfRangeTokens,
  onToggleOutOfRangeTokens,
  showOutOfRangeArcs,
  onToggleOutOfRangeArcs,
  showPromptTokens,
  onTogglePromptTokens,
  onFocusAround,
  onShowAll,
  disabled = false,
}: ReplayControlsProps) {
  const sliderRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
  
  // Convert pixel position to token index
  const pixelToToken = useCallback((clientX: number): number => {
    if (!sliderRef.current || totalTokens === 0) return 0;
    const rect = sliderRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(ratio * totalTokens);
  }, [totalTokens]);
  
  // Handle mouse/touch move during drag
  const handleMove = useCallback((clientX: number) => {
    if (!dragging || totalTokens === 0) return;
    
    const token = pixelToToken(clientX);
    
    if (dragging === 'start') {
      // Don't let start go past end - 1
      const newStart = Math.min(token, contextRange.end - 1);
      onContextRangeChange({ ...contextRange, start: Math.max(0, newStart) });
    } else if (dragging === 'end') {
      // Don't let end go before start + 1
      const newEnd = Math.max(token, contextRange.start + 1);
      onContextRangeChange({ ...contextRange, end: Math.min(totalTokens, newEnd) });
    } else if (dragging === 'playhead') {
      // Playhead can move anywhere (context range follows if needed)
      onSeek(Math.max(0, Math.min(totalTokens, token)));
    }
  }, [dragging, totalTokens, contextRange, onContextRangeChange, onSeek, pixelToToken]);
  
  // Mouse + touch event handlers
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      handleMove(e.clientX);
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length > 0) handleMove(e.touches[0].clientX);
    };

    const handleEnd = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [dragging, handleMove]);
  
  // Calculate percentages for rendering
  const startPercent = totalTokens > 0 ? (contextRange.start / totalTokens) * 100 : 0;
  const endPercent = totalTokens > 0 ? (contextRange.end / totalTokens) * 100 : 100;
  const playheadPercent = totalTokens > 0 ? (currentPosition / totalTokens) * 100 : 0;
  
  // Is playhead within context range?
  const playheadInRange = currentPosition >= contextRange.start && currentPosition <= contextRange.end;

  return (
    <div className={`replay-controls-v2 ${disabled ? 'disabled' : ''}`}>
      {/* Top row: Transport buttons + position display */}
      <div className="replay-transport">
        <div className="replay-buttons">
          <button
            className="replay-btn"
            onClick={onJumpToStart}
            disabled={disabled || currentPosition === 0}
            title="Jump to start"
          >
            ⏮
          </button>
          <button
            className="replay-btn"
            onClick={onStepBack}
            disabled={disabled || currentPosition === 0}
            title="Step back one token"
          >
            ◀
          </button>
          <button
            className="replay-btn play-pause"
            onClick={onPlayPause}
            disabled={disabled || totalTokens === 0}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button
            className="replay-btn"
            onClick={onStepForward}
            disabled={disabled || currentPosition >= totalTokens}
            title="Step forward one token"
          >
            ▶
          </button>
          <button
            className="replay-btn"
            onClick={onJumpToEnd}
            disabled={disabled || currentPosition >= totalTokens}
            title="Jump to end"
          >
            ⏭
          </button>
        </div>
        
        <div className="replay-position">
          <span className="position-current">{currentPosition}</span>
          <span className="position-separator">/</span>
          <span className="position-total">{totalTokens}</span>
        </div>
      </div>
      
      {/* Context range slider */}
      <div className="context-slider-container">
        <div 
          ref={sliderRef}
          className="context-slider"
          onMouseDown={(e) => {
            // Click on track = move playhead
            if (e.target === sliderRef.current) {
              const token = pixelToToken(e.clientX);
              onSeek(token);
            }
          }}
          onTouchStart={(e) => {
            if (e.target === sliderRef.current && e.touches.length > 0) {
              const token = pixelToToken(e.touches[0].clientX);
              onSeek(token);
            }
          }}
        >
          {/* Out-of-range regions (dimmed) */}
          <div 
            className="context-region out-of-range left"
            style={{ width: `${startPercent}%` }}
          />
          <div 
            className="context-region out-of-range right"
            style={{ width: `${100 - endPercent}%` }}
          />
          
          {/* In-range region (highlighted) */}
          <div 
            className="context-region in-range"
            style={{ 
              left: `${startPercent}%`, 
              width: `${endPercent - startPercent}%` 
            }}
          />
          
          {/* Start handle */}
          <div
            className={`context-handle start ${dragging === 'start' ? 'dragging' : ''}`}
            style={{ left: `${startPercent}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging('start');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragging('start');
            }}
            title={`Context start: ${contextRange.start}`}
          >
            <div className="handle-grip">⟨</div>
          </div>
          
          {/* End handle */}
          <div
            className={`context-handle end ${dragging === 'end' ? 'dragging' : ''}`}
            style={{ left: `${endPercent}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging('end');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragging('end');
            }}
            title={`Context end: ${contextRange.end}`}
          >
            <div className="handle-grip">⟩</div>
          </div>
          
          {/* Playhead indicator */}
          <div
            className={`playhead-indicator ${dragging === 'playhead' ? 'dragging' : ''} ${!playheadInRange ? 'out-of-range' : ''}`}
            style={{ left: `${playheadPercent}%` }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setDragging('playhead');
            }}
            onTouchStart={(e) => {
              e.stopPropagation();
              setDragging('playhead');
            }}
            title={`Playhead: ${currentPosition}`}
          >
            <div className="playhead-line" />
            <div className="playhead-head">▼</div>
          </div>
        </div>
        
        {/* Range labels */}
        <div className="context-labels">
          <span className="context-label start">{contextRange.start}</span>
          <span className="context-label range">
            Context: {contextRange.end - contextRange.start} tokens
          </span>
          <span className="context-label end">{contextRange.end}</span>
        </div>
      </div>
      
      {/* Bottom row: Quick focus buttons + visibility toggles */}
      <div className="context-controls">
        <div className="quick-focus">
          <span className="control-label">Focus:</span>
          <button 
            className="focus-btn"
            onClick={() => onFocusAround(10)}
            disabled={disabled}
            title="Show ±10 tokens around playhead"
          >
            ±10
          </button>
          <button 
            className="focus-btn"
            onClick={() => onFocusAround(25)}
            disabled={disabled}
            title="Show ±25 tokens around playhead"
          >
            ±25
          </button>
          <button 
            className="focus-btn"
            onClick={() => onFocusAround(50)}
            disabled={disabled}
            title="Show ±50 tokens around playhead"
          >
            ±50
          </button>
          <button 
            className="focus-btn show-all"
            onClick={onShowAll}
            disabled={disabled}
            title="Show all tokens"
          >
            All
          </button>
        </div>
        
        <div className="visibility-toggles">
          <label className="toggle-label" title="Show prompt tokens in 3D space">
            <input
              type="checkbox"
              checked={showPromptTokens}
              onChange={onTogglePromptTokens}
              disabled={disabled}
            />
            <span>Prompt</span>
          </label>
          <label className="toggle-label" title="Show ghosted tokens outside context range">
            <input
              type="checkbox"
              checked={showOutOfRangeTokens}
              onChange={onToggleOutOfRangeTokens}
              disabled={disabled}
            />
            <span>Ghost tokens</span>
          </label>
          <label className="toggle-label" title="Show faded arcs to tokens outside context range">
            <input
              type="checkbox"
              checked={showOutOfRangeArcs}
              onChange={onToggleOutOfRangeArcs}
              disabled={disabled}
            />
            <span>Ghost arcs</span>
          </label>
        </div>
      </div>
    </div>
  );
}
