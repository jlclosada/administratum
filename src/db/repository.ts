import type {
    Army,
    ArmyWithStats,
    CreateArmyDTO,
    CreateGameDTO,
    CreateMiniatureDTO,
    CreatePaintingProcessDTO,
    DashboardStats,
    Game,
    Miniature,
    MiniatureImage,
    MiniatureWithDetails,
    PaintingProcess,
    Tag,
    UpdateArmyDTO,
    UpdateGameDTO,
    UpdateMiniatureDTO
} from "@/types";
import { DEFAULT_GAMES as defaultGames } from "@/types";
import { v4 as uuid } from "uuid";
import { getDb } from "./connection";

// ======================== HELPERS ========================

function now(): string {
  return new Date().toISOString();
}

function mapRow<T>(row: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
    mapped[camelKey] = value;
  }
  return mapped as T;
}

function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => mapRow<T>(r));
}

// ======================== GAMES ========================

export async function getAllGames(): Promise<Game[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM games ORDER BY sort_order ASC, name ASC"
  );
  return mapRows<Game>(rows);
}

export async function getGameById(id: string): Promise<Game | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM games WHERE id = $1",
    [id]
  );
  return rows.length > 0 ? mapRow<Game>(rows[0]!) : null;
}

export async function createGame(dto: CreateGameDTO): Promise<Game> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  await db.execute(
    `INSERT INTO games (id, name, description, cover_image, icon, is_custom, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7)`,
    [id, dto.name, dto.description ?? "", dto.coverImage ?? null, dto.icon ?? null, timestamp, timestamp]
  );
  return (await getGameById(id))!;
}

export async function updateGame(dto: UpdateGameDTO): Promise<Game> {
  const db = await getDb();
  const existing = await getGameById(dto.id);
  if (!existing) throw new Error(`Game ${dto.id} not found`);

  await db.execute(
    `UPDATE games SET name = $1, description = $2, cover_image = $3, icon = $4, updated_at = $5
     WHERE id = $6`,
    [
      dto.name ?? existing.name,
      dto.description ?? existing.description,
      dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
      dto.icon !== undefined ? dto.icon : existing.icon,
      now(),
      dto.id,
    ]
  );
  return (await getGameById(dto.id))!;
}

export async function deleteGame(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM games WHERE id = $1", [id]);
}

export async function seedDefaultGames(): Promise<void> {
  const db = await getDb();
  for (const game of defaultGames) {
    const existing = await db.select<{ count: number }[]>(
      "SELECT COUNT(*) as count FROM games WHERE name = $1",
      [game.name]
    );
    const count = Number(Object.values(existing[0]!)[0]);
    if (count > 0) continue;

    const id = uuid();
    const timestamp = now();
    await db.execute(
      `INSERT INTO games (id, name, description, cover_image, icon, sort_order, is_custom, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, game.name, game.description, game.coverImage, game.icon, game.sortOrder, game.isCustom ? 1 : 0, timestamp, timestamp]
    );
  }
}

// ======================== ARMIES ========================

export async function getArmiesByGame(gameId: string): Promise<ArmyWithStats[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*,
       (SELECT COUNT(*) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COUNT(*) FROM miniatures m3 WHERE m3.army_id = a.id AND EXISTS (
         SELECT 1 FROM miniature_statuses ms WHERE ms.miniature_id = m3.id AND ms.status_type IN ('painted','based','varnished')
       )) as total_painted
     FROM armies a
     WHERE a.game_id = $1
     ORDER BY a.sort_order ASC, a.name ASC`,
    [gameId]
  );
  return mapRows<ArmyWithStats>(rows).map((a) => ({
    ...a,
    totalMiniatures: Number(a.totalMiniatures),
    totalPainted: Number(a.totalPainted),
    completionPercentage: a.totalMiniatures > 0 ? Math.round((a.totalPainted / a.totalMiniatures) * 100) : 0,
  }));
}

export async function getArmyById(id: string): Promise<ArmyWithStats | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*,
       (SELECT COUNT(*) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COUNT(*) FROM miniatures m3 WHERE m3.army_id = a.id AND EXISTS (
         SELECT 1 FROM miniature_statuses ms WHERE ms.miniature_id = m3.id AND ms.status_type IN ('painted','based','varnished')
       )) as total_painted
     FROM armies a
     WHERE a.id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const army = mapRow<ArmyWithStats>(rows[0]!);
  army.totalMiniatures = Number(army.totalMiniatures);
  army.totalPainted = Number(army.totalPainted);
  army.completionPercentage = army.totalMiniatures > 0
    ? Math.round((army.totalPainted / army.totalMiniatures) * 100) : 0;
  return army;
}

export async function createArmy(dto: CreateArmyDTO): Promise<Army> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  await db.execute(
    `INSERT INTO armies (id, game_id, name, description, cover_image, color_primary, color_secondary, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, dto.gameId, dto.name, dto.description ?? "", dto.coverImage ?? null, dto.colorPrimary ?? null, dto.colorSecondary ?? null, timestamp, timestamp]
  );
  return (await getArmyById(id))!;
}

export async function updateArmy(dto: UpdateArmyDTO): Promise<Army> {
  const db = await getDb();
  const existing = await getArmyById(dto.id);
  if (!existing) throw new Error(`Army ${dto.id} not found`);

  await db.execute(
    `UPDATE armies SET name = $1, description = $2, cover_image = $3, color_primary = $4, color_secondary = $5, updated_at = $6
     WHERE id = $7`,
    [
      dto.name ?? existing.name,
      dto.description ?? existing.description,
      dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
      dto.colorPrimary !== undefined ? dto.colorPrimary : existing.colorPrimary,
      dto.colorSecondary !== undefined ? dto.colorSecondary : existing.colorSecondary,
      now(),
      dto.id,
    ]
  );
  return (await getArmyById(dto.id))!;
}

export async function deleteArmy(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM armies WHERE id = $1", [id]);
}

// ======================== MINIATURES ========================

export async function getMiniaturesByArmy(armyId: string): Promise<MiniatureWithDetails[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM miniatures WHERE army_id = $1 ORDER BY sort_order ASC, name ASC",
    [armyId]
  );
  const miniatures = mapRows<Miniature>(rows);

  return Promise.all(
    miniatures.map(async (m) => {
      const [statusRows, imageRows, tagRows, processRows] = await Promise.all([
        db.select<Record<string, unknown>[]>(
          "SELECT status_type FROM miniature_statuses WHERE miniature_id = $1",
          [m.id]
        ),
        db.select<Record<string, unknown>[]>(
          "SELECT * FROM miniature_images WHERE miniature_id = $1 ORDER BY sort_order ASC",
          [m.id]
        ),
        db.select<Record<string, unknown>[]>(
          `SELECT t.* FROM tags t
           INNER JOIN miniature_tags mt ON mt.tag_id = t.id
           WHERE mt.miniature_id = $1`,
          [m.id]
        ),
        db.select<Record<string, unknown>[]>(
          "SELECT * FROM painting_processes WHERE miniature_id = $1 ORDER BY step_order ASC",
          [m.id]
        ),
      ]);
      return {
        ...m,
        statuses: statusRows.map((r) => String(r.status_type ?? r["status_type"])) as PaintStatusType[],
        images: mapRows<MiniatureImage>(imageRows),
        tags: mapRows<Tag>(tagRows),
        paintingProcesses: mapRows<PaintingProcess>(processRows),
      };
    })
  );
}

export async function getMiniatureById(id: string): Promise<MiniatureWithDetails | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM miniatures WHERE id = $1",
    [id]
  );
  if (rows.length === 0) return null;
  const m = mapRow<Miniature>(rows[0]!);

  const [statusRows, imageRows, tagRows, processRows] = await Promise.all([
    db.select<Record<string, unknown>[]>(
      "SELECT status_type FROM miniature_statuses WHERE miniature_id = $1",
      [m.id]
    ),
    db.select<Record<string, unknown>[]>(
      "SELECT * FROM miniature_images WHERE miniature_id = $1 ORDER BY sort_order ASC",
      [m.id]
    ),
    db.select<Record<string, unknown>[]>(
      `SELECT t.* FROM tags t
       INNER JOIN miniature_tags mt ON mt.tag_id = t.id
       WHERE mt.miniature_id = $1`,
      [m.id]
    ),
    db.select<Record<string, unknown>[]>(
      "SELECT * FROM painting_processes WHERE miniature_id = $1 ORDER BY step_order ASC",
      [m.id]
    ),
  ]);

  return {
    ...m,
    statuses: statusRows.map((r) => String(r.status_type ?? r["status_type"])) as PaintStatusType[],
    images: mapRows<MiniatureImage>(imageRows),
    tags: mapRows<Tag>(tagRows),
    paintingProcesses: mapRows<PaintingProcess>(processRows),
  };
}

export async function createMiniature(dto: CreateMiniatureDTO): Promise<MiniatureWithDetails> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();

  await db.execute(
    `INSERT INTO miniatures (id, army_id, name, category, quantity, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, dto.armyId, dto.name, dto.category, dto.quantity, dto.notes ?? "", timestamp, timestamp]
  );

  for (const statusType of dto.statuses) {
    await db.execute(
      `INSERT OR IGNORE INTO miniature_statuses (miniature_id, status_type)
       VALUES ($1, $2)`,
      [id, statusType]
    );
  }

  if (dto.tags) {
    for (const tagId of dto.tags) {
      await db.execute(
        `INSERT OR IGNORE INTO miniature_tags (miniature_id, tag_id) VALUES ($1, $2)`,
        [id, tagId]
      );
    }
  }

  return (await getMiniatureById(id))!;
}

export async function updateMiniature(dto: UpdateMiniatureDTO): Promise<MiniatureWithDetails> {
  const db = await getDb();
  const existing = await getMiniatureById(dto.id);
  if (!existing) throw new Error(`Miniature ${dto.id} not found`);

  await db.execute(
    `UPDATE miniatures SET name = $1, category = $2, quantity = $3, notes = $4, updated_at = $5
     WHERE id = $6`,
    [
      dto.name ?? existing.name,
      dto.category ?? existing.category,
      dto.quantity ?? existing.quantity,
      dto.notes ?? existing.notes,
      now(),
      dto.id,
    ]
  );

  if (dto.statuses) {
    await db.execute("DELETE FROM miniature_statuses WHERE miniature_id = $1", [dto.id]);
    for (const statusType of dto.statuses) {
      await db.execute(
        `INSERT OR IGNORE INTO miniature_statuses (miniature_id, status_type)
         VALUES ($1, $2)`,
        [dto.id, statusType]
      );
    }
  }

  if (dto.tags) {
    await db.execute("DELETE FROM miniature_tags WHERE miniature_id = $1", [dto.id]);
    for (const tagId of dto.tags) {
      await db.execute(
        `INSERT OR IGNORE INTO miniature_tags (miniature_id, tag_id) VALUES ($1, $2)`,
        [dto.id, tagId]
      );
    }
  }

  return (await getMiniatureById(dto.id))!;
}

export async function deleteMiniature(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM miniatures WHERE id = $1", [id]);
}

export async function toggleFavorite(id: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE miniatures SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END, updated_at = $1 WHERE id = $2",
    [now(), id]
  );
}

// ======================== PAINTING PROCESSES ========================

export async function addPaintingProcess(dto: CreatePaintingProcessDTO): Promise<PaintingProcess> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  await db.execute(
    `INSERT INTO painting_processes (id, miniature_id, step_order, title, description, colors_used, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [id, dto.miniatureId, dto.stepOrder, dto.title, dto.description ?? "", dto.colorsUsed ?? "", timestamp, timestamp]
  );
  const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM painting_processes WHERE id = $1", [id]);
  return mapRow<PaintingProcess>(rows[0]!);
}

export async function updatePaintingProcess(id: string, title: string, description: string, colorsUsed: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE painting_processes SET title = $1, description = $2, colors_used = $3, updated_at = $4 WHERE id = $5`,
    [title, description, colorsUsed, now(), id]
  );
}

export async function deletePaintingProcess(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM painting_processes WHERE id = $1", [id]);
}

// ======================== IMAGES ========================

export async function addImage(
  miniatureId: string,
  filePath: string,
  fileName: string,
  fileSize: number
): Promise<MiniatureImage> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  const existingImages = await db.select<Record<string, unknown>[]>(
    "SELECT COUNT(*) as count FROM miniature_images WHERE miniature_id = $1",
    [miniatureId]
  );
  const imgCount = Number(Object.values(existingImages[0] ?? { count: 0 })[0] ?? 0);
  const isPrimary = imgCount === 0 ? 1 : 0;

  await db.execute(
    `INSERT INTO miniature_images (id, miniature_id, file_path, file_name, file_size, is_primary, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, miniatureId, filePath, fileName, fileSize, isPrimary, imgCount, timestamp, timestamp]
  );

  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM miniature_images WHERE id = $1",
    [id]
  );
  return mapRow<MiniatureImage>(rows[0]!);
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM miniature_images WHERE id = $1", [id]);
}

// ======================== TAGS ========================

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM tags ORDER BY name ASC"
  );
  return mapRows<Tag>(rows);
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  await db.execute(
    `INSERT INTO tags (id, name, color, created_at, updated_at) VALUES ($1, $2, $3, $4, $5)`,
    [id, name, color, timestamp, timestamp]
  );
  const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM tags WHERE id = $1", [id]);
  return mapRow<Tag>(rows[0]!);
}

// ======================== GALLERY ========================

export async function getAllImages(): Promise<(MiniatureImage & { miniatureName: string })[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT mi.*, m.name as miniature_name
     FROM miniature_images mi
     JOIN miniatures m ON m.id = mi.miniature_id
     ORDER BY mi.created_at DESC`
  );
  return rows.map((r) => {
    const mapped = mapRow<MiniatureImage & { miniatureName: string }>(r);
    return mapped;
  });
}

// ======================== DASHBOARD ========================

export async function getDashboardStats(): Promise<DashboardStats> {
  const db = await getDb();

  const gameCount = await db.select<Record<string, unknown>[]>("SELECT COUNT(*) as count FROM games");
  const armyCount = await db.select<Record<string, unknown>[]>("SELECT COUNT(*) as count FROM armies");
  const miniatureTotal = await db.select<Record<string, unknown>[]>(
    "SELECT COUNT(*) as total FROM miniatures"
  );
  const paintedTotal = await db.select<Record<string, unknown>[]>(
    `SELECT COUNT(DISTINCT ms.miniature_id) as total FROM miniature_statuses ms
     WHERE ms.status_type IN ('painted','based','varnished')`
  );

  const recent = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM miniatures ORDER BY created_at DESC LIMIT 5"
  );

  const statusDist = await db.select<Record<string, unknown>[]>(
    `SELECT status_type, COUNT(*) as total FROM miniature_statuses GROUP BY status_type ORDER BY total DESC`
  );

  const armyRows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*,
       (SELECT COUNT(*) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COUNT(*) FROM miniatures m3 WHERE m3.army_id = a.id AND EXISTS (
         SELECT 1 FROM miniature_statuses ms WHERE ms.miniature_id = m3.id AND ms.status_type IN ('painted','based','varnished')
       )) as total_painted
     FROM armies a
     ORDER BY a.name ASC`
  );

  const totalMinis = Number(Object.values(miniatureTotal[0] ?? { total: 0 })[0] ?? 0);
  const totalPaint = Number(Object.values(paintedTotal[0] ?? { total: 0 })[0] ?? 0);

  const recentMiniatures = (await Promise.all(
    mapRows<Miniature>(recent).map(async (m) => {
      try {
        return await getMiniatureById(m.id);
      } catch {
        return null;
      }
    })
  )).filter((m): m is MiniatureWithDetails => m !== null);

  const armyProgress = mapRows<ArmyWithStats>(armyRows).map((a) => ({
    ...a,
    totalMiniatures: Number(a.totalMiniatures),
    totalPainted: Number(a.totalPainted),
    completionPercentage:
      Number(a.totalMiniatures) > 0
        ? Math.round((Number(a.totalPainted) / Number(a.totalMiniatures)) * 100)
        : 0,
  }));

  return {
    totalGames: Number(Object.values(gameCount[0] ?? { count: 0 })[0] ?? 0),
    totalArmies: Number(Object.values(armyCount[0] ?? { count: 0 })[0] ?? 0),
    totalMiniatures: totalMinis,
    totalPainted: totalPaint,
    completionPercentage: totalMinis > 0 ? Math.round((totalPaint / totalMinis) * 100) : 0,
    recentMiniatures,
    armyProgress,
    statusDistribution: statusDist.map((s) => ({
      status: String(s.status_type ?? Object.values(s)[0]),
      count: Number(s.total ?? Object.values(s)[1] ?? 0),
    })),
  };
}
