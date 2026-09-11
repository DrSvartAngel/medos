import '@/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useDB } from '@/hooks/useDB';
import { useTheme } from '@/hooks/useTheme';
import { resolveThemeMode } from '@/theme/themeBridge';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    'Manrope-Regular': Manrope_400Regular,
    'Manrope-Medium': Manrope_500Medium,
    'Manrope-SemiBold': Manrope_600SemiBold,
    'Manrope-Bold': Manrope_700Bold,
  });

  const { error, isInitializing, retry } = useDB();
  const { isDark, colorScheme, colors } = useTheme();
  const gluestackMode = resolveThemeMode(colorScheme);

  // App is ready once DB initializes and fonts are loaded (or font loading errored, falling back safely)
  const isAppReady = !isInitializing && (fontsLoaded || fontError !== null);

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={gluestackMode}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {!isAppReady || error ? (
          <DatabaseGate
            isInitializing={!isAppReady && !error}
            hasError={error !== null}
            onRetry={() => void retry()}
          />
        ) : (
          <Stack
            initialRouteName="(tabs)"
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
              animation: 'fade',
            }}
          />
        )}
      </GluestackUIProvider>
    </SafeAreaProvider>
  );
}
