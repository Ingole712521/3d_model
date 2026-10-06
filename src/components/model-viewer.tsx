import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as THREE from 'three';

import { EmptyState } from '@/components/empty-state';
import { groupFromGlb } from '@/lib/load-glb';
import { createRoomRenderer } from '@/lib/room-scene';
import { colors } from '@/theme';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

export type ModelControls = {
  fit: () => void;
  reset: () => void;
};

type ModelViewerProps = {
  modelUrl?: string;
};

export const ModelViewer = forwardRef<ModelControls, ModelViewerProps>(function ModelViewer({ modelUrl }, ref) {
  const sceneRef = useRef<ModelControls>(null);
  const [attempt, setAttempt] = useState(0);

  useImperativeHandle(ref, () => ({
    fit: () => sceneRef.current?.fit(),
    reset: () => sceneRef.current?.reset(),
  }));

  if (!modelUrl) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>
        <EmptyState title="No model yet" message="This scan doesn't include a reconstructed model." />
      </View>
    );
  }

  return (
    <ReconstructedScene
      key={`${modelUrl}:${attempt}`}
      ref={sceneRef}
      modelUrl={modelUrl}
      onRetry={() => setAttempt((value) => value + 1)}
    />
  );
});

const ReconstructedScene = forwardRef<ModelControls, { modelUrl: string; onRetry: () => void }>(function ReconstructedScene(
  { modelUrl, onRetry },
  ref,
) {
  const reducedMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState("The reconstructed model didn't load. Try again.");
  const cleanupRef = useRef<(() => void) | null>(null);
  const poseRef = useRef({
    rotX: 0.18,
    rotY: 0.62,
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  const rotX = useSharedValue(0.18);
  const rotY = useSharedValue(0.62);
  const zoom = useSharedValue(1);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const originX = useSharedValue(0.18);
  const originY = useSharedValue(0.62);
  const zoomOrigin = useSharedValue(1);
  const panOriginX = useSharedValue(0);
  const panOriginY = useSharedValue(0);

  poseRef.current = {
    get rotX() {
      return rotX.get();
    },
    get rotY() {
      return rotY.get();
    },
    get zoom() {
      return zoom.get();
    },
    get panX() {
      return panX.get();
    },
    get panY() {
      return panY.get();
    },
  };

  const timing = (duration: number) => ({
    duration: reducedMotion ? 0 : duration,
    easing: EASE_OUT,
  });

  useImperativeHandle(ref, () => ({
    fit: () => {
      zoom.set(withTiming(1, timing(220)));
      panX.set(withTiming(0, timing(220)));
      panY.set(withTiming(0, timing(220)));
    },
    reset: () => {
      zoom.set(withTiming(1, timing(280)));
      panX.set(withTiming(0, timing(280)));
      panY.set(withTiming(0, timing(280)));
      rotX.set(withTiming(0.18, timing(280)));
      rotY.set(withTiming(0.62, timing(280)));
    },
  }));

  useEffect(() => () => cleanupRef.current?.(), []);

  const gesture = useMemo(() => {
    const rotate = Gesture.Pan()
      .maxPointers(1)
      .onBegin(() => {
        'worklet';
        originX.set(rotX.get());
        originY.set(rotY.get());
      })
      .onUpdate((event) => {
        'worklet';
        const nextX = originX.get() + event.translationY * 0.005;
        rotX.set(Math.max(-0.35, Math.min(0.85, nextX)));
        rotY.set(originY.get() + event.translationX * 0.006);
      });

    const pinch = Gesture.Pinch()
      .onBegin(() => {
        'worklet';
        zoomOrigin.set(zoom.get());
      })
      .onUpdate((event) => {
        'worklet';
        const next = zoomOrigin.get() * event.scale;
        zoom.set(Math.max(0.72, Math.min(2.1, next)));
      });

    const pan = Gesture.Pan()
      .minPointers(2)
      .onBegin(() => {
        'worklet';
        panOriginX.set(panX.get());
        panOriginY.set(panY.get());
      })
      .onUpdate((event) => {
        'worklet';
        panX.set(Math.max(-1.1, Math.min(1.1, panOriginX.get() + event.translationX * 0.004)));
        panY.set(Math.max(-0.7, Math.min(0.7, panOriginY.get() - event.translationY * 0.004)));
      });

    return Gesture.Simultaneous(rotate, pinch, pan);
  }, [originX, originY, panOriginX, panOriginY, panX, panY, rotX, rotY, zoom, zoomOrigin]);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    let active = true;
    let frame = 0;

    const fail = (error: unknown) => {
      if (!active) return;
      console.error(error);
      setErrorMessage(error instanceof Error ? error.message : "The reconstructed model didn't load. Try again.");
      setStatus('error');
    };

    void (async () => {
      try {
        const response = await fetch(modelUrl);
        if (!response.ok) throw new Error('The reconstructed model could not be downloaded.');
        const buffer = await response.arrayBuffer();
        if (!active) return;

        const renderer = createRoomRenderer(gl);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(38, gl.drawingBufferWidth / Math.max(gl.drawingBufferHeight, 1), 0.01, 100);
        camera.position.set(4.4, 3.1, 5.2);
        camera.lookAt(0, 0, 0);
        scene.add(new THREE.AmbientLight('#F4F1EA', 0.7));
        const key = new THREE.DirectionalLight('#FFF4E4', 1.2);
        key.position.set(3.5, 5.5, 2.4);
        scene.add(key);

        const model = groupFromGlb(buffer);
        const bounds = new THREE.Box3().setFromObject(model);
        if (bounds.isEmpty()) throw new Error('The reconstructed model has no visible geometry.');
        const size = bounds.getSize(new THREE.Vector3());
        const largest = Math.max(size.x, size.y, size.z);
        if (!Number.isFinite(largest) || largest <= 0) {
          throw new Error('The reconstructed model has no usable size.');
        }
        model.position.copy(bounds.getCenter(new THREE.Vector3())).multiplyScalar(-1);
        const fitted = 2.4 / largest;
        const pivot = new THREE.Group();
        pivot.scale.setScalar(fitted);
        pivot.add(model);
        scene.add(pivot);

        const loop = () => {
          if (!active) return;
          const pose = poseRef.current;
          pivot.rotation.order = 'YXZ';
          pivot.rotation.y = pose.rotY;
          pivot.rotation.x = pose.rotX;
          pivot.position.set(pose.panX, pose.panY, 0);
          pivot.scale.setScalar(fitted * pose.zoom);
          renderer.render(scene, camera);
          gl.endFrameEXP();
          frame = requestAnimationFrame(loop);
        };

        loop();
        if (active) setStatus('ready');

        cleanupRef.current = () => {
          active = false;
          cancelAnimationFrame(frame);
          disposeObject(pivot);
          renderer.dispose();
        };
      } catch (error) {
        fail(error);
      }
    })();

    cleanupRef.current = () => {
      active = false;
      cancelAnimationFrame(frame);
    };
  };

  if (status === 'error') {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          paddingTop: insets.top + 56,
          paddingHorizontal: 24,
          paddingBottom: 24,
        }}>
        <EmptyState title="Unable to show this model" message={errorMessage} actionLabel="Try again" onAction={onRetry} />
      </View>
    );
  }

  return (
    <GestureDetector gesture={gesture}>
      <View style={{ flex: 1 }} collapsable={false}>
        <GLView style={{ flex: 1 }} onContextCreate={onContextCreate} />
        {status === 'loading' ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <ActivityIndicator color={colors.textPrimary} />
          </View>
        ) : null}
      </View>
    </GestureDetector>
  );
});

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Points) {
      child.geometry.dispose();
      const material = child.material;
      if (Array.isArray(material)) material.forEach((item) => item.dispose());
      else material.dispose();
    }
  });
}
