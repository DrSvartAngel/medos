import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { SubjectEditor } from '@/components/curriculum/SubjectEditor';
import { subjectRouteId } from '@/utils/subjectRoutes';

export default function EditSubjectScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return <SubjectEditor key={subjectRouteId(id)} mode="edit" id={subjectRouteId(id)} />;
}
