// Economy layer barrel — one import surface for the rest of the codebase.

export * from './types';
export * from './currencies';
export * from './platinum_rules';
export * from './itemCatalog';
export * from './purchaseLedger';
export * from './walletService';
export * from './chainAdapter';
// Don't re-export solanaAdapter here — it lazy-imports node-only modules
// and we want the client bundle to tree-shake it. Server imports it
// directly from './solanaAdapter'.
