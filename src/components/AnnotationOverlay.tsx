import { useState, useEffect, useRef, useCallback } from 'react';
import type { RecordingAnnotation, CuratedRecording } from '../recordings/types';
import './AnnotationOverlay.css';

interface AnnotationOverlayProps {
  recording: CuratedRecording | null;
  currentTokenIndex: number;
  isPlaying: boolean;
}

const TUTORIAL_STORAGE_KEY = 'ghostline-tutorial-enabled';

export function AnnotationOverlay({ recording, currentTokenIndex, isPlaying }: AnnotationOverlayProps) {
  const [activeAnnotation, setActiveAnnotation] = useState<RecordingAnnotation | null>(null);
  const [annotationIndex, setAnnotationIndex] = useState(-1);
  const [dismissed, setDismissed] = useState(false);
  const [tutorialEnabled, setTutorialEnabled] = useState(() => {
    const stored = localStorage.getItem(TUTORIAL_STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });
  const [showTeachingGoal, setShowTeachingGoal] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seenRef = useRef<Set<number>>(new Set());

  // Persist tutorial preference
  const toggleTutorial = useCallback(() => {
    setTutorialEnabled(prev => {
      const next = !prev;
      localStorage.setItem(TUTORIAL_STORAGE_KEY, String(next));
      if (!next) {
        setActiveAnnotation(null);
        setShowTeachingGoal(false);
      }
      return next;
    });
  }, []);

  // Show teaching goal when a new recording starts
  useEffect(() => {
    if (!recording || !tutorialEnabled) return;
    seenRef.current.clear();
    setAnnotationIndex(-1);
    setActiveAnnotation(null);
    setDismissed(false);
    setShowTeachingGoal(true);

    const timer = setTimeout(() => setShowTeachingGoal(false), 8000);
    return () => clearTimeout(timer);
  }, [recording?.id, tutorialEnabled]);

  // Trigger annotations at token indices
  useEffect(() => {
    if (!recording || !isPlaying || !tutorialEnabled) return;

    const annotations = recording.annotations;
    if (!annotations.length) return;

    // Find the annotation that matches this token index (if not already shown)
    const idx = annotations.findIndex(
      a => a.tokenIndex === currentTokenIndex && !seenRef.current.has(a.tokenIndex)
    );

    if (idx !== -1) {
      const annotation = annotations[idx];
      seenRef.current.add(annotation.tokenIndex);
      setActiveAnnotation(annotation);
      setAnnotationIndex(idx);
      setDismissed(false);
      setShowTeachingGoal(false);

      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setActiveAnnotation(null);
      }, (annotation.duration ?? 8) * 1000);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [recording, currentTokenIndex, isPlaying, tutorialEnabled]);

  // Navigate between annotations manually
  const goToAnnotation = useCallback((direction: 'prev' | 'next') => {
    if (!recording?.annotations.length) return;
    const annotations = recording.annotations;
    let newIdx: number;
    if (direction === 'next') {
      newIdx = annotationIndex < annotations.length - 1 ? annotationIndex + 1 : annotationIndex;
    } else {
      newIdx = annotationIndex > 0 ? annotationIndex - 1 : 0;
    }
    const annotation = annotations[newIdx];
    seenRef.current.add(annotation.tokenIndex);
    setActiveAnnotation(annotation);
    setAnnotationIndex(newIdx);
    setDismissed(false);

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    // Don't auto-dismiss manual navigation
  }, [recording, annotationIndex]);

  const totalAnnotations = recording?.annotations.length ?? 0;

  return (
    <>
      {/* Tutorial toggle button — always visible when a recording is loaded */}
      {recording && (
        <button
          className={`tutorial-toggle ${tutorialEnabled ? 'active' : ''}`}
          onClick={toggleTutorial}
          title={tutorialEnabled ? 'Pause tutorial annotations' : 'Resume tutorial annotations'}
        >
          <span className="tutorial-toggle-icon">{tutorialEnabled ? '\u{1F4D6}' : '\u{1F4D5}'}</span>
          <span className="tutorial-toggle-label">
            {tutorialEnabled ? 'Tutorial ON' : 'Tutorial OFF'}
          </span>
        </button>
      )}

      {/* Teaching goal banner — shown briefly when a recording starts */}
      {showTeachingGoal && recording && tutorialEnabled && (
        <div className="teaching-goal-banner" onClick={() => setShowTeachingGoal(false)}>
          <div className="teaching-goal-label">Learning Goal</div>
          <div className="teaching-goal-text">{recording.teachingGoal}</div>
          <div className="teaching-goal-hint">Click to dismiss</div>
        </div>
      )}

      {/* Annotation card */}
      {activeAnnotation && !dismissed && tutorialEnabled && (
        <div className={`annotation-overlay ${activeAnnotation.highlight ? `highlight-${activeAnnotation.highlight}` : ''}`}>
          <div className="annotation-card">
            <button
              className="annotation-dismiss"
              onClick={() => setDismissed(true)}
              title="Dismiss this annotation"
            >&times;</button>

            {/* Progress indicator */}
            {totalAnnotations > 0 && (
              <div className="annotation-progress">
                <div className="annotation-progress-bar">
                  {recording!.annotations.map((_, i) => (
                    <span
                      key={i}
                      className={`annotation-dot ${i === annotationIndex ? 'active' : i < annotationIndex ? 'seen' : ''}`}
                    />
                  ))}
                </div>
                <span className="annotation-step">
                  {annotationIndex + 1} / {totalAnnotations}
                </span>
              </div>
            )}

            <div className="annotation-title">{activeAnnotation.title}</div>
            <div className="annotation-body">{activeAnnotation.description}</div>

            <div className="annotation-footer">
              <div className="annotation-token">Token {activeAnnotation.tokenIndex}</div>
              <div className="annotation-nav">
                <button
                  className="annotation-nav-btn"
                  onClick={() => goToAnnotation('prev')}
                  disabled={annotationIndex <= 0}
                  title="Previous annotation"
                >{'\u25C0'}</button>
                <button
                  className="annotation-nav-btn"
                  onClick={() => goToAnnotation('next')}
                  disabled={annotationIndex >= totalAnnotations - 1}
                  title="Next annotation"
                >{'\u25B6'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
