import React from 'react';
import { View } from 'react-native';
import { EmptyState } from '@/components/ui/EmptyState';
import { useTranslation } from '@/i18n';

interface CommitteeEmptyStateProps {
  onAdd: () => void;
}

export function CommitteeEmptyState({ onAdd }: CommitteeEmptyStateProps) {
  const t = useTranslation();

  return (
    <View style={{ width: '100%', alignItems: 'center' }}>
      <EmptyState
        title={t.committees.empty}
        message={t.committees.emptyDesc}
        icon="book-open"
        action={{
          label: t.committees.createFirst,
          onPress: onAdd,
        }}
      />
    </View>
  );
}
