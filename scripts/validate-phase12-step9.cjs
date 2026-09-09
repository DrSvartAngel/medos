// MedOS — Phase 12.9 Master Validation Suite: Vector Store Integration
// Covers all 40 required checklist items for provider-independent semantic + hybrid retrieval.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
// TypeScript Module Loader
// ---------------------------------------------------------------------------

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
  const mod = { exports: {} };
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
          const rel = path.relative(root, candidate).replace(/\\/g, '/');
          return load(rel, mocks);
        }
      }
      if (key.startsWith('.')) {
        const dir = path.dirname(path.join(root, file));
        const candidate = path.join(dir, key.endsWith('.ts') ? key : key + '.ts');
        if (fs.existsSync(candidate)) {
          const rel = path.relative(root, candidate).replace(/\\/g, '/');
          return load(rel, mocks);
        }
      }
      try {
        return require(key);
      } catch {
        return {};
      }
    },
    mod,
    mod.exports,
    path.join(root, file),
    path.dirname(path.join(root, file))
  );
  return mod.exports;
}

// ---------------------------------------------------------------------------
// SQLite Test Adapter
// ---------------------------------------------------------------------------

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

function createTestDatabase() {
  const db = new SQLiteAdapter();
  db.execSync('PRAGMA foreign_keys = ON;');
  db.execSync(`
    CREATE TABLE IF NOT EXISTS study_sources (
      id TEXT PRIMARY KEY,
      topic_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      source_type TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS topics (
      id TEXT PRIMARY KEY,
      subject_id TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS source_chunks (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL REFERENCES study_sources(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      source_title TEXT NOT NULL,
      ordinal INTEGER NOT NULL,
      chunk_type TEXT NOT NULL,
      text TEXT NOT NULL,
      page_number INTEGER,
      slide_number INTEGER,
      section_title TEXT,
      media_id TEXT,
      image_index INTEGER,
      extraction_method TEXT NOT NULL DEFAULT 'native',
      char_start INTEGER,
      char_end INTEGER,
      token_estimate INTEGER NOT NULL DEFAULT 0,
      word_count INTEGER NOT NULL DEFAULT 0,
      fingerprint TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS chunk_embeddings (
      chunk_id TEXT PRIMARY KEY NOT NULL REFERENCES source_chunks(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL REFERENCES study_sources(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
      embedding TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      model TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
  `);
  return db;
}

// ---------------------------------------------------------------------------
// Test Runner
// ---------------------------------------------------------------------------

let passedCount = 0;
let totalChecks = 0;

function check(name, fn) {
  totalChecks++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function checkAsync(name, fn) {
  totalChecks++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    throw err;
  }
}

async function runValidation() {
  console.log('=== PHASE 12.9: VECTOR STORE INTEGRATION VALIDATION ===\n');

  // Load modules
  const embeddingModels = load('models/embedding.ts');
  const retrievalModels = load('models/retrieval.ts');
  const { MockEmbeddingProvider, mockEmbeddingProvider } = load('services/embedding/mockEmbeddingProvider.ts');
  const { GeminiEmbeddingAdapter, geminiEmbeddingAdapter } = load('services/embedding/geminiEmbeddingAdapter.ts');
  const { normalizeLexicalScores, normalizeSemanticScore, rankHybrid } = load('services/retrieval/hybridRanker.ts');
  const contextBuilder = load('services/rag/contextBuilder.ts');

  // 1. vector store abstraction exists
  check('1. vector store abstraction exists', () => {
    const src = read('models/embedding.ts');
    assert.ok(src.includes('export interface VectorStore'), 'VectorStore interface missing');
    assert.ok(src.includes('upsert('), 'upsert missing');
    assert.ok(src.includes('searchNearest('), 'searchNearest missing');
    assert.ok(src.includes('hasValidEmbedding('), 'hasValidEmbedding missing');
  });

  // 2. embedding provider abstraction exists
  check('2. embedding provider abstraction exists', () => {
    const src = read('models/embedding.ts');
    assert.ok(src.includes('export interface EmbeddingProvider'), 'EmbeddingProvider interface missing');
    assert.ok(src.includes('embedText('), 'embedText missing');
    assert.ok(src.includes('defaultModel: string'), 'defaultModel missing');
    assert.ok(src.includes('dimensions: number'), 'dimensions missing');
  });

  // 3. deterministic mock embedding provider works
  check('3. deterministic mock embedding provider works', () => {
    const provider = new MockEmbeddingProvider(64);
    const vecA = provider.embedTextSync('Cardiac output and stroke volume');
    const vecB = provider.embedTextSync('Cardiac output and stroke volume');
    const vecC = provider.embedTextSync('Renal glomerular filtration rate');

    assert.strictEqual(vecA.dimensions, 64);
    assert.deepStrictEqual(vecA.vector, vecB.vector, 'Identical text must yield identical vector');

    // Compute norm of vecA
    const normA = Math.sqrt(vecA.vector.reduce((sum, v) => sum + v * v, 0));
    assert.ok(Math.abs(normA - 1.0) < 1e-4, `Expected unit norm, got ${normA}`);

    // Cosine similarity
    const dotAC = vecA.vector.reduce((sum, v, i) => sum + v * vecC.vector[i], 0);
    assert.ok(dotAC < 0.6, `Expected distinct concepts to have lower similarity, got ${dotAC}`);
  });

  // Setup in-memory DB for persistence tests
  const testDb = createTestDatabase();
  const chunkEmbeddingRepoModule = load('db/repositories/chunkEmbeddingRepo.ts', {
    '../client': { getDB: () => testDb },
  });
  const { chunkEmbeddingRepo, setChunkEmbeddingDbOverride, cosineSimilarity } = chunkEmbeddingRepoModule;
  setChunkEmbeddingDbOverride(testDb);

  // Seed parent records in testDb
  testDb.execSync(`
    INSERT INTO topics (id, subject_id, name, created_at, updated_at)
    VALUES ('topic-1', 'subj-1', 'Cardiovascular', 1000, 1000);

    INSERT INTO topics (id, subject_id, name, created_at, updated_at)
    VALUES ('topic-2', 'subj-1', 'Renal', 1000, 1000);

    INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at)
    VALUES ('src-1', 'topic-1', 'Cardio Physiology', 'Cardiac content', 'note', 1000, 1000);

    INSERT INTO study_sources (id, topic_id, title, content, source_type, created_at, updated_at)
    VALUES ('src-2', 'topic-2', 'Nephrology Notes', 'Renal content', 'note', 1000, 1000);
  `);

  // Insert mock chunks into source_chunks
  testDb.runSync(
    `INSERT INTO source_chunks (
      id, source_id, topic_id, source_title, ordinal, chunk_type, text, page_number, extraction_method, token_estimate, word_count, fingerprint, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ['chk-1', 'src-1', 'topic-1', 'Cardio Physiology', 0, 'paragraph', 'Cardiac output equals stroke volume times heart rate.', 12, 'native', 15, 8, 'fp-chk-1', 1000, 1000]
  );
  testDb.runSync(
    `INSERT INTO source_chunks (
      id, source_id, topic_id, source_title, ordinal, chunk_type, text, page_number, extraction_method, token_estimate, word_count, fingerprint, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ['chk-2', 'src-1', 'topic-1', 'Cardio Physiology', 1, 'paragraph', 'Preload represents ventricular end diastolic volume.', 13, 'native', 12, 6, 'fp-chk-2', 1000, 1000]
  );
  testDb.runSync(
    `INSERT INTO source_chunks (
      id, source_id, topic_id, source_title, ordinal, chunk_type, text, page_number, extraction_method, token_estimate, word_count, fingerprint, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    ['chk-3', 'src-2', 'topic-2', 'Nephrology Notes', 0, 'paragraph', 'Glomerular filtration rate is regulated by arteriolar resistance.', 45, 'native', 16, 8, 'fp-chk-3', 1000, 1000]
  );

  const embeddingIndexingModule = load('services/embedding/embeddingIndexingService.ts', {
    '@/db/repositories/chunkEmbeddingRepo': { chunkEmbeddingRepo },
    '@/db/repositories/sourceChunkRepo': {
      sourceChunkRepo: {
        getBySourceId(sourceId) {
          return testDb.getAllSync('SELECT * FROM source_chunks WHERE source_id = ?', [sourceId]).map(r => ({
            id: r.id, sourceId: r.source_id, topicId: r.topic_id, sourceTitle: r.source_title,
            ordinal: r.ordinal, chunkType: r.chunk_type, text: r.text, pageNumber: r.page_number,
            fingerprint: r.fingerprint, extractionMethod: r.extraction_method
          }));
        },
        getByTopicId(topicId) {
          return testDb.getAllSync('SELECT * FROM source_chunks WHERE topic_id = ?', [topicId]).map(r => ({
            id: r.id, sourceId: r.source_id, topicId: r.topic_id, sourceTitle: r.source_title,
            ordinal: r.ordinal, chunkType: r.chunk_type, text: r.text, pageNumber: r.page_number,
            fingerprint: r.fingerprint, extractionMethod: r.extraction_method
          }));
        }
      }
    }
  });
  const { embeddingIndexingService } = embeddingIndexingModule;

  const testProvider = new MockEmbeddingProvider(64);

  // 4. source chunk embedding generation
  await checkAsync('4. source chunk embedding generation', async () => {
    const chunks = testDb.getAllSync('SELECT * FROM source_chunks').map(r => ({
      id: r.id, sourceId: r.source_id, topicId: r.topic_id, text: r.text, fingerprint: r.fingerprint
    }));
    const res = await embeddingIndexingService.indexChunks(chunks, testProvider);
    assert.strictEqual(res.indexed, 3, 'All 3 chunks should be indexed');
    assert.strictEqual(res.skipped, 0);

    const saved = testDb.getFirstSync('SELECT COUNT(*) as count FROM chunk_embeddings');
    assert.strictEqual(saved.count, 3, 'Expected 3 saved embeddings');
  });

  // 5. unchanged chunk does not re-embed
  await checkAsync('5. unchanged chunk does not re-embed', async () => {
    const chunks = testDb.getAllSync('SELECT * FROM source_chunks').map(r => ({
      id: r.id, sourceId: r.source_id, topicId: r.topic_id, text: r.text, fingerprint: r.fingerprint
    }));
    const res = await embeddingIndexingService.indexChunks(chunks, testProvider);
    assert.strictEqual(res.indexed, 0, 'No chunks should re-embed');
    assert.strictEqual(res.skipped, 3, 'All 3 chunks should be skipped');
  });

  // 6. changed content invalidates old embedding
  await checkAsync('6. changed content invalidates old embedding', async () => {
    const changedChunk = {
      id: 'chk-1',
      sourceId: 'src-1',
      topicId: 'topic-1',
      text: 'Updated cardiac output content with new data.',
      fingerprint: 'fp-chk-1-new',
    };
    const isValid = chunkEmbeddingRepo.hasValidEmbedding(changedChunk.id, changedChunk.fingerprint, testProvider.defaultModel);
    assert.strictEqual(isValid, false, 'Old fingerprint should be invalid');

    const res = await embeddingIndexingService.indexChunks([changedChunk], testProvider);
    assert.strictEqual(res.indexed, 1, 'Changed chunk must be re-embedded');
  });

  // 7. embedding model/version change invalidates incompatibility
  check('7. embedding model/version change invalidates incompatibility', () => {
    const isValidModelA = chunkEmbeddingRepo.hasValidEmbedding('chk-1', 'fp-chk-1-new', testProvider.defaultModel);
    assert.strictEqual(isValidModelA, true);

    const isValidModelB = chunkEmbeddingRepo.hasValidEmbedding('chk-1', 'fp-chk-1-new', 'different-model-v2');
    assert.strictEqual(isValidModelB, false, 'Different model name should invalidate cache');
  });

  // 8. semantic retrieval returns relevant chunk
  check('8. semantic retrieval returns relevant chunk', () => {
    const qVec = testProvider.embedTextSync('cardiac output stroke volume').vector;
    const results = chunkEmbeddingRepo.searchNearest(qVec, { limit: 5 });
    assert.ok(results.length > 0, 'Expected results');
    assert.strictEqual(results[0].chunkId, 'chk-1', 'chk-1 should be the top semantic match for cardiac output');
  });

  // 9. semantic ranking order
  check('9. semantic ranking order', () => {
    const qVec = testProvider.embedTextSync('cardiac output heart rate').vector;
    const results = chunkEmbeddingRepo.searchNearest(qVec, { limit: 5 });
    for (let i = 1; i < results.length; i++) {
      assert.ok(results[i - 1].similarity >= results[i].similarity, 'Results must be in descending similarity order');
    }
  });

  // Set up mock sourceChunkRepo for retrievalService
  const mockLexicalRepo = {
    search(opts) {
      const q = (opts.query || '').toLowerCase();
      const res = [];
      if (q.includes('cardiac') || q.includes('stroke')) {
        res.push({
          chunk: { id: 'chk-1', text: 'Cardiac output equals stroke volume times heart rate.', ordinal: 0, chunkType: 'paragraph' },
          score: 30,
          matchTerms: ['cardiac', 'output'],
          provenance: { sourceId: 'src-1', topicId: 'topic-1', sourceTitle: 'Cardio Physiology', pageNumber: 12, extractionMethod: 'native' }
        });
      }
      if (q.includes('preload') || q.includes('ventricular')) {
        res.push({
          chunk: { id: 'chk-2', text: 'Preload represents ventricular end diastolic volume.', ordinal: 1, chunkType: 'paragraph' },
          score: 20,
          matchTerms: ['preload'],
          provenance: { sourceId: 'src-1', topicId: 'topic-1', sourceTitle: 'Cardio Physiology', extractionMethod: 'native' }
        });
      }
      if (q.includes('filtration') || q.includes('renal')) {
        res.push({
          chunk: { id: 'chk-3', text: 'Glomerular filtration rate is regulated by arteriolar resistance.', ordinal: 0, chunkType: 'paragraph' },
          score: 25,
          matchTerms: ['filtration'],
          provenance: { sourceId: 'src-2', topicId: 'topic-2', sourceTitle: 'Nephrology Notes', extractionMethod: 'native' }
        });
      }
      let filtered = res;
      if (opts.topicId) filtered = filtered.filter((r) => r.provenance.topicId === opts.topicId);
      if (opts.sourceId) filtered = filtered.filter((r) => r.provenance.sourceId === opts.sourceId);
      return filtered;
    }
  };

  const retrievalServiceModule = load('services/retrieval/retrievalService.ts', {
    '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: mockLexicalRepo },
    '@/db/repositories/chunkEmbeddingRepo': { chunkEmbeddingRepo },
    '@/services/embedding/embeddingClient': { getActiveEmbeddingProvider: () => testProvider },
  });
  const { retrievalService } = retrievalServiceModule;

  // 10. lexical retrieval still works
  check('10. lexical retrieval still works', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac', mode: 'lexical' });
    assert.strictEqual(resp.usedVector, false, 'Vector should not be used in lexical mode');
    assert.ok(resp.results.length > 0);
    assert.strictEqual(resp.results[0].chunkId, 'chk-1');
  });

  // 11. hybrid retrieval works
  check('11. hybrid retrieval works', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output', mode: 'hybrid' });
    assert.ok(resp.results.length > 0);
    assert.strictEqual(resp.usedVector, true, 'Hybrid mode should utilize vector search');
    assert.ok(resp.results[0].score > 0);
  });

  // 12. duplicate chunk prevention
  check('12. duplicate chunk prevention', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output stroke volume', mode: 'hybrid' });
    const ids = resp.results.map((r) => r.chunkId);
    const uniqueIds = new Set(ids);
    assert.strictEqual(ids.length, uniqueIds.size, 'Duplicate chunkId found in hybrid response');
  });

  // 13. topK respected
  check('13. topK respected', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac ventricular filtration', topK: 2 });
    assert.ok(resp.results.length <= 2, `Expected at most 2 results, got ${resp.results.length}`);
  });

  // 14. academic scope filtering
  check('14. academic scope filtering', () => {
    const resp = retrievalService.retrieve({
      query: 'cardiac filtration',
      scope: { topicId: 'topic-1' },
    });
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.topicId, 'topic-1', 'Cross-topic result leaked into topic-1 query');
    }
  });

  // 15. source scope filtering
  check('15. source scope filtering', () => {
    const resp = retrievalService.retrieve({
      query: 'cardiac filtration',
      scope: { sourceId: 'src-1' },
    });
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.sourceId, 'src-1', 'Cross-source result leaked into src-1 query');
    }
  });

  // 16. page/source metadata preserved
  check('16. page/source metadata preserved', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output', mode: 'hybrid' });
    const match = resp.results.find((r) => r.chunkId === 'chk-1');
    assert.ok(match, 'chk-1 missing');
    assert.strictEqual(match.provenance.sourceTitle, 'Cardio Physiology');
    assert.strictEqual(match.provenance.pageNumber, 12);
  });

  // 17. citation lineage remains compatible
  check('17. citation lineage remains compatible', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output', mode: 'hybrid' });
    const context = contextBuilder.buildGroundingContext(resp.results);
    assert.ok(context.contextText.includes('[SRC-1]'), 'Grounding context should format citations with [SRC-N]');
    assert.ok(context.citationMap.has('SRC-1'));
  });

  // 18. query embedding generated once
  await checkAsync('18. query embedding generated once', async () => {
    let callCount = 0;
    const countingProvider = {
      id: 'counting-provider',
      name: 'Counting Provider',
      defaultModel: 'count-v1',
      dimensions: 64,
      async embedText(text) {
        callCount++;
        return testProvider.embedTextSync(text);
      },
    };

    const countingRetrieval = load('services/retrieval/retrievalService.ts', {
      '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: mockLexicalRepo },
      '@/db/repositories/chunkEmbeddingRepo': { chunkEmbeddingRepo },
      '@/services/embedding/embeddingClient': { getActiveEmbeddingProvider: () => countingProvider },
    }).retrievalService;

    await countingRetrieval.retrieveAsync({ query: 'cardiac output' });
    assert.strictEqual(callCount, 1, `Expected query embedding to be generated exactly once, called ${callCount} times`);
  });

  // 19. missing provider fallback
  await checkAsync('19. missing provider fallback', async () => {
    const nullProviderRetrieval = load('services/retrieval/retrievalService.ts', {
      '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: mockLexicalRepo },
      '@/db/repositories/chunkEmbeddingRepo': { chunkEmbeddingRepo },
      '@/services/embedding/embeddingClient': { getActiveEmbeddingProvider: () => null },
    }).retrievalService;

    const resp = await nullProviderRetrieval.retrieveAsync({ query: 'cardiac' });
    assert.ok(resp.results.length > 0, 'Retrieval should succeed via lexical fallback');
    assert.strictEqual(resp.usedVector, false);
  });

  // 20. provider failure fallback
  await checkAsync('20. provider failure fallback', async () => {
    const failingProvider = new MockEmbeddingProvider(64);
    failingProvider.setMode('fail');

    const failingRetrieval = load('services/retrieval/retrievalService.ts', {
      '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: mockLexicalRepo },
      '@/db/repositories/chunkEmbeddingRepo': { chunkEmbeddingRepo },
      '@/services/embedding/embeddingClient': { getActiveEmbeddingProvider: () => failingProvider },
    }).retrievalService;

    const resp = await failingRetrieval.retrieveAsync({ query: 'cardiac' });
    assert.ok(resp.results.length > 0, 'Failed provider should not crash retrieval');
    assert.strictEqual(resp.usedVector, false);
  });

  // 21. missing credentials fallback
  await checkAsync('21. missing credentials fallback', async () => {
    const adapter = new GeminiEmbeddingAdapter();
    let thrownError;
    try {
      await adapter.embedText('test text');
    } catch (err) {
      thrownError = err;
    }
    assert.ok(thrownError, 'Calling unconfigured Gemini embedding adapter should throw');
    assert.strictEqual(thrownError.code, 'provider_unavailable');
  });

  // 22. dimension mismatch handled
  check('22. dimension mismatch handled', () => {
    const mismatchedVec = new Array(32).fill(0.1); // 32 dims instead of 64
    const results = chunkEmbeddingRepo.searchNearest(mismatchedVec, { limit: 5 });
    assert.strictEqual(results.length, 0, 'Mismatched dimension vector should be skipped cleanly');
  });

  // 23. malformed vector handled
  check('23. malformed vector handled', () => {
    const malformedSim = cosineSimilarity([NaN, 1, 0], [1, 0, 0]);
    assert.strictEqual(malformedSim, 0, 'NaN values should yield 0 similarity');
  });

  // 24. deleted source cannot be retrieved
  check('24. deleted source cannot be retrieved', () => {
    // Delete source-2 and verify chunk-3 cannot be found in vector search
    testDb.runSync('DELETE FROM study_sources WHERE id = ?;', ['src-2']);
    const qVec = testProvider.embedTextSync('glomerular filtration rate').vector;
    const results = chunkEmbeddingRepo.searchNearest(qVec, { limit: 5 });
    const ids = results.map(r => r.chunkId);
    assert.ok(!ids.includes('chk-3'), 'Deleted source chunk must not appear in vector search');
  });

  // 25. stale embedding cannot be retrieved
  check('25. stale embedding cannot be retrieved', () => {
    // Insert an orphaned embedding while foreign keys temporarily disabled to simulate legacy stale row
    testDb.runSync('PRAGMA foreign_keys = OFF;');
    testDb.runSync(
      `INSERT INTO chunk_embeddings (
        chunk_id, source_id, topic_id, embedding, dimensions, model, content_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      ['chk-nonexistent', 'src-1', 'topic-1', JSON.stringify(new Array(64).fill(0.1)), 64, testProvider.defaultModel, 'fp-none', 1000, 1000]
    );
    testDb.runSync('PRAGMA foreign_keys = ON;');
    const qVec = testProvider.embedTextSync('cardiac output').vector;
    const results = chunkEmbeddingRepo.searchNearest(qVec, { limit: 10 });
    const ids = results.map(r => r.chunkId);
    assert.ok(!ids.includes('chk-nonexistent'), 'Orphaned embedding without matching source_chunk must be excluded');
  });

  // 26. Turkish query
  check('26. Turkish query', () => {
    const qVec = testProvider.embedTextSync('kardiyak debi ve atım hacmi').vector;
    assert.strictEqual(qVec.length, 64);
    assert.ok(qVec.some(v => v !== 0), 'Turkish query should generate non-zero vector');
  });

  // 27. English query
  check('27. English query', () => {
    const qVec = testProvider.embedTextSync('cardiac output and stroke volume').vector;
    assert.strictEqual(qVec.length, 64);
    assert.ok(qVec.some(v => v !== 0), 'English query should generate non-zero vector');
  });

  // 28. mixed Turkish/English query
  check('28. mixed Turkish/English query', () => {
    const qVec = testProvider.embedTextSync('cardiac debi preload dolum basıncı').vector;
    assert.strictEqual(qVec.length, 64);
    assert.ok(qVec.some(v => v !== 0), 'Mixed query should generate non-zero vector');
  });

  // 29. bounded candidates
  check('29. bounded candidates', () => {
    const src = read('db/repositories/chunkEmbeddingRepo.ts');
    assert.ok(src.includes('LIMIT 1000'), 'Candidate search must include bounded limit');
  });

  // 30. deterministic ranking
  check('30. deterministic ranking', () => {
    const resp1 = retrievalService.retrieve({ query: 'cardiac output' });
    const resp2 = retrievalService.retrieve({ query: 'cardiac output' });
    assert.deepStrictEqual(
      resp1.results.map(r => ({ id: r.chunkId, score: r.score })),
      resp2.results.map(r => ({ id: r.chunkId, score: r.score })),
      'Consecutive runs must produce identical ranking and scores'
    );
  });

  // 31. no hardcoded API keys
  check('31. no hardcoded API keys', () => {
    const files = [
      'models/embedding.ts',
      'services/embedding/mockEmbeddingProvider.ts',
      'services/embedding/geminiEmbeddingAdapter.ts',
      'services/embedding/embeddingClient.ts',
      'services/embedding/embeddingIndexingService.ts',
      'services/retrieval/hybridRanker.ts',
      'services/retrieval/retrievalService.ts',
      'db/repositories/chunkEmbeddingRepo.ts',
    ];
    for (const f of files) {
      const src = read(f);
      assert.ok(!src.includes('AIzaSy'), `Hardcoded API key detected in ${f}`);
      assert.ok(!src.includes('sk-'), `Hardcoded OpenAI key pattern detected in ${f}`);
    }
  });

  // 32. no mandatory external network
  check('32. no mandatory external network', () => {
    const src = read('services/embedding/embeddingClient.ts');
    assert.ok(src.includes('mockEmbeddingProvider'), 'Default provider must be mock provider');
  });

  // 33. RAG service still consumes RetrievalService
  check('33. RAG service still consumes RetrievalService', () => {
    const src = read('services/rag/ragAnswerService.ts');
    assert.ok(src.includes('retrievalService.retrieve'), 'ragAnswerService must consume retrievalService');
    assert.ok(!src.includes('chunkEmbeddingRepo'), 'ragAnswerService must NOT directly depend on chunkEmbeddingRepo');
    assert.ok(!src.includes('geminiEmbeddingAdapter'), 'ragAnswerService must NOT directly depend on geminiEmbeddingAdapter');
  });

  // 34. Phase 12.5 regression PASS
  check('34. Phase 12.5 regression PASS', () => {
    const { execSync } = require('child_process');
    execSync('node scripts/validate-phase12-step5.cjs', { cwd: root, stdio: 'pipe' });
  });

  // 35. Phase 12.6 regression PASS
  check('35. Phase 12.6 regression PASS', () => {
    const { execSync } = require('child_process');
    execSync('node scripts/validate-phase12-step6.cjs', { cwd: root, stdio: 'pipe' });
  });

  // 36. Phase 12.7 regression PASS
  check('36. Phase 12.7 regression PASS', () => {
    const { execSync } = require('child_process');
    execSync('node scripts/validate-phase12-step7.cjs', { cwd: root, stdio: 'pipe' });
  });

  // 37. Phase 12.8 regression PASS
  check('37. Phase 12.8 regression PASS', () => {
    const { execSync } = require('child_process');
    execSync('node scripts/validate-phase12-step8.cjs', { cwd: root, stdio: 'pipe' });
  });

  // 38. TypeScript/static validation PASS
  check('38. TypeScript/static validation PASS', () => {
    const { execSync } = require('child_process');
    execSync('node node_modules/typescript/bin/tsc --noEmit', { cwd: root, stdio: 'pipe' });
  });

  // 39. schema/migration validation for schema v14
  await checkAsync('39. schema/migration validation for schema v14', async () => {
    const src = read('db/migrations.ts');
    assert.ok(src.includes('const CURRENT_VERSION = 14;'), 'CURRENT_VERSION must be 14');
    assert.ok(src.includes('if (currentVersion < 14)'), 'v14 migration block missing');
    assert.ok(src.includes('CREATE TABLE IF NOT EXISTS chunk_embeddings'), 'chunk_embeddings DDL missing');

    // 1. Fresh install test
    const freshDb = new SQLiteAdapter();
    const freshMigrations = load('db/migrations.ts', {
      './client': { getDB: () => freshDb },
      '@/utils/calendarDate': { formatLocalDateKey: () => '2026-09-09' },
    });
    await freshMigrations.runMigrations();
    const freshVer = freshDb.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.strictEqual(freshVer.version, 14, 'Fresh install must reach version 14');
    const freshTables = freshDb.getAllSync("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name);
    assert.ok(freshTables.includes('chunk_embeddings'), 'chunk_embeddings table must exist on fresh install');

    // 2. Migration from v13 test
    const v13Db = new SQLiteAdapter();
    v13Db.execSync(`
      CREATE TABLE _schema_version (version INTEGER NOT NULL);
      INSERT INTO _schema_version (version) VALUES (13);
      CREATE TABLE topics (id TEXT PRIMARY KEY, subject_id TEXT, name TEXT, created_at INTEGER, updated_at INTEGER);
      INSERT INTO topics VALUES ('t1', 's1', 'Cardio', 100, 100);
      CREATE TABLE study_sources (id TEXT PRIMARY KEY, topic_id TEXT REFERENCES topics(id), title TEXT, content TEXT, source_type TEXT, created_at INTEGER, updated_at INTEGER);
      INSERT INTO study_sources VALUES ('src1', 't1', 'Lecture 1', 'Content', 'note', 100, 100);
      CREATE TABLE source_chunks (id TEXT PRIMARY KEY, source_id TEXT REFERENCES study_sources(id), topic_id TEXT REFERENCES topics(id), source_title TEXT, ordinal INTEGER, chunk_type TEXT, text TEXT, fingerprint TEXT, created_at INTEGER, updated_at INTEGER);
      INSERT INTO source_chunks VALUES ('chk1', 'src1', 't1', 'Lecture 1', 0, 'paragraph', 'Heart rate', 'fp1', 100, 100);
    `);

    const upgradeMigrations = load('db/migrations.ts', {
      './client': { getDB: () => v13Db },
      '@/utils/calendarDate': { formatLocalDateKey: () => '2026-09-09' },
    });
    await upgradeMigrations.runMigrations();
    const upgradeVer = v13Db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.strictEqual(upgradeVer.version, 14, 'v13 must advance to v14');
    const v13Chunk = v13Db.getFirstSync("SELECT id FROM source_chunks WHERE id = 'chk1'");
    assert.ok(v13Chunk, 'v13 source chunks must be preserved');
    const upgradeTables = v13Db.getAllSync("SELECT name FROM sqlite_master WHERE type='table'").map((r) => r.name);
    assert.ok(upgradeTables.includes('chunk_embeddings'), 'chunk_embeddings must be created on upgrade');

    // 3. Idempotency test (running again should not error or change version)
    await upgradeMigrations.runMigrations();
    const idempVer = v13Db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
    assert.strictEqual(idempVer.version, 14, 'Repeated migrations must remain at v14');
  });

  // 40. existing project invariants remain intact
  check('40. existing project invariants remain intact', () => {
    const retSrc = read('services/retrieval/retrievalService.ts');
    assert.ok(!retSrc.includes('GoogleGenerativeAI'), 'SDK leak in retrievalService');
    assert.ok(!retSrc.match(/\bINSERT\b/i), 'Write op in retrievalService');
    assert.ok(!retSrc.match(/\bDELETE\b/i), 'Write op in retrievalService');
  });

  console.log(`\n============================================================`);
  console.log(`Phase 12.9 Validation: ${passedCount}/${totalChecks} passed, 0 failed`);
  console.log(`============================================================`);
}

runValidation().catch((err) => {
  console.error('\nValidation failed:', err);
  process.exit(1);
});
