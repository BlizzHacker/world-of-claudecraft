// crypticD2Formats.js — Cryptic Realm 8.0: D2 Binary Format Parsers
// Ported directly from:
//   OpenDiablo2 (Go)  — d2dc6, d2dcc, d2cof, d2dat, d2ds1, d2dt1, d2animdata
//   DevilutionX (C++) — drlg_l1..l4, crypt, gendung, path
//   AbyssEngine (Go)  — additional D2 rendering helpers
// All six core binary formats + D1 dungeon generators, fully in JS.

// ─────────────────────────────────────────────────────────────────────────────
// Utility: Little-endian DataView helpers
// ─────────────────────────────────────────────────────────────────────────────
class BinaryReader {
  constructor(buf) {
    this.buf = buf instanceof ArrayBuffer ? buf : buf.buffer;
    this.view = new DataView(this.buf);
    this.pos = 0;
  }
  u8()   { return this.view.getUint8(this.pos++); }
  i8()   { return this.view.getInt8(this.pos++); }
  u16()  { const v=this.view.getUint16(this.pos,true); this.pos+=2; return v; }
  i16()  { const v=this.view.getInt16(this.pos,true);  this.pos+=2; return v; }
  u32()  { const v=this.view.getUint32(this.pos,true); this.pos+=4; return v; }
  i32()  { const v=this.view.getInt32(this.pos,true);  this.pos+=4; return v; }
  bytes(n) { const sl=new Uint8Array(this.buf,this.pos,n); this.pos+=n; return sl; }
  skip(n)  { this.pos+=n; }
  seek(n)  { this.pos=n; }
  get eof() { return this.pos>=this.buf.byteLength; }
  subReader(offset, length) {
    const sr = new BinaryReader(this.buf.slice(offset, offset+length));
    return sr;
  }
}

// BitMuncher: LSB-first bit reader (used for DCC)
class BitMuncher {
  constructor(data) {
    this.data = data;
    this.bit  = 0;
  }
  readBits(n) {
    let result = 0;
    for (let i=0; i<n; i++) {
      const byteIdx = (this.bit) >> 3;
      const bitIdx  = (this.bit) & 7;
      if (byteIdx < this.data.length) {
        result |= ((this.data[byteIdx] >> bitIdx) & 1) << i;
      }
      this.bit++;
    }
    return result >>> 0;
  }
  readSigned(n) {
    const v = this.readBits(n);
    if (n > 0 && (v & (1 << (n-1)))) return v - (1 << n);
    return v;
  }
  skipBits(n) { this.bit += n; }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. DC6 — Diablo 1/2 sprite format (UI elements, inventory items, cursors)
//    Source: OpenDiablo2/d2common/d2fileformats/d2dc6/dc6.go
// ─────────────────────────────────────────────────────────────────────────────
export function parseDC6(buffer) {
  const r = new BinaryReader(buffer);
  const version    = r.i32();
  const flags      = r.u32();
  const encoding   = r.u32();
  const termination= r.bytes(4);
  const directions = r.u32();
  const framesPerDir = r.u32();
  const frameCount = directions * framesPerDir;

  const framePointers = [];
  for (let i=0; i<frameCount; i++) framePointers.push(r.u32());

  const frames = [];
  for (let i=0; i<frameCount; i++) {
    const flipped    = r.u32();
    const width      = r.u32();
    const height     = r.u32();
    const offsetX    = r.i32();
    const offsetY    = r.i32();
    /* unknown */      r.u32();
    /* nextBlock */    r.u32();
    const length     = r.u32();
    const frameData  = r.bytes(length);
    /* terminator */   r.bytes(3);
    frames.push({ flipped, width, height, offsetX, offsetY, frameData });
  }

  return { version, flags, encoding, directions, framesPerDir, frames,
    // Decode a single frame to palette index array (Uint8Array, row-major top-down)
    decodeFrame(idx) {
      const f = this.frames[idx];
      const pixels = new Uint8Array(f.width * f.height);
      const rle = f.frameData;
      let x=0, y=f.height-1, off=0;
      while (off < rle.length) {
        const b = rle[off++];
        if (b === 0x80) { // end of scanline
          if (y===0) break;
          y--; x=0;
        } else if (b & 0x80) { // transparent run
          x += (b & 0x7f);
        } else { // opaque run
          for (let n=0; n<b; n++) {
            const dst = y*f.width + x;
            if (dst >= 0 && dst < pixels.length) pixels[dst] = rle[off];
            off++; x++;
          }
        }
      }
      return pixels;
    },
    // Render frame to RGBA ImageData using a 256-entry palette (Uint8ClampedArray of length 1024)
    renderFrame(idx, palette) {
      const f = this.frames[idx];
      const palIndexes = this.decodeFrame(idx);
      const rgba = new Uint8ClampedArray(f.width * f.height * 4);
      for (let i=0; i<palIndexes.length; i++) {
        const pi = palIndexes[i] * 4;
        rgba[i*4]   = palette[pi];
        rgba[i*4+1] = palette[pi+1];
        rgba[i*4+2] = palette[pi+2];
        rgba[i*4+3] = palIndexes[i] === 0 ? 0 : 255;
      }
      return new ImageData(rgba, f.width, f.height);
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. DAT Palette — 256-color palette (act-specific + character/monster palettes)
//    Source: OpenDiablo2/d2common/d2fileformats/d2dat/dat.go
//    Format: 256 × 3 bytes (R,G,B) — no alpha — 768 bytes total
// ─────────────────────────────────────────────────────────────────────────────
export function parseDAT(buffer) {
  const data = new Uint8Array(buffer);
  // Returns a flat Uint8ClampedArray[1024] where [i*4..i*4+3] = RGBA
  const palette = new Uint8ClampedArray(256 * 4);
  for (let i=0; i<256; i++) {
    palette[i*4]   = data[i*3+2]; // B→R (D2 stores BGR)
    palette[i*4+1] = data[i*3+1];
    palette[i*4+2] = data[i*3];   // R→B
    palette[i*4+3] = i===0 ? 0 : 255; // index 0 is transparent
  }
  return palette;
}

// Default D2 Act 1 palette (greyscale fallback when no MPQ loaded)
export const D2_DEFAULT_PALETTE = (() => {
  const p = new Uint8ClampedArray(256*4);
  for (let i=0; i<256; i++) {
    p[i*4]=p[i*4+1]=p[i*4+2]=i; p[i*4+3]=i===0?0:255;
  }
  return p;
})();

// ─────────────────────────────────────────────────────────────────────────────
// 3. COF — Component Object Framework (character/monster animation layers)
//    Source: OpenDiablo2/d2common/d2fileformats/d2cof/cof.go
//    Defines layer draw order (HD/TR/LG/RA/LA/RH/LH/SH/S1-S5) per frame+dir
// ─────────────────────────────────────────────────────────────────────────────
export const COF_LAYER = {
  HD:0, TR:1, LG:2, RA:3, LA:4, RH:5, LH:6, SH:7,
  S1:8, S2:9, S3:10, S4:11, S5:12,
};
export const COF_LAYER_NAMES = ['HD','TR','LG','RA','LA','RH','LH','SH','S1','S2','S3','S4','S5'];

export function parseCOF(buffer) {
  const r = new BinaryReader(buffer);
  const numLayers      = r.u8();
  const framesPerDir   = r.u8();
  const numDirections  = r.u8();
  r.skip(21); // unknown header bytes
  const speed          = r.u8();
  r.skip(3);  // unknown body bytes

  const layers = [];
  const compositeLayers = {};
  for (let i=0; i<numLayers; i++) {
    const type        = r.u8();
    const shadow      = r.u8();
    const selectable  = r.u8() > 0;
    const transparent = r.u8() > 0;
    const drawEffect  = r.u8();
    const weaponClass = String.fromCharCode(...r.bytes(4)).replace(/\0/g,'').trim();
    layers.push({ type, shadow, selectable, transparent, drawEffect, weaponClass });
    compositeLayers[type] = i;
  }

  const animFrames = Array.from(r.bytes(framesPerDir));

  // Priority table: [direction][frame][layerSlot] = compositeType (draw order)
  const priority = [];
  for (let d=0; d<numDirections; d++) {
    priority[d] = [];
    for (let f=0; f<framesPerDir; f++) {
      priority[d][f] = [];
      for (let l=0; l<numLayers; l++) {
        priority[d][f][l] = r.u8();
      }
    }
  }

  return {
    numLayers, framesPerDir, numDirections, speed,
    layers, compositeLayers, animFrames, priority,
    // Get draw order for a given direction + frame (returns array of layer type ints)
    getDrawOrder(dir, frame) {
      const d = ((dir % this.numDirections) + this.numDirections) % this.numDirections;
      const f = ((frame % this.framesPerDir) + this.framesPerDir) % this.framesPerDir;
      return this.priority[d]?.[f] || [];
    },
  };
}

// COF direction mapping — D2 uses 8 or 16 directions, numbered differently per char type
export function d2DirFromAngle(angleDeg, numDirs) {
  // D2 direction 0 = South, goes counter-clockwise
  const step = 360 / numDirs;
  const adj = ((angleDeg + 90 + step/2) % 360 + 360) % 360;
  return Math.floor(adj / step) % numDirs;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. DCC — Animated sprite (characters, monsters) — Simplified BitMuncher decoder
//    Source: OpenDiablo2/d2common/d2fileformats/d2dcc/dcc.go
//    Full decode with cell-based Huffman delta is complex; this implements it.
// ─────────────────────────────────────────────────────────────────────────────
const DCC_CRAZY_BIT_TABLE = [0,1,2,4,6,8,10,12,14,16,20,24,26,28,30,32];
const DCC_PIX_MASK_LOOKUP = [0,1,1,2,1,2,2,3,1,2,2,3,2,3,3,4]; // popcount 4-bit

export function parseDCC(buffer) {
  const data = new Uint8Array(buffer);
  const r = new BinaryReader(buffer);

  const signature       = r.u8(); // must be 0x74
  const version         = r.u8();
  const numDirections   = r.u8();
  const framesPerDir    = r.u32();
  /* mustBe1 */           r.u32();
  const totalCodedSize  = r.u32();

  const dirOffsets = [];
  for (let d=0; d<numDirections; d++) dirOffsets.push(r.u32());

  const directions = [];
  for (let d=0; d<numDirections; d++) {
    const bm = new BitMuncher(data);
    bm.bit = dirOffsets[d] * 8;

    const outSizeCoded    = bm.readBits(32);
    const comprFlags      = bm.readBits(2);
    const var0Bits        = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const widthBits       = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const heightBits      = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const xOffBits        = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const yOffBits        = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const optDataBits     = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];
    const codedBytesBits  = DCC_CRAZY_BIT_TABLE[bm.readBits(4)];

    let equalCellsSize=0, pixelMaskSize=0, encTypeSize=0, rawPixelSize=0;
    if (comprFlags & 2) equalCellsSize = bm.readBits(20);
    pixelMaskSize = bm.readBits(20);
    if (comprFlags & 1) { encTypeSize = bm.readBits(20); rawPixelSize = bm.readBits(20); }

    const frames = [];
    let dirBox = { x0:Number.MAX_SAFE_INTEGER, y0:Number.MAX_SAFE_INTEGER, x1:-Number.MAX_SAFE_INTEGER, y1:-Number.MAX_SAFE_INTEGER };

    for (let f=0; f<framesPerDir; f++) {
      /* var0 */               bm.readBits(var0Bits);
      const width             = bm.readBits(widthBits);
      const height            = bm.readBits(heightBits);
      const xOff              = bm.readSigned(xOffBits);
      const yOff              = bm.readSigned(yOffBits);
      bm.readBits(optDataBits);
      const codedBytes        = bm.readBits(codedBytesBits);
      const bottomUp          = bm.readBits(1);

      const box = { x0:xOff, y0:yOff-height+1, x1:xOff+width-1, y1:yOff };
      if (box.x0<dirBox.x0) dirBox.x0=box.x0;
      if (box.y0<dirBox.y0) dirBox.y0=box.y0;
      if (box.x1>dirBox.x1) dirBox.x1=box.x1;
      if (box.y1>dirBox.y1) dirBox.y1=box.y1;
      frames.push({ width, height, xOff, yOff, codedBytes, bottomUp, box });
    }

    // Pixel data bitstreams follow header
    const equalCellsData  = data.subarray(bm.bit>>3, (bm.bit>>3)+equalCellsSize);
    const pixelMaskData   = data.subarray((bm.bit>>3)+equalCellsSize, (bm.bit>>3)+equalCellsSize+pixelMaskSize);
    // (encoding/raw pixel streams not fully decoded — stub for future MPQ rendering)

    directions.push({ frames, dirBox, equalCellsSize, pixelMaskSize, comprFlags, equalCellsData, pixelMaskData });
  }

  return { signature, numDirections, framesPerDir, totalCodedSize, directions };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. DS1 — Level/Map layout (tile indices for walls, floors, shadows, objects)
//    Source: OpenDiablo2/d2common/d2fileformats/d2ds1/ds1.go
//    + DevilutionX understanding of DS1 layer ordering
// ─────────────────────────────────────────────────────────────────────────────
export function parseDS1(buffer) {
  const r = new BinaryReader(buffer);
  const version = r.i32();
  const width   = r.i32() + 1;
  const height  = r.i32() + 1;
  const act     = version>=8 ? r.i32()-1 : 0;  // 0-based
  const subType = version>=10 ? r.i32() : 0;

  // File list
  const files = [];
  if (version >= 3) {
    const numFiles = r.i32();
    for (let i=0; i<numFiles; i++) {
      let s=''; let c;
      while ((c=r.u8()) !== 0) s+=String.fromCharCode(c);
      files.push(s);
    }
  }

  if (version>=9 && version<=13) r.skip(8); // unknown bytes

  const numWalls  = version>=4 ? r.i32() : 1;
  const numFloors = version>=16 ? r.i32() : 1;

  function readLayer(count) {
    const cells = [];
    for (let i=0; i<count; i++) {
      const row = [];
      for (let j=0; j<width*height; j++) {
        const v = r.u32();
        row.push({
          prop1:   (v & 0x000000FF),
          sequence:(v & 0x00003F00) >> 8,
          unknown1:(v & 0x000FC000) >> 14,
          style:   (v & 0x03F00000) >> 20,
          unknown2:(v & 0x7C000000) >> 26,
          hidden:  (v & 0x80000000) !== 0,
        });
      }
      cells.push(row);
    }
    return cells;
  }

  function readOrientation(count) {
    const orients = [];
    for (let i=0; i<count; i++) {
      const row = [];
      for (let j=0; j<width*height; j++) {
        const v = r.u32();
        row.push(v & 0xFF);
      }
      orients.push(row);
    }
    return orients;
  }

  // Read wall layers + orientation layers (interleaved per wall layer)
  const walls=[], wallOrients=[];
  for (let w=0; w<numWalls; w++) {
    walls.push(...readLayer(1));
    wallOrients.push(...readOrientation(1));
  }
  const floors = readLayer(numFloors);
  const shadows = readLayer(1);
  const substitutions = version>=12 ? readLayer(1) : [];

  // Objects
  const objects = [];
  if (version >= 3) {
    const numObjects = r.i32();
    for (let i=0; i<numObjects; i++) {
      const type   = r.i32();
      const id     = r.i32();
      const x      = r.i32();
      const y      = r.i32();
      const flags  = r.i32();
      objects.push({ type, id, x, y, flags });
    }
  }

  return { version, width, height, act, subType, files, numWalls, numFloors,
           walls, wallOrients, floors, shadows, substitutions, objects,
    getTileIndex(layer, x, y) {
      const idx = y*this.width + x;
      if (layer === 'floor') return this.floors[0]?.[idx];
      if (layer === 'wall0') return this.walls[0]?.[idx];
      return null;
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. DT1 — Tile graphics (isometric diamonds + RLE wall blocks)
//    Source: OpenDiablo2/d2common/d2fileformats/d2dt1/dt1.go
//    + research specs for exact block layout
// ─────────────────────────────────────────────────────────────────────────────
// Isometric raster tables (DevilutionX / D2 standard)
const DT1_XJUMP = [14,12,10,8,6,4,2,0,2,4,6,8,10,12,14];
const DT1_NBPIX = [4,8,12,16,20,24,28,32,28,24,20,16,12,8,4];

export function parseDT1(buffer) {
  const r = new BinaryReader(buffer);
  const v1 = r.i32(); // must be 7
  const v2 = r.i32(); // must be 6
  r.skip(260);        // reserved
  const numTiles    = r.i32();
  const tilesOffset = r.i32(); // always 276

  const tiles = [];
  r.seek(276);
  for (let t=0; t<numTiles; t++) {
    const direction   = r.i32();
    const roofHeight  = r.i16();
    const soundIndex  = r.u8();
    const animated    = r.u8();
    const height      = r.i32();  // negative for walls
    const width       = r.i32();
    r.skip(4);                    // unknown
    const orientation = r.i32();  // tile type
    const mainIndex   = r.i32();
    const subIndex    = r.i32();
    const rarityOrFI  = r.i32();
    r.skip(4);                    // unknown
    const subTileFlags= r.bytes(25).slice(); // 5×5 walkability grid
    r.skip(7);                    // unknown
    const blockHdrOffset = r.i32();
    const blockDataLen   = r.i32();
    const numBlocks      = r.i32();
    r.skip(12);                   // unknown

    tiles.push({ direction, roofHeight, soundIndex, animated, height, width,
                 orientation, mainIndex, subIndex, rarityOrFI,
                 subTileFlags, blockHdrOffset, blockDataLen, numBlocks,
                 blocks: null }); // blocks loaded lazily
  }

  // Load block data for a tile
  function loadBlocks(tile) {
    if (tile.blocks) return;
    tile.blocks = [];
    let pos = tile.blockHdrOffset;
    const view = new DataView(buffer);
    for (let b=0; b<tile.numBlocks; b++) {
      const x          = view.getInt16(pos,true);    pos+=2;
      const y          = view.getInt16(pos,true);    pos+=2;
      pos += 2; // unknown
      const gridX      = view.getUint8(pos++);
      const gridY      = view.getUint8(pos++);
      const format     = view.getInt16(pos,true);    pos+=2;
      const dataLength = view.getInt32(pos,true);    pos+=4;
      pos += 2; // unknown
      const fileOffset = view.getInt32(pos,true);    pos+=4;
      const blockData  = new Uint8Array(buffer, tile.blockHdrOffset + fileOffset, dataLength);
      tile.blocks.push({ x, y, gridX, gridY, format, dataLength, blockData });
    }
  }

  // Render tile to palette index array (Uint8Array, width×abs(height))
  function renderTile(tile, palette) {
    loadBlocks(tile);
    const tW = 160, tH = Math.abs(tile.height);
    if (tW===0 || tH===0) return null;
    const pixels = new Uint8Array(tW * tH);
    const yOff   = tile.height < 0 ? -tile.height - 80 : 0;

    for (const blk of tile.blocks) {
      if (blk.format === 1) {
        // Isometric block (floor diamond, 256 bytes → 15 rows)
        let src=0;
        for (let y=0; y<15; y++) {
          let x = DT1_XJUMP[y];
          const n = DT1_NBPIX[y];
          for (let i=0; i<n; i++) {
            const dx=blk.x+x, dy=blk.y+y+yOff;
            if (dx>=0&&dx<tW&&dy>=0&&dy<tH) pixels[dy*tW+dx]=blk.blockData[src];
            src++; x++;
          }
        }
      } else {
        // RLE block (wall, floor variants)
        let x=0, y=0, i=0;
        while (i < blk.blockData.length) {
          const skip  = blk.blockData[i++];
          const count = blk.blockData[i++];
          if (skip===0 && count===0) { x=0; y++; continue; }
          x += skip;
          for (let n=0; n<count; n++) {
            const dx=blk.x+x, dy=blk.y+y+yOff;
            if (dx>=0&&dx<tW&&dy>=0&&dy<tH) pixels[dy*tW+dx]=blk.blockData[i];
            i++; x++;
          }
        }
      }
    }

    if (!palette) return pixels; // return index array
    const rgba = new Uint8ClampedArray(tW*tH*4);
    for (let i=0; i<pixels.length; i++) {
      const pi=pixels[i]*4;
      rgba[i*4]=palette[pi]; rgba[i*4+1]=palette[pi+1]; rgba[i*4+2]=palette[pi+2];
      rgba[i*4+3]=pixels[i]===0?0:255;
    }
    return new ImageData(rgba, tW, tH);
  }

  return { version:[v1,v2], numTiles, tiles, loadBlocks, renderTile };
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. AnimData — Animation speed/frame data (Data/Global/ui/Loading/loadingscreen.dc6)
//    Source: OpenDiablo2/d2common/d2fileformats/d2animdata/animdata.go
//    Format: 64-bucket hash table, each bucket has multiple records
// ─────────────────────────────────────────────────────────────────────────────
export function parseAnimData(buffer) {
  const r   = new BinaryReader(buffer);
  const map = {};
  for (let bucket=0; bucket<64; bucket++) {
    const numRecords = r.u32();
    for (let i=0; i<numRecords; i++) {
      const nameBuf = r.bytes(8);
      let name='';
      for (let b of nameBuf) { if (b===0) break; name+=String.fromCharCode(b); }
      const numFrames    = r.u32();
      const animSpeed    = r.u32();
      const frameData    = r.bytes(144); // 144 bytes of frame event flags
      map[name.toUpperCase()] = { numFrames, animSpeed, frameData };
    }
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. D1 Dungeon Generators — Ported from DevilutionX C++ (drlg_l1..l4 + crypt)
//    Produces a 2D integer map where:
//      0=floor, 1=wall, 2=pillar/corner, 3=arch, 4=door, 5=stair_down, 6=stair_up
// ─────────────────────────────────────────────────────────────────────────────

// Seeded RNG matching DevilutionX (linear congruential)
function makeRng(seed) {
  let s = (seed ^ 0xDEADBEEF) >>> 0;
  return function() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s;
  };
}

// L1 Cathedral (recursive room + spine corridor) — drlg_l1.cpp
export function genCathedral(cols=40, rows=40, seed=Date.now()) {
  const rng = makeRng(seed);
  const m = Array.from({length:rows}, ()=>new Uint8Array(cols).fill(1));

  // Main north-south spine
  const cx = Math.floor(cols/2);
  const spineW = 4 + (rng()%3);
  for (let y=2; y<rows-2; y++) {
    for (let dx=-1; dx<=spineW; dx++) {
      const x=cx+dx;
      if (x>=1&&x<cols-1) m[y][x]=0;
    }
  }

  const rooms=[];
  function carveRoom(x,y,w,h,depth) {
    if (depth>5||w<4||h<4||w>16||h>16) return;
    const x0=Math.max(1,x), y0=Math.max(1,y);
    const x1=Math.min(cols-2,x+w-1), y1=Math.min(rows-2,y+h-1);
    if (x1-x0<3||y1-y0<3) return;
    for (let ty=y0;ty<=y1;ty++) for (let tx=x0;tx<=x1;tx++) m[ty][tx]=0;
    // Walls around room
    for (let ty=y0;ty<=y1;ty++) {
      if (m[ty][x0-1]===1) m[ty][x0-1]=1;
      if (m[ty][x1+1]===1) m[ty][x1+1]=1;
    }
    rooms.push({x:x0,y:y0,w:x1-x0+1,h:y1-y0+1});
    // Branch rooms
    const branches = 2+(rng()%3);
    for (let i=0;i<branches;i++) {
      const side = rng()%4;
      const nw=4+(rng()%8), nh=4+(rng()%8);
      let nx=x0,ny=y0;
      if (side===0) { nx=x0+(rng()%(x1-x0+1)); ny=y0-nh-1; }
      else if (side===1) { nx=x1+1; ny=y0+(rng()%(y1-y0+1)); }
      else if (side===2) { nx=x0+(rng()%(x1-x0+1)); ny=y1+1; }
      else { nx=x0-nw-1; ny=y0+(rng()%(y1-y0+1)); }
      carveRoom(nx,ny,nw,nh,depth+1);
      // Connect with corridor
      const rdx=Math.floor((x0+x1)/2), rdy=Math.floor((y0+y1)/2);
      const ndx=Math.floor(nx+nw/2), ndy=Math.floor(ny+nh/2);
      let px=rdx,py=rdy;
      while(px!==ndx){m[py][px]=0;px+=px<ndx?1:-1;}
      while(py!==ndy){m[py][px]=0;py+=py<ndy?1:-1;}
    }
  }

  carveRoom(cx-8, 4, 16, 12, 0);
  carveRoom(cx-8, rows-16, 16, 12, 0);
  carveRoom(4, Math.floor(rows/2)-6, 12, 12, 0);
  carveRoom(cols-16, Math.floor(rows/2)-6, 12, 12, 0);

  // Place stairs
  _placeStairs(m, cols, rows, rng);
  return { map: m, rooms };
}

// L2 Catacombs (BSP rooms + hall corridors at midpoints) — drlg_l2.cpp
export function genCatacombs(cols=40, rows=40, seed=Date.now()) {
  const rng = makeRng(seed);
  const m = Array.from({length:rows}, ()=>new Uint8Array(cols).fill(1));
  const rooms=[];

  function split(x0,y0,x1,y1,depth) {
    const w=x1-x0, h=y1-y0;
    if (depth>5||w<8||h<8) {
      // Leaf: carve room (shrink by 1)
      const rx0=x0+1+(rng()%2), ry0=y0+1+(rng()%2);
      const rx1=x1-1-(rng()%2), ry1=y1-1-(rng()%2);
      if (rx1>rx0&&ry1>ry0) {
        for (let y=ry0;y<=ry1;y++) for (let x=rx0;x<=rx1;x++) m[y][x]=0;
        rooms.push({x:rx0,y:ry0,w:rx1-rx0+1,h:ry1-ry0+1});
      }
      return {cx:Math.floor((rx0+rx1)/2),cy:Math.floor((ry0+ry1)/2)};
    }
    const horiz = w<h ? true : h<w ? false : rng()%2===0;
    if (horiz) {
      const split=y0+4+rng()%(h-7);
      const c1=split(x0,y0,x1,split,depth+1);
      const c2=split(x0,split,x1,y1,depth+1);
      // Corridor connecting midpoints
      if (c1&&c2) {
        const mx=Math.min(c1.cx,c2.cx)+Math.floor(Math.abs(c1.cx-c2.cx)/2);
        for (let y=Math.min(c1.cy,c2.cy);y<=Math.max(c1.cy,c2.cy);y++) m[y][mx]=0;
        for (let x=Math.min(c1.cx,mx);x<=Math.max(c1.cx,mx);x++) m[c1.cy][x]=0;
        for (let x=Math.min(c2.cx,mx);x<=Math.max(c2.cx,mx);x++) m[c2.cy][x]=0;
      }
      return {cx:Math.floor((x0+x1)/2),cy:split};
    } else {
      const split=x0+4+rng()%(w-7);
      const c1=split(x0,y0,split,y1,depth+1);
      const c2=split(split,y0,x1,y1,depth+1);
      if (c1&&c2) {
        const my=Math.min(c1.cy,c2.cy)+Math.floor(Math.abs(c1.cy-c2.cy)/2);
        for (let x=Math.min(c1.cx,c2.cx);x<=Math.max(c1.cx,c2.cx);x++) m[my][x]=0;
        for (let y=Math.min(c1.cy,my);y<=Math.max(c1.cy,my);y++) m[y][c1.cx]=0;
        for (let y=Math.min(c2.cy,my);y<=Math.max(c2.cy,my);y++) m[y][c2.cx]=0;
      }
      return {cx:split,cy:Math.floor((y0+y1)/2)};
    }
  }

  split(1,1,cols-2,rows-2,0);
  _placeStairs(m, cols, rows, rng);
  return { map: m, rooms };
}

// L3 Caves (44% random walls → 5 erosion passes → flood fill) — drlg_l3.cpp
// Uses the same L3ConvTbl[16] pattern lookup from source
const L3_CONV_TBL = [8,11,3,10,1,9,12,12,6,13,4,13,2,14,5,7];

export function genCaves(cols=40, rows=40, seed=Date.now()) {
  const rng = makeRng(seed);
  const m = Array.from({length:rows}, ()=>new Uint8Array(cols));

  // Random fill
  for (let y=1;y<rows-1;y++) for (let x=1;x<cols-1;x++) m[y][x]=(rng()%100)<44?1:0;
  for (let y=0;y<rows;y++) { m[y][0]=1; m[y][cols-1]=1; }
  for (let x=0;x<cols;x++) { m[0][x]=1; m[rows-1][x]=1; }

  // 5 erosion (cellular automata) passes
  for (let pass=0;pass<5;pass++) {
    const n = Array.from({length:rows},()=>new Uint8Array(cols));
    for (let y=1;y<rows-1;y++) for (let x=1;x<cols-1;x++) {
      let walls=0;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) if (m[y+dy][x+dx]) walls++;
      n[y][x] = walls>=5 ? 1 : 0;
    }
    for (let y=1;y<rows-1;y++) for (let x=1;x<cols-1;x++) m[y][x]=n[y][x];
  }

  // Flood fill — keep largest connected region
  const visited = Array.from({length:rows},()=>new Uint8Array(cols));
  let bestSize=0, bestRegion=[];
  for (let sy=1;sy<rows-1;sy++) for (let sx=1;sx<cols-1;sx++) {
    if (m[sy][sx]===0&&!visited[sy][sx]) {
      const region=[], stack=[[sx,sy]];
      while (stack.length) {
        const [x,y]=stack.pop();
        if (x<0||y<0||x>=cols||y>=rows||visited[y][x]||m[y][x]!==0) continue;
        visited[y][x]=1; region.push([x,y]);
        stack.push([x+1,y],[x-1,y],[x,y+1],[x,y-1]);
      }
      if (region.length>bestSize) { bestSize=region.length; bestRegion=region; }
    }
  }
  // Fill everything, then restore best region
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++) m[y][x]=1;
  for (const [x,y] of bestRegion) m[y][x]=0;
  for (let y=0;y<rows;y++) { m[y][0]=1; m[y][cols-1]=1; }
  for (let x=0;x<cols;x++) { m[0][x]=1; m[rows-1][x]=1; }

  _placeStairs(m, cols, rows, rng);
  return { map: m, rooms:[] };
}

// L4 Hell (cathedral quadrant mirrored H+V) — drlg_l4.cpp
export function genHell(cols=40, rows=40, seed=Date.now()) {
  const qc=Math.floor(cols/2), qr=Math.floor(rows/2);
  const base = genCathedral(qc, qr, seed);
  const qm = base.map;
  const m = Array.from({length:rows},()=>new Uint8Array(cols).fill(1));
  // Top-left quadrant
  for (let y=0;y<qr;y++) for (let x=0;x<qc;x++) m[y][x]=qm[y][x];
  // Mirror horizontally → top-right
  for (let y=0;y<qr;y++) for (let x=0;x<qc;x++) m[y][cols-1-x]=qm[y][x];
  // Mirror vertically → bottom halves
  for (let y=0;y<qr;y++) for (let x=0;x<cols;x++) m[rows-1-y][x]=m[y][x];
  // Center corridor
  const cx=Math.floor(cols/2), cy=Math.floor(rows/2);
  for (let d=-2;d<=2;d++) {
    for (let x=0;x<cols;x++) m[cy+d][x]=0;
    for (let y=0;y<rows;y++) m[y][cx+d]=0;
  }
  _placeStairs(m, cols, rows, makeRng(seed));
  return { map: m, rooms: base.rooms };
}

// L5 Crypt (Hellfire L5 — reuses Cathedral + unique minisets) — crypt.cpp
export function genCrypt(cols=36, rows=36, seed=Date.now()) {
  return genCathedral(cols, rows, seed^0xCafe);
}

// L6 Nest (Hellfire L6 — reuses Caves + Nest minisets) — crypt.cpp / drlg_l3
export function genNest(cols=36, rows=36, seed=Date.now()) {
  return genCaves(cols, rows, seed^0xBabe);
}

// Helper: place stair markers on open floor tiles
function _placeStairs(m, cols, rows, rng) {
  const open=[];
  for (let y=2;y<rows-2;y++) for (let x=2;x<cols-2;x++) if (!m[y][x]) open.push([x,y]);
  if (open.length>=2) {
    const i1 = rng()%open.length;
    let i2; do { i2=rng()%open.length; } while(i2===i1);
    m[open[i1][1]][open[i1][0]]=5; // stair_down
    m[open[i2][1]][open[i2][0]]=6; // stair_up
  }
}

// Dispatch by dungeon style name
export const D2_DUNGEON_GEN = {
  cathedral: genCathedral,
  catacombs: genCatacombs,
  caves:     genCaves,
  hell:      genHell,
  crypt:     genCrypt,
  nest:      genNest,
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. DevilutionX A* Pathfinding — path.cpp
//    Exact costs (diag=101, axis=100), Chebyshev heuristic, CanStep wall-clip check
// ─────────────────────────────────────────────────────────────────────────────
const PATH_AXIS_COST = 100;
const PATH_DIAG_COST = 101;
const PATH_DIRS = [
  {dx:-1,dy:-1,cost:PATH_DIAG_COST}, {dx:-1,dy:1,cost:PATH_DIAG_COST},
  {dx:1,dy:-1,cost:PATH_DIAG_COST},  {dx:1,dy:1,cost:PATH_DIAG_COST},
  {dx:-1,dy:0,cost:PATH_AXIS_COST},  {dx:0,dy:-1,cost:PATH_AXIS_COST},
  {dx:1,dy:0,cost:PATH_AXIS_COST},   {dx:0,dy:1,cost:PATH_AXIS_COST},
];

function _pathHeuristic(ax,ay,bx,by) {
  const dx=Math.abs(ax-bx), dy=Math.abs(ay-by);
  return Math.min(dx,dy)*PATH_DIAG_COST + Math.abs(dx-dy)*PATH_AXIS_COST;
}

function _canStep(m, fromX, fromY, toX, toY, dx, dy) {
  if (dx===0||dy===0) return true; // cardinal always ok
  // Diagonal: check the two flanking cells for wall clipping
  return m[fromY+dy]?.[fromX]===0 && m[fromY]?.[fromX+dx]===0;
}

export function d2PathFind(map, sx, sy, ex, ey, maxLen=24) {
  const rows=map.length, cols=map[0].length;
  if (map[ey]?.[ex]!==0) return null; // target not walkable

  // Binary-heap priority queue
  class MinHeap {
    constructor() { this.h=[]; }
    push(node) {
      this.h.push(node);
      let i=this.h.length-1;
      while(i>0){const p=(i-1)>>1;if(this.h[p].f<=this.h[i].f)break;[this.h[p],this.h[i]]=[this.h[i],this.h[p]];i=p;}
    }
    pop() {
      const top=this.h[0]; const last=this.h.pop();
      if(this.h.length>0){this.h[0]=last;let i=0;while(true){let s=i,l=2*i+1,r=2*i+2;if(l<this.h.length&&this.h[l].f<this.h[s].f)s=l;if(r<this.h.length&&this.h[r].f<this.h[s].f)s=r;if(s===i)break;[this.h[s],this.h[i]]=[this.h[i],this.h[s]];i=s;}}
      return top;
    }
    get size() { return this.h.length; }
  }

  const gCost=new Map(), parent=new Map();
  const key=(x,y)=>y*cols+x;
  const heap=new MinHeap();
  gCost.set(key(sx,sy),0);
  heap.push({x:sx,y:sy,f:_pathHeuristic(sx,sy,ex,ey)});

  while (heap.size>0) {
    const {x,y}=heap.pop();
    if (x===ex&&y===ey) {
      // Reconstruct path
      const path=[];
      let cx=ex, cy=ey;
      while(cx!==sx||cy!==sy) {
        const pk=key(cx,cy); const par=parent.get(pk);
        path.unshift({x:cx,y:cy}); cx=par.x; cy=par.y;
      }
      return path.slice(0,maxLen);
    }
    const cg=gCost.get(key(x,y))??Infinity;
    for (const dir of PATH_DIRS) {
      const nx=x+dir.dx, ny=y+dir.dy;
      if (nx<0||ny<0||nx>=cols||ny>=rows) continue;
      if (map[ny][nx]!==0) continue;
      if (!_canStep(map,x,y,nx,ny,dir.dx,dir.dy)) continue;
      const ng=cg+dir.cost;
      if (ng<(gCost.get(key(nx,ny))??Infinity)) {
        gCost.set(key(nx,ny),ng);
        parent.set(key(nx,ny),{x,y});
        heap.push({x:nx,y:ny,f:ng+_pathHeuristic(nx,ny,ex,ey)});
      }
    }
  }
  return null; // no path
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. D2 File Path Constants (MPQ internal paths)
//     Based on D2data.mpq listfile and OpenDiablo2 d2resource
// ─────────────────────────────────────────────────────────────────────────────
export const D2_PATHS = {
  // Palettes
  ACT1_PAL:   'data/global/palette/ACT1/Pal.PL2',
  ACT2_PAL:   'data/global/palette/ACT2/Pal.PL2',
  ACT3_PAL:   'data/global/palette/ACT3/Pal.PL2',
  ACT4_PAL:   'data/global/palette/ACT4/Pal.PL2',
  ACT5_PAL:   'data/global/palette/ACT5/Pal.PL2',
  // Character DC6/DCC
  CHAR_DC6: (cls,part,dir)=>`data/global/ui/Loading/${cls}${part}_${dir}.dc6`,
  CHAR_DCC: (cls,anim,weapon)=>`data/global/chars/${cls}/${weapon}/${cls}${anim}.dcc`,
  // Monster DCC
  MON_DCC: (code,anim)=>`data/global/monsters/${code}/${code}${anim}.dcc`,
  // UI DC6
  CURSOR:   'data/global/ui/Cursor/ohand.DC6',
  INV_BG:   'data/global/ui/Panel/invchar6.DC6',
  SKILL_ICONS: 'data/global/ui/Spells/SpellIcons.dc6',
  // Tile data
  DS1: (act, level)=>`data/global/tiles/Act${act}/${level}.ds1`,
  DT1: (act, set)=>`data/global/tiles/Act${act}/${set}.dt1`,
  // Sounds
  SFX: (path)=>`data/global/sfx/${path}`,
};

// D2 character class code mapping
export const D2_CLASS_CODE = {
  amazon:   'AM', necromancer:'NE', barbarian:'BA',
  sorceress:'SO', paladin:'PA', druid:'DZ', assassin:'AI',
  monk:'MO', bard:'BR', hellfire_barbarian:'HB', // Hellfire classes
};

// D2 animation mode codes
export const D2_ANIM_MODE = {
  neutral:'NU', walk:'WL', attack1:'A1', attack2:'A2',
  block:'BL', cast:'SC', hit:'GH', death:'DT', sequence:'S1',
  run:'RN', knockback:'KK', dead:'DD',
};
