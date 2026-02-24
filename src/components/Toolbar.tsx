// ============================================================================
// Toolbar - Unified top-right button row
// ============================================================================
// Consolidated: wiki, settings, batch, research (4 buttons)

import './Toolbar.css';
import type { LayerInfo } from '../hooks/useGhostwire';

export type PanelId = 'wiki' | 'settings' | 'batch' | 'research';

interface ToolbarProps {
  activePanel: PanelId | null;
  onTogglePanel: (panel: PanelId) => void;
  isBatchRunning?: boolean;
  batchProgress?: { current: number; total: number };
  isResearchRunning?: boolean;
  layerInfo?: LayerInfo;
  onLayerChange?: (layer: number) => void;
}

export function Toolbar({
  activePanel,
  onTogglePanel,
  isBatchRunning = false,
  batchProgress,
  isResearchRunning = false,
  layerInfo,
  onLayerChange,
}: ToolbarProps) {
  const hasLayers = layerInfo && layerInfo.capture.length > 0;

  return (
    <div className="gl-toolbar">
      {hasLayers && onLayerChange && (
        <select
          className="gl-toolbar-layer-select"
          value={layerInfo.render}
          onChange={(e) => onLayerChange(Number(e.target.value))}
          title="Render layer"
        >
          {layerInfo.capture.map((layer) => (
            <option key={layer} value={layer}>
              L{layer}
            </option>
          ))}
        </select>
      )}
      <button
        className={`gl-toolbar-btn ${activePanel === 'wiki' ? 'active' : ''}`}
        onClick={() => onTogglePanel('wiki')}
        title="Wiki"
      >
        <span className="gl-toolbar-icon">&#128214;</span>
      </button>
      <button
        className={`gl-toolbar-btn ${activePanel === 'settings' ? 'active' : ''}`}
        onClick={() => onTogglePanel('settings')}
        title="Settings"
      >
        <span className="gl-toolbar-icon">&#9881;</span>
      </button>
      <button
        className={`gl-toolbar-btn ${activePanel === 'batch' ? 'active' : ''} ${isBatchRunning ? 'running' : ''}`}
        onClick={() => onTogglePanel('batch')}
        title="Batch Generator"
      >
        {isBatchRunning && batchProgress ? (
          <span className="gl-toolbar-batch-text">
            {batchProgress.current}/{batchProgress.total}
          </span>
        ) : (
          <span className="gl-toolbar-icon">&#9889;</span>
        )}
      </button>
      <button
        className={`gl-toolbar-btn ${activePanel === 'research' ? 'active' : ''} ${isResearchRunning ? 'running' : ''}`}
        onClick={() => onTogglePanel('research')}
        title="Research Lab"
      >
        <span className="gl-toolbar-icon">&#128300;</span>
      </button>
    </div>
  );
}
