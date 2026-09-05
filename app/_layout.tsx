import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DatabaseGate } from '@/components/layout/DatabaseGate';
import { useDB } from '@/hooks/useDB';
import { Colors } from '@/theme/colors';

export default function RootLayout() {
  const { error, isInitializing, retry } = useDB();

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
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
            contentStyle: { backgroundColor: Colors.background },
            animation: 'fade',
          }}
        />
      )}
    </SafeAreaProvider>
  );
}
