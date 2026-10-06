import 'react-native-gesture-handler';

import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useReducedMotion } from 'react-native-reanimated';

import { useScanStore } from '@/store/scan-store';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const reducedMotion = useReducedMotion();
  const loadHistory = useScanStore((state) => state.loadHistory);

  useEffect(() => {
    void SystemUI.setBackgroundColorAsync(colors.background);
    void loadHistory().finally(() => {
      void SplashScreen.hideAsync();
    });
  }, [loadHistory]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <ThemeProvider value={DarkTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: reducedMotion ? 'fade' : 'slide_from_right',
          }}>
          <Stack.Screen name="index" options={{ title: 'RoomScan 3D' }} />
          <Stack.Screen name="instructions" options={{ title: 'Scan your room' }} />
          <Stack.Screen name="camera" options={{ title: 'Scan Room', animation: 'fade' }} />
          <Stack.Screen name="review" options={{ title: 'Review your scan' }} />
          <Stack.Screen name="processing/[id]" options={{ title: 'Creating your 3D space' }} />
          <Stack.Screen name="viewer/[id]" options={{ title: '3D model' }} />
          <Stack.Screen name="history" options={{ title: 'Your spaces' }} />
          <Stack.Screen
            name="how-it-works"
            options={{
              title: 'How scanning works',
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: 'fitToContents',
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
          <Stack.Screen
            name="scan-info/[id]"
            options={{
              title: 'Scan details',
              presentation: 'formSheet',
              sheetGrabberVisible: true,
              sheetAllowedDetents: 'fitToContents',
              contentStyle: { backgroundColor: colors.surface },
            }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
