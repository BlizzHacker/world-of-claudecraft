// Public, read-only upstream contribution feed. The page uses this endpoint
// instead of a hand-maintained PR list, so opening, merging, or closing a
// ClaudeCraft PR is reflected automatically without exposing credentials.

import type * as http from 'node:http';
import { json } from './http_util';

export interface ContributionEntry {
  number: number;
  title: string;
  url: string;
  state: 'open' | 'merged';
  updatedAt: string;
  author: string;
  labels: string[];
}

interface PullRequestLike {
  number?: unknown;
  title?: unknown;
  html_url?: unknown;
  state?: unknown;
  merged_at?: unknown;
  updated_at?: unknown;
  user?: { login?: unknown } | null;
  labels?: Array<{ name?: unknown }>;
}

export function normalizeUpstreamPulls(rows: readonly PullRequestLike[]): ContributionEntry[] {
  return rows
    .flatMap((row) => {
      const number = Number(row.number);
      const title = typeof row.title === 'string' ? row.title.trim() : '';
      const url = typeof row.html_url === 'string' ? row.html_url : '';
      const merged = typeof row.merged_at === 'string' && row.merged_at.length > 0;
      const open = row.state === 'open';
      if (
        !Number.isSafeInteger(number) ||
        !title ||
        !/^https:\/\/github\.com\//.test(url) ||
        (!open && !merged)
      )
        return [];
      return [
        {
          number,
          title,
          url,
          state: merged ? 'merged' : 'open',
          updatedAt:
            typeof row.updated_at === 'string' ? row.updated_at : new Date(0).toISOString(),
          author: typeof row.user?.login === 'string' ? row.user.login : 'unknown',
          labels: (row.labels ?? []).flatMap((label) =>
            typeof label.name === 'string' ? [label.name] : [],
          ),
        } satisfies ContributionEntry,
      ];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || b.number - a.number);
}

let cached: { at: number; entries: ContributionEntry[] } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export async function upstreamContributions(): Promise<ContributionEntry[]> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.entries;
  const repo = process.env.UPSTREAM_REPO?.trim() || 'levy-street/world-of-claudecraft';
  const token = process.env.GITHUB_TOKEN?.trim();
  const response = await fetch(
    `https://api.github.com/repos/${repo}/pulls?state=all&per_page=100&sort=updated&direction=desc`,
    {
      headers: {
        Accept: 'application/vnd.github+json',
        'User-Agent': 'cryptic-realm-contributions',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    },
  );
  if (!response.ok) throw new Error(`upstream contribution feed returned ${response.status}`);
  const body = (await response.json()) as unknown;
  const entries = normalizeUpstreamPulls(Array.isArray(body) ? (body as PullRequestLike[]) : []);
  cached = { at: Date.now(), entries };
  return entries;
}

/** Dispatch. Returns true when the public feed path matched. */
export async function maybeHandleContributionsApi(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  pathname: string,
): Promise<boolean> {
  if (pathname !== '/api/contributions' || req.method !== 'GET') return false;
  try {
    json(res, 200, {
      ok: true,
      source: process.env.UPSTREAM_REPO?.trim() || 'levy-street/world-of-claudecraft',
      entries: await upstreamContributions(),
    });
  } catch {
    json(res, 502, { ok: false, error: 'upstream contribution feed unavailable' });
  }
  return true;
}
