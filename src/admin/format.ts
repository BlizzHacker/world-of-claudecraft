// Small display formatters shared across the admin dashboard.
import { t } from './i18n';

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function fmtDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ${m % 60}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
}

export function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function fmtRelative(iso: string | null): string {
  if (!iso) return t('common.never');
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return t('common.never');
  if (ms < 0) return t('common.justNow');
  const sec = Math.floor(ms / 1000);
  let value: string;
  if (sec < 60) value = `${sec}s`;
  else {
    const min = Math.floor(sec / 60);
    if (min < 60) value = `${min}m`;
    else {
      const hr = Math.floor(min / 60);
      value = hr < 24 ? `${hr}h` : `${Math.floor(hr / 24)}d`;
    }
  }
  return t('common.ago', { value });
}

// 12345 copper -> "1g 23s 45c"
export function fmtCopper(copper: number): string {
  const c = Math.max(0, Math.round(copper));
  const gold = Math.floor(c / 10_000);
  const silver = Math.floor((c % 10_000) / 100);
  const rest = c % 100;
  const g = t('money.gold'), s = t('money.silver'), cu = t('money.copper');
  if (gold > 0) return `${gold}${g} ${silver}${s} ${rest}${cu}`;
  if (silver > 0) return `${silver}${s} ${rest}${cu}`;
  return `${rest}${cu}`;
}

export function fmtBytes(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (bytes >= 1024 * 1024) return `${Math.round(bytes / (1024 * 1024))} MB`;
  return `${Math.round(bytes / 1024)} KB`;
}
