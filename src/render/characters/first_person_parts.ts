export type FirstPersonMeshRole = 'hide' | 'keep' | 'other';

function normalizedMeshName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function firstPersonMeshRole(name: string): FirstPersonMeshRole {
  const n = normalizedMeshName(name);
  if (!n) return 'other';
  if (
    n.includes('head')
    || n.includes('helmet')
    || n.includes('visor')
    || n.includes('hat')
    || n.includes('hair')
    || n.includes('cape')
    || n.endsWith('body')
    || n.includes('bodymerged')
  ) {
    return 'hide';
  }
  if (
    n.includes('armleft')
    || n.includes('armright')
    || n.includes('legleft')
    || n.includes('legright')
    || n.includes('hand')
    || n.includes('foot')
    || n.includes('toe')
  ) {
    return 'keep';
  }
  return 'other';
}

export function shouldPreserveFirstPersonMeshPart(name: string): boolean {
  return firstPersonMeshRole(name) !== 'other';
}
