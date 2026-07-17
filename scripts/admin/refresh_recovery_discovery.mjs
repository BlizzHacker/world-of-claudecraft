import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const manifestPath = join(root, 'config/cryptic-recovery/features.json');
const outputPath = join(root, 'config/cryptic-recovery/discovery.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

function git(args, options = {}) {
  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    ...options,
  }).trim();
}

function lines(value) {
  return value ? value.split(/\r?\n/).filter(Boolean) : [];
}

function parseRefLines(value, source) {
  return lines(value).map((line) => {
    const [sha, ...rest] = line.split(/\s+/);
    return { source, ref: rest.join(' '), sha };
  }).filter((row) => /^[0-9a-f]{40}$/.test(row.sha) && row.ref);
}

function patchIds(shas) {
  const result = new Map();
  for (let start = 0; start < shas.length; start += 32) {
    const batch = shas.slice(start, start + 32);
    let diff;
    try {
      diff = execFileSync('git', ['show', '--format=raw', '--no-ext-diff', '--binary', '--full-index', '--no-renames', ...batch], {
        cwd: root,
        encoding: 'utf8',
        maxBuffer: 512 * 1024 * 1024,
      });
    } catch (error) {
      throw new Error(`git show failed for batch ${start}-${start + batch.length}: ${error.stderr ?? error.message}`);
    }
    const patched = spawnSync('git', ['patch-id', '--stable'], {
      cwd: root,
      input: diff,
      encoding: 'utf8',
    });
    if (patched.status !== 0) throw new Error(`git patch-id failed for batch ${start}: ${patched.stderr}`);
    for (const line of lines(patched.stdout)) {
      const [id, sha] = line.split(/\s+/);
      if (/^[0-9a-f]{40}$/.test(id) && /^[0-9a-f]{40}$/.test(sha) && !result.has(sha)) result.set(sha, id);
    }
    process.stderr.write(`indexed patch IDs: ${Math.min(start + batch.length, shas.length)}/${shas.length}\n`);
  }
  return result;
}

function isAncestor(ancestor, descendant) {
  return spawnSync('git', ['merge-base', '--is-ancestor', ancestor, descendant], {
    cwd: root,
    stdio: 'ignore',
  }).status === 0;
}

const localRefs = parseRefLines(git(['for-each-ref', '--format=%(objectname) %(refname)']), 'local')
  .sort((a, b) => a.ref.localeCompare(b.ref));
const remotes = lines(git(['remote']));
const advertisedRefs = remotes.flatMap((remote) => {
  try {
    return parseRefLines(git(['ls-remote', '--heads', '--tags', remote]), remote);
  } catch (error) {
    throw new Error(`unable to refresh advertised refs for ${remote}: ${error.message}`);
  }
}).sort((a, b) => `${a.source}/${a.ref}`.localeCompare(`${b.source}/${b.ref}`));

const bundleCandidates = readdirSync(join(root, 'tmp/recovery'))
  .filter((name) => name.endsWith('.bundle'))
  .sort();
if (bundleCandidates.length === 0) throw new Error('no preserved recovery bundle found');
const bundlePath = join(root, 'tmp/recovery', bundleCandidates[0]);
const bundleRefs = parseRefLines(git(['bundle', 'list-heads', bundlePath]), 'bundle')
  .sort((a, b) => a.ref.localeCompare(b.ref));

const upstreamTips = [
  ...localRefs.filter((row) => row.ref.startsWith('refs/remotes/upstream/')).map((row) => row.sha),
];
const uniqueUpstreamTips = [...new Set(upstreamTips)];
const uniqueCommits = lines(git(['rev-list', '--all', '--not', ...uniqueUpstreamTips]));
const candidateSha = git(['rev-parse', 'HEAD']);

const upstreamCommitIds = lines(git(['rev-list', ...localRefs
  .filter((row) => row.ref.startsWith('refs/remotes/upstream/'))
  .map((row) => row.ref), '--no-merges']));
const cherryLines = lines(git(['cherry', 'upstream/release/v0.26.0', 'HEAD']));
const cherryEquivalent = new Set(cherryLines.filter((line) => line.startsWith('- ')).map((line) => line.slice(2).trim()));
const candidateCommits = new Set(lines(git(['rev-list', 'HEAD'])));

const localPatchIds = patchIds(uniqueCommits);
const commits = uniqueCommits.sort().map((sha, index) => {
  const parentsLine = git(['rev-list', '--parents', '-n', '1', sha]);
  const [, ...parents] = parentsLine.split(/\s+/);
  const subject = git(['show', '-s', '--format=%s', sha]).replace(/<[^>\s]+@[^>\s]+>/g, '<redacted>');
  const author = 'redacted';
  const refs = lines(git(['for-each-ref', '--contains', sha, '--format=%(refname)']));
  const id = parents.length === 1 ? (localPatchIds.get(sha) ?? null) : null;
  const emptyPatch = parents.length === 1 && !id && spawnSync('git', ['diff-tree', '--quiet', '--no-ext-diff', parents[0], sha], { cwd: root, stdio: 'ignore' }).status === 0;
  const equivalent = id && cherryEquivalent.has(sha);
  const candidate = candidateCommits.has(sha);
  let disposition = 'dead-letter';
  let evidence = 'reachable from a preserved non-candidate ref; retained for audit and not promoted';
  if (equivalent) {
    disposition = 'superseded';
    evidence = 'stable patch-id equivalent reported by git cherry against upstream/release/v0.26.0';
  } else if (candidate) {
    disposition = 'recovered';
    evidence = `reachable from candidate ${candidateSha}`;
  }
  if ((index + 1) % 100 === 0) process.stderr.write(`classified commits: ${index + 1}/${uniqueCommits.length}\n`);
  return {
    sha,
    parents,
    patchId: parents.length === 1 ? id : null,
    emptyPatchMarker: emptyPatch ? 'empty' : null,
    mergeMarker: parents.length > 1 ? 'merge' : null,
    upstreamEquivalentSha: null,
    upstreamEquivalenceRef: equivalent ? 'refs/remotes/upstream/release/v0.26.0' : null,
    sourceRefs: refs,
    subject,
    author,
    disposition,
    owner: 'recovery-audit',
    evidence,
  };
});

const ledger = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  candidateSha,
  preservedBundle: { path: bundlePath.replace(`${root}\\`, '').replaceAll('\\', '/'), refs: bundleRefs },
  localRefs,
  advertisedRefs,
  upstreamUniverse: {
    tipCount: uniqueUpstreamTips.length,
    tips: uniqueUpstreamTips.sort(),
    commitCount: upstreamCommitIds.length,
    patchIdComparison: 'git cherry against upstream/release/v0.26.0; equivalent rows retain the exact local SHA and comparison ref',
  },
  uniqueCommits: commits,
  classificationPolicy: {
    superseded: 'stable patch-id matches a commit reachable from the local upstream ref universe',
    recovered: 'commit is reachable from the candidate branch and has no upstream patch-id equivalent',
    deadLetter: 'commit is preserved by another local ref but is not part of the candidate recovery line',
    merge: 'merge commits carry an explicit merge marker instead of a synthetic patch-id',
  },
};
const canonical = JSON.stringify(ledger);
ledger.digest = createHash('sha256').update(canonical).digest('hex');
writeFileSync(outputPath, `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  output: outputPath,
  localRefCount: localRefs.length,
  advertisedRefCount: advertisedRefs.length,
  bundleRefCount: bundleRefs.length,
  upstreamCommitCount: upstreamCommitIds.length,
  uniqueCommitCount: commits.length,
  digest: ledger.digest,
}, null, 2));
