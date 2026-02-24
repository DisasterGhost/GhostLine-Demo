import { useState, useEffect, useCallback } from 'react';
import { GhostwireScene } from './components/GhostwireScene';
import { StatusDisplay } from './components/StatusDisplay';
import { GeneratedText } from './components/GeneratedText';
import { Toolbar, type PanelId } from './components/Toolbar';
import { WikiPanel } from './components/WikiPanel';
import { TokenInspector } from './components/TokenInspector';
import { UnifiedResearchPanel } from './components/UnifiedResearchPanel';
import { SettingsPanel, loadSettings, type AllSettings } from './components/SettingsPanel';
import { ReplayControls } from './components/ReplayControls';
import { SignalsPanel } from './components/SignalsPanel';
import { RecordingSelector } from './components/RecordingSelector';
import { AnnotationOverlay } from './components/AnnotationOverlay';
import { Tutorial } from './components/Tutorial';
import { WelcomeLanding } from './components/WelcomeLanding';
import { useGhostwire } from './hooks/useGhostwire';
import { useResearchWorkbench } from './hooks/useResearchWorkbench';
import type { CuratedRecording } from './recordings/types';
import './App.css';

function App() {
  const [settings, setSettings] = useState<AllSettings>(loadSettings);
  const [selectedTokenPosition, setSelectedTokenPosition] = useState<number | null>(null);
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [replayMinimized, setReplayMinimized] = useState(false);

  // Demo viewer state
  const [currentRecording, setCurrentRecording] = useState<CuratedRecording | null>(null);
  const [isLoadingRecording, setIsLoadingRecording] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);

  const togglePanel = useCallback((panel: PanelId) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const handleOpenWiki = useCallback((entryId: string) => {
    setActiveEntryId(entryId);
    setActivePanel('wiki');
  }, []);

  const playbackRate = settings.display.playbackRate;

  const {
    isConnected,
    isGenerating,
    trajectory,
    currentToken,
    stats,
    config,
    error,
    isBuffering,
    bufferSize,
    rawTokenCount,
    pauseState,
    // Recording state
    isRecording,
    lastSession,
    hasSession,
    // Replay state
    isReplaying,
    isReplayPlaying,
    isReviewMode,
    replayPosition,
    replayTotalTokens,
    // Actions
    flush,
    setPlaybackRate: updatePlaybackRate,
    loadAndReplay,
    // Replay controls
    replayPlayPause,
    replaySeek,
    replayStepForward,
    replayStepBack,
    replayJumpToStart,
    replayJumpToEnd,
    // Context window controls
    contextRange,
    updateContextRange,
    focusAroundPlayhead,
    showAllTokens,
    showOutOfRangeTokens,
    toggleOutOfRangeTokens,
    showOutOfRangeArcs,
    toggleOutOfRangeArcs,
    showPromptTokens,
    togglePromptTokens,
    // Prophecy
    prophecy,
    prophecyCorrect,
    // Layer selection
    layerInfo,
    setLayers,
    // Layer transition animation
    layerTransitionRef,
    setTransitionConfig,
  } = useGhostwire(playbackRate);

  // Research workbench (patent-protected, Claim 5)
  const research = useResearchWorkbench();

  // Load a curated recording by fetching its .ghostline file
  const handleSelectRecording = useCallback(async (recording: CuratedRecording) => {
    setIsLoadingRecording(true);
    setCurrentRecording(recording);
    setShowWelcome(false);
    try {
      const basePath = import.meta.env.BASE_URL || '/';
      const response = await fetch(`${basePath}recordings/${recording.filename}`);
      if (!response.ok) throw new Error(`Failed to load ${recording.filename}: ${response.status}`);
      const json = await response.json();

      // Create a File-like blob so loadAndReplay can parse it
      const blob = new Blob([JSON.stringify(json)], { type: 'application/json' });
      const file = new File([blob], recording.filename, { type: 'application/json' });
      loadAndReplay(file);
    } catch (err) {
      console.error('Failed to load recording:', err);
      setCurrentRecording(null);
    } finally {
      setIsLoadingRecording(false);
    }
  }, [loadAndReplay]);

  // Reset replay minimize when replay ends
  useEffect(() => {
    if (!isReplaying) setReplayMinimized(false);
  }, [isReplaying]);

  // Sync playback rate
  useEffect(() => {
    updatePlaybackRate(playbackRate);
  }, [playbackRate, updatePlaybackRate]);

  // Sync layer transition settings
  useEffect(() => {
    setTransitionConfig({
      tokenDuration: settings.visual.layerTokenDuration,
      segmentDuration: settings.visual.layerSegmentDuration,
      minStagger: settings.visual.layerMinStagger,
      beatDuration: settings.visual.layerBeatDuration,
    });
  }, [settings.visual.layerTokenDuration, settings.visual.layerSegmentDuration, settings.visual.layerMinStagger, settings.visual.layerBeatDuration, setTransitionConfig]);

  // Apply UI theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.visual.uiTheme);
  }, [settings.visual.uiTheme]);

  // Clear selection on replay mode change
  useEffect(() => {
    if (isReplaying) setSelectedTokenPosition(null);
  }, [isReplaying]);

  // Wrap seek actions to clear selection
  const handleSeek = useCallback((position: number) => {
    setSelectedTokenPosition(null);
    replaySeek(position);
  }, [replaySeek]);

  const handleStepForward = useCallback(() => {
    setSelectedTokenPosition(null);
    replayStepForward();
  }, [replayStepForward]);

  const handleStepBack = useCallback(() => {
    setSelectedTokenPosition(null);
    replayStepBack();
  }, [replayStepBack]);

  const handleJumpToStart = useCallback(() => {
    setSelectedTokenPosition(null);
    replayJumpToStart();
  }, [replayJumpToStart]);

  const handleJumpToEnd = useCallback(() => {
    setSelectedTokenPosition(null);
    replayJumpToEnd();
  }, [replayJumpToEnd]);

  const handleSelectToken = useCallback((position: number | null) => {
    setSelectedTokenPosition(position);
  }, []);

  // Build visualSettings object for GhostwireScene
  const visualSettings = {
    ...settings.visual,
    ribbonTrails: settings.visual.ribbonTrails ?? false,
    trajectoryGradient: true,
    animatedArcPulses: false,
    arcThicknessWeight: true,
    arcGlowTrails: false,
    pauseDrama: true,
    trajectoryStyle: settings.visual.trajectoryStyle || 'lines',
    arcColorMode: settings.visual.arcColorMode || 'pattern',
    uncertaintyStatic: settings.visual.uncertaintyStatic ?? false,
    cameraAutoDrift: settings.visual.cameraAutoDrift ?? false,
    dynamicBackground: settings.visual.dynamicBackground ?? false,
  };

  const textSizeScale = { small: '0.85', medium: '1', large: '1.2', 'x-large': '1.4' }[settings.visual.textSize ?? 'medium'];

  return (
    <div className="app" style={{ fontSize: `calc(1rem * ${textSizeScale})` }}>
      {/* Welcome landing — shown until first recording is selected */}
      {showWelcome && !isReplaying && (
        <WelcomeLanding onSelectRecording={handleSelectRecording} />
      )}

      {/* 3D Visualization - Full Screen */}
      <GhostwireScene
        trajectory={trajectory}
        currentToken={currentToken}
        isGenerating={isGenerating || isBuffering}
        pauseState={pauseState}
        playbackRate={playbackRate}
        showAllLabels={settings.display.showAllLabels}
        showLandmarks={settings.display.showLandmarks}
        showAttentionArcs={settings.display.showAttentionArcs}
        enabledHeads={settings.display.enabledHeads}
        landmarkOpacity={settings.display.landmarkOpacity}
        selectedTokenPosition={selectedTokenPosition}
        onSelectToken={handleSelectToken}
        visualSettings={visualSettings}
        contextRange={isReplaying ? contextRange : null}
        showOutOfRangeTokens={showOutOfRangeTokens}
        showOutOfRangeArcs={showOutOfRangeArcs}
        showPromptTokens={settings.display.showPromptTokens}
        layerTransitionRef={layerTransitionRef}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        <div className="top-row">
          <StatusDisplay
            isConnected={isConnected}
            isGenerating={isGenerating}
            isBuffering={isBuffering}
            bufferSize={bufferSize}
            rawTokenCount={rawTokenCount}
            stats={stats}
            config={config}
            currentToken={currentToken}
            trajectory={trajectory}
            error={error}
            pauseState={pauseState}
            onFlush={flush}
          />
          <RecordingSelector
            currentRecordingId={currentRecording?.id ?? null}
            onSelect={handleSelectRecording}
            isLoading={isLoadingRecording}
          />
        </div>

        {/* Bottom: Replay Controls only (no generation input) */}
        <div className="bottom-controls">
          {isReplaying && (
            <div className={`replay-controls-container ${replayMinimized ? 'minimized' : ''}`}>
              {replayMinimized ? (
                <div className="replay-minimized-pill">
                  <button className="replay-btn play-pause" onClick={replayPlayPause}>
                    {isReplayPlaying ? '\u23F8' : '\u25B6'}
                  </button>
                  <span className="replay-position">
                    <span className="position-current">{replayPosition}</span>
                    <span className="position-separator">/</span>
                    <span className="position-total">{replayTotalTokens}</span>
                  </span>
                  <button className="replay-minimize-btn" onClick={() => setReplayMinimized(false)} title="Expand replay">{'\u25B4'}</button>
                </div>
              ) : (
                <>
                  <ReplayControls
                    currentPosition={replayPosition}
                    totalTokens={replayTotalTokens}
                    contextRange={contextRange}
                    onContextRangeChange={updateContextRange}
                    isPlaying={isReplayPlaying}
                    onSeek={handleSeek}
                    onPlayPause={replayPlayPause}
                    onStepBack={handleStepBack}
                    onStepForward={handleStepForward}
                    onJumpToStart={handleJumpToStart}
                    onJumpToEnd={handleJumpToEnd}
                    showOutOfRangeTokens={showOutOfRangeTokens}
                    onToggleOutOfRangeTokens={toggleOutOfRangeTokens}
                    showOutOfRangeArcs={showOutOfRangeArcs}
                    onToggleOutOfRangeArcs={toggleOutOfRangeArcs}
                    showPromptTokens={settings.display.showPromptTokens}
                    onTogglePromptTokens={() => setSettings(s => ({ ...s, display: { ...s.display, showPromptTokens: !s.display.showPromptTokens } }))}
                    onFocusAround={focusAroundPlayhead}
                    onShowAll={showAllTokens}
                  />
                  <button className="replay-minimize-btn" onClick={() => setReplayMinimized(true)} title="Minimize replay">{'\u25BE'}</button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Generated text panel */}
      <GeneratedText
        prompt={config?.prompt || currentRecording?.title || ''}
        trajectory={trajectory}
        isGenerating={isGenerating || isBuffering}
        selectedPosition={selectedTokenPosition}
        onSelectToken={handleSelectToken}
      />

      {/* Title */}
      <div className="title">
        <h1>GHOSTLINE</h1>
        <p>{isReplaying ? 'Exploring recording.' : 'Choose a recording to begin.'}</p>
      </div>

      {/* Toolbar (top-right) — wiki, settings, research, layer selector */}
      <Toolbar
        activePanel={activePanel}
        onTogglePanel={togglePanel}
        isResearchRunning={research.isRunning}
        layerInfo={layerInfo}
        onLayerChange={(layer) => setLayers({ render: layer })}
      />

      {/* Wiki Panel */}
      <WikiPanel
        isOpen={activePanel === 'wiki'}
        onClose={() => setActivePanel(null)}
        activeEntryId={activeEntryId}
        onClearActive={() => setActiveEntryId(null)}
      />

      {/* Token Inspector */}
      <TokenInspector
        token={selectedTokenPosition !== null ? (trajectory.find(t => t.position === selectedTokenPosition) ?? null) : null}
        tokenIndex={selectedTokenPosition}
        onOpenWiki={handleOpenWiki}
      />

      {/* Signals Panel */}
      <SignalsPanel
        trajectory={trajectory}
        currentToken={currentToken?.position ?? (trajectory.length - 1)}
        selectedToken={selectedTokenPosition}
        isGenerating={isGenerating || isBuffering}
        prophecy={prophecy}
        prophecyCorrect={prophecyCorrect}
      />

      {/* Settings Panel */}
      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        disabled={false}
        isOpen={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
      />

      {/* Research Panel (patent-protected, Claim 5) */}
      <UnifiedResearchPanel
        isOpen={activePanel === 'research'}
        onClose={() => setActivePanel(null)}
        onOpenWiki={handleOpenWiki}
        trajectory={trajectory}
        selectedToken={selectedTokenPosition}
        onSelectToken={handleSelectToken}
        onRunCompare={research.runCompare}
        onRunSweep={research.runSweep}
        onRunHypothesis={research.runHypothesis}
        loadResearchHistory={research.loadResearchHistory}
        loadResearchRun={research.loadResearchRun}
        researchStatus={research.status}
        researchResults={research.results}
        researchPresets={research.presets}
        researchLibrary={research.library}
        researchRunHistory={research.runHistory}
        onStartRun={research.startRun}
        onCancelRun={research.cancelRun}
        onDownload={research.downloadResults}
        onReset={research.resetStatus}
        onLoadLibrary={research.loadLibrary}
        onLoadHistory={research.loadHistory}
      />

      {/* Annotation Overlay */}
      <AnnotationOverlay
        recording={currentRecording}
        currentTokenIndex={replayPosition}
        isPlaying={isReplayPlaying}
      />

      {/* First-Load Tutorial */}
      <Tutorial />

      {/* Footer */}
      <div className="prototype-footer">
        GhostLine Demo Viewer &middot; Explore LLM Geometric Internals &middot; v2.0
      </div>
    </div>
  );
}

export default App;
