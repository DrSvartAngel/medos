import { getDB } from './client';
import { formatLocalDateKey } from '@/utils/calendarDate';

// Base v14: const CURRENT_VERSION = 14;
const CURRENT_VERSION = 15;

interface TableInfoRow {
  name: string;
}

type MigratedTable =
  | 'committees'
  | 'focus_sessions'
  | 'decks'
  | 'flashcards'
  | 'calendar_events';

function getColumnNames(table: MigratedTable): Set<string> {
  const db = getDB();
  let rows: TableInfoRow[];
  switch (table) {
    case 'committees':
      rows = db.getAllSync<TableInfoRow>('PRAGMA table_info(committees)');
      break;
    case 'focus_sessions':
      rows = db.getAllSync<TableInfoRow>('PRAGMA table_info(focus_sessions)');
      break;
    case 'decks':
      rows = db.getAllSync<TableInfoRow>('PRAGMA table_info(decks)');
      break;
    case 'flashcards':
      rows = db.getAllSync<TableInfoRow>('PRAGMA table_info(flashcards)');
      break;
    case 'calendar_events':
      rows = db.getAllSync<TableInfoRow>('PRAGMA table_info(calendar_events)');
      break;
  }

  return new Set(rows.map((row) => row.name));
}

/**
 * Runs schema migrations on app startup.
 * Each version block is idempotent:
 *  - v1: CREATE TABLE IF NOT EXISTS
 *  - v2/v3: explicit column checks inside transactions
 *  - v4: guarded additive Memory schema + review history
 *  - v5: guarded additive Calendar schema + bounded-query indexes
 */
export async function runMigrations(): Promise<void> {
  const db = getDB();

  // Create meta table to track schema version
  db.execSync(`
    CREATE TABLE IF NOT EXISTS _schema_version (
      version INTEGER NOT NULL
    );
  `);

  const versionRow = db.getFirstSync<{ version: number }>(
    'SELECT version FROM _schema_version LIMIT 1'
  );
  const currentVersion = versionRow?.version ?? 0;

  if (currentVersion < 1) {
    // --- Version 1: initial schema ---
    db.execSync(`
      CREATE TABLE IF NOT EXISTS committees (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        subject     TEXT NOT NULL,
        color       TEXT NOT NULL DEFAULT '#6C63FF',
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS focus_sessions (
        id            TEXT PRIMARY KEY NOT NULL,
        duration_sec  INTEGER NOT NULL,
        completed     INTEGER NOT NULL DEFAULT 0,
        committee_id  TEXT,
        started_at    INTEGER NOT NULL,
        ended_at      INTEGER
      );

      CREATE TABLE IF NOT EXISTS decks (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        subject     TEXT NOT NULL,
        created_at  INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS flashcards (
        id           TEXT PRIMARY KEY NOT NULL,
        deck_id      TEXT NOT NULL,
        front        TEXT NOT NULL,
        back         TEXT NOT NULL,
        interval     INTEGER NOT NULL DEFAULT 1,
        ease         REAL    NOT NULL DEFAULT 2.5,
        next_review  INTEGER NOT NULL,
        created_at   INTEGER NOT NULL,
        FOREIGN KEY (deck_id) REFERENCES decks(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS calendar_events (
        id            TEXT PRIMARY KEY NOT NULL,
        title         TEXT NOT NULL,
        description   TEXT,
        start_time    INTEGER NOT NULL,
        end_time      INTEGER NOT NULL,
        is_all_day    INTEGER NOT NULL DEFAULT 0,
        color         TEXT NOT NULL DEFAULT '#6C63FF',
        committee_id  TEXT,
        created_at    INTEGER NOT NULL
      );
    `);

    // Record version
    if (currentVersion === 0) {
      db.runSync('INSERT INTO _schema_version (version) VALUES (?)', [1]);
    } else {
      db.runSync('UPDATE _schema_version SET version = ?', [1]);
    }
  }

  if (currentVersion < 2) {
    // --- Version 2: extend committees table ---
    // Explicit checks distinguish a safe repeat run from a real ALTER failure.
    db.withTransactionSync(() => {
      const committeeColumns = getColumnNames('committees');
      if (!committeeColumns.has('description')) {
        db.execSync(`ALTER TABLE committees ADD COLUMN description TEXT;`);
      }
      if (!committeeColumns.has('start_date')) {
        db.execSync(
          `ALTER TABLE committees ADD COLUMN start_date INTEGER NOT NULL DEFAULT 0;`
        );
      }
      if (!committeeColumns.has('exam_date')) {
        db.execSync(
          `ALTER TABLE committees ADD COLUMN exam_date INTEGER NOT NULL DEFAULT 0;`
        );
      }
      if (!committeeColumns.has('updated_at')) {
        db.execSync(
          `ALTER TABLE committees ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`
        );
      }

      db.runSync('UPDATE _schema_version SET version = ?', [2]);
    });
  }

  if (currentVersion < 3) {
    // --- Version 3: extend focus sessions for planned-vs-actual time and cancellation ---
    // These additions are data-safe and retain every existing focus session.
    db.withTransactionSync(() => {
      const focusColumns = getColumnNames('focus_sessions');
      if (!focusColumns.has('actual_duration_sec')) {
        db.execSync(
          `ALTER TABLE focus_sessions ADD COLUMN actual_duration_sec INTEGER NOT NULL DEFAULT 0;`
        );
      }
      if (!focusColumns.has('cancelled')) {
        db.execSync(
          `ALTER TABLE focus_sessions ADD COLUMN cancelled INTEGER NOT NULL DEFAULT 0;`
        );
      }

      db.runSync('UPDATE _schema_version SET version = ?', [3]);
    });
  }

  if (currentVersion < 4) {
    // --- Version 4: functional Memory decks, cards, and review history ---
    // Explicit column checks make this safe for partially prepared user databases.
    // Existing interval/ease/next_review fields remain unchanged for compatibility.
    db.withTransactionSync(() => {
      const deckColumns = getColumnNames('decks');

      if (!deckColumns.has('description')) {
        db.execSync(`ALTER TABLE decks ADD COLUMN description TEXT NOT NULL DEFAULT '';`);
      }
      if (!deckColumns.has('committee_id')) {
        db.execSync(`ALTER TABLE decks ADD COLUMN committee_id TEXT;`);
      }
      if (!deckColumns.has('updated_at')) {
        db.execSync(`ALTER TABLE decks ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`);
      }

      const flashcardColumns = getColumnNames('flashcards');
      if (!flashcardColumns.has('updated_at')) {
        db.execSync(
          `ALTER TABLE flashcards ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`
        );
      }

      db.execSync(`
        CREATE TABLE IF NOT EXISTS flashcard_reviews (
          id          TEXT PRIMARY KEY NOT NULL,
          card_id     TEXT NOT NULL,
          rating      TEXT NOT NULL CHECK (rating IN ('again', 'hard', 'good', 'easy')),
          reviewed_at INTEGER NOT NULL,
          FOREIGN KEY (card_id) REFERENCES flashcards(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_flashcards_deck_id
          ON flashcards(deck_id);
        CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_card_id
          ON flashcard_reviews(card_id);
        CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_reviewed_at
          ON flashcard_reviews(reviewed_at DESC);
      `);

      // Preserve useful legacy data while backfilling the new timestamp fields.
      db.runSync(
        `UPDATE decks
         SET description = subject
         WHERE TRIM(description) = '' AND TRIM(subject) <> ''`
      );
      db.runSync(
        `UPDATE decks
         SET updated_at = created_at
         WHERE updated_at = 0`
      );
      db.runSync(
        `UPDATE flashcards
         SET updated_at = created_at
         WHERE updated_at = 0`
      );

      db.runSync('UPDATE _schema_version SET version = ?', [4]);
    });
  }

  if (currentVersion < 5) {
    // --- Version 5: timezone-safe manual Calendar dates and timeline indexes ---
    db.withTransactionSync(() => {
      const calendarColumns = getColumnNames('calendar_events');

      if (!calendarColumns.has('event_date')) {
        db.execSync(
          `ALTER TABLE calendar_events ADD COLUMN event_date TEXT NOT NULL DEFAULT '';`
        );
      }
      if (!calendarColumns.has('updated_at')) {
        db.execSync(
          `ALTER TABLE calendar_events ADD COLUMN updated_at INTEGER NOT NULL DEFAULT 0;`
        );
      }

      const legacyEvents = db.getAllSync<{
        id: string;
        start_time: number;
        event_date: string;
      }>(
        `SELECT id, start_time, event_date
         FROM calendar_events
         WHERE event_date = ''`
      );

      for (const event of legacyEvents) {
        db.runSync(
          'UPDATE calendar_events SET event_date = ? WHERE id = ?',
          [formatLocalDateKey(event.start_time), event.id]
        );
      }

      db.runSync(
        `UPDATE calendar_events
         SET updated_at = created_at
         WHERE updated_at = 0`
      );

      db.execSync(`
        CREATE INDEX IF NOT EXISTS idx_calendar_events_date_time
          ON calendar_events(event_date, start_time);
        CREATE INDEX IF NOT EXISTS idx_focus_sessions_started_at
          ON focus_sessions(started_at);
      `);

      db.runSync('UPDATE _schema_version SET version = ?', [5]);
    });
  }

  if (currentVersion < 6) {
    // Additive curriculum foundation. Never interpret legacy subject text as a relation.
    db.withTransactionSync(() => {
      const conflict = db.getFirstSync<{ name: string }>(
        `SELECT name FROM sqlite_master WHERE name IN (?, ?, ?, ?) LIMIT 1`,
        ['subjects', 'topics', 'idx_subjects_committee_order', 'idx_topics_subject_order']
      );
      if (conflict) {
        throw new Error('Curriculum schema conflict before v6. No existing data was repaired or removed.');
      }
      db.execSync(`
        CREATE TABLE subjects (
          id TEXT PRIMARY KEY NOT NULL,
          committee_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK(length(trim(name)) > 0),
          description TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (committee_id) REFERENCES committees(id) ON DELETE CASCADE
        );
        CREATE TABLE topics (
          id TEXT PRIMARY KEY NOT NULL,
          subject_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK(length(trim(name)) > 0),
          description TEXT NOT NULL DEFAULT '',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
        );
        CREATE INDEX idx_subjects_committee_order ON subjects(committee_id, created_at, id);
        CREATE INDEX idx_topics_subject_order ON topics(subject_id, created_at, id);
      `);
      db.runSync('UPDATE _schema_version SET version = ?', [6]);
    });
  }
  if (currentVersion < 7) {
    db.withTransactionSync(() => {
      db.execSync("ALTER TABLE topics ADD COLUMN learning_objectives TEXT NOT NULL DEFAULT ''");
      db.runSync('UPDATE _schema_version SET version = ?', [7]);
    });
  }
  if (currentVersion < 8) {
    db.withTransactionSync(() => {
      db.execSync('ALTER TABLE focus_sessions ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL');
      db.runSync('UPDATE _schema_version SET version = ?', [8]);
    });
  }
  if (currentVersion < 9) {
    db.withTransactionSync(() => {
      // Legacy interval/ease/next_review values are not evidence of an actual schedule.
      db.execSync("ALTER TABLE flashcards ADD COLUMN schedule_state TEXT NOT NULL DEFAULT 'unscheduled' CHECK(schedule_state IN ('unscheduled','learning','reviewing'))");
      db.runSync('UPDATE _schema_version SET version = ?', [9]);
    });
  }
  if (currentVersion < 10) {
    db.withTransactionSync(() => {
      db.execSync('ALTER TABLE flashcards ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL');
      // Snapshot at rating time: relinking a card must never reattribute old reviews.
      db.execSync('ALTER TABLE flashcard_reviews ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL');
      db.runSync('UPDATE _schema_version SET version = ?', [10]);
    });
  }
  if (currentVersion < 11) {
    db.withTransactionSync(() => {
      db.execSync(`
        CREATE TABLE qbank_sessions (
          id TEXT PRIMARY KEY NOT NULL,
          topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL,
          total_questions INTEGER NOT NULL CHECK(total_questions > 0),
          correct_count INTEGER NOT NULL CHECK(correct_count >= 0 AND correct_count <= total_questions),
          duration_sec INTEGER CHECK(duration_sec IS NULL OR duration_sec >= 0),
          source_name TEXT,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_qbank_sessions_topic_id ON qbank_sessions(topic_id);
        CREATE INDEX idx_qbank_sessions_created_at ON qbank_sessions(created_at);
      `);
      db.runSync('UPDATE _schema_version SET version = ?', [11]);
    });
  }
  if (currentVersion < 12) {
    db.withTransactionSync(() => {
      db.execSync(`
        CREATE TABLE IF NOT EXISTS study_sources (
          id TEXT PRIMARY KEY NOT NULL,
          topic_id TEXT NOT NULL
            REFERENCES topics(id) ON DELETE CASCADE,
          title TEXT NOT NULL
            CHECK(length(trim(title)) > 0),
          content TEXT NOT NULL
            CHECK(length(trim(content)) > 0),
          source_type TEXT NOT NULL DEFAULT 'text'
            CHECK(source_type IN ('text', 'note', 'document')),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_study_sources_topic_created
          ON study_sources(topic_id, created_at DESC);
      `);
      db.runSync('UPDATE _schema_version SET version = ?', [12]);
    });
  }

  if (currentVersion < 13) {
    // --- Version 13: persistent source knowledge chunks, inverted term index, and text search ---
    db.withTransactionSync(() => {
      ensureSourceChunksSchema(db);
      db.runSync('UPDATE _schema_version SET version = ?', [13]);
    });
  }

  if (currentVersion < 14) {
    // --- Version 14: persistent chunk embeddings for semantic retrieval ---
    db.withTransactionSync(() => {
      ensureChunkEmbeddingsSchema(db);
      db.runSync('UPDATE _schema_version SET version = ?', [14]);
    });
  }

  if (currentVersion < 15) {
    // --- Version 15: unified academic context (subject_id on focus_sessions, subject_id & topic_id on calendar_events) ---
    db.withTransactionSync(() => {
      const hasFocusSessions = Boolean(
        db.getFirstSync("SELECT 1 FROM sqlite_master WHERE type='table' AND name='focus_sessions'")
      );
      if (hasFocusSessions) {
        const focusColumns = getColumnNames('focus_sessions');
        if (!focusColumns.has('subject_id')) {
          db.execSync(
            'ALTER TABLE focus_sessions ADD COLUMN subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;'
          );
        }
        db.execSync(`
          CREATE INDEX IF NOT EXISTS idx_focus_sessions_subject_id
            ON focus_sessions(subject_id);
        `);
      }

      const hasCalendarEvents = Boolean(
        db.getFirstSync("SELECT 1 FROM sqlite_master WHERE type='table' AND name='calendar_events'")
      );
      if (hasCalendarEvents) {
        const calendarColumns = getColumnNames('calendar_events');
        if (!calendarColumns.has('subject_id')) {
          db.execSync(
            'ALTER TABLE calendar_events ADD COLUMN subject_id TEXT REFERENCES subjects(id) ON DELETE SET NULL;'
          );
        }
        if (!calendarColumns.has('topic_id')) {
          db.execSync(
            'ALTER TABLE calendar_events ADD COLUMN topic_id TEXT REFERENCES topics(id) ON DELETE SET NULL;'
          );
        }
        db.execSync(`
          CREATE INDEX IF NOT EXISTS idx_calendar_events_subject_id
            ON calendar_events(subject_id);
          CREATE INDEX IF NOT EXISTS idx_calendar_events_topic_id
            ON calendar_events(topic_id);
        `);
      }

      const NEXT_SCHEMA_VERSION = 15;
      db.runSync('UPDATE _schema_version SET version = ?', [NEXT_SCHEMA_VERSION]);
    });
  }
}

export function ensureChunkEmbeddingsSchema(db: ReturnType<typeof getDB>): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS chunk_embeddings (
      chunk_id TEXT PRIMARY KEY NOT NULL
        REFERENCES source_chunks(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL
        REFERENCES study_sources(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL
        REFERENCES topics(id) ON DELETE CASCADE,
      embedding TEXT NOT NULL,
      dimensions INTEGER NOT NULL,
      model TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_source_id
      ON chunk_embeddings(source_id);
    CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_topic_id
      ON chunk_embeddings(topic_id);
    CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_model
      ON chunk_embeddings(model);
    CREATE INDEX IF NOT EXISTS idx_chunk_embeddings_chunk_hash
      ON chunk_embeddings(chunk_id, content_hash, model);
  `);
}

export function ensureSourceChunksSchema(db: ReturnType<typeof getDB>): void {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS source_chunks (
      id TEXT PRIMARY KEY NOT NULL,
      source_id TEXT NOT NULL
        REFERENCES study_sources(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL
        REFERENCES topics(id) ON DELETE CASCADE,
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

    CREATE INDEX IF NOT EXISTS idx_source_chunks_source_id
      ON source_chunks(source_id);
    CREATE INDEX IF NOT EXISTS idx_source_chunks_topic_id
      ON source_chunks(topic_id);
    CREATE INDEX IF NOT EXISTS idx_source_chunks_source_ordinal
      ON source_chunks(source_id, ordinal);
    CREATE INDEX IF NOT EXISTS idx_source_chunks_fingerprint
      ON source_chunks(fingerprint);
    CREATE INDEX IF NOT EXISTS idx_source_chunks_type
      ON source_chunks(chunk_type);

    CREATE TABLE IF NOT EXISTS source_chunk_terms (
      term TEXT NOT NULL,
      chunk_id TEXT NOT NULL
        REFERENCES source_chunks(id) ON DELETE CASCADE,
      source_id TEXT NOT NULL
        REFERENCES study_sources(id) ON DELETE CASCADE,
      topic_id TEXT NOT NULL
        REFERENCES topics(id) ON DELETE CASCADE,
      term_frequency INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (term, chunk_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chunk_terms_term
      ON source_chunk_terms(term);
    CREATE INDEX IF NOT EXISTS idx_chunk_terms_source_term
      ON source_chunk_terms(source_id, term);
    CREATE INDEX IF NOT EXISTS idx_chunk_terms_topic_term
      ON source_chunk_terms(topic_id, term);
    CREATE INDEX IF NOT EXISTS idx_chunk_terms_chunk_id
      ON source_chunk_terms(chunk_id);
  `);

  try {
    db.execSync(`
      CREATE VIRTUAL TABLE IF NOT EXISTS source_chunks_fts USING fts5(
        chunk_id UNINDEXED,
        text,
        source_title,
        section_title,
        topic_id UNINDEXED,
        source_id UNINDEXED,
        tokenize = 'unicode61'
      );
    `);
  } catch {
    // FTS5 not guaranteed on all Android platforms; source_chunk_terms provides deterministic indexing
  }
}

export { CURRENT_VERSION };
