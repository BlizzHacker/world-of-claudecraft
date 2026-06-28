// crypticMpqReader.js — Pure JavaScript MPQ v1 Archive Reader
// Implements the Blizzard MPQ v1 format used by Diablo 1, Diablo 2, and Starcraft.
// Source reference: OpenDiablo2/d2common/d2fileformats/d2mpq (Go),
//   Ladislav Zezula's StormLib documentation, and community format specs.
// No native dependencies — runs in browser via ArrayBuffer.

// ─── Storm hash constants (from StormLib / OpenDiablo2) ──────────────────────
const STORM_HASH_TABLE_KEY  = 0xC3AF3770;  // Used to decrypt hash table
const STORM_BLOCK_TABLE_KEY = 0xEC83B3A3;  // Used to decrypt block table

// ─── Block flags ─────────────────────────────────────────────────────────────
export const MPQ_FLAG = {
  FILE:        0x80000000,  // File exists
  SINGLEUNIT:  0x01000000,  // File is one chunk only (no multi-block)
  ENCRYPTED:   0x00010000,  // File is encrypted
  FIX_KEY:     0x00020000,  // Encryption key adjusted by position
  COMPRESSED:  0x00000200,  // File is compressed
  IMPLODED:    0x00000100,  // File uses PKWARE DCL implode
  COMPRESS_Z:  0x00000002,  // zlib deflate compression
};

// ─── Storm crypto table (256 slots) ──────────────────────────────────────────
const _CRYPT = new Uint32Array(0x500);
(function buildCryptTable() {
  let seed = 0x00100001;
  for (let i = 0; i < 0x100; i++) {
    let idx = i;
    for (let j = 0; j < 5; j++) {
      seed = (seed * 125 + 3) % 0x2AAAAB;
      const t1 = (seed & 0xFFFF) << 0x10;
      seed = (seed * 125 + 3) % 0x2AAAAB;
      const t2 = seed & 0xFFFF;
      _CRYPT[idx] = (t1 | t2) >>> 0;
      idx += 0x100;
    }
  }
})();

// ─── Hash types ──────────────────────────────────────────────────────────────
const HASH_OFFSET  = 0;  // File offset hash
const HASH_NAME_A  = 1;  // File name hash A
const HASH_NAME_B  = 2;  // File name hash B
const HASH_KEY     = 3;  // Encryption key hash

function _stormHash(str, type) {
  let s1 = 0xEEEEEEEE >>> 0, s2 = 0x00000000;
  for (let i = 0; i < str.length; i++) {
    const ch = str.toUpperCase().charCodeAt(i);
    const ct = _CRYPT[(type << 8) + ch];
    s2 = (s2 + s1 + ct) >>> 0;
    s1 = (((s1 << 5) + 1) ^ s2) >>> 0;
    // Simulate 32-bit wrap
    s1 >>>= 0;
    s2 >>>= 0;
  }
  return s1;
}

function _hashFileName(name, type) {
  return _stormHash(name.replace(/\//g, "\\"), type);
}

// Decrypt a 32-bit word stream in-place
function _decryptData(data, key) {
  const view = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
  let s = 0xEEEEEEEE >>> 0;
  for (let i = 0; i < view.length; i++) {
    s = (s + _CRYPT[0x400 + (key & 0xFF)]) >>> 0;
    const encrypted = view[i];
    view[i] = (encrypted ^ (key + s)) >>> 0;
    key  = ((~key << 0x15) + 0x11111111) | (key >>> 0x0B);
    key  >>>= 0;
    s    = (s + encrypted + s * 32 + 3) >>> 0;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
export class MpqReader {
  /**
   * @param {ArrayBuffer} buffer - Raw MPQ file bytes.
   */
  constructor(buffer) {
    this._buf  = buffer;
    this._view = new DataView(buffer);
    this._u8   = new Uint8Array(buffer);
    this._hashTable   = [];
    this._blockTable  = [];
    this._archiveOffset = 0;
    this._ready = false;
    this._parseHeader();
  }

  _parseHeader() {
    // Scan for 'MPQ\x1a' signature (archives may not start at offset 0)
    let offset = 0;
    while (offset < this._buf.byteLength - 32) {
      if (this._view.getUint32(offset, true) === 0x1A51504D) break; // 'MPQ\x1a'
      offset += 512;
    }
    if (offset >= this._buf.byteLength - 32) {
      console.warn("[MpqReader] MPQ signature not found");
      return;
    }
    this._archiveOffset = offset;
    const v = this._view;

    // Header layout (MPQ v1):
    // +0  : uint32 signature    = 0x1A51504D ('MPQ\x1a')
    // +4  : uint32 headerSize   = 32 (v1)
    // +8  : uint32 archiveSize
    // +12 : uint16 mpqVersion   = 0 (v1) or 1 (v2)
    // +14 : uint16 blockSize    = sector size shift (512 << blockSize bytes per sector)
    // +16 : uint32 hashTableOffset
    // +20 : uint32 blockTableOffset
    // +24 : uint32 hashTableCount
    // +28 : uint32 blockTableCount

    const base = this._archiveOffset;
    // const archiveSize    = v.getUint32(base+8,  true);
    // const mpqVersion     = v.getUint16(base+12, true);
    const blockSizeShift = v.getUint16(base+14, true);
    this._sectorSize = 512 << blockSizeShift;

    const hashTableOff   = v.getUint32(base+16, true) + base;
    const blockTableOff  = v.getUint32(base+20, true) + base;
    const hashTableCount = v.getUint32(base+24, true);
    const blockTableCount= v.getUint32(base+28, true);

    this._parseHashTable(hashTableOff, hashTableCount);
    this._parseBlockTable(blockTableOff, blockTableCount);
    this._ready = true;
  }

  _parseHashTable(offset, count) {
    const raw = new Uint8Array(this._buf, offset, count * 16);
    _decryptData(raw, _hashFileName("(hash table)", HASH_KEY));
    const v32 = new Uint32Array(raw.buffer, raw.byteOffset, count * 4);
    for (let i = 0; i < count; i++) {
      const b = i * 4;
      this._hashTable.push({
        nameA:    v32[b],
        nameB:    v32[b+1],
        locale:   v32[b+2] & 0xFFFF,
        platform: (v32[b+2] >> 16) & 0xFFFF,
        blockIdx: v32[b+3],
      });
    }
  }

  _parseBlockTable(offset, count) {
    const raw = new Uint8Array(this._buf, offset, count * 16);
    _decryptData(raw, _hashFileName("(block table)", HASH_KEY));
    const v32 = new Uint32Array(raw.buffer, raw.byteOffset, count * 4);
    for (let i = 0; i < count; i++) {
      const b = i * 4;
      this._blockTable.push({
        fileOffset:       v32[b] + this._archiveOffset,
        compressedSize:   v32[b+1],
        uncompressedSize: v32[b+2],
        flags:            v32[b+3],
      });
    }
  }

  // ─── Find block index by filename ─────────────────────────────────────────
  _findBlock(filename) {
    const norm = filename.replace(/\//g, "\\").toUpperCase();
    const hashOffset = _stormHash(norm, HASH_OFFSET);
    const nameA      = _stormHash(norm, HASH_NAME_A);
    const nameB      = _stormHash(norm, HASH_NAME_B);
    const tableLen   = this._hashTable.length;
    let slot = hashOffset % tableLen;
    for (let i = 0; i < tableLen; i++) {
      const e = this._hashTable[slot];
      if (e.blockIdx === 0xFFFFFFFF) return null; // file not in archive
      if (e.nameA === nameA && e.nameB === nameB) return e.blockIdx;
      slot = (slot + 1) % tableLen;
    }
    return null;
  }

  // ─── Read raw (possibly compressed) file data ─────────────────────────────
  _readBlockData(block, encKey) {
    const flags = block.flags;
    if (!(flags & MPQ_FLAG.FILE)) return null;

    const isSingle = !!(flags & MPQ_FLAG.SINGLEUNIT);
    const isEnc    = !!(flags & MPQ_FLAG.ENCRYPTED);
    const isComp   = !!(flags & MPQ_FLAG.COMPRESSED);
    const isImpl   = !!(flags & MPQ_FLAG.IMPLODED);

    const raw = new Uint8Array(this._buf, block.fileOffset, block.compressedSize);

    if (isSingle) {
      let data = raw;
      if (isEnc) { const d = new Uint8Array(data); _decryptData(d, encKey); data = d; }
      if (isComp || isImpl) return this._decompress(data, block.uncompressedSize, isImpl);
      return data;
    }

    // Multi-sector file: sector offset table then sectors
    const sectorCount = Math.ceil(block.uncompressedSize / this._sectorSize);
    // Sector offset table: (sectorCount+1) uint32 entries
    const sectorOffsets = new Uint32Array(this._buf, block.fileOffset, sectorCount + 1);
    const out = new Uint8Array(block.uncompressedSize);
    let outPos = 0;

    for (let si = 0; si < sectorCount; si++) {
      const sOff  = sectorOffsets[si];
      const sEnd  = sectorOffsets[si+1];
      let sector  = new Uint8Array(this._buf, block.fileOffset + sOff, sEnd - sOff);
      if (isEnc) {
        const sd = new Uint8Array(sector); _decryptData(sd, (encKey + si) >>> 0); sector = sd;
      }
      const decompressed = (isComp || isImpl) ? this._decompress(sector, Math.min(this._sectorSize, block.uncompressedSize-outPos), isImpl) : sector;
      out.set(decompressed, outPos);
      outPos += decompressed.length;
    }
    return out;
  }

  // ─── Decompressor dispatcher ──────────────────────────────────────────────
  _decompress(data, expectedSize, isImplode) {
    if (isImplode) {
      // PKWARE DCL implode — not implementing full PKWARE here;
      // return raw and warn (requires PKWARE library for full support)
      console.warn("[MpqReader] PKWARE implode not yet implemented, returning raw");
      return data;
    }
    // Multi-compression: first byte = compression type flags
    const compType = data[0];
    let d = data.slice(1);

    // zlib deflate (0x02)
    if (compType & 0x02) {
      try {
        const ds = new DecompressionStream("deflate-raw");
        const writer = ds.writable.getWriter();
        const reader  = ds.readable.getReader();
        writer.write(d);
        writer.close();
        const chunks = [];
        // This is async in browser — we use sync fallback: return raw
        // Full async version requires await (see readFileAsync)
        console.warn("[MpqReader] Async decompress required, use readFileAsync()");
        return data; // Fallback
      } catch(_) { return data; }
    }
    return d;
  }

  /** Synchronously read a file. For zlib-compressed files use readFileAsync. */
  readFile(filename) {
    if (!this._ready) return null;
    const blockIdx = this._findBlock(filename);
    if (blockIdx == null || blockIdx >= this._blockTable.length) return null;
    const block = this._blockTable[blockIdx];
    const baseKey = _stormHash(filename.split("\\").pop().split("/").pop(), HASH_KEY);
    const encKey  = (block.flags & MPQ_FLAG.FIX_KEY)
      ? ((baseKey + block.fileOffset) ^ block.uncompressedSize) >>> 0
      : baseKey;
    return this._readBlockData(block, encKey);
  }

  /** Asynchronously read a file with full zlib decompression support. */
  async readFileAsync(filename) {
    if (!this._ready) return null;
    const blockIdx = this._findBlock(filename);
    if (blockIdx == null || blockIdx >= this._blockTable.length) return null;
    const block = this._blockTable[blockIdx];
    const flags = block.flags;
    if (!(flags & MPQ_FLAG.FILE)) return null;

    const baseKey = _stormHash(filename.split(/[\\/]/).pop(), HASH_KEY);
    const encKey  = (flags & MPQ_FLAG.FIX_KEY)
      ? ((baseKey + block.fileOffset) ^ block.uncompressedSize) >>> 0
      : baseKey;

    const isSingle = !!(flags & MPQ_FLAG.SINGLEUNIT);
    const isEnc    = !!(flags & MPQ_FLAG.ENCRYPTED);
    const isComp   = !!(flags & MPQ_FLAG.COMPRESSED);
    const isImpl   = !!(flags & MPQ_FLAG.IMPLODED);

    if (isSingle) {
      let data = new Uint8Array(this._buf, block.fileOffset, block.compressedSize);
      if (isEnc) { data = new Uint8Array(data); _decryptData(data, encKey); }
      if (isComp && data[0] & 0x02) return await this._zlibDecompress(data.slice(1));
      return data;
    }

    // Multi-sector
    const sectorCount = Math.ceil(block.uncompressedSize / this._sectorSize);
    const sectorOffBuf = new Uint8Array(this._buf, block.fileOffset, (sectorCount+1)*4);
    const sectorOffsets = new Uint32Array(sectorOffBuf.buffer, sectorOffBuf.byteOffset, sectorCount+1);
    const out = new Uint8Array(block.uncompressedSize);
    let outPos = 0;

    for (let si = 0; si < sectorCount; si++) {
      const sOff = sectorOffsets[si], sEnd = sectorOffsets[si+1];
      let sector = new Uint8Array(this._buf, block.fileOffset + sOff, sEnd - sOff);
      if (isEnc) { sector = new Uint8Array(sector); _decryptData(sector, (encKey+si)>>>0); }
      let decompressed;
      if ((isComp || isImpl) && sector[0] & 0x02) {
        decompressed = await this._zlibDecompress(sector.slice(1));
      } else {
        decompressed = isComp ? sector.slice(1) : sector;
      }
      const chunk = decompressed.subarray(0, Math.min(decompressed.length, block.uncompressedSize - outPos));
      out.set(chunk, outPos);
      outPos += chunk.length;
    }
    return out;
  }

  async _zlibDecompress(data) {
    try {
      const ds = new DecompressionStream("deflate-raw");
      const writer = ds.writable.getWriter();
      const reader  = ds.readable.getReader();
      writer.write(data).catch(()=>{});
      writer.close().catch(()=>{});
      const chunks = [];
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const total = chunks.reduce((s,c)=>s+c.length,0);
      const result = new Uint8Array(total);
      let off=0; for (const c of chunks) { result.set(c,off); off+=c.length; }
      return result;
    } catch(e) {
      console.warn("[MpqReader] zlib decompress failed:", e.message);
      return data;
    }
  }

  /** Returns true if the archive contains the given file path. */
  hasFile(filename) {
    return this._findBlock(filename) != null;
  }

  /** Returns a list of known file names (requires (listfile) to be present). */
  async listFiles() {
    const raw = await this.readFileAsync("(listfile)");
    if (!raw) return [];
    const text = new TextDecoder().decode(raw);
    return text.split(/[\r\n]+/).filter(Boolean);
  }

  /** Read a file and decode it as UTF-8 text. */
  async readText(filename) {
    const raw = await this.readFileAsync(filename);
    return raw ? new TextDecoder().decode(raw) : null;
  }

  /** Read a file and return it as an ImageBitmap (for DC6/DCC: use DC6Decoder instead). */
  async readImageBitmap(filename) {
    const raw = await this.readFileAsync(filename);
    if (!raw) return null;
    const blob = new Blob([raw]);
    try { return await createImageBitmap(blob); } catch(_) { return null; }
  }

  /** Parse a tab-delimited .txt data file (D2 data tables). */
  async readDataTable(filename) {
    const text = await this.readText(filename);
    if (!text) return null;
    const lines = text.split(/[\r\n]+/).filter(Boolean);
    if (lines.length < 2) return [];
    const headers = lines[0].split("\t");
    return lines.slice(1).map(line => {
      const cols = line.split("\t");
      const row = {};
      headers.forEach((h,i) => { if(h) row[h] = cols[i] || ""; });
      return row;
    }).filter(row => Object.values(row).some(v => v !== ""));
  }
}

// ─── Singleton MPQ cache ──────────────────────────────────────────────────────
const _mpqCache = new Map(); // filename → MpqReader
const _textureCache = new Map(); // path → ImageBitmap

/** Load an MPQ from a File object (drag-and-drop or <input type="file">). */
export async function loadMpqFromFile(file) {
  const buf = await file.arrayBuffer();
  const reader = new MpqReader(buf);
  _mpqCache.set(file.name.toUpperCase(), reader);
  console.log(`[MpqReader] Loaded ${file.name}: ${reader._blockTable.length} files`);
  return reader;
}

/** Load an MPQ from a URL (must be same-origin or CORS-enabled). */
export async function loadMpqFromUrl(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch MPQ: ${url}`);
  const buf = await resp.arrayBuffer();
  const reader = new MpqReader(buf);
  const key = url.split("/").pop().toUpperCase();
  _mpqCache.set(key, reader);
  return reader;
}

/** Get a cached reader by MPQ filename (e.g. "D2DATA.MPQ"). */
export function getMpq(name) {
  return _mpqCache.get(name.toUpperCase()) || null;
}

/** Read a file from the first MPQ that contains it (search order: D2EXP.MPQ → D2DATA.MPQ → D2MUSIC.MPQ → D2SPEECH.MPQ). */
const _D2_SEARCH_ORDER = [
  "CRYPTIC_D2.MPQ","CRYPTIC_DIABLO2.MPQ","DIABLO2_COMPAT.MPQ",
  "CRYPTIC_HELLFIRE.MPQ","CRYPTIC_D1.MPQ","HELLFIRE_COMPAT.MPQ",
  "D2EXP.MPQ","D2DATA.MPQ","DIABDAT.MPQ","DIABLODAT.MPQ","HELLFIRE.MPQ",
  "D2CHAR.MPQ","D2SFX.MPQ","D2MUSIC.MPQ","D2SPEECH.MPQ","D2VIDEO.MPQ",
];
export async function readD2File(filename) {
  const tried = new Set();
  for (const mpqName of _D2_SEARCH_ORDER) {
    tried.add(mpqName);
    const mpq = getMpq(mpqName);
    if (mpq && mpq.hasFile(filename)) return mpq.readFileAsync(filename);
  }
  for (const [mpqName, mpq] of _mpqCache.entries()) {
    if (tried.has(mpqName)) continue;
    if (mpq && mpq.hasFile(filename)) return mpq.readFileAsync(filename);
  }
  return null;
}

/** List all loaded MPQ names. */
export function listLoadedMpqs() { return [..._mpqCache.keys()]; }

/** Load a D2 sprite as an ImageBitmap from any loaded MPQ (DC6 format: use DC6Decoder). */
export async function loadD2TextureFromMpq(d2path) {
  if (_textureCache.has(d2path)) return _textureCache.get(d2path);
  const raw = await readD2File(d2path);
  if (!raw) return null;
  // For DC6/DCC, caller should use DC6Decoder
  const blob = new Blob([raw]);
  const bm = await createImageBitmap(blob).catch(()=>null);
  if (bm) _textureCache.set(d2path, bm);
  return bm;
}

/** Present a file picker so the user can load their own Diablo 2 MPQs. */
export async function promptUserMpqLoad(onProgress) {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;
    input.accept = ".mpq,.MPQ,.crmpq,.CRMPQ";
    input.onchange = async () => {
      const loaded = [];
      for (const file of input.files) {
        try {
          onProgress?.(`Loading ${file.name}...`);
          const reader = await loadMpqFromFile(file);
          loaded.push(reader);
        } catch(e) {
          console.warn("[MpqReader] Failed to load", file.name, e);
        }
      }
      resolve(loaded);
    };
    input.click();
  });
}
