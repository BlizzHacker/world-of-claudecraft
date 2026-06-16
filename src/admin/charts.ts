import { escapeHtml } from './format';

// Hand-rolled SVG bar charts — no chart library needed for bars and labels.

export interface BarPoint {
  label: string;
  value: number;
  title?: string;
}

const CHART_WIDTH = 560;
const CHART_HEIGHT = 180;
const AXIS_HEIGHT = 16;
const BAR_GAP = 2;
const MAX_X_LABELS = 10;

export function barChart(points: BarPoint[], opts: { valueSuffix?: string } = {}): string {
  if (points.length === 0) return '<div class="empty">no data yet</div>';
  const max = Math.max(...points.map((p) => p.value), 1);
  const plotHeight = CHART_HEIGHT - AXIS_HEIGHT;
  const barWidth = Math.max(1, CHART_WIDTH / points.length - BAR_GAP);
  const labelEvery = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));

  const bars = points.map((p, i) => {
    const h = Math.max(1, Math.round((p.value / max) * (plotHeight - 8)));
    const x = (i * CHART_WIDTH) / points.length;
    const y = plotHeight - h;
    const title = escapeHtml(p.title ?? `${p.label}: ${p.value}${opts.valueSuffix ?? ''}`);
    const label = i % labelEvery === 0
      ? `<text class="axis" x="${x + barWidth / 2}" y="${CHART_HEIGHT - 4}" text-anchor="middle">${escapeHtml(p.label)}</text>`
      : '';
    return `<g><rect class="bar" x="${x}" y="${y}" width="${barWidth}" height="${h}"><title>${title}</title></rect>${label}</g>`;
  });

  return `<svg viewBox="0 0 ${CHART_WIDTH} ${CHART_HEIGHT}" preserveAspectRatio="xMidYMid meet">
    <text class="axis" x="0" y="10">${max}${escapeHtml(opts.valueSuffix ?? '')}</text>
    ${bars.join('')}
  </svg>`;
}

export function chartPanel(title: string, bodyHtml: string): string {
  return `<div class="panel chart"><div class="panel-title">${escapeHtml(title)}</div>${bodyHtml}</div>`;
}
