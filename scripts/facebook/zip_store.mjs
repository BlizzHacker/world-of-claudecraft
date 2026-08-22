// Minimal deterministic STORE-only ZIP writer for the Facebook Instant Games
// bundle (scripts/build_facebook_bundle.mjs). The bundle is a handful of tiny
// text files, so compression buys nothing; storing keeps this dependency-free
// and byte-identical across rebuilds (fixed DOS timestamp, caller-ordered
// entries). Tested by tests/facebook_bundle.test.ts.

const LOCAL_FILE_HEADER_SIG = 0x04034b50;
const CENTRAL_DIR_HEADER_SIG = 0x02014b50;
const END_OF_CENTRAL_DIR_SIG = 0x06054b50;
const VERSION_NEEDED = 20;
const METHOD_STORE = 0;

// Fixed DOS timestamp (2026-01-01 00:00:00) so rebuilds of identical inputs
// produce identical zips.
export const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;
export const DOS_TIME = 0;

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

/** CRC-32 (IEEE 802.3) of a Buffer or Uint8Array. */
export function crc32(data) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Reject names a Facebook bundle (or any sane unzip) would choke on. */
export function assertZipEntryName(name) {
  if (typeof name !== 'string' || name.length === 0) throw new Error('zip entry name is empty');
  if (name.includes('\\')) throw new Error(`zip entry name uses backslashes: ${name}`);
  if (name.startsWith('/')) throw new Error(`zip entry name is absolute: ${name}`);
  if (name.split('/').includes('..')) throw new Error(`zip entry name escapes the root: ${name}`);
  // The writer emits no UTF-8 name flag, so keep names plain ASCII.
  if (!/^[\x20-\x7e]+$/.test(name)) throw new Error(`zip entry name is not ASCII: ${name}`);
}

/**
 * Build a store-only zip from `entries` ([{ name, data }], data Buffer or
 * Uint8Array). Entries land in the given order; pass a sorted list for
 * deterministic output. No zip64: sizes and counts past the classic limits
 * throw instead of silently corrupting.
 */
export function createStoreZip(entries) {
  if (!Array.isArray(entries) || entries.length === 0) throw new Error('zip needs entries');
  if (entries.length > 0xffff) throw new Error('too many entries for a classic zip');
  const seen = new Set();
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  for (const entry of entries) {
    assertZipEntryName(entry.name);
    if (seen.has(entry.name)) throw new Error(`duplicate zip entry: ${entry.name}`);
    seen.add(entry.name);
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data);
    if (data.length > 0xffffffff)
      throw new Error(`entry too large for a classic zip: ${entry.name}`);
    const nameBytes = Buffer.from(entry.name, 'ascii');
    const checksum = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(LOCAL_FILE_HEADER_SIG, 0);
    local.writeUInt16LE(VERSION_NEEDED, 4);
    local.writeUInt16LE(0, 6); // general purpose flags
    local.writeUInt16LE(METHOD_STORE, 8);
    local.writeUInt16LE(DOS_TIME, 10);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(data.length, 18); // compressed size (store: same)
    local.writeUInt32LE(data.length, 22); // uncompressed size
    local.writeUInt16LE(nameBytes.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    localParts.push(local, nameBytes, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(CENTRAL_DIR_HEADER_SIG, 0);
    central.writeUInt16LE(VERSION_NEEDED, 4); // version made by
    central.writeUInt16LE(VERSION_NEEDED, 6); // version needed to extract
    central.writeUInt16LE(0, 8); // general purpose flags
    central.writeUInt16LE(METHOD_STORE, 10);
    central.writeUInt16LE(DOS_TIME, 12);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42); // local header offset
    centralParts.push(central, nameBytes);

    offset += local.length + nameBytes.length + data.length;
    if (offset > 0xffffffff) throw new Error('bundle too large for a classic zip');
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(END_OF_CENTRAL_DIR_SIG, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central directory
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralSize, 12);
  eocd.writeUInt32LE(offset, 16); // central directory offset
  eocd.writeUInt16LE(0, 20); // comment length
  return Buffer.concat([...localParts, ...centralParts, eocd]);
}
