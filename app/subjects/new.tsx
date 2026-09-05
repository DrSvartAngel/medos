import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SubjectEditor } from '@/components/curriculum/SubjectEditor';
import { subjectRouteId } from '@/utils/subjectRoutes';

export default function NewSubjectScreen() {
  const { committeeId } = useLocalSearchParams<{ committeeId?: string | string[] }>();
  return <SubjectEditor key={subjectRouteId(committeeId)} mode="create" id={subjectRouteId(committeeId)} />;
}
