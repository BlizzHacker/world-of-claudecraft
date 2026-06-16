import type { LiveReportTarget } from './moderation_db';

export interface ReportTargetResolvers {
  reportTargetForPid(pid: number): LiveReportTarget | null;
  findCharacterReportTargetByName(name: string): Promise<LiveReportTarget | null>;
}

export type ResolveReportTargetResult =
  | { ok: true; target: LiveReportTarget }
  | { ok: false; status: number; error: string };

export async function resolveReportTarget(
  body: Record<string, unknown>,
  resolvers: ReportTargetResolvers,
): Promise<ResolveReportTargetResult> {
  const targetPid = Number(body.targetPid);
  if (Number.isFinite(targetPid)) {
    const target = resolvers.reportTargetForPid(targetPid);
    return target
      ? { ok: true, target }
      : { ok: false, status: 404, error: 'that player is no longer online' };
  }

  const name = typeof body.targetCharacterName === 'string' ? body.targetCharacterName.trim() : '';
  if (name) {
    const target = await resolvers.findCharacterReportTargetByName(name);
    return target
      ? { ok: true, target }
      : { ok: false, status: 404, error: 'that player could not be found' };
  }

  return { ok: false, status: 400, error: 'invalid report target' };
}
