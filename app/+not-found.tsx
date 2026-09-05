import { Link, Stack } from 'expo-router';
import { View, StyleSheet } from 'react-native';
import { ScreenWrapper } from '@/components/layout/ScreenWrapper';
import { AppText } from '@/components/ui/Typography';
import { Button } from '@/components/ui/Button';
import { useTranslation } from '@/i18n';

export default function NotFoundScreen() {
  const t = useTranslation();
  return (
    <>
      <Stack.Screen options={{ title: 'Not Found' }} />
      <ScreenWrapper>
        <View style={styles.container}>
          <AppText variant="h1" style={{ textAlign: 'center' }}>404</AppText>
          <AppText variant="h3" style={{ textAlign: 'center', marginTop: 8 }}>
            {t.notFound.title}
          </AppText>
          <Link href="/" asChild style={{ marginTop: 24 }}>
            <Button label={t.notFound.goHome} onPress={() => {}} />
          </Link>
        </View>
      </ScreenWrapper>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
