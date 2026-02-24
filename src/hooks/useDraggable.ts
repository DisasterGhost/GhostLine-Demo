import { useState, useCallback, useEffect, useRef } from 'react';

interface DragOffset {
  x: number;
  y: number;
}

function loadPosition(key: string): DragOffset {
  try {
    const saved = localStorage.getItem(`ghostline-panel-${key}`);
    if (saved) {
      const pos = JSON.parse(saved);
      if (typeof pos.x === 'number' && typeof pos.y === 'number') {
        return pos;
      }
    }
  } catch { /* ignore */ }
  return { x: 0, y: 0 };
}

/**
 * Makes a panel draggable by its header.
 * Returns style to apply to the panel, and props for the drag handle.
 * Positions persist in localStorage across sessions.
 *
 * Usage:
 *   const { dragStyle, dragHandleProps, wasDragged } = useDraggable('my-panel');
 *   <div style={dragStyle}> ... <div {...dragHandleProps}> Header </div> ... </div>
 *
 *   // If header also has onClick, guard it:
 *   onClick={() => { if (!wasDragged()) toggleCollapse(); }}
 */
export function useDraggable(storageKey: string) {
  const [offset, setOffset] = useState<DragOffset>(() => loadPosition(storageKey));
  const offsetRef = useRef(offset);
  const isDragging = useRef(false);
  const didDrag = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startOffset = useRef({ x: 0, y: 0 });

  // Keep ref in sync with state
  useEffect(() => { offsetRef.current = offset; }, [offset]);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // left click only
    isDragging.current = true;
    didDrag.current = false;
    startMouse.current = { x: e.clientX, y: e.clientY };
    startOffset.current = { ...offsetRef.current };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = e.clientX - startMouse.current.x;
      const dy = e.clientY - startMouse.current.y;

      // Only count as drag if moved > 3px (prevents click jitter)
      if (!didDrag.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        didDrag.current = true;
      }

      if (didDrag.current) {
        const newOffset = {
          x: startOffset.current.x + dx,
          y: startOffset.current.y + dy,
        };
        setOffset(newOffset);
        offsetRef.current = newOffset;
      }
    };

    const onMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        if (didDrag.current) {
          localStorage.setItem(
            `ghostline-panel-${storageKey}`,
            JSON.stringify(offsetRef.current)
          );
        }
      }
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [storageKey]);

  const dragStyle: React.CSSProperties =
    offset.x !== 0 || offset.y !== 0
      ? { transform: `translate(${offset.x}px, ${offset.y}px)` }
      : {};

  const resetPosition = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    offsetRef.current = { x: 0, y: 0 };
    localStorage.removeItem(`ghostline-panel-${storageKey}`);
  }, [storageKey]);

  return {
    /** Apply to the panel container element */
    dragStyle,
    /** Spread onto the drag handle element (header) */
    dragHandleProps: { onMouseDown },
    /** Check after mouseup — true if user dragged (vs clicked) */
    wasDragged: () => didDrag.current,
    /** Reset to default CSS position */
    resetPosition,
  };
}
