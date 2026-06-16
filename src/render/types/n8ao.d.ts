// Minimal typings for the n8ao package (ships untyped JS). Only the surface
// we use: stock-EffectComposer N8AOPass + the configuration knobs we set.
declare module 'n8ao' {
  import type { Camera, Scene } from 'three';
  import { Pass } from 'three/examples/jsm/postprocessing/Pass.js';

  export interface N8AOConfiguration {
    aoRadius: number;
    distanceFalloff: number;
    intensity: number;
    color: { set(hex: number): void };
    aoSamples: number;
    denoiseSamples: number;
    denoiseRadius: number;
    halfRes: boolean;
    depthAwareUpsampling: boolean;
    screenSpaceRadius: boolean;
    gammaCorrection: boolean;
    transparencyAware: boolean;
    accumulate: boolean;
  }

  export class N8AOPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: N8AOConfiguration;
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void;
    setDisplayMode(mode: 'Combined' | 'AO' | 'No AO' | 'Split' | 'Split AO'): void;
    setSize(width: number, height: number): void;
  }
}
