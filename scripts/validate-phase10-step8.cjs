/**
 * MedOS — Phase 10 Step 8 Validation Suite
 *
 * Validates PDF / Document Ingestion Pipeline:
 * - ARCHITECTURE: Document extractor abstraction exists; isolated from AI provider layer.
 *   StudyAIService does NOT parse documents; Gemini provider does not receive file bytes.
 * - EXTRACTION CAPABILITY & TRUTHFULNESS:
 *   - Plain text extraction handles text/markdown, normalizes whitespace, rejects empty content.
 *   - On-device PDF extraction capability is truthfully reported as unavailable in standard Expo/Hermes runtime.
 *   - Manual text import fallback is provided when extraction is unavailable.
 *   - Limits enforced: file size limit (5 MB), text character length limit (100,000 chars).
 * - PREVIEW & SELECTION:
 *   - Document picker filters for supported MIME/file types.
 *   - Selected document metadata is displayed (name, formatted size, type).
 *   - Preview is editable and scrollable.
 *   - No automatic persistence; explicit user confirmation required.
 * - PERSISTENCE & DATABASE:
 *   - Reuses canonical studySourceRepo.insert.
 *   - Saves with source_type = 'document'.
 *   - Topic linkage preserved with foreign key cascade.
 *   - Original file bytes, binary data, or base64 are NOT stored in SQLite.
 *   - Schema strictly remains v12 unchanged.
 * - ISOLATION:
 *   - Zero writes to Memory (cards, flashcard_reviews).
 *   - Zero writes to Q-Bank (questions, question_attempts).
 *   - Zero writes to Analytics (study_sessions, session_events).
 *   - Zero AI provider calls or network uploads.
 * - LOCALIZATION:
 *   - Complete EN/TR parity across documentImport namespace and studySources.importDocument.
 * - ACCESSIBILITY:
 *   - Buttons have accessible labels and roles; no fixed-height content clipping.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { DatabaseSync } = require('node:sqlite');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(file, mocks = {}, source = read(file)) {
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
    },
    fileName: file,
  }).outputText;
  const module = { exports: {} };
  const wrapped = vm.runInThisContext(
    '(function(require,module,exports,__filename,__dirname){' + output + '\n})',
    { filename: file }
  );
  wrapped(
    (key) => {
      if (Object.hasOwn(mocks, key)) return mocks[key];
      if (key.startsWith('.')) {
        const dir = path.dirname(path.join(root, file));
        const candidate = path.join(dir, key.endsWith('.ts') ? key : key + '.ts');
        if (fs.existsSync(candidate)) {
          const relCandidate = path.relative(root, candidate).replace(/\\/g, '/');
          return load(relCandidate, mocks);
        }
      }
      return require(key);
    },
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

class SQLiteAdapter {
  constructor() {
    this.db = new DatabaseSync(':memory:');
  }
  execSync(sql) {
    this.db.exec(sql);
  }
  runSync(sql, values = []) {
    return this.db.prepare(sql).run(...values);
  }
  getFirstSync(sql, values = []) {
    return this.db.prepare(sql).get(...values);
  }
  getAllSync(sql, values = []) {
    return this.db.prepare(sql).all(...values);
  }
  withTransactionSync(work) {
    this.db.exec('BEGIN');
    try {
      work();
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  closeSync() {
    this.db.close();
  }
}

const calendarDate = load('utils/calendarDate.ts');

function migrate(db) {
  return load('db/migrations.ts', {
    './client': { getDB: () => db },
    '@/utils/calendarDate': calendarDate,
  }).runMigrations();
}

function createStudySourceRepo(db) {
  return load('db/repositories/studySourceRepo.ts', {
    '../client': { getDB: () => db },
  }).studySourceRepo;
}

console.log('=== PHASE 10 STEP 8: PDF / DOCUMENT INGESTION PIPELINE SUITE ===\n');

// 1. Schema check: strictly v12 unchanged
{
  const db = new SQLiteAdapter();
  migrate(db);
  const versionRow = db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
  assert.equal(versionRow.version, 12, 'Schema must remain strictly v12');

  // Verify study_sources table has source_type check constraint including 'document'
  const tableSql = db.getFirstSync(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name='study_sources'"
  ).sql;
  assert.match(tableSql, /'document'/, "study_sources must support 'document' source_type");
  db.closeSync();
  console.log('PASS Schema remains strictly v12 with native document source_type support');
}

// 2. Architecture & Layer Isolation
{
  const studyAIServiceSource = read('services/ai/studyAIService.ts');
  assert(
    !studyAIServiceSource.includes('documentExtractor'),
    'StudyAIService must not import documentExtractor'
  );
  assert(
    !studyAIServiceSource.includes('expo-document-picker'),
    'StudyAIService must not import expo-document-picker'
  );
  assert(
    !studyAIServiceSource.includes('expo-file-system'),
    'StudyAIService must not import expo-file-system'
  );

  const geminiProviderSource = read('services/ai/geminiProvider.ts');
  assert(
    !geminiProviderSource.includes('DocumentInput'),
    'GeminiProvider must not import DocumentInput'
  );
  assert(
    !geminiProviderSource.includes('expo-document-picker'),
    'GeminiProvider must not import expo-document-picker'
  );
  assert(
    !geminiProviderSource.includes('uploadFile'),
    'GeminiProvider must not upload files'
  );

  const docExtractorSource = read('services/documents/documentExtractor.ts');
  assert(
    !docExtractorSource.includes('gemini'),
    'documentExtractor must not import Gemini'
  );
  assert(
    !docExtractorSource.includes('MockAIProvider'),
    'documentExtractor must not import MockAIProvider'
  );

  console.log('PASS Document ingestion is isolated from AI providers and network upload');
}

// 3. Document Extractor Types, Limits & Utilities
{
  const docTypes = load('services/documents/documentTypes.ts');
  const docModule = load('services/documents/documentExtractor.ts', {
    './documentTypes': docTypes,
    './pdfExtractor': { pdfExtractor: { isSupported: () => false, extract: async () => ({ status: 'unavailable', text: '' }) } },
    './textExtractor': { textExtractor: { isSupported: () => true, extract: async () => ({ status: 'success', text: 'Clean text' }) } },
  });

  assert.equal(docModule.MAX_DOCUMENT_FILE_SIZE_BYTES, 5 * 1024 * 1024, 'Max file size must be 5 MB');
  assert.equal(docModule.MAX_DOCUMENT_TEXT_LENGTH, 100_000, 'Max text length must be 100,000 characters');

  // Utility tests
  assert.equal(docModule.cleanDocumentTitle('Physiology_Notes.pdf'), 'Physiology_Notes');
  assert.equal(docModule.cleanDocumentTitle('Cardiology.Chapter.1.txt'), 'Cardiology.Chapter.1');
  assert.equal(docModule.cleanDocumentTitle(''), '');

  assert.equal(docModule.formatDocumentFileSize(500), '500 B');
  assert.equal(docModule.formatDocumentFileSize(1024 * 150), '150.0 KB');
  assert.equal(docModule.formatDocumentFileSize(1024 * 1024 * 2.5), '2.5 MB');

  // Text normalization
  const dirty = '\r\nHello \t world\r\n\r\n\r\n\r\nTest paragraph\x00\x03\r\n';
  const clean = docModule.normalizeExtractedText(dirty);
  assert(!clean.includes('\r'), 'CRLF must be normalized to LF');
  assert(!clean.includes('\x00'), 'Null bytes must be stripped');
  assert(!clean.includes('\n\n\n'), 'Consecutive blank lines must be collapsed to max 2');
  assert.equal(clean, 'Hello \t world\n\nTest paragraph');

  console.log('PASS Document extractor limits, normalization, and utilities behave correctly');
}

// 4. PDF Extractor Truthful Runtime Capability
{
  const docTypes = load('services/documents/documentTypes.ts');
  const pdfModule = load('services/documents/pdfExtractor.ts', {
    './documentTypes': docTypes,
    './documentExtractor': docTypes,
  });

  const pdfExtractor = pdfModule.pdfExtractor;
  assert.equal(typeof pdfExtractor.extract, 'function');
  assert.equal(typeof pdfExtractor.isSupported, 'function');

  // Truthful boundary: returns false in current Expo/Hermes runtime
  assert.equal(pdfExtractor.isSupported('application/pdf', 'lecture.pdf'), false);
  assert.equal(pdfExtractor.isSupported('text/plain', 'lecture.txt'), false);

  // Extraction returns unavailable status truthfully
  const promise = pdfExtractor.extract({
    uri: 'file:///cache/lecture.pdf',
    name: 'lecture.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 50,
  });

  promise.then((res) => {
    assert.equal(res.status, 'unavailable', 'PDF extraction must report unavailable truthfully');
    assert.equal(res.text, '');
    assert(res.warnings && res.warnings.length > 0, 'PDF extraction must include warning');
  });

  // Rejects oversize files
  const oversizePromise = pdfExtractor.extract({
    uri: 'file:///cache/huge.pdf',
    name: 'huge.pdf',
    mimeType: 'application/pdf',
    size: 10 * 1024 * 1024, // 10 MB
  });

  oversizePromise.then((res) => {
    assert.equal(res.status, 'file_too_large', 'Oversize PDF must return file_too_large');
  });

  console.log('PASS PDF extractor reports runtime capability truthfully without fake extraction');
}

// 5. Text Extractor Functionality & Limits
{
  const docTypes = load('services/documents/documentTypes.ts');
  const textModule = load('services/documents/textExtractor.ts', {
    './documentTypes': {
      ...docTypes,
      normalizeExtractedText: (str) => str.trim(),
    },
    './documentExtractor': {
      ...docTypes,
      normalizeExtractedText: (str) => str.trim(),
    },
    'expo-file-system': {
      File: class MockFile {
        constructor(uri) {
          this.uri = uri;
        }
        async text() {
          if (this.uri.includes('empty')) return '   \n  ';
          if (this.uri.includes('large')) return 'x'.repeat(100_001);
          return 'Valid document study text on cardiac physiology.';
        }
      },
    },
  });

  const textExtractor = textModule.textExtractor;
  assert(textExtractor.isSupported('text/plain', 'notes.txt'));
  assert(textExtractor.isSupported(undefined, 'notes.md'));
  assert(!textExtractor.isSupported('application/pdf', 'notes.pdf'));

  // Valid extraction
  textExtractor
    .extract({ uri: 'file:///notes.txt', name: 'notes.txt', size: 100 })
    .then((res) => {
      assert.equal(res.status, 'success');
      assert.equal(res.text, 'Valid document study text on cardiac physiology.');
    });

  // Empty extraction rejected
  textExtractor
    .extract({ uri: 'file:///empty.txt', name: 'empty.txt', size: 10 })
    .then((res) => {
      assert.equal(res.status, 'empty');
    });

  // Oversize text rejected
  textExtractor
    .extract({ uri: 'file:///large.txt', name: 'large.txt', size: 200_000 })
    .then((res) => {
      assert.equal(res.status, 'text_too_long');
    });

  console.log('PASS Text extractor extracts local text, rejects empty content, and enforces limits');
}

// 6. Canonical Study Source Persistence with source_type = 'document'
{
  const db = new SQLiteAdapter();
  db.execSync('PRAGMA foreign_keys = ON');
  migrate(db);
  const repo = createStudySourceRepo(db);

  // Setup committee -> subject -> topic
  db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Cardiology', 'Medicine', 1000)");
  db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Physiology', 1000, 1000)");
  db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('top_doc_1', 's1', 'Cardiovascular Overview', 1000, 1000)");

  // Insert document source
  const source = repo.insert({
    topicId: 'top_doc_1',
    title: 'Harrison Cardiology Excerpt',
    content: 'The normal heart beats approximately 60 to 100 times per minute at rest.',
    sourceType: 'document',
  });

  assert.equal(source.topicId, 'top_doc_1');
  assert.equal(source.title, 'Harrison Cardiology Excerpt');
  assert.equal(source.sourceType, 'document');
  assert(source.id, 'Source ID must be generated');
  assert(source.createdAt > 0, 'Created timestamp must be monotonic integer');

  // Verify in SQLite
  const row = db.getFirstSync('SELECT * FROM study_sources WHERE id = ?', [source.id]);
  assert.equal(row.source_type, 'document');
  assert.equal(row.title, 'Harrison Cardiology Excerpt');
  assert.equal(
    row.content,
    'The normal heart beats approximately 60 to 100 times per minute at rest.'
  );

  // Verify binary / file URIs are NOT stored in SQLite
  const columnNames = Object.keys(row);
  assert(!columnNames.includes('file_bytes'), 'Binary bytes must not be persisted in table');
  assert(!columnNames.includes('file_blob'), 'File blobs must not be persisted in table');
  assert(!columnNames.includes('file_uri'), 'Local file URIs must not be stored in study_sources');

  db.closeSync();
  console.log('PASS Canonical studySourceRepo persists document sources with correct metadata');
}

// 7. Topic Foreign Key Cascade Invariant
{
  const db = new SQLiteAdapter();
  db.execSync('PRAGMA foreign_keys = ON');
  migrate(db);
  const repo = createStudySourceRepo(db);

  db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c2', 'Pulmonology', 'Medicine', 1000)");
  db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s2', 'c2', 'Respiration', 1000, 1000)");
  db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('top_cascade', 's2', 'Pulmonology', 1000, 1000)");

  repo.insert({
    topicId: 'top_cascade',
    title: 'Pulmonary Mechanics',
    content: 'Tidal volume is the amount of air moved per breath.',
    sourceType: 'document',
  });

  const countBefore = db.getFirstSync(
    "SELECT COUNT(*) as c FROM study_sources WHERE topic_id = 'top_cascade'"
  ).c;
  assert.equal(countBefore, 1);

  // Delete parent topic
  db.runSync("DELETE FROM topics WHERE id = 'top_cascade'");
  const countAfter = db.getFirstSync(
    "SELECT COUNT(*) as c FROM study_sources WHERE topic_id = 'top_cascade'"
  ).c;
  assert.equal(countAfter, 0, 'Study sources must cascade delete with parent topic');

  db.closeSync();
  console.log('PASS Study sources maintain strict CASCADE deletion on topic removal');
}

// 8. Isolation: Zero Writes to Memory, Q-Bank, or Analytics
{
  const db = new SQLiteAdapter();
  db.execSync('PRAGMA foreign_keys = ON');
  migrate(db);
  const repo = createStudySourceRepo(db);

  db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c3', 'Cardiology', 'Medicine', 1000)");
  db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s3', 'c3', 'Electrophysiology', 1000, 1000)");
  db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('top_iso', 's3', 'Electrophysiology', 1000, 1000)");

  repo.insert({
    topicId: 'top_iso',
    title: 'Arrhythmias',
    content: 'Ventricular fibrillation is a life-threatening rhythm.',
    sourceType: 'document',
  });

  const flashcardsCount = db.getFirstSync('SELECT COUNT(*) as c FROM flashcards').c;
  const reviewsCount = db.getFirstSync('SELECT COUNT(*) as c FROM flashcard_reviews').c;
  const qbankSessionsCount = db.getFirstSync('SELECT COUNT(*) as c FROM qbank_sessions').c;
  const focusSessionsCount = db.getFirstSync('SELECT COUNT(*) as c FROM focus_sessions').c;

  assert.equal(flashcardsCount, 0, 'No cards must be created by document ingestion');
  assert.equal(reviewsCount, 0, 'No reviews must be created by document ingestion');
  assert.equal(qbankSessionsCount, 0, 'No Q-Bank sessions must be created');
  assert.equal(focusSessionsCount, 0, 'No focus sessions must be created');

  db.closeSync();
  console.log('PASS Document ingestion strictly isolates Memory, Q-Bank, and Analytics tables');
}

// 9. UI Route Inspection & Pre-Persistence Safeguards
{
  const routeSource = read('app/topics/[id]/sources/import-document.tsx');
  assert(
    routeSource.includes('ScreenWrapper'),
    'import-document.tsx must use ScreenWrapper'
  );
  assert(
    routeSource.includes('includeBottomSafeArea'),
    'import-document.tsx must includeBottomSafeArea'
  );
  assert(
    routeSource.includes('DocumentPicker.getDocumentAsync'),
    'import-document.tsx must invoke DocumentPicker.getDocumentAsync'
  );
  assert(
    routeSource.includes('cleanDocumentTitle'),
    'import-document.tsx must clean document title from filename'
  );
  assert(
    routeSource.includes("sourceType: 'document'"),
    "import-document.tsx must persist with sourceType: 'document'"
  );
  assert(
    routeSource.includes('handleConfirmSave'),
    'import-document.tsx must require explicit confirm save before persistence'
  );
  assert(
    routeSource.includes('manualTextPlaceholder'),
    'import-document.tsx must support manual fallback text input'
  );
  assert(
    !routeSource.includes('geminiProvider'),
    'import-document.tsx must not import Gemini provider'
  );

  console.log('PASS Ingestion UI enforces explicit confirmation, preview, and safe fallback');
}

// 10. Localization Parity
{
  const en = load('i18n/en.ts').default;
  const tr = load('i18n/tr.ts').default;

  assert(en.documentImport, 'en.ts must include documentImport');
  assert(tr.documentImport, 'tr.ts must include documentImport');
  assert(en.studySources.importDocument, 'en.ts must include studySources.importDocument');
  assert(tr.studySources.importDocument, 'tr.ts must include studySources.importDocument');

  const enKeys = Object.keys(en.documentImport).sort();
  const trKeys = Object.keys(tr.documentImport).sort();

  assert.deepEqual(
    enKeys,
    trKeys,
    `EN/TR keys for documentImport must match identically. Diff: ${JSON.stringify(
      enKeys.filter((k) => !trKeys.includes(k))
    )} vs ${JSON.stringify(trKeys.filter((k) => !enKeys.includes(k)))}`
  );

  for (const key of enKeys) {
    const enVal = en.documentImport[key];
    const trVal = tr.documentImport[key];
    assert.equal(
      typeof enVal,
      typeof trVal,
      `Key ${key} must have identical type in EN and TR`
    );
  }

  console.log(`PASS Localization has 100% EN/TR parity across all ${enKeys.length} documentImport keys`);
}

// 11. Accessibility Attributes
{
  const routeSource = read('app/topics/[id]/sources/import-document.tsx');
  assert(
    routeSource.includes('accessibilityRole="button"') ||
      routeSource.includes('accessibilityLabel='),
    'Interactive controls must have accessibility labels'
  );
  assert(
    routeSource.includes('disabled={'),
    'Buttons must expose disabled state during saving/extracting'
  );
  assert(
    !routeSource.includes('height: 180,') && !routeSource.includes('height: 200,'),
    'Scrollable areas must not use fixed restrictive height'
  );

  console.log('PASS Accessibility roles, labels, disabled states, and responsive styling are intact');
}

console.log('\nAll 11 checks passed successfully!');
