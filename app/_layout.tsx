import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { useDB } from '@/hooks/useDB';
import { useTheme } from '@/hooks/useTheme';

export default function RootLayout() {
  const { error, isInitializing, retry } = useDB();
  const { isDark, colors } = useTheme();

  return (
    <SafeAreaProvider>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {isInitializing || error ? (
        <DatabaseGate
          isInitializing={isInitializing}
          hasError={error !== null}
          onRetry={() => void retry()}
        />
      ) : (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
