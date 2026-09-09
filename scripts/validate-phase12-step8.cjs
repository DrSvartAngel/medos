const fs = require('fs');
const path = require('path');

function check() {
  const errors = [];

  const assistantPath = path.join(__dirname, '../app/topics/[id]/assistant.tsx');
  const enPath = path.join(__dirname, '../i18n/en.ts');
  const trPath = path.join(__dirname, '../i18n/tr.ts');
  const cardPath = path.join(__dirname, '../components/study-ai/RagAnswerCard.tsx');

  // Check RagAnswerCard
  if (!fs.existsSync(cardPath)) {
    errors.push('RagAnswerCard.tsx is missing.');
  } else {
    const cardContent = fs.readFileSync(cardPath, 'utf8');
    if (!cardContent.includes('RagAnswerCard')) errors.push('RagAnswerCard missing export.');
    if (!cardContent.includes('ragInsufficientEvidence')) errors.push('RagAnswerCard missing evidence warning.');
  }

  // Check assistant.tsx
  if (!fs.existsSync(assistantPath)) {
    errors.push('assistant.tsx is missing.');
  } else {
    const content = fs.readFileSync(assistantPath, 'utf8');
    if (!content.includes('ragAnswerService.generate')) errors.push('ragAnswerService.generate not called.');
    if (!content.includes('activeMode === \'rag\'')) errors.push('rag mode not handled.');
    if (!content.includes('<RagAnswerCard')) errors.push('RagAnswerCard not rendered.');
  }

  // Check locales
  const enContent = fs.readFileSync(enPath, 'utf8');
  if (!enContent.includes('askTab')) errors.push('en.ts missing askTab.');
  const trContent = fs.readFileSync(trPath, 'utf8');
  if (!trContent.includes('askTab')) errors.push('tr.ts missing askTab.');

  if (errors.length > 0) {
    console.error('Validation failed:');
    errors.forEach(e => console.error('- ' + e));
    process.exit(1);
  } else {
    console.log('Phase 12.8 validation passed.');
    process.exit(0);
  }
}

check();
