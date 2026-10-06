import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { cancelAnimation, Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { AppButton } from '@/components/app-button';
import { IconButton } from '@/components/icon-button';
import { ThemedText } from '@/components/themed-text';
import { apiBaseUrl } from '@/services/api-config';
import { useScan } from '@/store/scan-store';
import { colors, radius, spacing } from '@/theme';
import { routeParam } from '@/utils/format';

type TourLink = {
  target: string;
  direction: 'forward' | 'back' | 'left' | 'right' | 'nearby';
  relation: 'next' | 'previous' | 'loop';
  yaw: number;
};

type TourNode = {
  id: string;
  index: number;
  imageUrl: string;
  heading: number;
  position: { x: number; y: number; z: number };
  links: TourLink[];
};

type TourDocument = {
  startNodeId: string;
  nodeCount: number;
  nodes: TourNode[];
};

const CROSSFADE_MS = 680;

const DIRECTION_LABEL: Record<TourLink['direction'], string> = {
  forward: 'Move forward',
  back: 'Move back',
  left: 'Turn left',
  right: 'Turn right',
  nearby: 'Open nearby viewpoint',
};

export function TourScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = routeParam(params.id);
  const scan = useScan(id);
  const insets = useSafeAreaInsets();
  const [tour, setTour] = useState<TourDocument | null>(null);
  const [nodeId, setNodeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${apiBaseUrl()}/scan/${id}/tour`);
        if (!response.ok) {
          throw new Error('This tour is not ready yet.');
        }
        const document = (await response.json()) as TourDocument;
        if (!document.nodes?.length) {
          throw new Error('This tour has no viewpoints.');
        }
        if (cancelled) return;
        setTour(document);
        setNodeId(document.startNodeId || document.nodes[0].id);
      } catch (caught) {
        if (!cancelled) {
          setError(caught instanceof Error && caught.message ? caught.message : 'This tour could not be opened.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!tour) return;
    const urls = tour.nodes.map((item) => item.imageUrl).filter((url) => url.length > 0);
    if (urls.length === 0) return;
    void Image.prefetch(urls, 'memory-disk');
  }, [tour]);

  const node = tour?.nodes.find((item) => item.id === nodeId) ?? null;

  const moveTo = useCallback(
    (target: string | undefined) => {
      if (!target || target === nodeId) return;
      setNodeId(target);
      void Haptics.selectionAsync();
    },
    [nodeId],
  );

  const moveRelation = useCallback(
    (relation: TourLink['relation']) => {
      const link = node?.links.find((item) => item.relation === relation);
      moveTo(link?.target);
    },
    [moveTo, node],
  );

  const swipe = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-28, 28])
        .onEnd((event) => {
          if (event.translationX < -48) {
            runOnJS(moveRelation)('next');
          } else if (event.translationX > 48) {
            runOnJS(moveRelation)('previous');
          }
        }),
    [moveRelation],
  );

  if (!id || error) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.xl, gap: spacing.md }}>
        <ThemedText variant="title">Tour unavailable</ThemedText>
        <ThemedText variant="subhead" selectable>
          {error ?? 'This scan could not be found.'}
        </ThemedText>
        <AppButton title="Back to spaces" onPress={() => router.replace('/history')} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <GestureDetector gesture={swipe}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {node ? <ViewpointStage node={node} /> : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              {loading ? <ActivityIndicator color={colors.accent} /> : null}
            </View>
          )}
          {node ? <DirectionControls node={node} onMove={moveTo} /> : null}
          {tour && node ? <TourMap tour={tour} currentId={node.id} onMove={moveTo} /> : null}
        </View>
      </GestureDetector>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          paddingTop: insets.top + spacing.sm,
          paddingHorizontal: spacing.sm,
          flexDirection: 'row',
          alignItems: 'center',
        }}>
        <IconButton icon="back" label="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} background={colors.overlay} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <ThemedText variant="headline" numberOfLines={1}>
            {scan?.name ?? 'Virtual tour'}
          </ThemedText>
          {tour && node ? (
            <ThemedText variant="caption">
              {node.index + 1} of {tour.nodeCount}
            </ThemedText>
          ) : null}
        </View>
        <IconButton
          icon="more"
          label="More options"
          background={colors.overlay}
          onPress={() => id && router.push({ pathname: '/scan-info/[id]', params: { id } })}
        />
      </View>

      {tour ? (
        <View
          style={{
            backgroundColor: colors.surface,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            paddingTop: spacing.sm,
            paddingBottom: insets.bottom + spacing.sm,
            gap: spacing.xs,
          }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}>
            {tour.nodes.map((item) => {
              const selected = item.id === nodeId;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={`Viewpoint ${item.index + 1}`}
                  onPress={() => moveTo(item.id)}
                  style={{
                    width: 72,
                    height: 52,
                    borderRadius: radius.sm,
                    overflow: 'hidden',
                    borderWidth: 2,
                    borderColor: selected ? colors.accent : 'transparent',
                  }}>
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: '100%', height: '100%' }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={0}
                    recyclingKey={item.imageUrl}
                  />
                </Pressable>
              );
            })}
          </ScrollView>
          <ThemedText variant="caption" style={{ paddingHorizontal: spacing.md }}>
            Swipe to walk. Arrows follow the navigation graph.
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

function ViewpointStage({ node }: { node: TourNode }) {
  const [frontUri, setFrontUri] = useState(node.imageUrl);
  const [backUri, setBackUri] = useState(node.imageUrl);
  const displayed = useRef(node.imageUrl);
  const pending = useRef<string | null>(null);
  const fading = useRef<string | null>(null);
  const ticket = useRef(0);
  const frontOnTop = useRef(true);
  const frontUriRef = useRef(node.imageUrl);
  const backUriRef = useRef(node.imageUrl);
  const frontOpacity = useSharedValue(1);
  const backOpacity = useSharedValue(0);
  const frontStyle = useAnimatedStyle(() => ({ opacity: frontOpacity.value }));
  const backStyle = useAnimatedStyle(() => ({ opacity: backOpacity.value }));

  const settle = useCallback((uri: string, incomingIsBack: boolean, issued: number) => {
    if (issued !== ticket.current || pending.current !== uri) return;
    displayed.current = uri;
    pending.current = null;
    fading.current = null;
    frontOnTop.current = !incomingIsBack;
  }, []);

  const startFade = useCallback(
    (uri: string, incomingIsBack: boolean, issued: number) => {
      if (issued !== ticket.current || pending.current !== uri || fading.current === uri) return;
      fading.current = uri;
      const incoming = incomingIsBack ? backOpacity : frontOpacity;
      const outgoing = incomingIsBack ? frontOpacity : backOpacity;
      incoming.value = withTiming(1, { duration: CROSSFADE_MS, easing: Easing.linear });
      outgoing.value = withTiming(0, { duration: CROSSFADE_MS, easing: Easing.linear }, (finished) => {
        if (finished) runOnJS(settle)(uri, incomingIsBack, issued);
      });
    },
    [backOpacity, frontOpacity, settle],
  );

  useEffect(() => {
    const uri = node.imageUrl;
    if (!uri || (uri === displayed.current && pending.current == null)) return;
    ticket.current += 1;
    const issued = ticket.current;
    pending.current = uri;
    fading.current = null;
    cancelAnimation(frontOpacity);
    cancelAnimation(backOpacity);
    const incomingIsBack = frontOnTop.current;
    if (incomingIsBack) {
      frontOpacity.value = 1;
      backOpacity.value = 0;
      if (backUriRef.current === uri) {
        startFade(uri, true, issued);
        return;
      }
      backUriRef.current = uri;
      setBackUri(uri);
      return;
    }
    backOpacity.value = 1;
    frontOpacity.value = 0;
    if (frontUriRef.current === uri) {
      startFade(uri, false, issued);
      return;
    }
    frontUriRef.current = uri;
    setFrontUri(uri);
  }, [backOpacity, frontOpacity, node.imageUrl, startFade]);

  return (
    <View style={styles.stage} collapsable={false} accessibilityLabel={`Viewpoint ${node.index + 1}`}>
      <Animated.View style={[StyleSheet.absoluteFill, frontStyle]} pointerEvents="none">
        <Image
          key={frontUri}
          source={{ uri: frontUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          priority="high"
          onLoad={() => startFade(frontUri, false, ticket.current)}
        />
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, backStyle]} pointerEvents="none">
        <Image
          key={backUri}
          source={{ uri: backUri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
          priority="high"
          onLoad={() => startFade(backUri, true, ticket.current)}
        />
      </Animated.View>
    </View>
  );
}

function DirectionControls({ node, onMove }: { node: TourNode; onMove: (target: string | undefined) => void }) {
  const byDirection = new Map<TourLink['direction'], TourLink>();
  for (const link of node.links) {
    if (!byDirection.has(link.direction)) byDirection.set(link.direction, link);
  }

  return (
    <>
      <ArrowButton label={DIRECTION_LABEL.left} symbol="‹" link={byDirection.get('left')} onMove={onMove} style={{ left: spacing.md, top: '42%' }} />
      <ArrowButton label={DIRECTION_LABEL.right} symbol="›" link={byDirection.get('right')} onMove={onMove} style={{ right: spacing.md, top: '42%' }} />
      <ArrowButton label={DIRECTION_LABEL.forward} symbol="⌃" link={byDirection.get('forward')} onMove={onMove} style={{ alignSelf: 'center', bottom: 108, left: '50%', marginLeft: -28 }} />
      <ArrowButton label={DIRECTION_LABEL.back} symbol="⌄" link={byDirection.get('back')} onMove={onMove} style={{ left: spacing.lg, bottom: 108 }} />
      <ArrowButton label={DIRECTION_LABEL.nearby} symbol="◎" link={byDirection.get('nearby')} onMove={onMove} style={{ right: spacing.lg, bottom: 108 }} />
    </>
  );
}

function ArrowButton({
  label,
  symbol,
  link,
  onMove,
  style,
}: {
  label: string;
  symbol: string;
  link: TourLink | undefined;
  onMove: (target: string | undefined) => void;
  style: object;
}) {
  if (!link) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => onMove(link.target)}
      style={[
        {
          position: 'absolute',
          width: 56,
          height: 56,
          borderRadius: radius.full,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.overlay,
        },
        style,
      ]}>
      <ThemedText variant="title" style={{ color: colors.shutter }}>
        {symbol}
      </ThemedText>
    </Pressable>
  );
}

function TourMap({ tour, currentId, onMove }: { tour: TourDocument; currentId: string; onMove: (target: string) => void }) {
  const bounds = useMemo(() => {
    const xs = tour.nodes.map((node) => node.position.x);
    const zs = tour.nodes.map((node) => node.position.z);
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minZ: Math.min(...zs),
      maxZ: Math.max(...zs),
    };
  }, [tour.nodes]);

  const point = (node: TourNode) => {
    const spanX = Math.max(0.001, bounds.maxX - bounds.minX);
    const spanZ = Math.max(0.001, bounds.maxZ - bounds.minZ);
    return {
      x: 10 + ((node.position.x - bounds.minX) / spanX) * 80,
      y: 10 + ((node.position.z - bounds.minZ) / spanZ) * 80,
    };
  };

  const lookup = new Map(tour.nodes.map((node) => [node.id, node]));

  return (
    <View
      style={{
        position: 'absolute',
        top: 108,
        right: spacing.sm,
        width: 108,
        height: 108,
        borderRadius: radius.md,
        backgroundColor: colors.overlay,
        overflow: 'hidden',
      }}>
      <Svg width={108} height={108} viewBox="0 0 100 100">
        {tour.nodes.flatMap((node) =>
          node.links
            .filter((link) => link.relation !== 'previous')
            .map((link) => {
              const target = lookup.get(link.target);
              if (!target) return null;
              const from = point(node);
              const to = point(target);
              return (
                <Line
                  key={`${node.id}-${link.target}`}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={link.relation === 'loop' ? colors.textTertiary : colors.accent}
                  strokeWidth={link.relation === 'loop' ? 1 : 1.5}
                />
              );
            }),
        )}
        {tour.nodes.map((node) => {
          const at = point(node);
          const selected = node.id === currentId;
          return <Circle key={node.id} cx={at.x} cy={at.y} r={selected ? 4.5 : 3} fill={selected ? colors.shutter : colors.accent} />;
        })}
      </Svg>
      {tour.nodes.map((node) => {
        const at = point(node);
        return (
          <Pressable
            key={`hit-${node.id}`}
            accessibilityRole="button"
            accessibilityLabel={`Map viewpoint ${node.index + 1}`}
            onPress={() => onMove(node.id)}
            style={{ position: 'absolute', left: at.x * 1.08 - 12, top: at.y * 1.08 - 12, width: 24, height: 24 }}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    backgroundColor: '#000',
  },
});
