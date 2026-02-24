import React, { useState } from 'react';
import { useDraggable } from '../hooks/useDraggable';

import { getActiveStatePalette } from '../data/statePalettes';

// State color palette — reads from active palette selection in settings
const STATE_TEXT_COLORS = getActiveStatePalette();

interface TrajectoryToken {
  position: number;
  tokenStr: string;
  isPrompt?: boolean;
  geometricState?: string;
  stateProbs?: Record<string, number>;
}

interface GeneratedTextProps {
  prompt: string;
  trajectory: TrajectoryToken[];
  isGenerating: boolean;
  selectedPosition?: number | null;
  onSelectToken?: (position: number) => void;
}

export function GeneratedText({ prompt, trajectory, isGenerating, selectedPosition, onSelectToken }: GeneratedTextProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth <= 768);
  const isMobile = window.innerWidth <= 768;
  const { dragStyle, dragHandleProps, wasDragged } = useDraggable('generated-text');
  const mobileDragStyle = isMobile ? {} : dragStyle;
  const mobileDragProps = isMobile ? {} : dragHandleProps;

  const generatedTokens = trajectory.filter(t => !t.isPrompt);

  if (!prompt && trajectory.length === 0) return null;

  return (
    <div className={`generated-text ${isCollapsed ? 'collapsed' : ''}`} style={mobileDragStyle}>
      <div className="generated-text-header drag-handle" {...mobileDragProps} onClick={() => { if (!wasDragged()) setIsCollapsed(!isCollapsed); }}>
        <span className="toggle">{isCollapsed ? '▶' : '▼'}</span>
        <span className="title">Generated Text</span>
        {isGenerating && <span className="typing">●</span>}
      </div>

      {!isCollapsed && (
        <div className="generated-text-content">
          <span className="prompt-part">{prompt}</span>
          {generatedTokens.map((token, i) => {
            const state = token.geometricState;
            const maxProb = token.stateProbs
              ? Math.max(...Object.values(token.stateProbs))
              : undefined;
            const color = state && STATE_TEXT_COLORS[state];
            // Token probability drives text opacity (model certainty, not state confidence)
            const tokenProb = token.tokenProb ?? 0.5;
            const opacity = 0.4 + tokenProb * 0.6; // Range: 0.4-1.0
            const tooltipText = state
              ? `${state}${maxProb !== undefined ? ` (${(maxProb * 100).toFixed(0)}%)` : ''}`
              : undefined;

            const isSelected = selectedPosition === token.position;

            return (
              <span
                key={i}
                className={`generated-token${onSelectToken ? ' clickable' : ''}${isSelected ? ' selected' : ''}`}
                style={color ? { color, opacity } : undefined}
                title={tooltipText}
                onClick={onSelectToken ? () => onSelectToken(token.position) : undefined}
              >
                {token.tokenStr}
              </span>
            );
          })}
          {isGenerating && <span className="cursor">|</span>}
        </div>
      )}
    </div>
  );
}
