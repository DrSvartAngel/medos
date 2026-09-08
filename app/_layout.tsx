import '@/global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { GluestackUIProvider } from '@/components/ui/gluestack-ui-provider';
import { useDB } from '@/hooks/useDB';
import { useTheme } from '@/hooks/useTheme';
import { resolveThemeMode } from '@/theme/themeBridge';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const { error, isInitializing, retry } = useDB();
  const { isDark, colorScheme, colors } = useTheme();
  const gluestackMode = resolveThemeMode(colorScheme);

  return (
    <SafeAreaProvider>
      <GluestackUIProvider mode={gluestackMode}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {isInitializing || error ? (
          <DatabaseGate
            isInitializing={isInitializing}
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
