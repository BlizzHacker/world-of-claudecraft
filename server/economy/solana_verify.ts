import { createPublicKey, verify as verifySignature } from 'node:crypto';

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const BASE58_MAP = new Map([...BASE58_ALPHABET].map((ch, i) => [ch, i]));
const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex');

function decodeBase58(value: string): Uint8Array {
  if (value.length === 0) return new Uint8Array();

  const bytes = [0];
  for (const ch of value) {
    const digit = BASE58_MAP.get(ch);
    if (digit === undefined) throw new Error('invalid base58 character');

    let carry = digit;
    for (let i = 0; i < bytes.length; i++) {
      carry += bytes[i] * 58;
      bytes[i] = carry & 0xff;
      carry >>= 8;
    }
    while (carry > 0) {
      bytes.push(carry & 0xff);
      carry >>= 8;
    }
  }

  let leadingZeros = 0;
  while (leadingZeros < value.length && value[leadingZeros] === '1') leadingZeros++;

  const out = new Uint8Array(leadingZeros + bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[out.length - 1 - i] = bytes[i];
  }
  return out;
}

export async function verifySolanaSignature(
  message: string,
  signatureBase58: string,
  walletAddressBase58: string,
): Promise<boolean> {
  try {
    const sigBytes = decodeBase58(signatureBase58);
    const pubkeyBytes = decodeBase58(walletAddressBase58);
    if (sigBytes.length !== 64 || pubkeyBytes.length !== 32) return false;

    const publicKey = createPublicKey({
      key: Buffer.concat([ED25519_SPKI_PREFIX, Buffer.from(pubkeyBytes)]),
      format: 'der',
      type: 'spki',
    });
    return verifySignature(null, Buffer.from(message, 'utf8'), publicKey, Buffer.from(sigBytes));
  } catch (err) {
    console.error('solana sig verify error:', err);
    return false;
  }
}
