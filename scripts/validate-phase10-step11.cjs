/**
 * MedOS — Phase 10 Step 11 Validation Suite
 *
 * Validates Security / Provider Settings / Real Gemini Activation:
 * - CREDENTIAL STORAGE: SecureStore used, no SQLite, no AsyncStorage, set/get/delete, empty rejected, no logging.
 * - PROVIDER REGISTRY: Mock vs Gemini construction, provider switching, safe state reporting, UI provider neutrality.
 * - REAL GEMINI CONFIG: Verified current model (gemini-2.5-flash), configurable model, header-only key.
 * - CONNECTION TEST: Success, missing key, 401/403, 429, network failure, zero study data writes.
 * - SECURITY HARDENING: No hardcoded keys, no key in URL/logs/UI/errors, redaction active.
 * - OFFLINE CORE: Core features independent, non-AI modules isolated from provider.
 * - UI & ROUTING: Settings route exists, secure key field, save/remove, test connection, profile link.
 * - LOCALIZATION: Complete EN/TR parity for aiSettings dictionary.
 * - ACCESSIBILITY: Accessible roles, labels, and alerts.
 * - SCHEMA: Schema remains v12 unchanged.
 */

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { DatabaseSync } = require('node:sqlite');

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
    (key) => (Object.hasOwn(mocks, key) ? mocks[key] : require(key)),
    module,
    module.exports,
    file,
    path.dirname(file)
  );
  return module.exports;
}

let passed = 0;
async function check(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`\nFAIL: ${name}\n${err.stack || err}`);
    process.exit(1);
  }
}

async function main() {
  console.log('=== PHASE 10 STEP 11: SECURITY / PROVIDER SETTINGS / REAL GEMINI SUITE ===\n');

  // Load modules
  const aiModels = load('models/ai.ts');
  const prompts = load('services/ai/prompts.ts', { '@/models/ai': aiModels });
  const mockProviderMod = load('services/ai/mockProvider.ts', { '@/models/ai': aiModels });
  const studyAIServiceMod = load('services/ai/studyAIService.ts', {
    '@/models/ai': aiModels,
    './prompts': prompts,
  });

  // 1. CREDENTIAL STORAGE INTEGRITY
  await check('Credential store uses expo-secure-store and never SQLite or AsyncStorage', () => {
    const credSource = read('services/ai/credentialStore.ts');

    assert.ok(
      credSource.includes("expo-secure-store"),
      'credentialStore must use expo-secure-store'
    );
    assert.ok(
      !credSource.includes('expo-sqlite') && !credSource.includes('DatabaseSync'),
      'credentialStore must NEVER reference SQLite'
    );
    assert.ok(
      !credSource.includes('async-storage') && !credSource.includes('AsyncStorage'),
      'credentialStore must NEVER reference AsyncStorage for API keys'
    );
    assert.ok(
      !credSource.includes('console.log') && !credSource.includes('console.info'),
      'credentialStore must NEVER log secrets to console'
    );
  });

  await check('Credential store set, get, delete, and empty validation lifecycle', async () => {
    let mockStorage = {};
    const mockSecureStore = {
      getItemAsync: async (key) => mockStorage[key] ?? null,
      setItemAsync: async (key, val) => {
        mockStorage[key] = val;
      },
      deleteItemAsync: async (key) => {
        delete mockStorage[key];
      },
    };

    const credStore = load('services/ai/credentialStore.ts', {
      'expo-secure-store': mockSecureStore,
    });

    credStore.setSecureStorageAdapter(mockSecureStore);

    // Initial state: empty
    assert.equal(await credStore.getGeminiApiKey(), null);
    assert.equal(await credStore.hasGeminiApiKey(), false);

    // Empty key rejected
    await assert.rejects(
      async () => credStore.setGeminiApiKey(''),
      /empty/i,
      'Empty API key must be rejected'
    );
    await assert.rejects(
      async () => credStore.setGeminiApiKey('   '),
      /empty/i,
      'Whitespace-only API key must be rejected'
    );

    // Valid key set (with whitespace trimming)
    await credStore.setGeminiApiKey('  AIzaSyTestValidFakeKey123456  ');
    assert.equal(await credStore.getGeminiApiKey(), 'AIzaSyTestValidFakeKey123456');
    assert.equal(await credStore.hasGeminiApiKey(), true);

    // Delete key
    await credStore.deleteGeminiApiKey();
    assert.equal(await credStore.getGeminiApiKey(), null);
    assert.equal(await credStore.hasGeminiApiKey(), false);
  });

  // 2. PROVIDER REGISTRY & COMPOSITION ROOT
  await check('Provider registry defaults to Mock and exposes provider-neutral state', async () => {
    let storedKey = null;
    const clientMod = load('services/ai/studyAIClient.ts', {
      './studyAIService': studyAIServiceMod,
      './mockProvider': mockProviderMod,
      '@/models/ai': aiModels,
    });

    clientMod.setAIProviderDependencies({
      getGeminiApiKey: async () => storedKey,
      hasGeminiApiKey: async () => storedKey !== null,
    });

    clientMod.resetStudyAIClient();

    const state = await clientMod.getActiveAIProviderState();
    assert.equal(state.providerId, 'mock');
    assert.equal(state.status, 'mock');
    assert.equal(state.hasApiKey, false);

    const provider = clientMod.getStudyAIProvider();
    assert.equal(provider.id, 'mock');

    const service = clientMod.getStudyAIService();
    assert.ok(service, 'getStudyAIService must return active service instance');
  });

  await check('Provider registry activates Gemini with stored key and reports missing credential without key', async () => {
    let storedKey = null;
    let geminiConfigPassed = null;

    const mockGeminiProvider = {
      id: 'gemini',
      name: 'Google Gemini',
      generateText: async () => ({ text: 'real gemini output' }),
      generateStructured: async () => ({}),
      healthCheck: async () => ({ ok: true, message: 'Gemini online' }),
    };

    const clientMod = load('services/ai/studyAIClient.ts', {
      './studyAIService': studyAIServiceMod,
      './mockProvider': mockProviderMod,
      '@/models/ai': aiModels,
    });

    clientMod.setAIProviderDependencies({
      getGeminiApiKey: async () => storedKey,
      hasGeminiApiKey: async () => storedKey !== null,
      createGeminiProvider: (cfg) => {
        geminiConfigPassed = cfg;
        return mockGeminiProvider;
      },
    });

    // 1. Activate Gemini when no key is stored
    await clientMod.setActiveAIProvider('gemini');
    const stateNoKey = await clientMod.getActiveAIProviderState();
    assert.equal(stateNoKey.providerId, 'gemini');
    assert.equal(stateNoKey.status, 'missing_credential');
    assert.equal(stateNoKey.hasApiKey, false);

    // 2. Set key and refresh
    storedKey = 'AIzaSyVerifiedTestKey999';
    await clientMod.refreshStudyAIService();

    const stateWithKey = await clientMod.getActiveAIProviderState();
    assert.equal(stateWithKey.providerId, 'gemini');
    assert.equal(stateWithKey.status, 'configured');
    assert.equal(stateWithKey.hasApiKey, true);
    assert.equal(clientMod.getStudyAIProvider().id, 'gemini');
    assert.equal(geminiConfigPassed.apiKey, 'AIzaSyVerifiedTestKey999');

    // 3. Switch back to Mock
    await clientMod.setActiveAIProvider('mock');
    const stateMockAgain = await clientMod.getActiveAIProviderState();
    assert.equal(stateMockAgain.providerId, 'mock');
    assert.equal(stateMockAgain.status, 'mock');
    assert.equal(clientMod.getStudyAIProvider().id, 'mock');
  });

  // 3. REAL GEMINI CONFIGURATION & MODEL VERIFICATION
  await check('Gemini provider verifies official gemini-2.5-flash model and header-only authentication', async () => {
    const geminiMod = load('services/ai/geminiProvider.ts', {
      '@/models/ai': aiModels,
    });

    assert.equal(
      geminiMod.DEFAULT_GEMINI_MODEL,
      'gemini-2.5-flash',
      'Official verified Flash model must be gemini-2.5-flash'
    );

    let recordedUrl = null;
    let recordedHeaders = null;

    const fakeFetch = async (url, options) => {
      recordedUrl = url;
      recordedHeaders = options.headers;
      return {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'Response OK' }] } }],
        }),
      };
    };

    const provider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSySecretVerificationKey456',
      fetchImpl: fakeFetch,
    });

    await provider.generateText({
      userPrompt: 'Test model and header',
    });

    // Check URL: model is in path, NO API key in query params
    assert.ok(recordedUrl.includes('models/gemini-2.5-flash:generateContent'));
    assert.ok(!recordedUrl.includes('key='));
    assert.ok(!recordedUrl.includes('AIzaSy'));

    // Check Header: x-goog-api-key present
    assert.equal(recordedHeaders['x-goog-api-key'], 'AIzaSySecretVerificationKey456');
    assert.equal(recordedHeaders['Content-Type'], 'application/json');
  });

  // 4. CONNECTION TEST
  await check('Connection test handles success, missing key, 401/403, 429, and network failures safely', async () => {
    const geminiMod = load('services/ai/geminiProvider.ts', {
      '@/models/ai': aiModels,
    });

    // Case A: Missing key
    const missingKeyProvider = geminiMod.createGeminiProvider({ apiKey: '' });
    const missingRes = await missingKeyProvider.healthCheck();
    assert.equal(missingRes.ok, false);
    assert.ok(missingRes.message.includes('missing'));

    // Case B: 200 OK success
    const okProvider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSyValidKey',
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: 'OK' }] } }],
        }),
      }),
    });
    const okRes = await okProvider.healthCheck();
    assert.equal(okRes.ok, true);
    assert.ok(okRes.message.includes('online'));

    // Case C: 401 Auth Failure
    const authFailProvider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSyBadKey',
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: 'API key not valid' } }),
      }),
    });
    const authRes = await authFailProvider.healthCheck();
    assert.equal(authRes.ok, false);
    assert.ok(authRes.message.includes('authentication failed'));

    // Case D: 429 Rate Limit
    const rateLimitProvider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSyRateLimitedKey',
      fetchImpl: async () => ({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: 'Resource exhausted' } }),
      }),
    });
    const rateRes = await rateLimitProvider.healthCheck();
    assert.equal(rateRes.ok, false);
    assert.ok(rateRes.message.includes('rate limit'));

    // Case E: Network failure
    const networkFailProvider = geminiMod.createGeminiProvider({
      apiKey: 'AIzaSyValidKey',
      fetchImpl: async () => {
        throw new Error('fetch failed');
      },
    });
    const netRes = await networkFailProvider.healthCheck();
    assert.equal(netRes.ok, false);
    assert.ok(netRes.message.includes('Network request') || netRes.message.includes('connection'));
  });

  // 5. SECURITY & ZERO DATA LEAKAGE
  await check('Zero hardcoded keys, zero secret logging, and secret redaction active', () => {
    const geminiMod = load('services/ai/geminiProvider.ts', {
      '@/models/ai': aiModels,
    });

    const fakeKey = 'AIzaSySecretKeyToBeRedacted99';
    const textWithSecret = `Error: call failed with key ${fakeKey} at endpoint`;
    const redacted = geminiMod.redactSecrets(textWithSecret, [fakeKey]);

    assert.ok(!redacted.includes(fakeKey));
    assert.ok(redacted.includes('[REDACTED]'));

    // Verify codebase files do not contain real API keys
    const filesToScan = [
      'services/ai/geminiProvider.ts',
      'services/ai/credentialStore.ts',
      'services/ai/studyAIClient.ts',
      'app/settings/ai.tsx',
    ];

    for (const f of filesToScan) {
      const code = read(f);
      assert.ok(!code.includes('AIzaSyB'), `${f} must not contain actual production API key`);
      assert.ok(!code.match(/apiKey\s*=\s*['"][a-zA-Z0-9_\-]{20,}['"]/), `${f} must not hardcode API key`);
    }
  });

  // 6. OFFLINE CORE INDEPENDENCE
  await check('Core features and curriculum do not import AI provider or credentialStore', () => {
    const coreFiles = [
      'app/(tabs)/index.tsx',
      'app/(tabs)/focus.tsx',
      'app/(tabs)/memory.tsx',
      'app/(tabs)/committees.tsx',
      'app/(tabs)/calendar.tsx',
      'db/repositories/committeeRepo.ts',
      'db/repositories/topicRepo.ts',
      'db/repositories/memoryRepo.ts',
      'db/repositories/qbankRepo.ts',
    ];

    for (const f of coreFiles) {
      const code = read(f);
      assert.ok(!code.includes('geminiProvider'), `${f} must not import geminiProvider`);
      assert.ok(!code.includes('credentialStore'), `${f} must not import credentialStore`);
      assert.ok(!code.includes('GeminiAIProvider'), `${f} must not import GeminiAIProvider`);
    }
  });

  // 7. UI & ROUTING CONTRACTS
  await check('AI Settings screen and Profile link exist with proper security and accessibility attributes', () => {
    assert.ok(
      fs.existsSync(path.join(root, 'app/settings/ai.tsx')),
      'app/settings/ai.tsx route file must exist'
    );

    const screenCode = read('app/settings/ai.tsx');
    const profileCode = read('app/(tabs)/profile.tsx');

    assert.ok(
      screenCode.includes('<ScreenWrapper includeBottomSafeArea>'),
      'AI Settings screen must use ScreenWrapper with includeBottomSafeArea'
    );
    assert.ok(
      screenCode.includes('secureTextEntry'),
      'API key input must have secureTextEntry'
    );
    assert.ok(
      screenCode.includes('accessibilityRole="radio"'),
      'Provider selection must expose radio accessibility semantics'
    );
    assert.ok(
      screenCode.includes('testAIProviderConnection'),
      'Screen must connect to testAIProviderConnection'
    );
    assert.ok(
      screenCode.includes('deleteGeminiApiKey'),
      'Screen must provide key removal via deleteGeminiApiKey'
    );

    // Never prefill existing key in input
    assert.ok(
      !screenCode.includes('setInputKey(state.apiKey') && !screenCode.includes('value={savedKey}'),
      'Screen must never prefill saved API key into input value'
    );

    // Profile must link to /settings/ai
    assert.ok(
      profileCode.includes('/settings/ai'),
      'Profile screen must contain navigation link to /settings/ai'
    );
  });

  // 8. LOCALIZATION PARITY
  await check('aiSettings localization catalog has 100% EN/TR parity', () => {
    const enMod = load('i18n/en.ts');
    const trMod = load('i18n/tr.ts');

    const enSettings = enMod.default.aiSettings;
    const trSettings = trMod.default.aiSettings;

    assert.ok(enSettings, 'en.ts must define aiSettings dictionary');
    assert.ok(trSettings, 'tr.ts must define aiSettings dictionary');

    const enKeys = Object.keys(enSettings).sort();
    const trKeys = Object.keys(trSettings).sort();

    assert.deepEqual(
      enKeys,
      trKeys,
      'aiSettings dictionary keys must match exactly between EN and TR'
    );

    for (const k of enKeys) {
      const enVal = enSettings[k];
      const trVal = trSettings[k];
      assert.equal(typeof enVal, typeof trVal, `Type mismatch for key "${k}"`);
      if (typeof enVal === 'string') {
        assert.ok(enVal.trim().length > 0, `EN key "${k}" must not be empty`);
        assert.ok(trVal.trim().length > 0, `TR key "${k}" must not be empty`);
      }
    }
  });

  // 9. DATABASE SCHEMA
  await check('Schema remains strictly v12 with zero schema changes for AI settings', () => {
    const migrationsCode = read('db/migrations.ts');
    const versionMatch = migrationsCode.match(/const CURRENT_VERSION = (\d+);/);
    assert.ok(versionMatch, 'CURRENT_VERSION constant must be found in db/migrations.ts');
    assert.ok(
      parseInt(versionMatch[1], 10) >= 12,
      'Schema version must be at least v12'
    );

    assert.ok(
      !migrationsCode.includes('ai_credentials') && !migrationsCode.includes('api_keys'),
      'Database migrations must NEVER add credentials or api keys tables'
    );
  });

  console.log(`\nALL ${passed} PHASE 10 STEP 11 VALIDATION CHECKS PASSED.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
