// MedOS — Phase 12.5 Master Validation Suite: Semantic Chunking + Source Indexing (Hardened v13)
// Validates:
// 1. Schema v13 advancement & v12 -> v13 data preservation
// 2. Canonical SourceChunk model & interfaces
// 3. Database persistence: source_chunks, source_chunk_terms, source_chunks_fts
// 4. Primary FTS5 & Fallback SQLite Inverted Term Index (source_chunk_terms)
// 5. Corpus A-E (Plain text, Markdown, PDF, Hybrid, PPTX, Table, Notes, OCR, Visual)
// 6. Medical queries: "cardiac output", "preload", "muscarinic antagonist", "glomerular filtration"
// 7. Deterministic fingerprints & idempotent indexing
// 8. Strict Topic and Source isolation
// 9. Re-index invalidation and cascade deletion cleanup

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

function load(file, mocks = {}) {
  const source = read(file);
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
      if (key.startsWith('@/')) {
        const candidate = path.join(root, key.slice(2) + (key.endsWith('.ts') ? '' : '.ts'));
        if (fs.existsSync(candidate)) {
          const relCandidate = path.relative(root, candidate).replace(/\\/g, '/');
          return load(relCandidate, mocks);
        }
      }
      if (key.startsWith('.')) {
        const dir = path.dirname(path.join(root, file));
        const candidate = path.join(dir, key.endsWith('.ts') ? key : key + '.ts');
        if (fs.existsSync(candidate)) {
          const relCandidate = path.relative(root, candidate).replace(/\\/g, '/');
          return load(relCandidate, mocks);
        }
      }
      try {
        return require(key);
      } catch {
        return {};
      }
    },
    module,
    module.exports,
    path.join(root, file),
    path.dirname(path.join(root, file))
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

async function runValidation() {
  console.log('=== PHASE 12.5: SEMANTIC CHUNKING + SOURCE INDEXING VALIDATION ===\n');

  const calendarDate = load('utils/calendarDate.ts');

  // -------------------------------------------------------------
  // Test 1: Migration Regression: Upgrade from existing v12 Database
  // -------------------------------------------------------------
  {
    const v12Db = new SQLiteAdapter();
    v12Db.execSync('PRAGMA foreign_keys = ON');

    // Simulate v12 database state
    v12Db.execSync(`
      CREATE TABLE _schema_version (version INTEGER NOT NULL PRIMARY KEY);
      INSERT INTO _schema_version (version) VALUES (12);

      CREATE TABLE committees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        start_date INTEGER NOT NULL DEFAULT 0,
        exam_date INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL DEFAULT 0,
        subject TEXT NOT NULL,
        color TEXT NOT NULL DEFAULT '#6C63FF',
        created_at INTEGER NOT NULL
      );

      CREATE TABLE subjects (
        id TEXT PRIMARY KEY,
        committee_id TEXT NOT NULL REFERENCES committees(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE topics (
        id TEXT PRIMARY KEY,
        subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE study_sources (
        id TEXT PRIMARY KEY NOT NULL,
        topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        source_type TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE decks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE flashcards (
        id TEXT PRIMARY KEY,
        deck_id TEXT NOT NULL REFERENCES decks(id) ON DELETE CASCADE,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE focus_sessions (
        id TEXT PRIMARY KEY,
        duration_sec INTEGER NOT NULL,
        completed_at INTEGER NOT NULL
      );

      CREATE TABLE calendar_events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        date_key TEXT NOT NULL,
        event_type TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );
    `);

    // Insert mock v12 user data
    v12Db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c_v12', 'Cardio', 'Cardio', 1000)");
    v12Db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s_v12', 'c_v12', 'Hemodynamics', 1000, 1000)");
    v12Db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t_v12', 's_v12', 'Cardiac Cycle', 1000, 1000)");
    v12Db.runSync("INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES ('src_v12', 't_v12', 'Lecture Notes', 'Preload and afterload notes', 'note', 1000, 1000)");
    v12Db.runSync("INSERT INTO decks (id, title, created_at) VALUES ('d_v12', 'Cardio Deck', 1000)");
    v12Db.runSync("INSERT INTO flashcards (id, deck_id, front, back, created_at) VALUES ('fc_v12', 'd_v12', 'What is cardiac output?', 'HR x SV', 1000)");
    v12Db.runSync("INSERT INTO focus_sessions (id, duration_sec, completed_at) VALUES ('fs_v12', 1500, 1000)");
    v12Db.runSync("INSERT INTO calendar_events (id, title, date_key, event_type, created_at) VALUES ('ce_v12', 'Cardio Exam', '2026-10-10', 'exam', 1000)");

    // Run migrations from v12
    const v12Migrations = load('db/migrations.ts', {
      './client': { getDB: () => v12Db },
      '@/utils/calendarDate': calendarDate,
    });
    assert.strictEqual(v12Migrations.CURRENT_VERSION, 13, 'CURRENT_VERSION constant must be 13');
    await v12Migrations.runMigrations();

    // Verify schema version is now 13
    const versionRow = v12Db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.strictEqual(versionRow.version, 13, 'Schema must advance from v12 to v13');

    // Verify all existing user data was preserved
    assert.ok(v12Db.getFirstSync("SELECT id FROM committees WHERE id = 'c_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM subjects WHERE id = 's_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM topics WHERE id = 't_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM study_sources WHERE id = 'src_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM decks WHERE id = 'd_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM flashcards WHERE id = 'fc_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM focus_sessions WHERE id = 'fs_v12'"));
    assert.ok(v12Db.getFirstSync("SELECT id FROM calendar_events WHERE id = 'ce_v12'"));

    // Verify v13 chunk tables exist and work
    const tables = v12Db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name);
    assert.ok(tables.includes('source_chunks'), 'source_chunks must exist in upgraded v13');
    assert.ok(tables.includes('source_chunk_terms'), 'source_chunk_terms must exist in upgraded v13');

    v12Db.closeSync();
    console.log('PASS Schema Migration v12 -> v13: All user data preserved, schema advanced to v13');
  }

  // -------------------------------------------------------------
  // Test 2: Clean install & Schema v13 Table / Index Verification
  // -------------------------------------------------------------
  const db = new SQLiteAdapter();
  db.execSync('PRAGMA foreign_keys = ON');

  const migrations = load('db/migrations.ts', {
    './client': { getDB: () => db },
    '@/utils/calendarDate': calendarDate,
  });
  await migrations.runMigrations();

  const tableNames = db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name);
  assert.ok(tableNames.includes('study_sources'), 'study_sources table must exist');
  assert.ok(tableNames.includes('source_chunks'), 'source_chunks table must exist');
  assert.ok(tableNames.includes('source_chunk_terms'), 'source_chunk_terms inverted index table must exist');
  assert.ok(tableNames.includes('source_chunks_fts'), 'source_chunks_fts table must exist');

  const indexNames = db.getAllSync("SELECT name FROM sqlite_master WHERE type='index'").map((r) => r.name);
  assert.ok(indexNames.includes('idx_source_chunks_source_id'));
  assert.ok(indexNames.includes('idx_source_chunks_topic_id'));
  assert.ok(indexNames.includes('idx_source_chunks_source_ordinal'));
  assert.ok(indexNames.includes('idx_source_chunks_fingerprint'));
  assert.ok(indexNames.includes('idx_source_chunks_type'));
  assert.ok(indexNames.includes('idx_chunk_terms_term'));
  assert.ok(indexNames.includes('idx_chunk_terms_source_term'));
  assert.ok(indexNames.includes('idx_chunk_terms_topic_term'));
  assert.ok(indexNames.includes('idx_chunk_terms_chunk_id'));
  console.log('PASS Database Persistence: source_chunks, source_chunk_terms, and FTS5 verified');

  // Populate base curriculum entities
  db.runSync("INSERT INTO committees (id, name, subject, created_at) VALUES ('c1', 'Cardiology Committee', 'Cardio', 1000)");
  db.runSync("INSERT INTO subjects (id, committee_id, name, created_at, updated_at) VALUES ('s1', 'c1', 'Hemodynamics', 1000, 1000)");
  db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t1', 's1', 'Cardiac Cycle', 1000, 1000)");
  db.runSync("INSERT INTO topics (id, subject_id, name, created_at, updated_at) VALUES ('t2', 's1', 'Renal & Autonomic', 1000, 1000)");

  // Wire repositories
  const chunkRepoModule = load('db/repositories/sourceChunkRepo.ts', {
    '../client': { getDB: () => db },
    '@/db/client': { getDB: () => db },
  });
  const chunkRepo = chunkRepoModule.sourceChunkRepo || chunkRepoModule;

  const semanticChunker = load('services/chunking/semanticChunker.ts');
  const indexingServiceModule = load('services/chunking/indexingService.ts', {
    '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: chunkRepo },
    './semanticChunker': semanticChunker,
  });
  const indexingService = indexingServiceModule.indexingService || indexingServiceModule;

  // -------------------------------------------------------------
  // Test 3: Corpus A — Long Plain-Text Medical Lecture
  // -------------------------------------------------------------
  const corpusA = {
    id: 'src-a',
    topicId: 't1',
    title: 'Cardiac Output and Pressures',
    content: `Cardiac output is the volume of blood pumped by the heart per minute, specifically by a ventricle. It is the product of heart rate and stroke volume.

Normal resting cardiac output is approximately 5 L/min in healthy adults at rest. During intense exercise, it can increase up to 20–25 L/min.

Stroke volume is determined by three major physiological variables: preload, afterload, and myocardial contractility. Preload represents end-diastolic wall tension or end-diastolic volume. Afterload is the resistance against which the ventricle must pump, predominantly determined by systemic vascular resistance and aortic pressure.

Inotropic state refers to myocardial contractility independent of loading conditions. Sympathetic stimulation increases calcium influx, shifting the ventricular function curve upwards and leftwards.`,
    sourceType: 'text',
    createdAt: 1000,
    updatedAt: 1000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusA.id, corpusA.topicId, corpusA.title, corpusA.content, corpusA.sourceType, corpusA.createdAt, corpusA.updatedAt]
  );

  const chunksA = semanticChunker.chunkStudySource(corpusA);
  assert.ok(chunksA.length >= 3, `Corpus A should produce multiple semantic chunks (got: ${chunksA.length})`);
  for (const c of chunksA) {
    assert.strictEqual(c.sourceId, corpusA.id);
    assert.strictEqual(c.topicId, corpusA.topicId);
    assert.ok(c.tokenEstimate > 0, 'tokenEstimate must be positive');
    assert.ok(c.wordCount > 0, 'wordCount must be positive');
    assert.ok(c.tokenEstimate < 900, 'Chunk must satisfy soft max size limit');
    assert.ok(c.fingerprint.length > 0, 'Fingerprint must be present');
    assert.strictEqual(c.extractionMethod, 'native');
  }
  console.log('PASS Corpus A: Long plain-text lecture chunked at paragraph boundaries with size bounds');

  // -------------------------------------------------------------
  // Test 4: Corpus B — Markdown with Headings and Lists
  // -------------------------------------------------------------
  const corpusB = {
    id: 'src-b',
    topicId: 't2',
    title: 'Autonomic Pharmacology',
    content: `# Autonomic Regulation of Cardiac Function

The autonomic nervous system modulates heart rate and contractile force.

## Sympathetic Nervous System
- Postganglionic fibers release norepinephrine.
- Acts on beta-1 adrenergic receptors in nodal tissue and myocardium.

## Parasympathetic Nervous System & Muscarinic Antagonist
- Vagal efferents release acetylcholine onto muscarinic M2 receptors.
- Atropine acts as a competitive muscarinic antagonist blocking parasympathetic slowing.`,
    sourceType: 'text',
    createdAt: 2000,
    updatedAt: 2000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusB.id, corpusB.topicId, corpusB.title, corpusB.content, corpusB.sourceType, corpusB.createdAt, corpusB.updatedAt]
  );

  const chunksB = semanticChunker.chunkStudySource(corpusB);
  assert.ok(chunksB.length >= 2);
  const muscChunk = chunksB.find((c) => c.text.includes('muscarinic antagonist') || c.text.includes('Muscarinic'));
  assert.ok(muscChunk, 'Muscarinic antagonist chunk must be captured');
  console.log('PASS Corpus B: Markdown headings, lists, and pharmacology terms preserved');

  // -------------------------------------------------------------
  // Test 5: Corpus C — Multi-Page PDF with Strict Page Provenance
  // -------------------------------------------------------------
  const corpusC = {
    id: 'src-c',
    topicId: 't1',
    title: 'Cardiac Mechanics Monograph.pdf',
    content: `--- [Page 1] ---

Ventricular systole begins with the closure of the atrioventricular valves. During isovolumetric contraction, intraventricular pressure rises sharply without a change in volume.

--- [Page 2] ---

When left ventricular pressure exceeds aortic diastolic pressure, the aortic valve opens, initiating the ventricular ejection phase. Peak systolic pressure is reached during rapid ejection.`,
    sourceType: 'document',
    metadata: { canonicalType: 'pdf', pageCount: 2 },
    createdAt: 3000,
    updatedAt: 3000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusC.id, corpusC.topicId, corpusC.title, corpusC.content, corpusC.sourceType, corpusC.createdAt, corpusC.updatedAt]
  );

  const chunksC = semanticChunker.chunkStudySource(corpusC);
  assert.strictEqual(chunksC.length, 2, 'Should produce exactly 2 page chunks');
  assert.strictEqual(chunksC[0].pageNumber, 1);
  assert.strictEqual(chunksC[1].pageNumber, 2);
  console.log('PASS Corpus C: Multi-page PDF strictly preserves distinct page numbers');

  // -------------------------------------------------------------
  // Test 6: Corpus D — Hybrid PDF with Native vs OCR Extraction Methods
  // -------------------------------------------------------------
  const corpusD = {
    id: 'src-d',
    topicId: 't1',
    title: 'Hybrid Pathology Report.pdf',
    content: `--- [Page 1] ---

Native vector text describing normal myocardial histology and intercalated disc architecture.

--- [Page 2] ---

[OCR Page 2]
Scanned micrograph showing extensive coagulative necrosis and neutrophilic infiltration consistent with acute myocardial infarction.`,
    sourceType: 'document',
    metadata: { canonicalType: 'pdf', pageCount: 2 },
    createdAt: 4000,
    updatedAt: 4000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusD.id, corpusD.topicId, corpusD.title, corpusD.content, corpusD.sourceType, corpusD.createdAt, corpusD.updatedAt]
  );

  const chunksD = semanticChunker.chunkStudySource(corpusD);
  assert.strictEqual(chunksD.length, 2);
  assert.strictEqual(chunksD[0].extractionMethod, 'native');
  assert.strictEqual(chunksD[1].extractionMethod, 'ocr');
  console.log('PASS Corpus D: Hybrid PDF cleanly separates native text from OCR extractionMethod');

  // -------------------------------------------------------------
  // Test 7: Corpus E — PPTX Slides, Bullet Hierarchy, Tables, Notes
  // -------------------------------------------------------------
  const corpusE = {
    id: 'src-e',
    topicId: 't1',
    title: 'Valvular Hemodynamics.pptx',
    content: `--- [Slide 1: Aortic Stenosis Overview] ---

Cardinal manifestations:
- Angina pectoris
- Syncope with exertion
- Dyspnea on exertion

| Stage | Valve Area | Mean Gradient |
| Severe | < 1.0 cm2 | > 40 mmHg |
| Moderate | 1.0 - 1.5 cm2 | 20 - 40 mmHg |

[Speaker Notes]
Emphasize to students that symptom onset marks the critical inflection point for surgical intervention.

--- [Slide 2: Mitral Regurgitation] ---

Holosystolic murmur radiating to the axilla. Volume overload induces eccentric left ventricular hypertrophy.`,
    sourceType: 'document',
    metadata: {
      canonicalType: 'pptx',
      slideCount: 2,
      visualAssets: [
        {
          id: 'asset-1',
          sourceId: 'src-e',
          sourceTitle: 'Valvular Hemodynamics.pptx',
          topicId: 't1',
          slideNumber: 1,
          mimeType: 'image/png',
          ocrText: 'PRESSURE OVERLOAD -> CONCENTRIC LVH',
          visualDescription: 'Schematic illustration of left ventricular concentric remodeling in response to outflow obstruction.',
          provenance: { sourceId: 'src-e', sourceTitle: 'Valvular Hemodynamics.pptx', topicId: 't1', slideNumber: 1 },
        },
      ],
    },
    createdAt: 5000,
    updatedAt: 5000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusE.id, corpusE.topicId, corpusE.title, corpusE.content, corpusE.sourceType, corpusE.createdAt, corpusE.updatedAt]
  );

  const chunksE = semanticChunker.chunkStudySource(corpusE);
  const tableChunk = chunksE.find((c) => c.chunkType === 'table');
  assert.ok(tableChunk, 'Table chunk must be generated');
  assert.strictEqual(tableChunk.slideNumber, 1);

  const notesChunk = chunksE.find((c) => c.chunkType === 'speaker_note');
  assert.ok(notesChunk, 'Speaker notes chunk must be distinct');

  const ocrChunk = chunksE.find((c) => c.chunkType === 'ocr');
  assert.ok(ocrChunk, 'OCR chunk must be generated from visual assets');

  const visualChunk = chunksE.find((c) => c.chunkType === 'visual_description');
  assert.ok(visualChunk, 'Visual description chunk must be generated');
  console.log('PASS Corpus E: PPTX slides, tables, speaker notes, image OCR, and visual descriptions isolated with slide provenance');

  // -------------------------------------------------------------
  // Test 8: Corpus F — Renal Physiology ("glomerular filtration")
  // -------------------------------------------------------------
  const corpusF = {
    id: 'src-f',
    topicId: 't2',
    title: 'Renal Clearance Lecture',
    content: `Glomerular filtration rate is the volume of fluid filtered from the renal glomerular capillaries into the Bowman capsule per unit time. Normal GFR is approximately 125 mL/min in adult males.`,
    sourceType: 'text',
    createdAt: 6000,
    updatedAt: 6000,
  };

  db.runSync(
    'INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [corpusF.id, corpusF.topicId, corpusF.title, corpusF.content, corpusF.sourceType, corpusF.createdAt, corpusF.updatedAt]
  );
  indexingService.indexSourceSync(corpusF);

  // -------------------------------------------------------------
  // Test 9: Deterministic Fingerprints & Stable IDs
  // -------------------------------------------------------------
  const run1 = semanticChunker.chunkStudySource(corpusE);
  const run2 = semanticChunker.chunkStudySource(corpusE);
  assert.strictEqual(run1.length, run2.length);
  for (let i = 0; i < run1.length; i++) {
    assert.strictEqual(run1[i].id, run2[i].id);
    assert.strictEqual(run1[i].ordinal, run2[i].ordinal);
    assert.strictEqual(run1[i].fingerprint, run2[i].fingerprint);
  }
  console.log('PASS Deterministic Fingerprints: Stable, reproducible chunk identities across runs');

  // -------------------------------------------------------------
  // Test 10: Idempotent Indexing & Index Population
  // -------------------------------------------------------------
  indexingService.indexSourceSync(corpusA);
  const countA1 = chunkRepo.countBySourceId(corpusA.id);
  assert.strictEqual(countA1, chunksA.length);

  // Second run on same unchanged source must not duplicate
  indexingService.indexSourceSync(corpusA);
  const countA2 = chunkRepo.countBySourceId(corpusA.id);
  assert.strictEqual(countA2, countA1, 'Second indexing must be strictly idempotent');

  indexingService.indexSourceSync(corpusB);
  indexingService.indexSourceSync(corpusE);

  // -------------------------------------------------------------
  // Test 11: Real Medical Lexical Search Queries
  // -------------------------------------------------------------
  // 1. "cardiac output"
  const resCardiac = chunkRepo.search({ query: 'cardiac output' });
  assert.ok(resCardiac.length > 0, 'Query for "cardiac output" must match');
  assert.strictEqual(resCardiac[0].chunk.sourceId, corpusA.id);
  assert.ok(resCardiac[0].provenance.sourceTitle.includes('Cardiac Output'));

  // 2. "preload"
  const resPreload = chunkRepo.search({ query: 'preload' });
  assert.ok(resPreload.length > 0, 'Query for "preload" must match');
  assert.ok(resPreload.some((r) => r.chunk.text.toLowerCase().includes('preload')));

  // 3. "muscarinic antagonist"
  const resMuscarinic = chunkRepo.search({ query: 'muscarinic antagonist' });
  assert.ok(resMuscarinic.length > 0, 'Query for "muscarinic antagonist" must match');
  assert.strictEqual(resMuscarinic[0].chunk.sourceId, corpusB.id);

  // 4. "glomerular filtration"
  const resGfr = chunkRepo.search({ query: 'glomerular filtration' });
  assert.ok(resGfr.length > 0, 'Query for "glomerular filtration" must match');
  assert.strictEqual(resGfr[0].chunk.sourceId, corpusF.id);

  // 5. OCR text: "PRESSURE OVERLOAD"
  const resOcr = chunkRepo.search({ query: 'PRESSURE OVERLOAD' });
  assert.ok(resOcr.length > 0, 'Should find OCR chunk');
  assert.strictEqual(resOcr[0].chunk.extractionMethod, 'ocr');

  // 6. Visual Description: "concentric remodeling"
  const resVisual = chunkRepo.search({ query: 'concentric remodeling' });
  assert.ok(resVisual.length > 0, 'Should find visual description chunk');
  assert.strictEqual(resVisual[0].chunk.extractionMethod, 'visual');
  console.log('PASS Medical Lexical Queries: cardiac output, preload, muscarinic antagonist, glomerular filtration verified');

  // -------------------------------------------------------------
  // Test 12: Real SQLite-Backed Fallback Inverted Index (source_chunk_terms)
  // -------------------------------------------------------------
  // Verify that source_chunk_terms contains populated inverted terms
  const termsCount = db.getFirstSync('SELECT COUNT(*) as count FROM source_chunk_terms');
  assert.ok(termsCount && termsCount.count > 0, 'source_chunk_terms must contain persisted terms');

  // Verify direct indexed term search works without FTS5
  const cardiacTerms = db.getAllSync(
    "SELECT sc.id, sc.text, sct.term_frequency FROM source_chunk_terms sct JOIN source_chunks sc ON sc.id = sct.chunk_id WHERE sct.term = 'cardiac'"
  );
  assert.ok(cardiacTerms.length > 0, 'Term "cardiac" must be indexed in source_chunk_terms');
  console.log('PASS Fallback Inverted Index: source_chunk_terms verified with direct indexed term joins');

  // -------------------------------------------------------------
  // Test 13: Topic & Source Isolation
  // -------------------------------------------------------------
  const t1Results = chunkRepo.search({ query: 'pressure', topicId: 't1' });
  assert.ok(t1Results.length > 0);
  assert.ok(t1Results.every((r) => r.chunk.topicId === 't1'), 'Topic 1 filter must exclude Topic 2');

  const t2Results = chunkRepo.search({ query: 'filtration', topicId: 't2' });
  assert.ok(t2Results.length > 0);
  assert.ok(t2Results.every((r) => r.chunk.topicId === 't2'), 'Topic 2 filter must exclude Topic 1');

  const sBResults = chunkRepo.search({ query: 'receptors', sourceId: 'src-b' });
  assert.ok(sBResults.length > 0);
  assert.ok(sBResults.every((r) => r.chunk.sourceId === 'src-b'), 'Source filter must isolate Source B');
  console.log('PASS Topic & Source Isolation: Zero cross-topic or cross-source data leakage');

  // -------------------------------------------------------------
  // Test 14: Re-indexing Invalidation
  // -------------------------------------------------------------
  const updatedCorpusB = {
    ...corpusB,
    content: `# Modified Autonomic Regulation\n\nCompletely new section on baroreceptor reflex and carotid sinus stimulation.`,
    updatedAt: 7000,
  };
  indexingService.reindexSourceSync(updatedCorpusB);

  const oldResults = chunkRepo.search({ query: 'norepinephrine', sourceId: 'src-b' });
  assert.strictEqual(oldResults.length, 0, 'Obsolete chunks and terms must be purged upon re-indexing');

  const newResults = chunkRepo.search({ query: 'baroreceptor', sourceId: 'src-b' });
  assert.ok(newResults.length > 0, 'New chunks and terms must be indexed immediately');
  console.log('PASS Re-index Invalidation: Stale chunks and terms purged cleanly');

  // -------------------------------------------------------------
  // Test 15: Deletion Cleanup & Cascade
  // -------------------------------------------------------------
  const beforeDeleteChunks = chunkRepo.countBySourceId(corpusA.id);
  assert.ok(beforeDeleteChunks > 0);

  db.runSync('DELETE FROM study_sources WHERE id = ?', [corpusA.id]);
  const afterDeleteChunks = chunkRepo.countBySourceId(corpusA.id);
  assert.strictEqual(afterDeleteChunks, 0, 'Deleting study_source must cascade delete all chunks');

  const afterDeleteTerms = db.getFirstSync('SELECT COUNT(*) as count FROM source_chunk_terms WHERE source_id = ?', [corpusA.id]);
  assert.strictEqual(afterDeleteTerms?.count ?? 0, 0, 'Cascade delete must purge all inverted index terms');

  const searchDeleted = chunkRepo.search({ query: 'volume of blood pumped', sourceId: corpusA.id });
  assert.strictEqual(searchDeleted.length, 0, 'Deleted chunks must no longer appear in search');
  console.log('PASS Deletion Cleanup: Foreign key cascade and inverted index term cleanup verified');

  console.log('\nALL 15 HARDENED PHASE 12.5 VALIDATION CHECKS PASSED.');
}

runValidation().catch((err) => {
  console.error('FAIL:', err);
  process.exit(1);
});
