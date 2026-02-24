// ============================================================================
// TokenInspector - Natural-language token reading with wiki links
// ============================================================================
// Appears when a token is selected. Generates a human-readable interpretation
// of the token's geometric data with clickable terms that open the wiki.

import type { TrajectoryPoint } from '../hooks/usePlaybackBuffer';
import { useDraggable } from '../hooks/useDraggable';
import { generateTokenReading, type ReadingSegment } from '../data/tokenReadingGenerator';
import './TokenInspector.css';

interface TokenInspectorProps {
  token: TrajectoryPoint | null;
  tokenIndex: number | null;
  onOpenWiki: (entryId: string) => void;
}

function SegmentSpan({
  segment,
  onOpenWiki,
}: {
  segment: ReadingSegment;
  onOpenWiki: (id: string) => void;
}) {
  switch (segment.type) {
    case 'text':
      return <span>{segment.content}</span>;
    case 'value':
      return <span className="inspector-value">{segment.content}</span>;
    case 'state':
      return (
        <span
          className={`inspector-state ${segment.wikiId ? 'clickable' : ''}`}
          style={{ color: segment.color }}
          onClick={() => segment.wikiId && onOpenWiki(segment.wikiId)}
        >
          {segment.content}
        </span>
      );
    case 'term':
      return (
        <span
          className="inspector-term"
          onClick={() => segment.wikiId && onOpenWiki(segment.wikiId)}
        >
          {segment.content}
        </span>
      );
    default:
      return <span>{segment.content}</span>;
  }
}

export function TokenInspector({ token, tokenIndex, onOpenWiki }: TokenInspectorProps) {
  const { dragStyle, dragHandleProps } = useDraggable('token-inspector');

  if (!token || tokenIndex === null) return null;

  const segments = generateTokenReading(token);

  return (
    <div className="token-inspector" style={dragStyle}>
      <div className="inspector-header drag-handle" {...dragHandleProps}>
        <span className="inspector-label">Token Inspector</span>
        <span className="inspector-index">#{tokenIndex}</span>
      </div>
      <div className="inspector-body">
        {segments.map((seg, i) => (
          <SegmentSpan key={i} segment={seg} onOpenWiki={onOpenWiki} />
        ))}
      </div>
    </div>
  );
}
