import { join } from 'path';

let dbInstance: any = null;
const isBun = typeof Bun !== 'undefined';

export function getDB() {
  if (dbInstance) return dbInstance;

  const dbPath = join(process.cwd(), 'drawsql.db');
  
  if (isBun) {
    const { Database } = require('bun:sqlite');
    dbInstance = new Database(dbPath);
  } else {
    const Database = require('better-sqlite3');
    dbInstance = new Database(dbPath);
  }
  
  // Enable performance structures & constraints
  if (isBun) {
    dbInstance.query('PRAGMA journal_mode = WAL;').run();
    dbInstance.query('PRAGMA foreign_keys = ON;').run();
  } else {
    dbInstance.prepare('PRAGMA journal_mode = WAL;').run();
    dbInstance.prepare('PRAGMA foreign_keys = ON;').run();
  }
  
  initializeSchema();
  
  return dbInstance;
}

export function exec(sql: string, params: any[] = []): { changes: number; lastInsertRowid: any } {
  const db = getDB();
  if (isBun) {
    const stmt = db.query(sql);
    const info = stmt.run(...params);
    return {
      changes: info.changes ?? 0,
      lastInsertRowid: info.lastInsertRowid ?? null
    };
  } else {
    const stmt = db.prepare(sql);
    const info = stmt.run(...params);
    return {
      changes: info.changes,
      lastInsertRowid: info.lastInsertRowid
    };
  }
}

export function query<T = any>(sql: string, params: any[] = []): T[] {
  const db = getDB();
  if (isBun) {
    const stmt = db.query(sql);
    return stmt.all(...params) as T[];
  } else {
    const stmt = db.prepare(sql);
    return stmt.all(...params) as T[];
  }
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const db = getDB();
  if (isBun) {
    const stmt = db.query(sql);
    const res = stmt.get(...params);
    return (res as T) || null;
  } else {
    const stmt = db.prepare(sql);
    const res = stmt.get(...params);
    return (res as T) || null;
  }
}

function initializeSchema() {
  // 1. Users Table
  exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar_url TEXT,
      github_id TEXT UNIQUE,
      google_id TEXT UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // 2. Diagrams Table
  exec(`
    CREATE TABLE IF NOT EXISTS diagrams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      user_id TEXT NOT NULL,
      dialect TEXT DEFAULT 'postgresql',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // 3. Tables Table
  exec(`
    CREATE TABLE IF NOT EXISTS tables (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      x INTEGER NOT NULL DEFAULT 100,
      y INTEGER NOT NULL DEFAULT 100,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
    );
  `);

  // 4. Columns Table
  exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      table_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      length TEXT,
      is_primary BOOLEAN DEFAULT 0,
      is_nullable BOOLEAN DEFAULT 1,
      is_unique BOOLEAN DEFAULT 0,
      is_unsigned BOOLEAN DEFAULT 0,
      is_auto_increment BOOLEAN DEFAULT 0,
      default_value TEXT,
      comment TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
    );
  `);

  // 5. Relations Table
  exec(`
    CREATE TABLE IF NOT EXISTS relations (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      source_table_id TEXT NOT NULL,
      source_column_id TEXT NOT NULL,
      target_table_id TEXT NOT NULL,
      target_column_id TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT '1:N',
      on_delete TEXT DEFAULT 'CASCADE',
      on_update TEXT DEFAULT 'CASCADE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE,
      FOREIGN KEY (source_table_id) REFERENCES tables(id) ON DELETE CASCADE,
      FOREIGN KEY (source_column_id) REFERENCES columns(id) ON DELETE CASCADE,
      FOREIGN KEY (target_table_id) REFERENCES tables(id) ON DELETE CASCADE,
      FOREIGN KEY (target_column_id) REFERENCES columns(id) ON DELETE CASCADE
    );
  `);

  // 6. Notes Table
  exec(`DROP TABLE IF EXISTS notes;`);
  exec(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      diagram_id TEXT NOT NULL,
      user_id TEXT,
      creator_name TEXT,
      creator_avatar TEXT,
      content TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT 'table-theme-violet',
      x INTEGER NOT NULL DEFAULT 100,
      y INTEGER NOT NULL DEFAULT 100,
      width INTEGER NOT NULL DEFAULT 250,
      height INTEGER NOT NULL DEFAULT 120,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (diagram_id) REFERENCES diagrams(id) ON DELETE CASCADE
    );
  `);

  // 7. Indexing for speed
  exec(`CREATE INDEX IF NOT EXISTS idx_tables_diagram ON tables(diagram_id);`);
  exec(`CREATE INDEX IF NOT EXISTS idx_columns_table ON columns(table_id);`);
  exec(`CREATE INDEX IF NOT EXISTS idx_relations_diagram ON relations(diagram_id);`);
  exec(`CREATE INDEX IF NOT EXISTS idx_notes_diagram ON notes(diagram_id);`);

  // 8. Workspaces Tables
  exec(`
    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  exec(`
    CREATE TABLE IF NOT EXISTS workspace_members (
      workspace_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (workspace_id, user_id),
      FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrate diagrams table to have workspace_id TEXT column
  try {
    exec('ALTER TABLE diagrams ADD COLUMN workspace_id TEXT;');
  } catch (e) {
    // Column already exists
  }
}
