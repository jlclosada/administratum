import Database from "@tauri-apps/plugin-sql";

let db: Database | null = null;

export async function getDb(): Promise<Database> {
  if (!db) {
    db = await Database.load("sqlite:warhammer_vault.db");
    await runMigrations(db);
  }
  return db;
}

async function runMigrations(database: Database): Promise<void> {
  // Enable foreign key cascade deletes
  await database.execute(`PRAGMA foreign_keys = ON;`);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      icon TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_custom INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS armies (
      id TEXT PRIMARY KEY,
      game_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      cover_image TEXT,
      color_primary TEXT,
      color_secondary TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      start_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS miniatures (
      id TEXT PRIMARY KEY,
      army_id TEXT NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'infantry',
      quantity INTEGER NOT NULL DEFAULT 1,
      notes TEXT NOT NULL DEFAULT '',
      is_favorite INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (army_id) REFERENCES armies(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS miniature_statuses (
      miniature_id TEXT NOT NULL,
      status_type TEXT NOT NULL,
      PRIMARY KEY (miniature_id, status_type),
      FOREIGN KEY (miniature_id) REFERENCES miniatures(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS painting_processes (
      id TEXT PRIMARY KEY,
      miniature_id TEXT NOT NULL,
      step_order INTEGER NOT NULL DEFAULT 0,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      colors_used TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (miniature_id) REFERENCES miniatures(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS miniature_images (
      id TEXT PRIMARY KEY,
      miniature_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      width INTEGER NOT NULL DEFAULT 0,
      height INTEGER NOT NULL DEFAULT 0,
      thumbnail_path TEXT,
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (miniature_id) REFERENCES miniatures(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL DEFAULT '#6b7280',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS miniature_tags (
      miniature_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (miniature_id, tag_id),
      FOREIGN KEY (miniature_id) REFERENCES miniatures(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);

  // Indexes for performance
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_armies_game_id ON armies(game_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_miniatures_army_id ON miniatures(army_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_miniature_statuses_miniature_id ON miniature_statuses(miniature_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_painting_processes_miniature_id ON painting_processes(miniature_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_miniature_images_miniature_id ON miniature_images(miniature_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_miniature_tags_miniature_id ON miniature_tags(miniature_id);`);

  // Clean up legacy tables from older versions
  await database.execute(`DROP TABLE IF EXISTS status_breakdown;`);

  // Migrate: add start_date column if missing (safe for existing DBs)
  try { await database.execute(`ALTER TABLE games ADD COLUMN start_date TEXT;`); } catch { /* column already exists */ }
  try { await database.execute(`ALTER TABLE armies ADD COLUMN start_date TEXT;`); } catch { /* column already exists */ }

  // Future-ready: user preferences table
  await database.execute(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
}

export { Database };
