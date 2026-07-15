import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = resolve(root, 'config/cryptic-recovery/features.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const errors = [];
const requiredIds = Array.from({ length: 27 }, (_, i) => `F-${String(i + 1).padStart(3, '0')}`);
const featureIds = manifest.features?.map((feature) => feature.id) ?? [];
const disabledOpen = new Set(['F-002', 'F-016', 'F-018', 'F-019', 'F-020', 'F-021', 'F-022', 'F-025', 'F-026', 'F-027']);

function requireValue(condition, message) { if (!condition) errors.push(message); }
function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

requireValue(manifest.schemaVersion === 1, 'schemaVersion must be 1');
requireValue(manifest.candidate?.branch === 'codex/cryptic-recovery-program', 'candidate branch drifted');
requireValue(/^[0-9a-f]{9,40}$/.test(manifest.candidate?.sha ?? ''), 'candidate sha must be a git prefix');
requireValue(manifest.production?.host === '192.168.0.6', 'production host is not the evidenced target');
requireValue(manifest.production?.container === 171, 'production container is not LXC 171');
requireValue(manifest.production?.repository === '/opt/cryptic-realm', 'production repository drifted');
requireValue(manifest.upstream?.release?.sha === 'd8a871763d7ad1384d224a32b3c1ac0dd9cfc909', 'pinned upstream release drifted');
requireValue(manifest.upstream?.gauntletReference?.sha === '196487c8688825d6831278191d3160e622142ec5', 'gauntlet reference drifted');
requireValue(manifest.upstream?.housingReference?.sha === '505142a51f32550f0c6c0d917c4f22e61b51efe9', 'housing reference drifted');
requireValue(JSON.stringify([...featureIds].sort()) === JSON.stringify([...requiredIds].sort()), 'feature IDs must exhaustively cover F-001..F-027');
requireValue(new Set(featureIds).size === featureIds.length, 'feature IDs must be unique');
for (const feature of manifest.features ?? []) {
  requireValue(['recovered', 'superseded', 'rejected', 'dead-letter', 'open'].includes(feature.disposition), `${feature.id} has invalid disposition`);
  requireValue(typeof feature.checkpoint === 'string' && feature.checkpoint.length > 0, `${feature.id} is missing checkpoint`);
  if (disabledOpen.has(feature.id)) requireValue(feature.enabled === false, `${feature.id} must remain default-off`);
}
requireValue(manifest.stage?.mode === 'ephemeral_required', 'stage must fail closed until an isolated identity is pinned');

const currentSha = git('rev-parse', 'HEAD');
const currentBranch = git('branch', '--show-current');
const strict = process.argv.includes('--strict');
const candidateSha = git('rev-parse', `${manifest.candidate.sha}^{commit}`);
let candidateIsAncestor = true;
try { execFileSync('git', ['merge-base', '--is-ancestor', candidateSha, currentSha], { cwd: root, stdio: 'ignore' }); }
catch { candidateIsAncestor = false; }
requireValue(candidateIsAncestor, `candidate ${candidateSha} is not an ancestor of HEAD ${currentSha}`);
requireValue(currentBranch === manifest.candidate.branch, `current branch ${currentBranch} does not match manifest`);

if (errors.length) {
  console.error(`Recovery manifest: FAIL\n- ${errors.join('\n- ')}`);
  process.exitCode = 1;
} else if (strict && manifest.discovery?.status !== 'complete') {
  console.error('Recovery manifest: STRUCTURALLY VALID, PROMOTION BLOCKED');
  console.error('- exhaustive ref discovery and patch-ID classification are not complete');
  process.exitCode = 2;
} else {
  console.log(`Recovery manifest: PASS${manifest.discovery?.status === 'complete' ? '' : ' (promotion blocked: reconciliation required)'}`);
}
