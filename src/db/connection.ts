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
      purchased_at TEXT,
      purchase_price REAL,
      store TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (army_id) REFERENCES armies(id) ON DELETE CASCADE
    );
  `);

  // Migration: add purchase fields if missing
  try {
    await database.execute(`ALTER TABLE miniatures ADD COLUMN purchased_at TEXT;`);
  } catch { /* column already exists */ }
  try {
    await database.execute(`ALTER TABLE miniatures ADD COLUMN purchase_price REAL;`);
  } catch { /* column already exists */ }
  try {
    await database.execute(`ALTER TABLE miniatures ADD COLUMN store TEXT;`);
  } catch { /* column already exists */ }

  // Migration: add painted_count field
  try {
    await database.execute(`ALTER TABLE miniatures ADD COLUMN painted_count INTEGER NOT NULL DEFAULT 0;`);
  } catch { /* column already exists */ }

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
    CREATE TABLE IF NOT EXISTS painting_process_media (
      id TEXT PRIMARY KEY,
      process_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_size INTEGER NOT NULL DEFAULT 0,
      media_type TEXT NOT NULL DEFAULT 'image',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (process_id) REFERENCES painting_processes(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_painting_process_media_process_id ON painting_process_media(process_id);`);

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

  // ======================== ARMY LISTS ========================

  await database.execute(`
    CREATE TABLE IF NOT EXISTS army_lists (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      game_id TEXT,
      army_id TEXT,
      points INTEGER NOT NULL DEFAULT 0,
      game_date TEXT,
      notes TEXT NOT NULL DEFAULT '',
      pdf_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE SET NULL,
      FOREIGN KEY (army_id) REFERENCES armies(id) ON DELETE SET NULL
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS army_list_miniatures (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      miniature_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (list_id) REFERENCES army_lists(id) ON DELETE CASCADE,
      FOREIGN KEY (miniature_id) REFERENCES miniatures(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS army_list_images (
      id TEXT PRIMARY KEY,
      list_id TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (list_id) REFERENCES army_lists(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_army_list_miniatures_list_id ON army_list_miniatures(list_id);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_army_list_images_list_id ON army_list_images(list_id);`);
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

  // ======================== PAINT COLLECTION ========================

  await database.execute(`
    CREATE TABLE IF NOT EXISTS paints (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      brand TEXT NOT NULL DEFAULT 'Citadel',
      range TEXT NOT NULL DEFAULT 'Base',
      hex_color TEXT,
      is_metallic INTEGER NOT NULL DEFAULT 0
    );
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS user_paints (
      id TEXT PRIMARY KEY,
      paint_id TEXT NOT NULL,
      in_wishlist INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (paint_id) REFERENCES paints(id) ON DELETE CASCADE
    );
  `);

  await database.execute(`CREATE INDEX IF NOT EXISTS idx_paints_brand ON paints(brand);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_paints_range ON paints(range);`);
  await database.execute(`CREATE INDEX IF NOT EXISTS idx_user_paints_paint_id ON user_paints(paint_id);`);
  await database.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_user_paints_unique ON user_paints(paint_id, in_wishlist);`);

  // Seed paints (INSERT OR IGNORE ensures no duplicates)
  await seedCitadelPaints(database);
}

async function seedCitadelPaints(database: Database): Promise<void> {
  const paints: [string, string, string | null, number][] = [
    // Base
    ["Abaddon Black", "Base", "#231F20", 0],
    ["Averland Sunset", "Base", "#FDB825", 0],
    ["Balthasar Gold", "Base", "#A47552", 1],
    ["Bugmans Glow", "Base", "#834F44", 0],
    ["Caledor Sky", "Base", "#396E9E", 0],
    ["Caliban Green", "Base", "#00401F", 0],
    ["Castellan Green", "Base", "#314821", 0],
    ["Celestra Grey", "Base", "#90A8A8", 0],
    ["Ceramite White", "Base", "#FFFFFF", 0],
    ["Daemonette Hide", "Base", "#696684", 0],
    ["Death Guard Green", "Base", "#848A66", 0],
    ["Deathworld Forest", "Base", "#5C6730", 0],
    ["Dryad Bark", "Base", "#33312D", 0],
    ["Incubi Darkness", "Base", "#0B474A", 0],
    ["Jokaero Orange", "Base", "#EE3823", 0],
    ["Kantor Blue", "Base", "#002151", 0],
    ["Khorne Red", "Base", "#6A0001", 0],
    ["Leadbelcher", "Base", "#888D8F", 1],
    ["Macragge Blue", "Base", "#0D407F", 0],
    ["Mechanicus Standard Grey", "Base", "#3D4B4D", 0],
    ["Mephiston Red", "Base", "#9A1115", 0],
    ["Mournfang Brown", "Base", "#640909", 0],
    ["Naggaroth Night", "Base", "#3D3354", 0],
    ["Rakarth Flesh", "Base", "#A29E91", 0],
    ["Ratskin Flesh", "Base", "#AD6B4C", 0],
    ["Retributor Armour", "Base", "#C39E81", 1],
    ["Rhinox Hide", "Base", "#493435", 0],
    ["Screamer Pink", "Base", "#7C1645", 0],
    ["Screaming Bell", "Base", "#C16F45", 1],
    ["Steel Legion Drab", "Base", "#5E5134", 0],
    ["Stegadon Scale Green", "Base", "#074863", 0],
    ["The Fang Grey", "Base", "#436174", 0],
    ["Thousand Sons Blue", "Base", "#18ABCC", 0],
    ["Waaagh! Flesh", "Base", "#1F5429", 0],
    ["Warplock Bronze", "Base", "#927D7B", 1],
    ["XV-88", "Base", "#72491E", 0],
    ["Zandri Dust", "Base", "#9E915C", 0],
    // Layer
    ["Administratum Grey", "Layer", "#949B95", 0],
    ["Ahriman Blue", "Layer", "#1F8C9C", 0],
    ["Alaitoc Blue", "Layer", "#295788", 0],
    ["Altdorf Guard Blue", "Layer", "#1F56A7", 0],
    ["Auric Armour Gold", "Layer", "#E8BC6D", 1],
    ["Balor Brown", "Layer", "#8B5910", 0],
    ["Baneblade Brown", "Layer", "#937F6D", 0],
    ["Bestigor Flesh", "Layer", "#D38A57", 0],
    ["Brass Scorpion", "Layer", "#B7885F", 1],
    ["Cadian Fleshtone", "Layer", "#C77958", 0],
    ["Calgar Blue", "Layer", "#4272B8", 0],
    ["Dark Reaper", "Layer", "#3B5150", 0],
    ["Dawnstone", "Layer", "#70756E", 0],
    ["Deathclaw Brown", "Layer", "#B36853", 0],
    ["Doombull Brown", "Layer", "#5D0009", 0],
    ["Elysian Green", "Layer", "#748F39", 0],
    ["Emperors Children", "Layer", "#B94278", 0],
    ["Eshin Grey", "Layer", "#4A4F52", 0],
    ["Evil Sunz Scarlet", "Layer", "#C2191F", 0],
    ["Fenrisian Grey", "Layer", "#719BB7", 0],
    ["Fire Dragon Bright", "Layer", "#F58652", 0],
    ["Flash Gitz Yellow", "Layer", "#FFF200", 0],
    ["Flayed One Flesh", "Layer", "#F0D9B8", 0],
    ["Fulgurite Copper", "Layer", "#FCFCDE", 1],
    ["Gehenna's Gold", "Layer", "#DBA674", 1],
    ["Genestealer Purple", "Layer", "#7761AB", 0],
    ["Gorthor Brown", "Layer", "#654741", 0],
    ["Hashut Copper", "Layer", "#B77647", 1],
    ["Hoeth Blue", "Layer", "#4C7FB4", 0],
    ["Ironbreaker", "Layer", "#A1A6A9", 1],
    ["Kabalite Green", "Layer", "#038C67", 0],
    ["Karak Stone", "Layer", "#BB9662", 0],
    ["Kislev Flesh", "Layer", "#D6A875", 0],
    ["Liberator Gold", "Layer", "#D3B587", 1],
    ["Loren Forest", "Layer", "#50702D", 0],
    ["Lothern Blue", "Layer", "#34A2CF", 0],
    ["Moot Green", "Layer", "#52B244", 0],
    ["Nurgling Green", "Layer", "#849C63", 0],
    ["Ogryn Camo", "Layer", "#9DA94B", 0],
    ["Pallid Wych Flesh", "Layer", "#CDCEBE", 0],
    ["Pink Horror", "Layer", "#90305D", 0],
    ["Runefang Steel", "Layer", "#C3CACE", 1],
    ["Runelord Brass", "Layer", "#B6A89A", 1],
    ["Russ Grey", "Layer", "#547588", 0],
    ["Screaming Skull", "Layer", "#D2D4A2", 0],
    ["Skarsnik Green", "Layer", "#5F9370", 0],
    ["Skavenblight Dinge", "Layer", "#47413B", 0],
    ["Skrag Brown", "Layer", "#90490F", 0],
    ["Skullcrusher Brass", "Layer", "#F1C78E", 1],
    ["Slaanesh Grey", "Layer", "#8E8C97", 0],
    ["Sotek Green", "Layer", "#0B6974", 0],
    ["Squig Orange", "Layer", "#AA4F44", 0],
    ["Stormhost Silver", "Layer", "#BBC6C9", 1],
    ["Stormvermin Fur", "Layer", "#736B65", 0],
    ["Straken Green", "Layer", "#628126", 0],
    ["Sybarite Green", "Layer", "#30A56C", 0],
    ["Sycorax Bronze", "Layer", "#CBB394", 1],
    ["Tallarn Sand", "Layer", "#A67610", 0],
    ["Tau Light Ochre", "Layer", "#BF6E1D", 0],
    ["Teclis Blue", "Layer", "#317EC1", 0],
    ["Temple Guard Blue", "Layer", "#339A8D", 0],
    ["Thunderhawk Blue", "Layer", "#417074", 0],
    ["Troll Slayer Orange", "Layer", "#F36D2D", 0],
    ["Tuskgor Fur", "Layer", "#883636", 0],
    ["Ulthuan Grey", "Layer", "#C7E0D9", 0],
    ["Ungor Flesh", "Layer", "#D6A766", 0],
    ["Ushabti Bone", "Layer", "#BBBB7F", 0],
    ["Warboss Green", "Layer", "#3E805D", 0],
    ["Warpfiend Grey", "Layer", "#6B6A74", 0],
    ["Warpstone Glow", "Layer", "#1E7331", 0],
    ["Wazdakka Red", "Layer", "#8C0A0C", 0],
    ["White Scar", "Layer", "#FFFFFF", 0],
    ["Wild Rider Red", "Layer", "#EA2F28", 0],
    ["Xereus Purple", "Layer", "#471F5F", 0],
    ["Yriel Yellow", "Layer", "#FFDA00", 0],
    ["Zamesi Desert", "Layer", "#DDA026", 0],
    // Shade
    ["Agrax Earthshade", "Shade", "#5A573F", 0],
    ["Agrax Earthshade (Gloss)", "Shade", "#5A573F", 0],
    ["Athonian Camoshade", "Shade", "#6D8E44", 0],
    ["Biel-Tan Green", "Shade", "#1BA169", 0],
    ["Carroburg Crimson", "Shade", "#A82A70", 0],
    ["Casandora Yellow", "Shade", "#FECE5A", 0],
    ["Coelia Greenshade", "Shade", "#0E7F78", 0],
    ["Drakenhof Nightshade", "Shade", "#125899", 0],
    ["Druchii Violet", "Shade", "#7A468C", 0],
    ["Fuegan Orange", "Shade", "#C77E4D", 0],
    ["Nuln Oil", "Shade", "#14100E", 0],
    ["Nuln Oil (Gloss)", "Shade", "#14100E", 0],
    ["Reikland Fleshshade", "Shade", "#CA6C4D", 0],
    ["Reikland Fleshshade (Gloss)", "Shade", "#CA6C4D", 0],
    ["Seraphim Sepia", "Shade", "#D7824B", 0],
    // Dry
    ["Astorath Red", "Dry", "#DD482B", 0],
    ["Changeling Pink", "Dry", "#F4AFCD", 0],
    ["Chronus Blue", "Dry", "#72A8D1", 0],
    ["Dawnstone (Dry)", "Dry", "#919C9F", 0],
    ["Eldar Flesh", "Dry", "#ECC083", 0],
    ["Etherium Blue", "Dry", "#A2BAD2", 0],
    ["Golden Griffon", "Dry", "#A99058", 1],
    ["Golgfag Brown", "Dry", "#C2804F", 0],
    ["Hellion Green", "Dry", "#84C3AA", 0],
    ["Hexos Palesun", "Dry", "#FFF200", 0],
    ["Hoeth Blue (Dry)", "Dry", "#57A9D4", 0],
    ["Imrik Blue", "Dry", "#67AED0", 0],
    ["Kindleflame", "Dry", "#F79E86", 0],
    ["Longbeard Grey", "Dry", "#CECEAF", 0],
    ["Lucius Lilac", "Dry", "#B69FCC", 0],
    ["Necron Compound", "Dry", "#828B8E", 1],
    ["Niblet Green", "Dry", "#7DC734", 0],
    ["Nurgling Green (Dry)", "Dry", "#B8CC82", 0],
    ["Praxeti White", "Dry", "#FFFFFF", 0],
    ["Ryza Rust", "Dry", "#EC631A", 0],
    ["Sigmarite", "Dry", "#CAAD76", 1],
    ["Skink Blue", "Dry", "#58C1CD", 0],
    ["Slaanesh Grey (Dry)", "Dry", "#DBD5E6", 0],
    ["Stormfang", "Dry", "#80A7C1", 0],
    ["Sylvaneth Bark", "Dry", "#AC8262", 0],
    ["Terminatus Stone", "Dry", "#BDB192", 0],
    ["Thunderhawk Blue (Dry)", "Dry", "#509BA9", 0],
    ["Tyrant Skull", "Dry", "#CDC586", 0],
    ["Underhive Ash", "Dry", "#C0BD81", 0],
    ["Verminlord Hide", "Dry", "#A16954", 0],
    ["Wrack White", "Dry", "#FCFBFA", 0],
    // Edge
    ["Baharroth Blue", "Edge", "#58C1CD", 0],
    ["Blue Horror", "Edge", "#A2BAD2", 0],
    ["Dechala Lilac", "Edge", "#B69FCC", 0],
    ["Dorn Yellow", "Edge", "#FFF200", 0],
    ["Fulgrim Pink", "Edge", "#F4AFCD", 0],
    ["Gauss Blaster Green", "Edge", "#84C3AA", 0],
    ["Krieg Khaki", "Edge", "#C0BD81", 0],
    ["Lugganath Orange", "Edge", "#F79E86", 0],
    // Glaze
    ["Bloodletter", "Glaze", "#F37355", 0],
    ["Guilliman Blue", "Glaze", "#2F9AD6", 0],
    ["Lamenters Yellow", "Glaze", "#FFF56B", 0],
    ["Waywatcher Green", "Glaze", "#6DC066", 0],
    // Texture
    ["Agrellan Badland", "Texture", null, 0],
    ["Agrellan Earth", "Texture", null, 0],
    ["Armageddon Dust", "Texture", "#D3A907", 0],
    ["Armageddon Dunes", "Texture", null, 0],
    ["Astrogranite", "Texture", "#757679", 0],
    ["Astrogranite Debris", "Texture", null, 0],
    ["Blackfire Earth", "Texture", "#A75820", 0],
    ["Lustrian Undergrowth", "Texture", "#415A09", 0],
    ["Martian Ironcrust", "Texture", null, 0],
    ["Martian Ironearth", "Texture", null, 0],
    ["Mourn Mountain Snow", "Texture", "#E9EAEB", 0],
    ["Stirland Battlemire", "Texture", null, 0],
    ["Stirland Mud", "Texture", "#492B00", 0],
    ["Valhallan Blizzard", "Texture", null, 0],
    // Technical
    ["'Ardcoat", "Technical", "#E2DEDF", 0],
    ["Agrellan Earth (Technical)", "Technical", "#9A816B", 0],
    ["Blood for the Blood God", "Technical", "#67080B", 0],
    ["Imperial Primer", "Technical", "#231F20", 0],
    ["Lahmian Medium", "Technical", "#F5EDE2", 0],
    ["Liquid Green Stuff", "Technical", "#3B7A5F", 0],
    ["Martian Ironearth (Technical)", "Technical", "#C15A4B", 0],
    ["Nihilakh Oxide", "Technical", "#6CB79E", 0],
    ["Nurgle's Rot", "Technical", "#9B8F22", 0],
    ["Soulstone Blue", "Technical", "#004EFA", 0],
    ["Spiritstone Red", "Technical", "#FF4B24", 0],
    ["Typhus Corrosion", "Technical", "#463D2B", 0],
    ["Waystone Green", "Technical", "#00C000", 0],
  ];

  for (const [name, range, hexColor, isMetallic] of paints) {
    const id = `citadel-${name.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    await database.execute(
      `INSERT OR IGNORE INTO paints (id, name, brand, range, hex_color, is_metallic) VALUES ($1, $2, 'Citadel', $3, $4, $5)`,
      [id, name, range, hexColor, isMetallic]
    );
  }

  // Vallejo Model Color
  const vallejoPaints: [string, string, string, string | null, number][] = [
    // Regular colors
    ["70.951", "White", "Model Color", "#FFFFFF", 0],
    ["70.919", "Cold White", "Model Color", "#F0F0F0", 0],
    ["70.842", "Gloss White", "Model Color", "#FFFFFF", 0],
    ["70.820", "Off-White", "Model Color", "#F0E8D8", 0],
    ["70.918", "Ivory", "Model Color", "#FFFCE8", 0],
    ["70.917", "Beige", "Model Color", "#C8B078", 0],
    ["70.837", "Pale Sand", "Model Color", "#E0C890", 0],
    ["70.928", "Light Flesh", "Model Color", "#E8B888", 0],
    ["70.815", "Basic Skin Tone", "Model Color", "#C89068", 0],
    ["70.955", "Flat Flesh", "Model Color", "#C89068", 0],
    ["70.860", "Medium Fleshtone", "Model Color", "#C48852", 0],
    ["70.845", "Sunny Skin Tone", "Model Color", "#D8A878", 0],
    ["70.927", "Dark Flesh", "Model Color", "#905838", 0],
    ["70.804", "Beige Red", "Model Color", "#C08060", 0],
    ["70.835", "Salmon Rose", "Model Color", "#D88878", 0],
    ["70.803", "Brown Rose", "Model Color", "#A86858", 0],
    ["70.944", "Old Rose", "Model Color", "#C07888", 0],
    ["70.958", "Pink", "Model Color", "#E888A0", 0],
    ["70.945", "Magenta", "Model Color", "#A01870", 0],
    ["70.812", "Violet Red", "Model Color", "#A01848", 0],
    ["70.959", "Purple", "Model Color", "#602080", 0],
    ["70.960", "Violet", "Model Color", "#5A2070", 0],
    ["70.811", "Blue Violet", "Model Color", "#4A30A0", 0],
    ["70.943", "Grey Blue", "Model Color", "#5A7B90", 0],
    ["70.930", "Dark Blue", "Model Color", "#172B5E", 0],
    ["70.925", "Blue", "Model Color", "#1838B0", 0],
    ["70.809", "Royal Blue", "Model Color", "#283CA0", 0],
    ["70.839", "Ultramarine", "Model Color", "#2838B0", 0],
    ["70.841", "Andrea Blue", "Model Color", "#3A80B2", 0],
    ["70.844", "Deep Sky Blue", "Model Color", "#2088C0", 0],
    ["70.962", "Flat Blue", "Model Color", "#2848A0", 0],
    ["70.963", "Medium Blue", "Model Color", "#2660A0", 0],
    ["70.964", "Field Blue", "Model Color", "#3A5A80", 0],
    ["70.965", "Prussian Blue", "Model Color", "#1A3070", 0],
    ["70.966", "Turquoise", "Model Color", "#1DABA0", 0],
    ["70.840", "Light Turquoise", "Model Color", "#48B8B0", 0],
    ["70.961", "Sky Blue", "Model Color", "#68A8D0", 0],
    ["70.906", "Pale Blue", "Model Color", "#A0B8D0", 0],
    ["70.901", "Pastel Blue", "Model Color", "#6898C0", 0],
    ["70.902", "Azure", "Model Color", "#2A78C0", 0],
    ["70.903", "Intermediate Blue", "Model Color", "#4870A0", 0],
    ["70.900", "French Mirage Blue", "Model Color", "#384888", 0],
    ["70.899", "Dark Prussian Blue", "Model Color", "#1A3448", 0],
    ["70.898", "Dark Sea Blue", "Model Color", "#1A3860", 0],
    ["70.904", "Dark Blue Grey", "Model Color", "#4A6070", 0],
    ["70.905", "Blue Grey Pale", "Model Color", "#8898A8", 0],
    ["70.907", "Pale Grey Blue", "Model Color", "#96ABB8", 0],
    ["70.808", "Blue Green", "Model Color", "#1A7878", 0],
    ["70.838", "Emerald", "Model Color", "#188048", 0],
    ["70.969", "Park Green Flat", "Model Color", "#3E6830", 0],
    ["70.970", "Deep Green", "Model Color", "#1A4828", 0],
    ["70.942", "Light Green", "Model Color", "#68A850", 0],
    ["70.827", "Lime Green", "Model Color", "#82C848", 0],
    ["70.954", "Yellow Green", "Model Color", "#8AAA38", 0],
    ["70.881", "Yellow Green", "Model Color", "#88A030", 0],
    ["70.891", "Intermediate Green", "Model Color", "#488038", 0],
    ["70.974", "Green Sky", "Model Color", "#689888", 0],
    ["70.972", "Light Green Blue", "Model Color", "#88A8A0", 0],
    ["70.971", "Green Grey", "Model Color", "#8A9A88", 0],
    ["70.885", "Pastel Green", "Model Color", "#7BAA7E", 0],
    ["70.833", "Ger. Camo. Bright Green", "Model Color", "#588028", 0],
    ["70.967", "Olive Green", "Model Color", "#4A5828", 0],
    ["70.968", "Flat Green", "Model Color", "#385020", 0],
    ["70.857", "Golden Olive", "Model Color", "#7A7828", 0],
    ["70.890", "Refractive Green", "Model Color", "#386028", 0],
    ["70.893", "US Dark Green", "Model Color", "#2A4020", 0],
    ["70.894", "Cam. Olive Green", "Model Color", "#5A5830", 0],
    ["70.895", "Gunship Green", "Model Color", "#3A5030", 0],
    ["70.896", "G. Camo Extra Dark Green", "Model Color", "#1A3018", 0],
    ["70.897", "Bronze Green", "Model Color", "#4A5A38", 0],
    ["70.892", "Yellow Olive", "Model Color", "#6A6820", 0],
    ["70.889", "Olive Brown", "Model Color", "#585028", 0],
    ["70.888", "Olive Grey", "Model Color", "#585838", 0],
    ["70.850", "Medium Olive", "Model Color", "#5A6830", 0],
    ["70.979", "German Cam. Dark Green", "Model Color", "#2C3B1D", 0],
    ["70.980", "Black Green", "Model Color", "#1A2818", 0],
    ["70.975", "Military Green", "Model Color", "#4A5A28", 0],
    ["70.922", "Uniform Green", "Model Color", "#4A6030", 0],
    ["70.924", "Russian Uniform WWII", "Model Color", "#5A5830", 0],
    ["70.923", "Japan. Uniform WWII", "Model Color", "#6A6238", 0],
    ["70.920", "German Uniform", "Model Color", "#5A6448", 0],
    ["70.830", "German Fieldgrey WWII", "Model Color", "#5A6A50", 0],
    ["70.823", "Luftwaffe Cam. Green", "Model Color", "#4A6028", 0],
    ["70.821", "German Cam. Beige WWII", "Model Color", "#A89058", 0],
    ["70.816", "Luftwaffe Uniform WWII", "Model Color", "#6B7A80", 0],
    ["70.822", "German Cam. Black Brown", "Model Color", "#3A2A20", 0],
    ["70.824", "Ger. Camo. Orange Ochre", "Model Color", "#B88028", 0],
    ["70.825", "German Cam. Pale Brown", "Model Color", "#8A7040", 0],
    ["70.826", "German Cam. Med. Brown", "Model Color", "#6D4C33", 0],
    ["70.879", "Green Brown", "Model Color", "#6A6030", 0],
    ["70.880", "Khaki Grey", "Model Color", "#8A8368", 0],
    ["70.988", "Khaki", "Model Color", "#8A7838", 0],
    ["70.882", "Middlestone", "Model Color", "#B89848", 0],
    ["70.986", "Deck Tan", "Model Color", "#B8A070", 0],
    ["70.916", "Sand Yellow", "Model Color", "#CDA858", 0],
    ["70.847", "Dark Sand", "Model Color", "#B09048", 0],
    ["70.819", "Iraqi Sand", "Model Color", "#C8A870", 0],
    ["70.976", "Buff", "Model Color", "#C8B070", 0],
    ["70.806", "German Yellow", "Model Color", "#C8A020", 0],
    ["70.948", "Golden Yellow", "Model Color", "#E8B020", 0],
    ["70.915", "Deep Yellow", "Model Color", "#E8B010", 0],
    ["70.953", "Flat Yellow", "Model Color", "#E8C820", 0],
    ["70.952", "Lemon Yellow", "Model Color", "#F8F020", 0],
    ["70.949", "Light Yellow", "Model Color", "#F8F080", 0],
    ["70.858", "Ice Yellow", "Model Color", "#F5E8A0", 0],
    ["70.913", "Yellow Ochre", "Model Color", "#C49A30", 0],
    ["70.914", "Green Ochre", "Model Color", "#8A8828", 0],
    ["70.912", "Tan Yellow", "Model Color", "#B89038", 0],
    ["70.977", "Desert Yellow", "Model Color", "#C8A848", 0],
    ["70.978", "Dark Yellow", "Model Color", "#B89828", 0],
    ["70.911", "Light Orange", "Model Color", "#F0A040", 0],
    ["70.805", "German Orange", "Model Color", "#C87020", 0],
    ["70.851", "Bright Orange", "Model Color", "#F08028", 0],
    ["70.956", "Clear Orange", "Model Color", "#F08030", 0],
    ["70.910", "Orange Red", "Model Color", "#E04030", 0],
    ["70.817", "Scarlet", "Model Color", "#D02020", 0],
    ["70.909", "Vermilion", "Model Color", "#E03020", 0],
    ["70.947", "Dark Vermilion", "Model Color", "#B02020", 0],
    ["70.926", "Red", "Model Color", "#C81820", 0],
    ["70.957", "Flat Red", "Model Color", "#C01818", 0],
    ["70.908", "Carmine Red", "Model Color", "#A01830", 0],
    ["70.946", "Dark Red", "Model Color", "#801018", 0],
    ["70.814", "Burnt Red", "Model Color", "#882018", 0],
    ["70.859", "Black Red", "Model Color", "#480010", 0],
    ["70.802", "Sunset Red", "Model Color", "#C83828", 0],
    ["70.829", "Amaranth Red", "Model Color", "#A01828", 0],
    ["70.818", "Red Leather", "Model Color", "#8A3020", 0],
    ["70.982", "Cavalry Brown", "Model Color", "#6A2818", 0],
    ["70.985", "Hull Red", "Model Color", "#5A1810", 0],
    ["70.814", "Burnt Red", "Model Color", "#882018", 0],
    ["70.981", "Orange Brown", "Model Color", "#A85820", 0],
    ["70.929", "Light Brown", "Model Color", "#A07840", 0],
    ["70.877", "Gold Brown", "Model Color", "#8A6820", 0],
    ["70.856", "Ochre Brown", "Model Color", "#8A6828", 0],
    ["70.875", "Beige Brown", "Model Color", "#9A7848", 0],
    ["70.876", "Brown Sand", "Model Color", "#907848", 0],
    ["70.874", "Tan Earth", "Model Color", "#7A5830", 0],
    ["70.873", "US Field Drab", "Model Color", "#7A6840", 0],
    ["70.843", "Cork Brown", "Model Color", "#6A4028", 0],
    ["70.940", "Saddle Brown", "Model Color", "#6A3818", 0],
    ["70.846", "Mahogany Brown", "Model Color", "#5A2818", 0],
    ["70.871", "Leather Brown", "Model Color", "#5A3818", 0],
    ["70.983", "Flat Earth", "Model Color", "#8A6828", 0],
    ["70.984", "Flat Brown", "Model Color", "#5A3818", 0],
    ["70.941", "Burnt Umber", "Model Color", "#4A2818", 0],
    ["70.872", "Chocolate Brown", "Model Color", "#3E2218", 0],
    ["70.828", "Woodgrain", "Model Color", "#6A3020", 0],
    ["70.834", "Natural Woodgrain", "Model Color", "#8A5828", 0],
    ["70.950", "Black", "Model Color", "#1A1A1A", 0],
    ["70.861", "Glossy Black", "Model Color", "#0A0A0A", 0],
    ["70.862", "Black Grey", "Model Color", "#3A3A3A", 0],
    ["70.995", "German Grey", "Model Color", "#3A4048", 0],
    ["70.994", "Dark Grey", "Model Color", "#4A4A4A", 0],
    ["70.992", "Neutral Grey", "Model Color", "#808080", 0],
    ["70.987", "Medium Grey", "Model Color", "#888888", 0],
    ["70.989", "Sky Grey", "Model Color", "#A8B8B8", 0],
    ["70.990", "Light Grey", "Model Color", "#B8C0C0", 0],
    ["70.993", "White Grey", "Model Color", "#E0E0E0", 0],
    ["70.883", "Silver Grey", "Model Color", "#C0C0C0", 0],
    ["70.884", "Stone Grey", "Model Color", "#9A9898", 0],
    ["70.886", "Green Grey", "Model Color", "#6B7C6B", 0],
    ["70.866", "Grey Green", "Model Color", "#5C635A", 0],
    ["70.867", "Dark Blue Grey", "Model Color", "#48586A", 0],
    ["70.868", "Dark Sea Green", "Model Color", "#4A6858", 0],
    ["70.869", "Basalt Grey", "Model Color", "#5A6268", 0],
    ["70.870", "Medium Sea Grey", "Model Color", "#8A9498", 0],
    ["70.973", "Light Sea Grey", "Model Color", "#8A9898", 0],
    ["70.991", "Dark Sea Grey", "Model Color", "#687078", 0],
    ["70.836", "London Grey", "Model Color", "#7A8284", 0],
    // Metallic
    ["70.997", "Silver", "Model Color", "#C0C0C0", 1],
    ["70.790", "Silver", "Model Color", "#C8C8C8", 1],
    ["70.998", "Bronze", "Model Color", "#8C6838", 1],
    ["70.996", "Gold", "Model Color", "#C8A830", 1],
    ["70.791", "Gold", "Model Color", "#C8A020", 1],
    ["70.792", "Old Gold", "Model Color", "#B09020", 1],
    ["70.793", "Rich Gold", "Model Color", "#C8A028", 1],
    ["70.794", "Red Gold", "Model Color", "#C08028", 1],
    ["70.795", "Green Gold", "Model Color", "#8A8030", 1],
    ["70.796", "White Gold", "Model Color", "#C8C098", 1],
    ["70.797", "Copper", "Model Color", "#B87040", 1],
    ["70.999", "Copper", "Model Color", "#B87040", 1],
    ["70.800", "Gunmetal Blue", "Model Color", "#4A5060", 1],
    ["70.801", "Brass", "Model Color", "#B89030", 1],
    ["70.863", "Gunmetal Grey", "Model Color", "#585C60", 1],
    ["70.864", "Natural Steel", "Model Color", "#808488", 1],
    ["70.865", "Oily Steel", "Model Color", "#606468", 1],
    ["70.878", "Old Gold", "Model Color", "#A88828", 1],
    // Fluorescent
    ["70.730", "Fluorescent Yellow", "Model Color", "#FFFF00", 0],
    ["70.733", "Fluorescent Orange", "Model Color", "#FF6000", 0],
    ["70.735", "Fluorescent Magenta", "Model Color", "#FF00FF", 0],
    ["70.736", "Fluorescent Blue", "Model Color", "#0088FF", 0],
    ["70.737", "Fluorescent Green", "Model Color", "#00FF40", 0],
    // Transparent
    ["70.934", "Transparent Red", "Model Color", "#C82020", 0],
    ["70.935", "Transparent Orange", "Model Color", "#E87530", 0],
    ["70.936", "Transparent Green", "Model Color", "#20A030", 0],
    ["70.937", "Transparent Yellow", "Model Color", "#F0D020", 0],
    ["70.938", "Transparent Blue", "Model Color", "#2060C0", 0],
    // Glazes
    ["70.853", "White Glaze", "Glaze", "#F0F0F0", 0],
    ["70.854", "Brown Glaze", "Glaze", "#8A6030", 0],
    ["70.855", "Black Glaze", "Glaze", "#2A2A2A", 0],
    ["70.831", "Tan Glaze", "Glaze", "#C0A060", 0],
    ["70.832", "Verdigris Glaze", "Glaze", "#48A880", 0],
    // Auxiliary
    ["70.510", "Gloss Varnish", "Auxiliary", null, 0],
    ["70.520", "Matt Varnish", "Auxiliary", null, 0],
    ["70.521", "Metal Medium", "Auxiliary", null, 0],
    ["70.522", "Satin Varnish", "Auxiliary", null, 0],
    ["70.523", "Liquid Mask", "Auxiliary", null, 0],
    ["70.524", "Thinner", "Auxiliary", null, 0],
    ["70.540", "Matt Medium", "Auxiliary", null, 0],
    ["70.470", "Gloss Medium", "Auxiliary", null, 0],
    ["70.400", "Plastic Putty", "Auxiliary", null, 0],
    ["70.596", "Glaze Medium", "Auxiliary", null, 0],
    ["70.597", "Retarder Medium", "Auxiliary", null, 0],
    ["70.598", "Crackle Medium", "Auxiliary", null, 0],
    ["71.261", "Airbrush Thinner", "Auxiliary", null, 0],
    ["71.262", "Flow Improver", "Auxiliary", null, 0],
    ["73.212", "Decal Softener", "Auxiliary", null, 0],
    ["73.213", "Decal Fix", "Auxiliary", null, 0],
    ["73.214", "Chipping Medium", "Auxiliary", null, 0],
  ];

  for (const [ref, name, range, hexColor, isMetallic] of vallejoPaints) {
    const id = `vallejo-${ref}`;
    await database.execute(
      `INSERT OR IGNORE INTO paints (id, name, brand, range, hex_color, is_metallic) VALUES ($1, $2, 'Vallejo', $3, $4, $5)`,
      [id, `${ref} ${name}`, range, hexColor, isMetallic]
    );
  }
}
