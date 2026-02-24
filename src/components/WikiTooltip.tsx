// ============================================================================
// WikiTooltip — Contextual hover tooltip with right-click-to-wiki
// ============================================================================
// Wraps any element to show a wiki entry's short description on hover.
// Right-click opens the full wiki sidebar entry.
// Left-click passes through to the child element (sorting, toggling, etc.)

import { useState, useCallback, useRef, useEffect } from 'react';
import { wikiById } from '../data/wikiContent';
import './WikiTooltip.css';

interface WikiTooltipProps {
  /** The wiki entry ID to display */
  wikiId: string;
  /** Callback to open the wiki sidebar to this entry */
  onOpenWiki?: (entryId: string) => void;
  /** Content to wrap with tooltip behavior */
  children: React.ReactNode;
  /** Override tooltip position: 'above' (default) or 'below' */
  position?: 'above' | 'below';
}

export function WikiTooltip({ wikiId, onOpenWiki, children, position = 'above' }: WikiTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const wrapperRef = useRef<HTMLSpanElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const entry = wikiById[wikiId];
  if (!entry) {
    // Unknown wiki ID — just render children with no tooltip
    return <>{children}</>;
  }

  const showTooltip = useCallback(() => {
    // Small delay to avoid tooltip flicker on quick mouse passes
    hoverTimeout.current = setTimeout(() => {
      if (wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        setCoords({
          x: rect.left + rect.width / 2,
          y: position === 'below' ? rect.bottom + 6 : rect.top - 6,
        });
      }
      setIsVisible(true);
    }, 200);
  }, [position]);

  const hideTooltip = useCallback(() => {
    if (hoverTimeout.current) {
      clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
    setIsVisible(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    if (onOpenWiki) {
      e.preventDefault();
      e.stopPropagation();
      onOpenWiki(wikiId);
      hideTooltip();
    }
  }, [onOpenWiki, wikiId, hideTooltip]);

  return (
    <span
      ref={wrapperRef}
      className="wiki-tooltip-wrapper"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onContextMenu={handleContextMenu}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`wiki-tooltip ${position}`}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
        >
          <div className="wiki-tooltip-title">{entry.title}</div>
          <div className="wiki-tooltip-short">{entry.short}</div>
          {onOpenWiki && (
            <div className="wiki-tooltip-hint">Right-click for full entry</div>
          )}
        </div>
      )}
    </span>
  );
}
