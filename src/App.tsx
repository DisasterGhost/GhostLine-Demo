import { useState, useEffect, useCallback } from 'react';
import { GhostwireScene } from './components/GhostwireScene';
import { PromptInput } from './components/PromptInput';
import { StatusDisplay } from './components/StatusDisplay';
import { GeneratedText } from './components/GeneratedText';
import { Toolbar, type PanelId } from './components/Toolbar';
import { WikiPanel } from './components/WikiPanel';
import { TokenInspector } from './components/TokenInspector';
import { BatchPanel } from './components/BatchPanel';
import { UnifiedResearchPanel } from './components/UnifiedResearchPanel';
import { SettingsPanel, loadSettings, type AllSettings } from './components/SettingsPanel';
import { GenerationControls, loadGenerationConfig, saveGenerationConfig, type GenerationConfig } from './components/GenerationControls';
import { RecordingPanel } from './components/RecordingPanel';
import { ReplayControls } from './components/ReplayControls';
import { SignalsPanel } from './components/SignalsPanel';
import { useGhostwire } from './hooks/useGhostwire';
import { useResearchWorkbench } from './hooks/useResearchWorkbench';
import './App.css';

function App() {
  // Load settings from localStorage on mount
  const [settings, setSettings] = useState<AllSettings>(loadSettings);
  const [generationConfig, setGenerationConfigRaw] = useState<GenerationConfig>(loadGenerationConfig);
  const setGenerationConfig = useCallback((config: GenerationConfig) => {
    setGenerationConfigRaw(config);
    saveGenerationConfig(config);
  }, []);
  const [currentPrompt, setCurrentPrompt] = useState('The most important thing about artificial intelligence is');

  // Token selection state - lifted from GhostwireScene for control
  // null = follow currentToken, number = user override
  const [selectedTokenPosition, setSelectedTokenPosition] = useState<number | null>(null);

  // Unified panel state — only one panel open at a time
  const [activePanel, setActivePanel] = useState<PanelId | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const togglePanel = useCallback((panel: PanelId) => {
    setActivePanel(prev => prev === panel ? null : panel);
  }, []);

  const handleOpenWiki = useCallback((entryId: string) => {
    setActiveEntryId(entryId);
    setActivePanel('wiki');
  }, []);

  // Mobile-specific state
  const [genControlsOpen, setGenControlsOpen] = useState(false);
  const [replayMinimized, setReplayMinimized] = useState(false);

  // Get playback rate from settings
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
    isBatchRunning,
    batchProgress,
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
    generate,
    flush,
    setPlaybackRate: updatePlaybackRate,
    runBatch,
    cancelBatch,
    saveLastSession,
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
    // Prophecy (pre-generation prediction)
    prophecy,
    prophecyCorrect,
    // Layer selection
    layerInfo,
    setLayers,
    // Layer transition animation
    layerTransitionRef,
    setTransitionConfig,
  } = useGhostwire(playbackRate);

  // Reset replay minimize when replay ends
  useEffect(() => {
    if (!isReplaying) setReplayMinimized(false);
  }, [isReplaying]);

  // Research workbench
  const research = useResearchWorkbench();

  // Sync playback rate changes to the hook
  useEffect(() => {
    updatePlaybackRate(playbackRate);
  }, [playbackRate, updatePlaybackRate]);

  // Sync layer transition settings to the buffer
  useEffect(() => {
    setTransitionConfig({
      tokenDuration: settings.visual.layerTokenDuration,
      segmentDuration: settings.visual.layerSegmentDuration,
      minStagger: settings.visual.layerMinStagger,
      beatDuration: settings.visual.layerBeatDuration,
    });
  }, [settings.visual.layerTokenDuration, settings.visual.layerSegmentDuration, settings.visual.layerMinStagger, settings.visual.layerBeatDuration, setTransitionConfig]);

  // Apply UI theme to document root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.visual.uiTheme);
  }, [settings.visual.uiTheme]);

  // Clear selection when new generation starts
  useEffect(() => {
    if (isGenerating) {
      setSelectedTokenPosition(null);
    }
  }, [isGenerating]);

  // Clear selection when entering replay mode
  useEffect(() => {
    if (isReplaying) {
      setSelectedTokenPosition(null);
    }
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

  // Handle token selection from scene
  const handleSelectToken = useCallback((position: number | null) => {
    setSelectedTokenPosition(position);
  }, []);

  // Handle generation with full config
  const handleGenerate = useCallback((prompt: string) => {
    generate(prompt, {
      maxTokens: generationConfig.maxTokens,
      temperature: generationConfig.temperature,
      topP: generationConfig.topP,
      minP: generationConfig.minP,
      frequencyPenalty: generationConfig.frequencyPenalty,
      presencePenalty: generationConfig.presencePenalty,
      seed: generationConfig.seed,
      mirostatMode: generationConfig.mirostatMode,
      mirostatTau: generationConfig.mirostatTau,
      mirostatEta: generationConfig.mirostatEta,
      repetitionPenalty: generationConfig.repetitionPenalty,
      systemPrompt: generationConfig.systemPrompt,
      lambdaDetail: generationConfig.lambdaDetail,
      hallucinationSampling: generationConfig.hallucinationSampling,
    });
  }, [generate, generationConfig]);

  // Build visualSettings object for GhostwireScene
  // Spread settings.visual and only provide fallbacks for truly missing fields
  const visualSettings = {
    ...settings.visual,
    // Legacy fields that may be missing from old localStorage
    ribbonTrails: settings.visual.ribbonTrails ?? false,
    trajectoryGradient: true,  // Always on (no UI toggle)
    animatedArcPulses: false,  // Not implemented yet
    arcThicknessWeight: true,  // Implemented
    arcGlowTrails: false,      // Not implemented yet
    pauseDrama: true,          // Always on (no UI toggle yet)
    // Ensure these have defaults if missing from old localStorage
    trajectoryStyle: settings.visual.trajectoryStyle || 'lines',
    arcColorMode: settings.visual.arcColorMode || 'pattern',
    // New environment settings - use actual values from settings!
    uncertaintyStatic: settings.visual.uncertaintyStatic ?? false,
    cameraAutoDrift: settings.visual.cameraAutoDrift ?? false,
    dynamicBackground: settings.visual.dynamicBackground ?? false,
  };

  // Text size accessibility — apply CSS variable to root
  const textSizeScale = { small: '0.85', medium: '1', large: '1.2', 'x-large': '1.4' }[settings.visual.textSize ?? 'medium'];

  return (
    <div className="app" style={{ fontSize: `calc(1rem * ${textSizeScale})` }}>
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
        // Context window (replay mode only)
        contextRange={isReplaying ? contextRange : null}
        showOutOfRangeTokens={showOutOfRangeTokens}
        showOutOfRangeArcs={showOutOfRangeArcs}
        showPromptTokens={settings.display.showPromptTokens}
        layerTransitionRef={layerTransitionRef}
      />

      {/* UI Overlay */}
      <div className="ui-overlay">
        {/* Top left: Status + Recording */}
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

          {/* Recording Panel */}
          <RecordingPanel
            isRecording={isRecording}
            isReplaying={isReplaying}
            hasSession={hasSession}
            lastSession={lastSession}
            onSave={saveLastSession}
            onLoad={loadAndReplay}
            disabled={isGenerating || isBatchRunning}
          />
        </div>

        {/* Bottom: Replay Controls + Generation Controls + Input */}
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
          <div className={`generation-controls-wrapper ${genControlsOpen ? 'mobile-open' : ''}`}>
            <GenerationControls
              config={generationConfig}
              onChange={setGenerationConfig}
              disabled={isGenerating || isBatchRunning || research.isRunning || (isReplaying && !isReviewMode)}
            />
          </div>
          <div className="mobile-prompt-row">
            <button
              className={`mobile-gen-controls-toggle ${genControlsOpen ? 'active' : ''}`}
              onClick={() => setGenControlsOpen(o => !o)}
              title="Generation settings"
            >
              {'\u2699'}
            </button>
            <PromptInput
              value={currentPrompt}
              onChange={setCurrentPrompt}
              onSubmit={handleGenerate}
              disabled={!isConnected || isGenerating || isBatchRunning || research.isRunning || (isReplaying && !isReviewMode)}
              isGenerating={isGenerating || isBatchRunning}
            />
          </div>
        </div>
      </div>

      {/* Generated text panel - bottom right */}
      <GeneratedText
        prompt={config?.prompt || ''}
        trajectory={trajectory}
        isGenerating={isGenerating || isBuffering}
        selectedPosition={selectedTokenPosition}
        onSelectToken={handleSelectToken}
      />

      {/* Title */}
      <div className="title">
        <h1>GHOSTLINE</h1>
        <p>{isReplaying ? (isReviewMode ? 'Review generation.' : 'Replay mode.') : 'Explore LLM internals.'}</p>
      </div>

      {/* Unified Toolbar (top-right) */}
      <Toolbar
        activePanel={activePanel}
        onTogglePanel={togglePanel}
        isBatchRunning={isBatchRunning}
        batchProgress={batchProgress}
        isResearchRunning={research.isRunning}
        layerInfo={layerInfo}
        onLayerChange={(layer) => setLayers({ render: layer })}
      />

      {/* Wiki Panel (right sidebar) */}
      <WikiPanel
        isOpen={activePanel === 'wiki'}
        onClose={() => setActivePanel(null)}
        activeEntryId={activeEntryId}
        onClearActive={() => setActiveEntryId(null)}
      />

      {/* Token Inspector (bottom-right, above GeneratedText) */}
      <TokenInspector
        token={selectedTokenPosition !== null ? (trajectory.find(t => t.position === selectedTokenPosition) ?? null) : null}
        tokenIndex={selectedTokenPosition}
        onOpenWiki={handleOpenWiki}
      />

      {/* Validated Signals Panel - The Evidence */}
      <SignalsPanel
        trajectory={trajectory}
        currentToken={currentToken?.position ?? (trajectory.length - 1)}
        selectedToken={selectedTokenPosition}
        isGenerating={isGenerating || isBuffering}
        prophecy={prophecy}
        prophecyCorrect={prophecyCorrect}
      />

      {/* Unified Settings Panel */}
      <SettingsPanel
        settings={settings}
        onChange={setSettings}
        disabled={!isConnected}
        isOpen={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
      />

      {/* Batch Generator */}
      <BatchPanel
        currentPrompt={currentPrompt}
        isConnected={isConnected}
        isGenerating={isGenerating}
        isBatchRunning={isBatchRunning}
        batchProgress={batchProgress}
        onRunBatch={runBatch}
        onCancelBatch={cancelBatch}
        isOpen={activePanel === 'batch'}
      />

      {/* Unified Research Panel — all research tools in one sidebar */}
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

      {/* Footer */}
      <div className="prototype-footer">
        {config ? `${config.model} · Validated High-D Signals` : 'Connecting...'} · v2.0
      </div>
    </div>
  );
}

export default App;
