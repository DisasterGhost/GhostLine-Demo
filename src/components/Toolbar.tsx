// ============================================================================
// Toolbar - Unified top-right button row (Demo Viewer)
// ============================================================================
// wiki, settings, research, layer selector (no batch)

import './Toolbar.css';
import type { LayerInfo } from '../hooks/useGhostwire';

export type PanelId = 'wiki' | 'settings' | 'research';

interface ToolbarProps {
  activePanel: PanelId | null;
  onTogglePanel: (panel: PanelId) => void;
  isResearchRunning?: boolean;
  layerInfo?: LayerInfo;
  onLayerChange?: (layer: number) => void;
}

export function Toolbar({
  activePanel,
  onTogglePanel,
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
        title="Wiki — Learn about GhostLine concepts"
      >
        <span className="gl-toolbar-icon">&#128214;</span>
        <span className="gl-toolbar-label">Wiki</span>
      </button>
      <button
        className={`gl-toolbar-btn ${activePanel === 'settings' ? 'active' : ''}`}
        onClick={() => onTogglePanel('settings')}
        title="Settings — Customize visuals and display"
      >
        <span className="gl-toolbar-icon">&#9881;</span>
        <span className="gl-toolbar-label">Settings</span>
      </button>
      <button
        className={`gl-toolbar-btn ${activePanel === 'research' ? 'active' : ''} ${isResearchRunning ? 'running' : ''}`}
        onClick={() => onTogglePanel('research')}
        title="Research Lab — Hypothesis testing and analysis"
      >
        <span className="gl-toolbar-icon">&#128300;</span>
        <span className="gl-toolbar-label">Research</span>
      </button>
    </div>
  );
}
