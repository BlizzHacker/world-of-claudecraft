// Hand-written declarations for zip_store.mjs (scripts/ convention: a module
// imported by a type-checked Vitest suite carries a .d.mts next to the .mjs).

export declare const DOS_DATE: number;
export declare const DOS_TIME: number;

export interface StoreZipEntry {
  name: string;
  data: Buffer | Uint8Array;
}

export declare function crc32(data: Buffer | Uint8Array): number;
export declare function assertZipEntryName(name: string): void;
export declare function createStoreZip(entries: StoreZipEntry[]): Buffer;
