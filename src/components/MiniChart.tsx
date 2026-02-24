/**
 * MiniChart — Lightweight canvas-based chart component for GhostLine.
 * Supports line charts (single/multi-series), bar charts, and hover tooltips.
 * Zero dependencies — pure Canvas2D.
 */

import { useRef, useEffect, useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ChartSeries {
  label: string;
  data: number[];
  color: string;
  dashed?: boolean;
}

export interface ChartProps {
  /** Array of series to plot */
  series: ChartSeries[];
  /** X-axis labels (optional — defaults to indices) */
  xLabels?: string[];
  /** Chart width in px */
  width?: number;
  /** Chart height in px */
  height?: number;
  /** Chart type */
  type?: 'line' | 'bar';
  /** Title shown above chart */
  title?: string;
  /** Y-axis label */
  yLabel?: string;
  /** X-axis label */
  xLabel?: string;
  /** Show grid lines */
  grid?: boolean;
  /** Show legend */
  legend?: boolean;
  /** Custom Y range [min, max] */
  yRange?: [number, number];
  /** Callback on hover: (index, x, y) */
  onHover?: (index: number | null) => void;
  /** Highlighted x index */
  highlightIndex?: number | null;
}

// ============================================================================
// Constants
// ============================================================================

const PADDING = { top: 24, right: 12, bottom: 28, left: 48 };
const FONT = '10px monospace';
const BG_COLOR = 'rgba(0, 0, 0, 0.3)';
const GRID_COLOR = 'rgba(255, 255, 255, 0.06)';
const AXIS_COLOR = 'rgba(255, 255, 255, 0.2)';
const TEXT_COLOR = 'rgba(255, 255, 255, 0.5)';
const HIGHLIGHT_COLOR = 'rgba(255, 255, 255, 0.15)';

// ============================================================================
// Component
// ============================================================================

export function MiniChart({
  series,
  xLabels,
  width = 300,
  height = 150,
  type = 'line',
  title,
  yLabel,
  xLabel,
  grid = true,
  legend = true,
  yRange,
  onHover,
  highlightIndex,
}: ChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Compute data range
  const allValues = series.flatMap(s => s.data.filter(v => v !== null && v !== undefined && !isNaN(v)));
  const dataLen = Math.max(...series.map(s => s.data.length), 1);

  const yMin = yRange ? yRange[0] : (allValues.length > 0 ? Math.min(...allValues) : 0);
  const yMax = yRange ? yRange[1] : (allValues.length > 0 ? Math.max(...allValues) : 1);
  const ySpan = yMax - yMin || 1;

  // Chart area
  const chartX = PADDING.left;
  const chartY = PADDING.top;
  const chartW = width - PADDING.left - PADDING.right;
  const chartH = height - PADDING.top - PADDING.bottom;

  // Map data to canvas coords
  const toCanvasX = useCallback((i: number) => chartX + (i / Math.max(dataLen - 1, 1)) * chartW, [chartX, chartW, dataLen]);
  const toCanvasY = useCallback((v: number) => chartY + chartH - ((v - yMin) / ySpan) * chartH, [chartY, chartH, yMin, ySpan]);

  // Draw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Title
    if (title) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.font = '11px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(title, chartX, 14);
    }

    // Grid
    if (grid) {
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 1;
      const gridLines = 4;
      for (let i = 0; i <= gridLines; i++) {
        const y = chartY + (i / gridLines) * chartH;
        ctx.beginPath();
        ctx.moveTo(chartX, y);
        ctx.lineTo(chartX + chartW, y);
        ctx.stroke();
      }
    }

    // Y-axis labels
    ctx.fillStyle = TEXT_COLOR;
    ctx.font = FONT;
    ctx.textAlign = 'right';
    const gridLines = 4;
    for (let i = 0; i <= gridLines; i++) {
      const val = yMax - (i / gridLines) * ySpan;
      const y = chartY + (i / gridLines) * chartH;
      ctx.fillText(formatNumber(val), chartX - 4, y + 3);
    }

    // X-axis labels
    ctx.textAlign = 'center';
    const xStep = Math.max(1, Math.floor(dataLen / 6));
    for (let i = 0; i < dataLen; i += xStep) {
      const x = toCanvasX(i);
      const label = xLabels?.[i] ?? String(i);
      ctx.fillText(label, x, height - 4);
    }

    // Y label
    if (yLabel) {
      ctx.save();
      ctx.translate(10, chartY + chartH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = FONT;
      ctx.fillText(yLabel, 0, 0);
      ctx.restore();
    }

    // X label
    if (xLabel) {
      ctx.fillStyle = TEXT_COLOR;
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.fillText(xLabel, chartX + chartW / 2, height - 2);
    }

    // Axes
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartX, chartY);
    ctx.lineTo(chartX, chartY + chartH);
    ctx.lineTo(chartX + chartW, chartY + chartH);
    ctx.stroke();

    // Highlight column
    const activeIdx = highlightIndex ?? hoverIdx;
    if (activeIdx !== null && activeIdx >= 0 && activeIdx < dataLen) {
      const hx = toCanvasX(activeIdx);
      ctx.fillStyle = HIGHLIGHT_COLOR;
      ctx.fillRect(hx - 1, chartY, 2, chartH);
    }

    // Draw series
    if (type === 'line') {
      for (const s of series) {
        ctx.strokeStyle = s.color;
        ctx.lineWidth = 1.5;
        if (s.dashed) ctx.setLineDash([4, 3]);
        else ctx.setLineDash([]);

        ctx.beginPath();
        let started = false;
        for (let i = 0; i < s.data.length; i++) {
          const v = s.data[i];
          if (v === null || v === undefined || isNaN(v)) continue;
          const x = toCanvasX(i);
          const y = toCanvasY(v);
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }
    } else if (type === 'bar') {
      const barCount = series.length;
      const groupWidth = chartW / dataLen;
      const barWidth = (groupWidth * 0.7) / barCount;
      const barGap = groupWidth * 0.3 / 2;

      for (let si = 0; si < series.length; si++) {
        const s = series[si];
        ctx.fillStyle = s.color;
        for (let i = 0; i < s.data.length; i++) {
          const v = s.data[i];
          if (v === null || v === undefined || isNaN(v)) continue;
          const x = chartX + i * groupWidth + barGap + si * barWidth;
          const barH = ((v - yMin) / ySpan) * chartH;
          const y = chartY + chartH - barH;
          ctx.fillRect(x, y, barWidth, barH);
        }
      }
    }

    // Hover tooltip
    if (activeIdx !== null && activeIdx >= 0 && activeIdx < dataLen) {
      const hx = toCanvasX(activeIdx);
      const tooltipLines: string[] = [];
      if (xLabels?.[activeIdx]) tooltipLines.push(xLabels[activeIdx]);
      else tooltipLines.push(`#${activeIdx}`);
      for (const s of series) {
        const v = s.data[activeIdx];
        if (v !== null && v !== undefined && !isNaN(v)) {
          tooltipLines.push(`${s.label}: ${formatNumber(v)}`);
        }
      }

      const lineH = 13;
      const tipW = Math.max(...tooltipLines.map(l => l.length)) * 6.5 + 12;
      const tipH = tooltipLines.length * lineH + 8;
      let tipX = hx + 8;
      if (tipX + tipW > width - 4) tipX = hx - tipW - 8;
      let tipY = chartY + 4;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(tipX, tipY, tipW, tipH, 4);
      ctx.fill();
      ctx.stroke();

      ctx.font = FONT;
      ctx.textAlign = 'left';
      for (let li = 0; li < tooltipLines.length; li++) {
        ctx.fillStyle = li === 0 ? 'rgba(255,255,255,0.7)' : (series[li - 1]?.color ?? TEXT_COLOR);
        ctx.fillText(tooltipLines[li], tipX + 6, tipY + 12 + li * lineH);
      }

      // Dots on series
      for (const s of series) {
        const v = s.data[activeIdx];
        if (v !== null && v !== undefined && !isNaN(v)) {
          ctx.fillStyle = s.color;
          ctx.beginPath();
          ctx.arc(hx, toCanvasY(v), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Legend
    if (legend && series.length > 1) {
      const legX = chartX + chartW - series.length * 70;
      const legY = chartY - 8;
      ctx.font = FONT;
      ctx.textAlign = 'left';
      for (let i = 0; i < series.length; i++) {
        const s = series[i];
        const x = legX + i * 70;
        ctx.fillStyle = s.color;
        ctx.fillRect(x, legY - 3, 12, 2);
        if (s.dashed) {
          ctx.fillStyle = BG_COLOR;
          ctx.fillRect(x + 4, legY - 3, 3, 2);
        }
        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(s.label, x + 16, legY);
      }
    }
  }, [series, xLabels, width, height, type, title, yLabel, xLabel, grid, legend, yRange, highlightIndex, hoverIdx, chartX, chartY, chartW, chartH, toCanvasX, toCanvasY, yMin, yMax, ySpan, dataLen]);

  // Mouse tracking
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    if (mx < chartX || mx > chartX + chartW) {
      setHoverIdx(null);
      onHover?.(null);
      return;
    }
    const idx = Math.round(((mx - chartX) / chartW) * (dataLen - 1));
    const clamped = Math.max(0, Math.min(dataLen - 1, idx));
    setHoverIdx(clamped);
    onHover?.(clamped);
  }, [chartX, chartW, dataLen, onHover]);

  const handleMouseLeave = useCallback(() => {
    setHoverIdx(null);
    onHover?.(null);
  }, [onHover]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height, borderRadius: 6 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    />
  );
}

// ============================================================================
// Helpers
// ============================================================================

function formatNumber(v: number): string {
  if (Math.abs(v) >= 1000) return v.toFixed(0);
  if (Math.abs(v) >= 10) return v.toFixed(1);
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(3);
}
