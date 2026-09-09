const fs = require('fs');
const path = require('path');

function validate() {
  const root = path.join(__dirname, '..');
  const errors = [];

  // 1. Verify tabs layout
  const tabsLayout = fs.readFileSync(path.join(root, 'app/(tabs)/_layout.tsx'), 'utf8');
  const expectedTabs = ['index', 'committees', 'focus', 'memory', 'calendar'];
  for (const tab of expectedTabs) {
    if (!tabsLayout.includes(`name: '${tab}'`)) {
      errors.push(`app/(tabs)/_layout.tsx is missing tab route for ${tab}`);
    }
  }

  // 2. Verify committees/[id].tsx (and/or SubjectList) flattening
  const subjectList = fs.readFileSync(path.join(root, 'components/curriculum/SubjectList.tsx'), 'utf8');
  if (!subjectList.includes('<TopicList')) {
    errors.push('SubjectList does not contain TopicList (flattening failed).');
  }

  // 3. Verify topics/[id].tsx segmented tabs
  const topicDetail = fs.readFileSync(path.join(root, 'app/topics/[id].tsx'), 'utf8');
  if (!topicDetail.includes("activeTab === 'overview'")) {
    errors.push('app/topics/[id].tsx does not seem to have the Overview tab.');
  }
  if (!topicDetail.includes("activeTab === 'materials'")) {
    errors.push('app/topics/[id].tsx does not seem to have the Materials tab.');
  }

  // 4. Verify returnTo context preservation
  const focusTab = fs.readFileSync(path.join(root, 'app/(tabs)/focus.tsx'), 'utf8');
  if (!focusTab.includes('returnTo')) {
    errors.push('app/(tabs)/focus.tsx is missing returnTo context parameter.');
  }

  const memoryTab = fs.readFileSync(path.join(root, 'app/(tabs)/memory.tsx'), 'utf8');
  if (!memoryTab.includes('returnTo')) {
    errors.push('app/(tabs)/memory.tsx is missing returnTo context parameter.');
  }

  // 5. Verify Topic-scoped Memory implementation
  const memoryRepo = fs.readFileSync(path.join(root, 'db/repositories/memoryRepo.ts'), 'utf8');
  if (!memoryRepo.includes('getTopicDueReviewQueue') || !memoryRepo.includes('getTopicScheduleSummary')) {
    errors.push('db/repositories/memoryRepo.ts is missing getTopicDueReviewQueue or getTopicScheduleSummary.');
  }

  const memoryStore = fs.readFileSync(path.join(root, 'store/useMemoryStore.ts'), 'utf8');
  if (!memoryStore.includes('startTopicReview')) {
    errors.push('store/useMemoryStore.ts is missing startTopicReview.');
  }

  if (!memoryTab.includes('topicId') || !memoryTab.includes('getTopicScheduleSummary') || !memoryTab.includes('getCardsByTopic')) {
    errors.push('app/(tabs)/memory.tsx is missing topic-scoped card/metric loading.');
  }

  const reviewRoute = path.join(root, 'app/memory/review.tsx');
  const reviewSessionComp = path.join(root, 'components/memory/ReviewSession.tsx');
  if (!fs.existsSync(reviewRoute)) {
    errors.push('app/memory/review.tsx does not exist.');
  } else {
    const reviewContent = fs.readFileSync(reviewRoute, 'utf8');
    if (!reviewContent.includes('topicId')) {
      errors.push('app/memory/review.tsx does not accept topicId.');
    }
  }

  if (!fs.existsSync(reviewSessionComp)) {
    errors.push('components/memory/ReviewSession.tsx does not exist.');
  } else {
    const sessionContent = fs.readFileSync(reviewSessionComp, 'utf8');
    if (!sessionContent.includes('startTopicReview')) {
      errors.push('components/memory/ReviewSession.tsx does not call startTopicReview.');
    }
  }

  if (errors.length > 0) {
    console.error('Validation failed with errors:');
    errors.forEach(e => console.error(' - ' + e));
    process.exit(1);
  }

  console.log('Phase 11.5 step 5 IA rebuild validated successfully.');
}

validate();
