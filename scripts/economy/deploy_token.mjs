#!/usr/bin/env node
// Cryptic Realm SPL token deploy script. Run once from a local machine that has
// the Solana / Agave CLI installed. The mint-authority keypair never leaves the
// machine unless you explicitly copy it to the server for live claim minting.

import { access, readdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const NETWORK = (process.env.CR_NETWORK ?? 'mainnet').toLowerCase();
const RPC_URL = process.env.CR_SOLANA_RPC ?? (
  NETWORK === 'devnet'  ? 'https://api.devnet.solana.com' :
  NETWORK === 'testnet' ? 'https://api.testnet.solana.com' :
  'https://api.mainnet-beta.solana.com'
);
const DECIMALS = Number(process.env.CR_SOLANA_DECIMALS ?? 9);
const INITIAL_MINT_AMOUNT = process.env.CR_SOLANA_INITIAL_MINT ?? '0';
const KEYPAIR_PATH = process.env.CR_SOLANA_KEYPAIR ?? (
  process.platform === 'win32'
    ? path.join(os.homedir(), '.config', 'solana', 'cryptic-realm-mint.json')
    : path.join(os.homedir(), '.config', 'solana', 'cryptic-realm-mint.json')
);

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function discoverAgaveBinary(name) {
  const explicit = process.env[`CR_${name.replace('-', '_').toUpperCase()}_CLI`];
  if (explicit) return explicit;

  const exe = process.platform === 'win32' ? `${name}.exe` : name;
  const root = path.join(os.homedir(), '.local', 'share', 'solana');
  try {
    const entries = (await readdir(root, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('agave-'))
      .map((entry) => entry.name)
      .sort()
      .reverse();
    for (const entry of entries) {
      const candidate = path.join(root, entry, 'bin', exe);
      if (await exists(candidate)) return candidate;
    }
  } catch {
    // PATH fallback below.
  }
  return exe;
}

function normalizeAmount(amount, decimals) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('CR_SOLANA_INITIAL_MINT must be a non-negative number');
  if (value === 0) return '0';
  const scale = Math.pow(10, decimals);
  const raw = Math.floor(value * scale);
  if (raw <= 0) throw new Error(`initial mint is below token precision (${decimals} decimals)`);
  return (raw / scale).toFixed(decimals).replace(/\.?0+$/, '');
}

async function run(bin, args) {
  try {
    const { stdout } = await execFileAsync(bin, args, {
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return String(stdout);
  } catch (err) {
    const stdout = String(err?.stdout ?? '');
    const stderr = String(err?.stderr ?? '');
    const detail = (stderr || stdout || err?.message || 'unknown error').trim();
    throw new Error(`${path.basename(bin)} ${args[0] ?? ''} failed: ${detail}`);
  }
}

function parseJson(stdout) {
  return JSON.parse(stdout.trim());
}

async function main() {
  const solana = process.env.CR_SOLANA_CLI || await discoverAgaveBinary('solana');
  const solanaKeygen = process.env.CR_SOLANA_KEYGEN_CLI || await discoverAgaveBinary('solana-keygen');
  const splToken = process.env.CR_SPL_TOKEN_CLI || await discoverAgaveBinary('spl-token');
  const initialMint = normalizeAmount(INITIAL_MINT_AMOUNT, DECIMALS);

  console.log(`network          : ${NETWORK}`);
  console.log(`rpc              : ${RPC_URL}`);
  console.log(`decimals         : ${DECIMALS}`);
  console.log(`initial mint     : ${initialMint}`);
  console.log(`keypair          : ${KEYPAIR_PATH}`);
  console.log(`solana cli       : ${solana}`);
  console.log(`spl-token cli    : ${splToken}`);

  if (!(await exists(KEYPAIR_PATH))) {
    throw new Error(`Could not read keypair at ${KEYPAIR_PATH}. Set CR_SOLANA_KEYPAIR or run solana-keygen new.`);
  }

  const authority = (await run(solanaKeygen, ['pubkey', KEYPAIR_PATH])).trim();
  console.log(`payer / authority: ${authority}`);

  const balance = parseJson(await run(solana, ['balance', authority, '--url', RPC_URL, '--output', 'json']));
  console.log(`payer balance    : ${(Number(balance.lamports ?? 0) / 1e9).toFixed(4)} SOL`);
  if (Number(balance.lamports ?? 0) < 5_000_000) {
    throw new Error('payer balance is below ~0.005 SOL; top up before deploying');
  }

  console.log('\nCreating mint...');
  const createOut = parseJson(await run(splToken, [
    'create-token',
    '--decimals', String(DECIMALS),
    '--fee-payer', KEYPAIR_PATH,
    '--mint-authority', authority,
    '--url', RPC_URL,
    '--output', 'json',
  ]));
  const mintAddress = String(createOut.address ?? createOut.token ?? '').trim();
  if (!mintAddress) throw new Error('spl-token create-token did not return a mint address');
  console.log(`mint address     : ${mintAddress}`);

  if (Number(initialMint) > 0) {
    console.log(`Minting ${initialMint} tokens (decimals applied) to payer ATA...`);
    try {
      await run(splToken, [
        'create-account', mintAddress,
        '--owner', authority,
        '--fee-payer', KEYPAIR_PATH,
        '--url', RPC_URL,
        '--output', 'json',
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!/already.*(exists|in use)|account.*exists/i.test(msg)) throw err;
    }
    const mintOut = parseJson(await run(splToken, [
      'mint', mintAddress, initialMint,
      '--recipient-owner', authority,
      '--mint-authority', KEYPAIR_PATH,
      '--fee-payer', KEYPAIR_PATH,
      '--url', RPC_URL,
      '--output', 'json',
    ]));
    console.log(`initial mint tx  : ${mintOut.signature ?? '(signature unavailable)'}`);
  }

  const envBlock =
`# Cryptic Realm SPL token (generated ${new Date().toISOString()})
CR_SOLANA_RPC=${RPC_URL}
CR_SOLANA_NETWORK=${NETWORK === 'mainnet' ? 'solana' : 'solana-devnet'}
CR_SOLANA_MINT=${mintAddress}
CR_SOLANA_DECIMALS=${DECIMALS}
CR_SPL_TOKEN_CLI=/usr/local/bin/spl-token
# Path to the mint authority keypair on the SERVER/LXC. Copy the keypair there
# only if live player claim minting is enabled, and keep permissions strict.
CR_SOLANA_MINT_AUTHORITY=/opt/cryptic-realm/.secrets/mint_authority.json
`;
  const envFile = path.resolve('cr-solana.env');
  await writeFile(envFile, envBlock);

  console.log('\n------------------------------------------------------------');
  console.log('DONE. Paste this into /opt/cryptic-realm/.env on the server:');
  console.log('------------------------------------------------------------');
  console.log(envBlock);
  console.log(`(Also written to: ${envFile})`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
