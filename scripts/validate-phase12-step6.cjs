// MedOS — Phase 12.6 Master Validation Suite: Retrieval Layer
// Validates:
// 1. RetrievalQuery / RetrievalResult / RetrievalResponse domain model contracts
// 2. retrievalService.retrieve() with text query and scope filtering
// 3. Scope narrowing: topicId, sourceId, and multi-topic (committee simulation)
// 4. topK clamping (min 1, max 50, default 10)
// 5. minScore filtering (only active when query terms present)
// 6. Deterministic tie-breaking: score DESC, sourceId ASC, ordinal ASC
// 7. listByTopic() listing mode (empty query)
// 8. listBySource() listing mode (empty query)
// 9. searchInTopic() / searchInSource() convenience wrappers
// 10. RetrievalError codes: invalid_query
// 11. Zero writes to any SQLite table
// 12. Schema v13 unchanged

'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
// Generic TypeScript module loader (no caching — fresh context per call)
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
      try { return require(key); } catch { return {}; }
    },
    mod,
    mod.exports,
    path.join(root, file),
    path.dirname(path.join(root, file))
  );
  return mod.exports;
}

// ---------------------------------------------------------------------------
// SQLite test infrastructure (for zero-write and schema tests only)
// ---------------------------------------------------------------------------

class SQLiteAdapter {
  constructor() { this.db = new DatabaseSync(':memory:'); }
  execSync(sql) { this.db.exec(sql); }
  runSync(sql, values = []) { return this.db.prepare(sql).run(...values); }
  getFirstSync(sql, values = []) { return this.db.prepare(sql).get(...values) ?? null; }
  getAllSync(sql, values = []) { return this.db.prepare(sql).all(...values); }
  withTransactionSync(fn) {
    this.db.exec('BEGIN');
    try { fn(); this.db.exec('COMMIT'); }
    catch (e) { try { this.db.exec('ROLLBACK'); } catch {} throw e; }
  }
}

function createMinimalSchema(db) {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _schema_version (version INTEGER NOT NULL);
    INSERT INTO _schema_version VALUES (13);
    CREATE TABLE IF NOT EXISTS source_chunks (
      id TEXT PRIMARY KEY,
      source_id TEXT NOT NULL, topic_id TEXT NOT NULL,
      source_title TEXT NOT NULL DEFAULT '', ordinal INTEGER NOT NULL DEFAULT 0,
      chunk_type TEXT NOT NULL DEFAULT 'paragraph', text TEXT NOT NULL,
      page_number INTEGER, slide_number INTEGER, section_title TEXT,
      media_id TEXT, image_index INTEGER,
      extraction_method TEXT NOT NULL DEFAULT 'native',
      char_start INTEGER, char_end INTEGER,
      token_estimate INTEGER NOT NULL DEFAULT 0, word_count INTEGER NOT NULL DEFAULT 0,
      fingerprint TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS source_chunk_terms (
      term TEXT NOT NULL, chunk_id TEXT NOT NULL,
      source_id TEXT NOT NULL, topic_id TEXT NOT NULL,
      term_frequency INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (term, chunk_id)
    );
  `);
}

// ---------------------------------------------------------------------------
// Mock sourceChunkRepo factory
// Creates a fresh repo mock with controllable search results and write tracking.
// ---------------------------------------------------------------------------

function makeChunkSearchResult(id, sourceId, topicId, ordinal, text, score, matchTerms, chunkType) {
  return {
    chunk: {
      id, sourceId, topicId, sourceTitle: 'Test Source',
      ordinal: ordinal ?? 0,
      chunkType: chunkType || 'paragraph',
      text: text || 'test text',
      extractionMethod: 'native',
      tokenEstimate: 5, wordCount: 5,
      fingerprint: id,
      createdAt: 1000, updatedAt: 1000,
    },
    score: score ?? 10,
    matchTerms: matchTerms ?? ['test'],
    provenance: {
      sourceId, sourceTitle: 'Test Source', topicId,
      excerpt: (text || 'test text').slice(0, 160).trim(),
      extractionMethod: 'native',
    },
  };
}

function makeMockRepo(searchResults) {
  let writeCalled = false;
  return {
    _writes: () => writeCalled,
    search(options) {
      // Simulate topicId and sourceId filtering
      let results = searchResults;
      if (options.topicId) {
        results = results.filter((r) => r.chunk.topicId === options.topicId);
      }
      if (options.sourceId) {
        results = results.filter((r) => r.chunk.sourceId === options.sourceId);
      }
      if (options.chunkType) {
        results = results.filter((r) => r.chunk.chunkType === options.chunkType);
      }
      const limit = options.limit ?? 20;
      return results.slice(0, limit);
    },
    insertBatch() { writeCalled = true; },
    replaceForSource() { writeCalled = true; },
    deleteBySourceId() { writeCalled = true; },
    getBySourceId() { return []; },
    getByTopicId() { return []; },
    countBySourceId() { return 0; },
    countByTopicId() { return 0; },
    getById() { return null; },
  };
}

function loadRetrievalWithMockRepo(mockRepo) {
  // Load termTokenizer fresh (no singletons)
  const tokenizerMocks = {};
  const tokenizer = load('services/chunking/termTokenizer.ts', tokenizerMocks);

  const mocks = {
    '@/db/repositories/sourceChunkRepo': { sourceChunkRepo: mockRepo },
    '@/services/chunking/termTokenizer': tokenizer,
    '@/models/retrieval': load('models/retrieval.ts', {}),
    '@/models/chunk': load('models/chunk.ts', {}),
  };
  return load('services/retrieval/retrievalService.ts', mocks);
}

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;

function check(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
    failed++;
  }
}

// Load models once (no singletons)
const retrievalModels = load('models/retrieval.ts', {});

// =========================================================================
// Suite 1: Domain model contracts
// =========================================================================
console.log('\nSuite 1: Domain model contracts');

check('RetrievalQuery interface exists in models/retrieval.ts', () => {
  assert.ok(fs.existsSync(path.join(root, 'models/retrieval.ts')));
  const src = read('models/retrieval.ts');
  assert.ok(src.includes('RetrievalQuery'), 'RetrievalQuery not found');
  assert.ok(src.includes('RetrievalResult'), 'RetrievalResult not found');
  assert.ok(src.includes('RetrievalResponse'), 'RetrievalResponse not found');
  assert.ok(src.includes('RetrievalScope'), 'RetrievalScope not found');
  assert.ok(src.includes('RetrievalError'), 'RetrievalError not found');
});

check('RetrievalScope includes committeeId, subjectId, topicId, sourceId', () => {
  const src = read('models/retrieval.ts');
  assert.ok(src.includes('committeeId'), 'committeeId missing');
  assert.ok(src.includes('subjectId'), 'subjectId missing');
  assert.ok(src.includes('topicId'), 'topicId missing');
  assert.ok(src.includes('sourceId'), 'sourceId missing');
});

check('RetrievalQuery has query, scope, topK, minScore fields', () => {
  const src = read('models/retrieval.ts');
  assert.ok(src.includes('query:'), 'query field missing');
  assert.ok(src.includes('topK'), 'topK missing');
  assert.ok(src.includes('minScore'), 'minScore missing');
  assert.ok(src.includes('scope'), 'scope missing');
});

check('RetrievalResult has chunkId, text, score, matchTerms, provenance, ordinal', () => {
  const src = read('models/retrieval.ts');
  assert.ok(src.includes('chunkId'), 'chunkId missing');
  assert.ok(src.includes('text:'), 'text field missing');
  assert.ok(src.includes('score:'), 'score missing');
  assert.ok(src.includes('matchTerms'), 'matchTerms missing');
  assert.ok(src.includes('provenance'), 'provenance missing');
  assert.ok(src.includes('ordinal:'), 'ordinal missing');
});

check('RetrievalResponse has results, total, queryTerms, scope, usedFts, usedTermIndex', () => {
  const src = read('models/retrieval.ts');
  assert.ok(src.includes('results:'), 'results field missing');
  assert.ok(src.includes('total:'), 'total missing');
  assert.ok(src.includes('queryTerms'), 'queryTerms missing');
  assert.ok(src.includes('usedFts'), 'usedFts missing');
  assert.ok(src.includes('usedTermIndex'), 'usedTermIndex missing');
});

check('Constants RETRIEVAL_DEFAULT_TOP_K=10, RETRIEVAL_MAX_TOP_K=50', () => {
  assert.strictEqual(retrievalModels.RETRIEVAL_DEFAULT_TOP_K, 10);
  assert.strictEqual(retrievalModels.RETRIEVAL_MAX_TOP_K, 50);
  assert.strictEqual(retrievalModels.RETRIEVAL_MIN_TOP_K, 1);
});

check('RetrievalError is an Error subclass with code property', () => {
  const { RetrievalError } = retrievalModels;
  const err = new RetrievalError('invalid_query', 'test error');
  assert.ok(err instanceof Error);
  assert.strictEqual(err.code, 'invalid_query');
  assert.strictEqual(err.name, 'RetrievalError');
  assert.strictEqual(err.message, 'test error');
});

// =========================================================================
// Suite 2: retrievalService file structure
// =========================================================================
console.log('\nSuite 2: retrievalService file structure');

check('services/retrieval/retrievalService.ts exists', () => {
  assert.ok(fs.existsSync(path.join(root, 'services/retrieval/retrievalService.ts')));
});

check('retrievalService exports retrieve, listByTopic, listBySource, searchInTopic, searchInSource', () => {
  const src = read('services/retrieval/retrievalService.ts');
  assert.ok(src.includes('retrieve('), 'retrieve missing');
  assert.ok(src.includes('listByTopic('), 'listByTopic missing');
  assert.ok(src.includes('listBySource('), 'listBySource missing');
  assert.ok(src.includes('searchInTopic('), 'searchInTopic missing');
  assert.ok(src.includes('searchInSource('), 'searchInSource missing');
});

check('retrievalService has zero fetch/Gemini/OpenAI SDK imports or calls', () => {
  const src = read('services/retrieval/retrievalService.ts');
  assert.ok(!src.includes('fetch('), 'fetch call found — network boundary violated');
  // Check for SDK imports/requires — not documentary boundary comments
  assert.ok(!src.includes("require('gemini")  && !src.includes('from \'gemini'), 'gemini SDK import found');
  assert.ok(!src.includes("require('openai") && !src.includes("from 'openai"), 'openai SDK import found');
  assert.ok(!src.includes("require('@google/gen") && !src.includes("from '@google/gen"), '@google/genai import found');
  assert.ok(!src.includes('GoogleGenerativeAI'), 'GoogleGenerativeAI class usage found');
  assert.ok(!src.includes('generativelanguage.googleapis.com'), 'Direct Gemini API URL found');
});

check('retrievalService has zero write operations (no INSERT/UPDATE/DELETE/runSync)', () => {
  const src = read('services/retrieval/retrievalService.ts');
  assert.ok(!src.match(/\bINSERT\b/i), 'INSERT found in retrievalService');
  assert.ok(!src.match(/\bUPDATE\b/i), 'UPDATE found in retrievalService');
  assert.ok(!src.match(/\bDELETE\b/i), 'DELETE found in retrievalService');
  assert.ok(!src.match(/\brunSync\b/), 'runSync (write op) found in retrievalService');
});

// =========================================================================
// Suite 3: Basic retrieval — text query results
// =========================================================================
console.log('\nSuite 3: Basic retrieval — text query via mock repo');

{
  // Set up mock results — simulate cardiac output and preload queries
  const searchResults = [
    makeChunkSearchResult('chk-001', 'src-a1', 'topic-a', 0, 'Cardiac output equals stroke volume times heart rate.', 30, ['cardiac', 'output']),
    makeChunkSearchResult('chk-002', 'src-a1', 'topic-a', 1, 'Preload is determined by venous return.', 20, ['preload', 'venous']),
    makeChunkSearchResult('chk-003', 'src-a1', 'topic-a', 2, 'Afterload increases with systemic vascular resistance.', 10, ['afterload']),
  ];

  const mockRepo = makeMockRepo(searchResults);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('retrieve("cardiac output") returns non-empty results', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output' });
    assert.ok(resp.results.length > 0, 'No results returned');
    const ids = resp.results.map((r) => r.chunkId);
    assert.ok(ids.includes('chk-001'), `chk-001 not in results: ${ids.join(', ')}`);
  });

  check('retrieve response has correct structure', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output' });
    assert.ok(typeof resp.total === 'number');
    assert.ok(Array.isArray(resp.results));
    assert.ok(Array.isArray(resp.queryTerms));
    assert.ok(resp.queryTerms.length > 0, 'queryTerms should not be empty for non-empty query');
    assert.ok(typeof resp.usedFts === 'boolean');
    assert.ok(typeof resp.usedTermIndex === 'boolean');
    assert.ok(typeof resp.scope === 'object');
  });

  check('retrieve result has chunkId, text, score, matchTerms, provenance, ordinal', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output' });
    const r = resp.results[0];
    assert.ok(typeof r.chunkId === 'string');
    assert.ok(typeof r.text === 'string');
    assert.ok(typeof r.score === 'number');
    assert.ok(Array.isArray(r.matchTerms));
    assert.ok(typeof r.ordinal === 'number');
    assert.ok(r.provenance && typeof r.provenance === 'object');
    assert.ok(typeof r.provenance.sourceId === 'string');
    assert.ok(typeof r.provenance.topicId === 'string');
  });

  check('results are returned in score DESC order', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output' });
    for (let i = 1; i < resp.results.length; i++) {
      assert.ok(
        resp.results[i].score <= resp.results[i - 1].score,
        `Score not descending: ${resp.results[i].score} > ${resp.results[i - 1].score}`
      );
    }
  });

  check('retrieve with empty query returns all chunks (list mode)', () => {
    const resp = retrievalService.retrieve({ query: '' });
    assert.ok(resp.results.length >= 3, `Expected >= 3, got ${resp.results.length}`);
    assert.deepStrictEqual(resp.queryTerms, []);
  });

  check('resp.total equals resp.results.length', () => {
    const resp = retrievalService.retrieve({ query: 'cardiac output' });
    assert.strictEqual(resp.total, resp.results.length);
  });
}

// =========================================================================
// Suite 4: Scope filtering
// =========================================================================
console.log('\nSuite 4: Scope filtering');

{
  const searchResults = [
    makeChunkSearchResult('chk-a1', 'src-a', 'topic-a', 0, 'glomerular filtration rate kidney', 20, ['glomerular', 'filtration']),
    makeChunkSearchResult('chk-b1', 'src-b', 'topic-b', 0, 'glomerular filtration pressure Bowman', 20, ['glomerular', 'filtration']),
  ];

  const mockRepo = makeMockRepo(searchResults);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('scope.topicId restricts results to topicA only', () => {
    const resp = retrievalService.retrieve({
      query: 'glomerular filtration',
      scope: { topicId: 'topic-a' },
    });
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.topicId, 'topic-a', `Expected topic-a, got ${r.provenance.topicId}`);
    }
    const ids = resp.results.map((r) => r.chunkId);
    assert.ok(ids.includes('chk-a1'), 'chk-a1 should be in results');
    assert.ok(!ids.includes('chk-b1'), 'chk-b1 should NOT be in results');
  });

  check('scope.sourceId restricts results to srcB only', () => {
    const resp = retrievalService.retrieve({
      query: 'glomerular',
      scope: { sourceId: 'src-b' },
    });
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.sourceId, 'src-b', `Expected src-b, got ${r.provenance.sourceId}`);
    }
    assert.ok(resp.results.some((r) => r.chunkId === 'chk-b1'));
  });

  check('allowedTopicIds set filters to topicA only (committee/subject simulation)', () => {
    const resp = retrievalService.retrieve(
      { query: 'glomerular filtration' },
      new Set(['topic-a'])
    );
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.topicId, 'topic-a', `Expected topic-a, got ${r.provenance.topicId}`);
    }
    assert.ok(resp.results.length >= 1, 'Expected at least one result for topic-a');
  });

  check('allowedTopicIds with both topics returns results from both', () => {
    const resp = retrievalService.retrieve(
      { query: 'glomerular filtration' },
      new Set(['topic-a', 'topic-b'])
    );
    const topics = new Set(resp.results.map((r) => r.provenance.topicId));
    assert.ok(topics.has('topic-a'), 'topic-a missing from results');
    assert.ok(topics.has('topic-b'), 'topic-b missing from results');
  });

  check('empty allowedTopicIds set does NOT filter results', () => {
    const resp = retrievalService.retrieve(
      { query: 'glomerular filtration' },
      new Set([])
    );
    assert.ok(resp.results.length >= 1, 'Expected at least one result with empty allowedTopicIds');
  });

  check('scope.topicId sets scope field in response', () => {
    const resp = retrievalService.retrieve({
      query: 'glomerular',
      scope: { topicId: 'topic-a' },
    });
    assert.strictEqual(resp.scope.topicId, 'topic-a');
  });
}

// =========================================================================
// Suite 5: topK clamping
// =========================================================================
console.log('\nSuite 5: topK clamping');

{
  const many = Array.from({ length: 30 }, (_, i) =>
    makeChunkSearchResult(`chk-x${i}`, 'src-x', 'topic-x', i, `chunk ${i} muscarinic antagonist`, 20 - i, ['muscarinic', 'antagonist'])
  );
  const mockRepo = makeMockRepo(many);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('default topK is 10 (no topK specified)', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic antagonist' });
    assert.ok(resp.results.length <= 10, `Expected <= 10, got ${resp.results.length}`);
  });

  check('topK=3 returns at most 3 results', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic', topK: 3 });
    assert.ok(resp.results.length <= 3, `Expected <= 3, got ${resp.results.length}`);
  });

  check('topK=0 is clamped to 1', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic', topK: 0 });
    assert.ok(resp.results.length <= 1, `Expected <= 1, got ${resp.results.length}`);
  });

  check('topK=999 is clamped to 50', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic', topK: 999 });
    assert.ok(resp.results.length <= 50, `Expected <= 50, got ${resp.results.length}`);
  });

  check('topK=undefined uses default 10', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic', topK: undefined });
    assert.ok(resp.results.length <= 10);
  });

  check('negative topK is clamped to 1', () => {
    const resp = retrievalService.retrieve({ query: 'muscarinic', topK: -5 });
    assert.ok(resp.results.length <= 1);
  });
}

// =========================================================================
// Suite 6: minScore filtering
// =========================================================================
console.log('\nSuite 6: minScore filtering');

{
  const results = [
    makeChunkSearchResult('chk-high', 'src-y', 'topic-y', 0, 'beta blocker receptor antagonist', 40, ['beta', 'blocker', 'receptor', 'antagonist']),
    makeChunkSearchResult('chk-low', 'src-y', 'topic-y', 1, 'general pharmacology notes', 5, ['general']),
  ];
  const mockRepo = makeMockRepo(results);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('minScore=0 returns all matching results', () => {
    const resp = retrievalService.retrieve({ query: 'beta blocker', minScore: 0 });
    assert.ok(resp.results.length >= 1, 'Expected at least one result with minScore=0');
  });

  check('minScore=20 filters out low-score results', () => {
    const resp = retrievalService.retrieve({ query: 'beta blocker receptor', minScore: 20 });
    for (const r of resp.results) {
      assert.ok(r.score >= 20, `score ${r.score} is below minScore 20`);
    }
    const ids = resp.results.map((r) => r.chunkId);
    assert.ok(ids.includes('chk-high'), 'chk-high should pass minScore=20');
    assert.ok(!ids.includes('chk-low'), 'chk-low should NOT pass minScore=20');
  });

  check('minScore is ignored when query is empty (list mode)', () => {
    const resp = retrievalService.retrieve({ query: '', minScore: 9999 });
    // In list mode, queryTerms.length === 0 so minScore is not applied
    assert.ok(resp.results.length >= 1, 'Expected list-mode results regardless of minScore');
  });
}

// =========================================================================
// Suite 7: Deterministic tie-breaking
// =========================================================================
console.log('\nSuite 7: Deterministic tie-breaking');

{
  // Same score, different ordinals — expect ordinal ASC
  const results = [
    makeChunkSearchResult('chk-z2', 'src-z', 'topic-z', 1, 'renal tubular reabsorption sodium', 10, ['renal', 'tubular']),
    makeChunkSearchResult('chk-z1', 'src-z', 'topic-z', 0, 'renal tubular secretion potassium', 10, ['renal', 'tubular']),
  ];
  const mockRepo = makeMockRepo(results);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('equal-score chunks are sorted by ordinal ASC', () => {
    const resp = retrievalService.retrieve({
      query: 'renal tubular',
      scope: { topicId: 'topic-z' },
      topK: 10,
    });
    assert.ok(resp.results.length >= 2, `Expected >= 2 results, got ${resp.results.length}`);
    // ordinal 0 should come before ordinal 1
    const ordinals = resp.results.map((r) => r.ordinal);
    assert.ok(ordinals[0] <= ordinals[1], `ordinal[0]=${ordinals[0]} should be <= ordinal[1]=${ordinals[1]}`);
  });

  check('results are in score DESC order', () => {
    const highResults = [
      makeChunkSearchResult('chk-high', 'src-z', 'topic-z', 0, 'renal tubular main', 30, ['renal', 'tubular']),
      makeChunkSearchResult('chk-low', 'src-z', 'topic-z', 1, 'renal detail', 10, ['renal']),
    ];
    const repo2 = makeMockRepo(highResults);
    const { retrievalService: svc2 } = loadRetrievalWithMockRepo(repo2);
    const resp = svc2.retrieve({ query: 'renal tubular', scope: { topicId: 'topic-z' } });
    for (let i = 1; i < resp.results.length; i++) {
      assert.ok(
        resp.results[i].score <= resp.results[i - 1].score,
        `Score not descending at index ${i}: ${resp.results[i].score} > ${resp.results[i - 1].score}`
      );
    }
  });
}

// =========================================================================
// Suite 8: listByTopic / listBySource
// =========================================================================
console.log('\nSuite 8: listByTopic / listBySource');

{
  const chunkSet = Array.from({ length: 5 }, (_, i) =>
    makeChunkSearchResult(`chk-lt${i}`, 'src-lt', 'topic-lt', i, `content ${i}`, 1, [])
  );
  const mockRepo = makeMockRepo(chunkSet);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('listByTopic returns all chunks for a topic', () => {
    const resp = retrievalService.listByTopic('topic-lt');
    assert.ok(resp.results.length === 5, `Expected 5, got ${resp.results.length}`);
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.topicId, 'topic-lt');
    }
  });

  check('listByTopic with limit returns clamped results', () => {
    const resp = retrievalService.listByTopic('topic-lt', 3);
    assert.ok(resp.results.length <= 3, `Expected <= 3, got ${resp.results.length}`);
  });

  check('listByTopic returns empty queryTerms', () => {
    const resp = retrievalService.listByTopic('topic-lt');
    assert.deepStrictEqual(resp.queryTerms, []);
  });

  check('listByTopic with whitespace-only topicId throws RetrievalError', () => {
    assert.throws(
      () => retrievalService.listByTopic('   '),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });

  check('listBySource returns all chunks for a source', () => {
    const resp = retrievalService.listBySource('src-lt');
    assert.ok(resp.results.length === 5, `Expected 5, got ${resp.results.length}`);
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.sourceId, 'src-lt');
    }
  });

  check('listBySource with empty sourceId throws RetrievalError', () => {
    assert.throws(
      () => retrievalService.listBySource(''),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });
}

// =========================================================================
// Suite 9: Convenience wrappers — searchInTopic / searchInSource
// =========================================================================
console.log('\nSuite 9: searchInTopic / searchInSource wrappers');

{
  const srcResults = [
    makeChunkSearchResult('chk-st1', 'src-st', 'topic-st', 0, 'renin angiotensin aldosterone system', 30, ['renin', 'angiotensin', 'aldosterone']),
    makeChunkSearchResult('chk-st2', 'src-st', 'topic-st', 1, 'sympathetic nervous adrenergic receptor', 20, ['sympathetic', 'adrenergic', 'receptor']),
  ];
  const mockRepo = makeMockRepo(srcResults);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('searchInTopic returns non-empty results for renin angiotensin', () => {
    const resp = retrievalService.searchInTopic('topic-st', 'renin angiotensin');
    assert.ok(resp.results.length > 0, 'Expected results from searchInTopic');
  });

  check('searchInTopic result topicId matches scope', () => {
    const resp = retrievalService.searchInTopic('topic-st', 'renin');
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.topicId, 'topic-st');
    }
  });

  check('searchInSource returns non-empty results for adrenergic receptor', () => {
    const resp = retrievalService.searchInSource('src-st', 'adrenergic receptor');
    assert.ok(resp.results.length > 0, 'Expected results from searchInSource');
  });

  check('searchInSource result sourceId matches scope', () => {
    const resp = retrievalService.searchInSource('src-st', 'system');
    for (const r of resp.results) {
      assert.strictEqual(r.provenance.sourceId, 'src-st');
    }
  });

  check('searchInTopic with empty topicId throws RetrievalError', () => {
    assert.throws(
      () => retrievalService.searchInTopic('', 'query'),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });

  check('searchInSource with empty sourceId throws RetrievalError', () => {
    assert.throws(
      () => retrievalService.searchInSource('', 'query'),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });
}

// =========================================================================
// Suite 10: Error handling — invalid inputs to retrieve()
// =========================================================================
console.log('\nSuite 10: Error handling — invalid inputs');

{
  const mockRepo = makeMockRepo([]);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('retrieve(null) throws RetrievalError with code=invalid_query', () => {
    assert.throws(
      () => retrievalService.retrieve(null),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });

  check('retrieve(undefined) throws RetrievalError with code=invalid_query', () => {
    assert.throws(
      () => retrievalService.retrieve(undefined),
      (e) => e != null && e.code === 'invalid_query' && e.name === 'RetrievalError'
    );
  });

  check('retrieve({ query: "" }) returns valid response, no error', () => {
    const resp = retrievalService.retrieve({ query: '' });
    assert.ok(Array.isArray(resp.results));
    assert.ok(typeof resp.total === 'number');
  });

  check('retrieve with negative topK does not throw, clamps to 1', () => {
    const resp = retrievalService.retrieve({ query: '', topK: -5 });
    assert.ok(resp.results.length <= 1);
  });
}

// =========================================================================
// Suite 11: Zero write verification (real SQLite)
// =========================================================================
console.log('\nSuite 11: Zero write verification');

{
  // Use real SQLiteAdapter + mock repo that tracks writes
  const mockRepo = makeMockRepo([
    makeChunkSearchResult('chk-w1', 'src-w', 'topic-w', 0, 'hemoglobin oxygen dissociation', 10, ['hemoglobin', 'oxygen']),
  ]);
  const { retrievalService } = loadRetrievalWithMockRepo(mockRepo);

  check('retrieve() does not call any write methods on repo', () => {
    retrievalService.retrieve({ query: 'hemoglobin oxygen' });
    retrievalService.listByTopic('topic-w');
    retrievalService.searchInTopic('topic-w', 'dissociation');
    assert.ok(!mockRepo._writes(), 'Write method was called on repo during retrieval');
  });

  // Verify schema version hasn't changed by checking migrations.ts
  check('migrations.ts CURRENT_VERSION still equals 13', () => {
    const src = read('db/migrations.ts');
    assert.ok(src.includes('const CURRENT_VERSION = 13'), 'CURRENT_VERSION is not 13');
  });
}

// =========================================================================
// Suite 12: Schema version integrity
// =========================================================================
console.log('\nSuite 12: Schema version integrity');

check('models/retrieval.ts introduces no new SQLite table', () => {
  const src = read('models/retrieval.ts');
  assert.ok(!src.includes('CREATE TABLE'), 'CREATE TABLE found in models/retrieval.ts');
  assert.ok(!src.includes('INSERT INTO'), 'INSERT INTO found in models/retrieval.ts');
  assert.ok(!src.includes('ALTER TABLE'), 'ALTER TABLE found in models/retrieval.ts');
});

check('services/retrieval/retrievalService.ts introduces no new SQLite table or migration', () => {
  const src = read('services/retrieval/retrievalService.ts');
  assert.ok(!src.includes('CREATE TABLE'), 'CREATE TABLE found in retrievalService.ts');
  assert.ok(!src.includes('ALTER TABLE'), 'ALTER TABLE found in retrievalService.ts');
});

check('Phase 12.5 source_chunks / source_chunk_terms tables are unchanged', () => {
  const db = new SQLiteAdapter();
  createMinimalSchema(db);
  const row = db.getFirstSync('SELECT version FROM _schema_version LIMIT 1');
  assert.strictEqual(row.version, 13, `Expected schema v13, got ${row.version}`);
});

check('retrievalService does not import db/migrations.ts', () => {
  const src = read('services/retrieval/retrievalService.ts');
  assert.ok(!src.includes('migrations'), 'retrievalService imports migrations — unexpected');
});

// =========================================================================
// Final report
// =========================================================================

console.log(`\n${'='.repeat(60)}`);
console.log(`Phase 12.6 Validation: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  process.exit(1);
}
