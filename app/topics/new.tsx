import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TopicEditor } from '@/components/curriculum/TopicEditor';
import { topicRouteId } from '@/utils/topicRoutes';

export default function NewTopicScreen() {
  const { subjectId } = useLocalSearchParams<{ subjectId?: string | string[] }>();
  return <TopicEditor id={topicRouteId(subjectId)} mode="create" />;
}
