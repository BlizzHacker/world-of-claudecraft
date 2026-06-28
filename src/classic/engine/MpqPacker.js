// MpqPacker.js — Create MPQ v1 archives from custom assets for CrypticRealm modding.
// Converts canvas images, PNGs, and raw data into MPQ files compatible with D2/D1 engines.
// Output: .mpq files that can be loaded by crypticMpqReader.js.

import { MpqReader, MPQ_FLAG } from './crypticMpqReader.js';

// Storm hash (same as reader)
function _stormHash(str, type) {
  const CRYPT = MpqPacker._CRYPT;
  if (!CRYPT) return 0;
  let s1 = 0xEEEEEEEE >>> 0, s2 = 0x00000000;
  for (let i = 0; i < str.length; i++) {
    const ch = str.toUpperCase().charCodeAt(i);
    const ct = CRYPT[(type << 8) + ch];
    s2 = (s2 + s1 + ct) >>> 0;
    s1 = (((s1 << 5) + 1) ^ s2) >>> 0;
    s1 >>>= 0; s2 >>>= 0;
  }
  return s1;
}

function _hashFileName(name, type) {
  return _stormHash(name.replace(/\//g, "\\"), type);
}

// Build crypt table if not yet built (shared with reader)
function _getCrypt() {
  if (MpqPacker._CRYPT) return MpqPacker._CRYPT;
  const CRYPT = new Uint32Array(0x500);
  let seed = 0x00100001;
  for (let i = 0; i < 0x100; i++) {
    let idx = i;
    for (let j = 0; j < 5; j++) {
      seed = (seed * 125 + 3) % 0x2AAAAB;
      const t1 = (seed & 0xFFFF) << 0x10;
      seed = (seed * 125 + 3) % 0x2AAAAB;
      const t2 = seed & 0xFFFF;
      CRYPT[idx] = (t1 | t2) >>> 0;
      idx += 0x100;
    }
  }
  MpqPacker._CRYPT = CRYPT;
  return CRYPT;
}

function _decryptData(data, key) {
  _getCrypt();
  const CRYPT = MpqPacker._CRYPT;
  const view = new Uint32Array(data.buffer, data.byteOffset, data.byteLength >> 2);
  let s = 0xEEEEEEEE >>> 0;
  for (let i = 0; i < view.length; i++) {
    s = (s + CRYPT[0x400 + (key & 0xFF)]) >>> 0;
    const encrypted = view[i];
    view[i] = (encrypted ^ (key + s)) >>> 0;
    key = ((~key << 0x15) + 0x11111111) | (key >>> 0x0B);
    key >>>= 0;
    s = (s + encrypted + s * 32 + 3) >>> 0;
  }
}

// ─── DC6 Encoder (RGBA ImageData → DC6 binary) ────────────────────────────────

/**
 * Convert RGBA ImageData to DC6 format.
 * Quantizes to 256-color palette and encodes RLE.
 * Returns ArrayBuffer.
 */
export function encodeDC6(imageData, palette256) {
  const w = imageData.width;
  const h = imageData.height;
  const src = imageData.data;

  // Quantize to 256-color palette (nearest color)
  const indices = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const r = src[i * 4], g = src[i * 4 + 1], b = src[i * 4 + 2], a = src[i * 4 + 3];
    if (a < 128) {
      indices[i] = 0; // transparent → index 0
    } else {
      indices[i] = _nearestPaletteColor(r, g, b, palette256);
    }
  }

  // RLE encode
  const rle = _encodeRLE(indices, w, h);

  // Build DC6 binary
  const headerSize = 20; // signature + version + flags + encoding + term + dirs + framesPerDir
  const framePointersSize = 4; // 1 frame
  const frameHeaderSize = 32 + rle.length + 3; // flipped + w + h + ox + oy + unk + nextBlock + len + data + term

  const totalSize = headerSize + framePointersSize + frameHeaderSize;
  const buf = new ArrayBuffer(totalSize);
  const v = new DataView(buf);
  const u8 = new Uint8Array(buf);

  let off = 0;
  // Header
  v.setUint32(off, 6, true); off += 4; // version = 6
  v.setUint32(off, 0, true); off += 4; // flags
  v.setUint32(off, 0, true); off += 4; // encoding
  // Termination bytes
  u8[off++] = 0x12; u8[off++] = 0x34; u8[off++] = 0x56; u8[off++] = 0x78;
  v.setUint32(off, 1, true); off += 4; // directions = 1
  v.setUint32(off, 1, true); off += 4; // framesPerDir = 1

  // Frame pointer
  v.setUint32(off, headerSize + framePointersSize, true); off += 4;

  // Frame header
  v.setUint32(off, 0, true); off += 4; // flipped
  v.setUint32(off, w, true); off += 4;
  v.setUint32(off, h, true); off += 4;
  v.setInt32(off, -Math.floor(w / 2), true); off += 4; // offsetX
  v.setInt32(off, 0, true); off += 4; // offsetY
  v.setUint32(off, 0, true); off += 4; // unknown
  v.setUint32(off, 0, true); off += 4; // nextBlock
  v.setUint32(off, rle.length, true); off += 4;

  // Frame data
  u8.set(rle, off); off += rle.length;

  // Terminator
  u8[off++] = 0x12; u8[off++] = 0x34; u8[off++] = 0x78;

  return buf;
}

function _nearestPaletteColor(r, g, b, palette) {
  // palette is Uint8ClampedArray of 1024 bytes (256 * RGBA)
  let best = 1, bestDist = Infinity;
  for (let i = 1; i < 256; i++) {
    const dr = r - palette[i * 4];
    const dg = g - palette[i * 4 + 1];
    const db = b - palette[i * 4 + 2];
    const dist = dr * dr + dg * dg + db * db;
    if (dist < bestDist) { bestDist = dist; best = i; }
    if (dist === 0) break;
  }
  return best;
}

function _encodeRLE(indices, w, h) {
  const out = [];
  for (let y = h - 1; y >= 0; y--) {
    let x = 0;
    while (x < w) {
      if (indices[y * w + x] === 0) {
        // Transparent run
        let len = 0;
        while (x < w && indices[y * w + x] === 0 && len < 127) { x++; len++; }
        out.push(0x80 | len);
      } else {
        // Opaque run
        let len = 0;
        while (x < w && indices[y * w + x] !== 0 && len < 127) {
          out.push(indices[y * w + x]);
          x++; len++;
        }
        // Prepend length byte (insert at position after all data)
        // DC6 RLE: length byte comes BEFORE the run data
        // We need to restructure — insert length before the run
        const runData = out.splice(out.length - len, len);
        out.push(len);
        out.push(...runData);
      }
    }
    out.push(0x80); // end of scanline
  }
  return new Uint8Array(out);
}

// ─── PNG → DC6 helper ─────────────────────────────────────────────────────────

/**
 * Load an image from URL/Blob/File and convert to DC6.
 * Returns {dc6: ArrayBuffer, width, height, palette}.
 */
export async function imageToDC6(imageSource, palette) {
  let img;
  if (imageSource instanceof ImageBitmap) {
    img = imageSource;
  } else if (imageSource instanceof Blob || imageSource instanceof File) {
    img = await createImageBitmap(imageSource);
  } else if (typeof imageSource === 'string') {
    img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(createImageBitmap(i));
      i.onerror = reject;
      i.src = imageSource;
    });
  } else {
    throw new Error('Unsupported image source');
  }

  // Draw to canvas to get RGBA data
  const c = new OffscreenCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, img.width, img.height);

  const dc6 = encodeDC6(imageData, palette);
  return { dc6, width: img.width, height: img.height };
}

// ─── MPQ Archive Builder ──────────────────────────────────────────────────────

const HASH_TABLE_SIZE = 4096; // Must be power of 2

export class MpqBuilder {
  constructor() {
    this._files = []; // {name, data}
    this._hashTable = new Array(HASH_TABLE_SIZE).fill(null);
  }

  /** Add a file to the archive. */
  addFile(name, data) {
    const normalized = name.replace(/\//g, '\\').toLowerCase();
    this._files.push({ name: normalized, data: new Uint8Array(data) });
  }

  /** Add a canvas image as DC6 at the given MPQ path. */
  async addCanvasAsDC6(canvas, mpqPath, palette) {
    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const dc6 = encodeDC6(imageData, palette);
    this.addFile(mpqPath, dc6);
  }

  /** Add an image URL/File as DC6. */
  async addImageAsDC6(imageSource, mpqPath, palette) {
    const { dc6 } = await imageToDC6(imageSource, palette);
    this.addFile(mpqPath, dc6);
  }

  /** Build the complete MPQ binary. */
  build() {
    const files = this._files;
    const blockCount = files.length;
    const sectorSizeShift = 3; // 512 << 3 = 4096 byte sectors
    const sectorSize = 512 << sectorSizeShift;

    // Calculate file positions
    const headerSize = 32;
    const hashTableSize = HASH_TABLE_SIZE * 16;
    const blockTableSize = blockCount * 16;

    // Header is at offset 0, hash table and block table follow
    let dataOffset = headerSize + hashTableSize + blockTableSize;

    // Calculate compressed sizes and positions
    const blocks = [];
    for (const file of files) {
      const fileData = file.data;
      blocks.push({
        fileOffset: dataOffset - this._archiveOffset,
        compressedSize: fileData.length,
        uncompressedSize: fileData.length,
        flags: MPQ_FLAG.FILE | MPQ_FLAG.SINGLEUNIT,
        data: fileData,
      });
      dataOffset += fileData.length;
    }

    const archiveSize = dataOffset;

    // Build header
    const totalSize = dataOffset;
    const buf = new ArrayBuffer(totalSize);
    const v = new DataView(buf);
    const u8 = new Uint8Array(buf);

    // Header
    v.setUint32(0, 0x1A51504D, true); // 'MPQ\x1a'
    v.setUint32(4, 32, true); // header size
    v.setUint32(8, archiveSize, true);
    v.setUint16(12, 0, true); // version
    v.setUint16(14, sectorSizeShift, true);
    v.setUint32(16, headerSize, true); // hash table offset
    v.setUint32(20, headerSize + hashTableSize, true); // block table offset
    v.setUint32(24, HASH_TABLE_SIZE, true);
    v.setUint32(28, blockCount, true);

    // Build hash table
    _getCrypt();
    const hashBuf = new Uint8Array(HASH_TABLE_SIZE * 16);
    const hView = new DataView(hashBuf.buffer);
    for (let i = 0; i < HASH_TABLE_SIZE; i++) {
      const base = i * 16;
      hView.setUint32(base, 0xFFFFFFFF, true); // nameA = free slot
      hView.setUint32(base + 4, 0xFFFFFFFF, true);
      hView.setUint32(base + 8, 0xFFFFFFFF, true);
      hView.setUint32(base + 12, 0xFFFFFFFF, true);
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const hashOffset = _stormHash(file.name, 3) % HASH_TABLE_SIZE; // HASH_OFFSET
      const nameA = _hashFileName(file.name, 1);
      const nameB = _hashFileName(file.name, 2);
      let slot = hashOffset;
      for (let j = 0; j < HASH_TABLE_SIZE; j++) {
        const base = slot * 16;
        if (hView.getUint32(base, true) === 0xFFFFFFFF) {
          hView.setUint32(base, nameA, true);
          hView.setUint32(base + 4, nameB, true);
          hView.setUint32(base + 8, 0, true); // locale + platform
          hView.setUint32(base + 12, i, true); // block index
          break;
        }
        slot = (slot + 1) % HASH_TABLE_SIZE;
      }
    }

    // Encrypt hash table
    _decryptData(hashBuf, _hashFileName('(hash table)', 3));
    u8.set(hashBuf, headerSize);

    // Build block table
    const blockBuf = new Uint8Array(blockCount * 16);
    const bView = new DataView(blockBuf.buffer);
    for (let i = 0; i < blockCount; i++) {
      const b = blocks[i];
      const base = i * 16;
      bView.setUint32(base, b.fileOffset, true);
      bView.setUint32(base + 4, b.compressedSize, true);
      bView.setUint32(base + 8, b.uncompressedSize, true);
      bView.setUint32(base + 12, b.flags, true);
    }

    // Encrypt block table
    _decryptData(blockBuf, _hashFileName('(block table)', 3));
    u8.set(blockBuf, headerSize + hashTableSize);

    // Write file data
    for (const b of blocks) {
      u8.set(b.data, b.fileOffset + headerSize + hashTableSize + blockTableSize);
    }

    return buf;
  }

  /** Download the built MPQ as a file. */
  download(filename = 'CRYPTIC_MOD.MPQ') {
    const buf = this.build();
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  /** Get MPQ as ArrayBuffer for saving or further processing. */
  toArrayBuffer() {
    return this.build();
  }

  /** Get file count. */
  get fileCount() {
    return this._files.length;
  }
}

// ─── Asset conversion presets ─────────────────────────────────────────────────

/**
 * Convert a monster image to a D2-compatible MPQ entry.
 * @param {ImageSource} image - Canvas, ImageBitmap, Blob, or URL
 * @param {string} monsterType - e.g. "zombie", "skeleton"
 * @param {Uint8ClampedArray} palette - 256-color palette (1024 bytes RGBA)
 * @returns {Promise<MpqBuilder>}
 */
export async function packMonsterAsMpq(image, monsterType, palette) {
  const { D2_MONSTER_PATHS, D2_ANIM } = await import('./d2MpqPaths.js');
  const entry = D2_MONSTER_PATHS[monsterType];
  if (!entry) throw new Error(`Unknown monster type: ${monsterType}`);

  const builder = new MpqBuilder();

  // Create DC6 for each animation state from the same source image
  // (In practice you'd have different images per animation — this creates a static sprite)
  for (const [state, animMode] of Object.entries(D2_ANIM)) {
    const mpqPath = `data/global/monsters/${entry.code}/${animMode.toLowerCase()}/dc6/${entry.code}${animMode}.dc6`;
    await builder.addImageAsDC6(image, mpqPath, palette);
  }

  return builder;
}

/**
 * Convert a character sheet (multiple animation frames) into an MPQ.
 * @param {HTMLCanvasElement} canvas - Character sprite sheet
 * @param {string} classCode - D2 class code (AM, BA, NE, PA, SO, etc.)
 * @param {Uint8ClampedArray} palette
 * @param {Object} options - {weaponCode: 'HTH', framesPerDir: 8, directions: 8}
 */
export async function packCharacterAsMpq(canvas, classCode, palette, options = {}) {
  const { weaponCode = 'HTH', framesPerDir = 8, directions = 8 } = options;
  const builder = new MpqBuilder();

  // Standard D2 animation modes for characters
  const charModes = ['NU', 'WL', 'A1', 'A2', 'GH', 'DD'];

  for (const mode of charModes) {
    const mpqPath = `data/global/chars/${classCode}/${weaponCode}/${classCode}HD${mode}.dc6`;
    await builder.addCanvasAsDC6(canvas, mpqPath, palette);
  }

  return builder;
}

/**
 * Batch pack multiple monster images into a single MPQ.
 * @param {Map<string, ImageSource>} monsters - type → image map
 * @param {Uint8ClampedArray} palette
 */
export async function packMonsterBatch(monsters, palette) {
  const builder = new MpqBuilder();

  for (const [type, image] of monsters) {
    const { D2_MONSTER_PATHS, D2_ANIM } = await import('./d2MpqPaths.js');
    const entry = D2_MONSTER_PATHS[type];
    if (!entry) continue;

    for (const [state, animMode] of Object.entries(D2_ANIM)) {
      const mpqPath = `data/global/monsters/${entry.code}/${animMode.toLowerCase()}/dc6/${entry.code}${animMode}.dc6`;
      await builder.addImageAsDC6(image, mpqPath, palette);
    }
  }

  return builder;
}

// ─── Export ────────────────────────────────────────────────────────────────────

export const MpqPacker = {
  builder: () => new MpqBuilder(),
  encodeDC6,
  imageToDC6,
  packMonsterAsMpq,
  packCharacterAsMpq,
  packMonsterBatch,
};
