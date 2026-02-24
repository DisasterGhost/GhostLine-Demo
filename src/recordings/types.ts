export interface RecordingAnnotation {
  /** Token index at which to show this annotation */
  tokenIndex: number;
  /** Short headline */
  title: string;
  /** 1-3 sentence description of what's happening */
  description: string;
  /** Optional: which UI element to highlight */
  highlight?: string;
  /** How long to show in seconds. Default 8. */
  duration?: number;
}

export interface CuratedRecording {
  id: string;
  title: string;
  /** Short description shown in the selector */
  description: string;
  /** What the viewer should learn from this recording */
  teachingGoal: string;
  /** Filename in public/recordings/ */
  filename: string;
  /** Token-indexed teaching annotations */
  annotations: RecordingAnnotation[];
  /** Optional tags for filtering */
  tags?: string[];
}
