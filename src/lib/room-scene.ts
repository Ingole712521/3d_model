import type { ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';

import { colors } from '@/theme/colors';

type GlContext = ExpoWebGLRenderingContext;

export function createRoomRenderer(gl: GlContext): THREE.WebGLRenderer {
  const canvas = {
    width: gl.drawingBufferWidth,
    height: gl.drawingBufferHeight,
    clientWidth: gl.drawingBufferWidth,
    clientHeight: gl.drawingBufferHeight,
    style: {},
    addEventListener: () => {},
    removeEventListener: () => {},
    getContext: () => gl,
  };

  (gl as unknown as { canvas: unknown }).canvas = canvas;

  // Expo Go's WebGL2 context extends WebGLRenderingContext. Three r163+ treats
  // that as WebGL 1 and refuses to start. The check only runs in this constructor.
  const scope = globalThis as typeof globalThis & {
    WebGLRenderingContext?: typeof WebGLRenderingContext;
  };
  const webgl1 = scope.WebGLRenderingContext;
  scope.WebGLRenderingContext = function ExpoWebGLContext() {} as unknown as typeof WebGLRenderingContext;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: canvas as unknown as HTMLCanvasElement,
      context: gl as unknown as WebGLRenderingContext,
      antialias: false,
      alpha: false,
    });
  } finally {
    scope.WebGLRenderingContext = webgl1;
  }
  renderer.setPixelRatio(1);
  renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
  renderer.setClearColor(colors.background);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  return renderer;
}
