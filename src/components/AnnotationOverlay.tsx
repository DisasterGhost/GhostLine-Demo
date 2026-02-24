import { useState, useEffect, useRef } from 'react';
import type { RecordingAnnotation, CuratedRecording } from '../recordings/types';
import './AnnotationOverlay.css';

interface AnnotationOverlayProps {
  recording: CuratedRecording | null;
  currentTokenIndex: number;
  isPlaying: boolean;
}

export function AnnotationOverlay({ recording, currentTokenIndex, isPlaying }: AnnotationOverlayProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<RecordingAnnotation | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!recording || !isPlaying) return;

    const annotation = recording.annotations.find(
      a => a.tokenIndex === currentTokenIndex
    );

    if (annotation) {
      setActiveAnnotation(annotation);
      setDismissed(false);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActiveAnnotation(null);
      }, (annotation.duration ?? 8) * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [recording, currentTokenIndex, isPlaying]);

  // Reset when recording changes
  useEffect(() => {
    setActiveAnnotation(null);
    setDismissed(false);
  }, [recording?.id]);

  if (!activeAnnotation || dismissed) return null;

  return (
    <div className={`annotation-overlay ${activeAnnotation.highlight ? `highlight-${activeAnnotation.highlight}` : ''}`}>
      <div className="annotation-card">
        <button className="annotation-dismiss" onClick={() => setDismissed(true)}>&times;</button>
        <div className="annotation-title">{activeAnnotation.title}</div>
        <div className="annotation-body">{activeAnnotation.description}</div>
        <div className="annotation-token">Token {currentTokenIndex}</div>
      </div>
    </div>
  );
}
