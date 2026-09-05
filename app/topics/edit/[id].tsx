import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { TopicEditor } from '@/components/curriculum/TopicEditor';
import { topicRouteId } from '@/utils/topicRoutes';

export default function EditTopicScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  return <TopicEditor id={topicRouteId(id)} mode="edit" />;
}
