import type {
  Army,
  ArmyListImage,
  ArmyListMiniature,
  ArmyListWithDetails,
  ArmyWithStats,
  CreateArmyDTO,
  CreateArmyListDTO,
  CreateGameDTO,
  CreateMiniatureDTO,
  CreatePaintingProcessDTO,
  DashboardStats,
  Game,
  Miniature,
  MiniatureImage,
  MiniatureWithDetails,
  Paint,
  PaintingProcess,
  PaintingProcessMedia,
  PaintingProcessMediaType,
  PaintStatusType,
  Tag,
  UpdateArmyDTO,
  UpdateGameDTO,
  UpdateMiniatureDTO,
  UserPaint
} from "@/types";
import { appDataDir, join } from "@tauri-apps/api/path";
import { copyFile, exists, mkdir } from "@tauri-apps/plugin-fs";
import { v4 as uuid } from "uuid";
import { getDb } from "./connection";

// ======================== HELPERS ========================

function now(): string {
  return new Date().toISOString();
}

/** Copy a user-selected file into the app's data directory and return the stored path */
export async function saveImageToAppData(sourcePath: string, subfolder: string): Promise<string> {
  const appData = await appDataDir();
  const imagesDir = await join(appData, "images", subfolder);
  const dirExists = await exists(imagesDir);
  if (!dirExists) {
    await mkdir(imagesDir, { recursive: true });
  }
  const ext = sourcePath.split(".").pop() ?? "png";
  const fileName = `${uuid()}.${ext}`;
  const destPath = await join(imagesDir, fileName);
  await copyFile(sourcePath, destPath);
  return destPath;
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

async function hydrateProcessesWithMedia(processRows: Record<string, unknown>[]): Promise<PaintingProcess[]> {
  if (processRows.length === 0) return [];
  const db = await getDb();
  const processes = mapRows<Omit<PaintingProcess, "media">>(processRows);
  return Promise.all(
    processes.map(async (p) => {
      const mediaRows = await db.select<Record<string, unknown>[]>(
        "SELECT * FROM painting_process_media WHERE process_id = $1 ORDER BY sort_order ASC",
        [p.id]
      );
      return { ...p, media: mapRows<PaintingProcessMedia>(mediaRows) } as PaintingProcess;
    })
  );
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
    `INSERT INTO games (id, name, description, cover_image, icon, start_date, is_custom, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, 1, $7, $8)`,
    [id, dto.name, dto.description ?? "", dto.coverImage ?? null, dto.icon ?? null, dto.startDate ?? null, timestamp, timestamp]
  );
  return (await getGameById(id))!;
}

export async function updateGame(dto: UpdateGameDTO): Promise<Game> {
  const db = await getDb();
  const existing = await getGameById(dto.id);
  if (!existing) throw new Error(`Game ${dto.id} not found`);

  await db.execute(
    `UPDATE games SET name = $1, description = $2, cover_image = $3, icon = $4, start_date = $5, updated_at = $6
     WHERE id = $7`,
    [
      dto.name ?? existing.name,
      dto.description ?? existing.description,
      dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
      dto.icon !== undefined ? dto.icon : existing.icon,
      dto.startDate !== undefined ? dto.startDate : existing.startDate,
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

// ======================== ARMIES ========================

export async function getAllArmies(): Promise<(ArmyWithStats & { gameName: string })[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*, g.name as game_name,
       (SELECT COALESCE(SUM(m2.quantity), 0) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COALESCE(SUM(m3.painted_count), 0) FROM miniatures m3 WHERE m3.army_id = a.id) as total_painted
     FROM armies a
     JOIN games g ON g.id = a.game_id
     ORDER BY g.name ASC, a.name ASC`
  );
  return rows.map((r) => {
    const mapped = mapRow<ArmyWithStats & { gameName: string }>(r);
    mapped.totalMiniatures = Number(mapped.totalMiniatures);
    mapped.totalPainted = Number(mapped.totalPainted);
    mapped.completionPercentage = mapped.totalMiniatures > 0
      ? Math.round((mapped.totalPainted / mapped.totalMiniatures) * 100) : 0;
    return mapped;
  });
}

export async function getArmiesByGame(gameId: string): Promise<ArmyWithStats[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*,
       (SELECT COALESCE(SUM(m2.quantity), 0) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COALESCE(SUM(m3.painted_count), 0) FROM miniatures m3 WHERE m3.army_id = a.id) as total_painted
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
       (SELECT COALESCE(SUM(m2.quantity), 0) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COALESCE(SUM(m3.painted_count), 0) FROM miniatures m3 WHERE m3.army_id = a.id) as total_painted
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
    `INSERT INTO armies (id, game_id, name, description, cover_image, color_primary, color_secondary, start_date, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [id, dto.gameId, dto.name, dto.description ?? "", dto.coverImage ?? null, dto.colorPrimary ?? null, dto.colorSecondary ?? null, dto.startDate ?? null, timestamp, timestamp]
  );
  return (await getArmyById(id))!;
}

export async function updateArmy(dto: UpdateArmyDTO): Promise<Army> {
  const db = await getDb();
  const existing = await getArmyById(dto.id);
  if (!existing) throw new Error(`Army ${dto.id} not found`);

  await db.execute(
    `UPDATE armies SET name = $1, description = $2, cover_image = $3, color_primary = $4, color_secondary = $5, start_date = $6, updated_at = $7
     WHERE id = $8`,
    [
      dto.name ?? existing.name,
      dto.description ?? existing.description,
      dto.coverImage !== undefined ? dto.coverImage : existing.coverImage,
      dto.colorPrimary !== undefined ? dto.colorPrimary : existing.colorPrimary,
      dto.colorSecondary !== undefined ? dto.colorSecondary : existing.colorSecondary,
      dto.startDate !== undefined ? dto.startDate : existing.startDate,
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
        paintingProcesses: await hydrateProcessesWithMedia(processRows),
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
    paintingProcesses: await hydrateProcessesWithMedia(processRows),
  };
}

export async function createMiniature(dto: CreateMiniatureDTO): Promise<MiniatureWithDetails> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();

  await db.execute(
    `INSERT INTO miniatures (id, army_id, name, category, quantity, painted_count, notes, purchased_at, purchase_price, store, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [id, dto.armyId, dto.name, dto.category, dto.quantity, dto.paintedCount ?? 0, dto.notes ?? "", dto.purchasedAt ?? null, dto.purchasePrice ?? null, dto.store ?? null, timestamp, timestamp]
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
    `UPDATE miniatures SET name = $1, category = $2, quantity = $3, painted_count = $4, notes = $5, updated_at = $6
     WHERE id = $7`,
    [
      dto.name ?? existing.name,
      dto.category ?? existing.category,
      dto.quantity ?? existing.quantity,
      dto.paintedCount ?? existing.paintedCount,
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
  const process = mapRow<Omit<PaintingProcess, "media">>(rows[0]!);
  return { ...process, media: [] } as PaintingProcess;
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

// ======================== PAINTING PROCESS MEDIA ========================

export async function addPaintingProcessMedia(
  processId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  mediaType: PaintingProcessMediaType
): Promise<PaintingProcessMedia> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  const existing = await db.select<Record<string, unknown>[]>(
    "SELECT COUNT(*) as count FROM painting_process_media WHERE process_id = $1",
    [processId]
  );
  const sortOrder = Number(Object.values(existing[0] ?? { count: 0 })[0] ?? 0);
  await db.execute(
    `INSERT INTO painting_process_media (id, process_id, file_path, file_name, file_size, media_type, sort_order, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, processId, filePath, fileName, fileSize, mediaType, sortOrder, timestamp, timestamp]
  );
  const rows = await db.select<Record<string, unknown>[]>("SELECT * FROM painting_process_media WHERE id = $1", [id]);
  return mapRow<PaintingProcessMedia>(rows[0]!);
}

export async function deletePaintingProcessMedia(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM painting_process_media WHERE id = $1", [id]);
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

export async function getImagesByArmy(armyId: string): Promise<(MiniatureImage & { miniatureName: string })[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT mi.*, m.name as miniature_name
     FROM miniature_images mi
     JOIN miniatures m ON m.id = mi.miniature_id
     WHERE m.army_id = $1
     ORDER BY mi.created_at DESC`,
    [armyId]
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
    "SELECT COALESCE(SUM(quantity), 0) as total FROM miniatures"
  );
  const paintedTotal = await db.select<Record<string, unknown>[]>(
    "SELECT COALESCE(SUM(painted_count), 0) as total FROM miniatures"
  );

  const recent = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM miniatures ORDER BY created_at DESC LIMIT 5"
  );

  // For each miniature, only count its highest (current) step
  const statusDist = await db.select<Record<string, unknown>[]>(
    `SELECT current_status as status_type, COUNT(*) as total
     FROM (
       SELECT ms.miniature_id,
              CASE
                WHEN MAX(CASE WHEN ms.status_type = 'varnished' THEN 1 ELSE 0 END) = 1 THEN 'varnished'
                WHEN MAX(CASE WHEN ms.status_type = 'based' THEN 1 ELSE 0 END) = 1 THEN 'based'
                WHEN MAX(CASE WHEN ms.status_type = 'painted' THEN 1 ELSE 0 END) = 1 THEN 'painted'
                WHEN MAX(CASE WHEN ms.status_type = 'wip' THEN 1 ELSE 0 END) = 1 THEN 'wip'
                WHEN MAX(CASE WHEN ms.status_type = 'primed' THEN 1 ELSE 0 END) = 1 THEN 'primed'
                WHEN MAX(CASE WHEN ms.status_type = 'assembled' THEN 1 ELSE 0 END) = 1 THEN 'assembled'
                WHEN MAX(CASE WHEN ms.status_type = 'unassembled' THEN 1 ELSE 0 END) = 1 THEN 'unassembled'
              END as current_status
       FROM miniature_statuses ms
       GROUP BY ms.miniature_id
     )
     WHERE current_status IS NOT NULL
     GROUP BY current_status
     ORDER BY total DESC`
  );

  const armyRows = await db.select<Record<string, unknown>[]>(
    `SELECT a.*,
       (SELECT COALESCE(SUM(m2.quantity), 0) FROM miniatures m2 WHERE m2.army_id = a.id) as total_miniatures,
       (SELECT COALESCE(SUM(m3.painted_count), 0) FROM miniatures m3 WHERE m3.army_id = a.id) as total_painted
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

// ======================== ARMY LISTS ========================

export async function getAllArmyLists(): Promise<ArmyListWithDetails[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT al.*, g.name as game_name, a.name as army_name
     FROM army_lists al
     LEFT JOIN games g ON g.id = al.game_id
     LEFT JOIN armies a ON a.id = al.army_id
     ORDER BY al.created_at DESC`
  );
  const lists: ArmyListWithDetails[] = [];
  for (const r of rows) {
    const mapped = mapRow<ArmyListWithDetails>(r);
    const minis = await getArmyListMiniatures(mapped.id);
    const images = await getArmyListImages(mapped.id);
    const totalMiniatures = minis.reduce((sum, m) => sum + m.quantity, 0);
    const paintedMiniatures = minis.filter((m) => {
      return m.miniature?.statuses?.some((s) => ['painted', 'based', 'varnished'].includes(s));
    }).reduce((sum, m) => sum + m.quantity, 0);
    lists.push({
      ...mapped,
      miniatures: minis,
      images,
      totalMiniatures,
      paintedMiniatures,
      completionPercentage: totalMiniatures > 0 ? Math.round((paintedMiniatures / totalMiniatures) * 100) : 0,
    });
  }
  return lists;
}

export async function getArmyListById(id: string): Promise<ArmyListWithDetails | null> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT al.*, g.name as game_name, a.name as army_name
     FROM army_lists al
     LEFT JOIN games g ON g.id = al.game_id
     LEFT JOIN armies a ON a.id = al.army_id
     WHERE al.id = $1`,
    [id]
  );
  if (rows.length === 0) return null;
  const mapped = mapRow<ArmyListWithDetails>(rows[0]!);
  const minis = await getArmyListMiniatures(id);
  const images = await getArmyListImages(id);
  const totalMiniatures = minis.reduce((sum, m) => sum + m.quantity, 0);
  const paintedMiniatures = minis.filter((m) => {
    return m.miniature?.statuses?.some((s) => ['painted', 'based', 'varnished'].includes(s));
  }).reduce((sum, m) => sum + m.quantity, 0);
  return {
    ...mapped,
    miniatures: minis,
    images,
    totalMiniatures,
    paintedMiniatures,
    completionPercentage: totalMiniatures > 0 ? Math.round((paintedMiniatures / totalMiniatures) * 100) : 0,
  };
}

export async function createArmyList(dto: CreateArmyListDTO): Promise<ArmyListWithDetails> {
  const db = await getDb();
  const id = uuid();
  const timestamp = now();
  await db.execute(
    `INSERT INTO army_lists (id, name, game_id, army_id, points, game_date, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [id, dto.name, dto.gameId ?? null, dto.armyId ?? null, dto.points ?? 0, dto.gameDate ?? null, dto.notes ?? "", timestamp, timestamp]
  );
  return (await getArmyListById(id))!;
}

export async function updateArmyList(id: string, dto: Partial<CreateArmyListDTO>): Promise<ArmyListWithDetails> {
  const db = await getDb();
  const existing = await getArmyListById(id);
  if (!existing) throw new Error(`Army list ${id} not found`);
  await db.execute(
    `UPDATE army_lists SET name = $1, game_id = $2, army_id = $3, points = $4, game_date = $5, notes = $6, updated_at = $7 WHERE id = $8`,
    [
      dto.name ?? existing.name,
      dto.gameId !== undefined ? dto.gameId : existing.gameId,
      dto.armyId !== undefined ? dto.armyId : existing.armyId,
      dto.points ?? existing.points,
      dto.gameDate !== undefined ? dto.gameDate : existing.gameDate,
      dto.notes ?? existing.notes,
      now(),
      id,
    ]
  );
  return (await getArmyListById(id))!;
}

export async function deleteArmyList(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_lists WHERE id = $1", [id]);
}

export async function addMiniatureToList(listId: string, miniatureId: string, quantity: number): Promise<void> {
  const db = await getDb();
  const id = uuid();
  const existing = await db.select<Record<string, unknown>[]>(
    "SELECT COUNT(*) as count FROM army_list_miniatures WHERE list_id = $1",
    [listId]
  );
  const sortOrder = Number(Object.values(existing[0] ?? { count: 0 })[0] ?? 0);
  await db.execute(
    `INSERT INTO army_list_miniatures (id, list_id, miniature_id, quantity, sort_order)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, listId, miniatureId, quantity, sortOrder]
  );
}

export async function removeMiniatureFromList(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_miniatures WHERE id = $1", [id]);
}

async function getArmyListMiniatures(listId: string): Promise<ArmyListMiniature[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT alm.* FROM army_list_miniatures alm
     WHERE alm.list_id = $1
     ORDER BY alm.sort_order ASC`,
    [listId]
  );
  const result: ArmyListMiniature[] = [];
  for (const r of rows) {
    const mapped = mapRow<ArmyListMiniature>(r);
    const mini = await getMiniatureById(mapped.miniatureId);
    result.push({ ...mapped, miniature: mini ?? undefined });
  }
  return result;
}

async function getArmyListImages(listId: string): Promise<ArmyListImage[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM army_list_images WHERE list_id = $1 ORDER BY created_at DESC`,
    [listId]
  );
  return mapRows<ArmyListImage>(rows);
}

export async function addImageToList(listId: string, filePath: string, fileName: string): Promise<void> {
  const db = await getDb();
  const id = uuid();
  await db.execute(
    `INSERT INTO army_list_images (id, list_id, file_path, file_name, created_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, listId, filePath, fileName, now()]
  );
}

export async function removeImageFromList(imageId: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM army_list_images WHERE id = $1", [imageId]);
}

export async function updateArmyListPdf(listId: string, pdfPath: string | null): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE army_lists SET pdf_path = $1, updated_at = $2 WHERE id = $3`,
    [pdfPath, now(), listId]
  );
}

export async function getAllMiniaturesFlat(): Promise<(MiniatureWithDetails & { armyName: string; gameName: string })[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT m.*, a.name as army_name, g.name as game_name
     FROM miniatures m
     JOIN armies a ON a.id = m.army_id
     JOIN games g ON g.id = a.game_id
     ORDER BY g.name ASC, a.name ASC, m.name ASC`
  );
  const result: (MiniatureWithDetails & { armyName: string; gameName: string })[] = [];
  for (const r of rows) {
    const mapped = mapRow<MiniatureWithDetails & { armyName: string; gameName: string }>(r);
    const statusRows = await db.select<Record<string, unknown>[]>(
      "SELECT status_type FROM miniature_statuses WHERE miniature_id = $1",
      [mapped.id]
    );
    mapped.statuses = statusRows.map((sr) => String(Object.values(sr)[0]) as PaintStatusType);
    mapped.images = [];
    mapped.tags = [];
    mapped.paintingProcesses = [];
    result.push(mapped);
  }
  return result;
}

// ======================== PAINTS ========================

export async function getAllPaints(): Promise<Paint[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    "SELECT * FROM paints ORDER BY brand ASC, range ASC, name ASC"
  );
  return mapRows<Paint>(rows);
}

export async function searchPaints(query: string): Promise<Paint[]> {
  const db = await getDb();
  const pattern = `%${query}%`;
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT * FROM paints
     WHERE name LIKE $1 OR range LIKE $1 OR brand LIKE $1
     ORDER BY
       CASE WHEN name LIKE $2 THEN 0 ELSE 1 END,
       brand ASC, range ASC, name ASC
     LIMIT 100`,
    [pattern, `${query}%`]
  );
  return mapRows<Paint>(rows);
}

export async function getUserPaints(): Promise<UserPaint[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT up.*, p.name as paint_name, p.brand as paint_brand, p.range as paint_range, p.hex_color as paint_hex_color, p.is_metallic as paint_is_metallic
     FROM user_paints up
     JOIN paints p ON p.id = up.paint_id
     WHERE up.in_wishlist = 0
     ORDER BY p.range ASC, p.name ASC`
  );
  return rows.map((r) => {
    const up = mapRow<UserPaint & { paintName: string; paintBrand: string; paintRange: string; paintHexColor: string | null; paintIsMetallic: number }>(r);
    return {
      id: up.id,
      paintId: up.paintId,
      inWishlist: up.inWishlist,
      createdAt: up.createdAt,
      paint: {
        id: up.paintId,
        name: up.paintName,
        brand: up.paintBrand,
        range: up.paintRange as Paint["range"],
        hexColor: up.paintHexColor,
        isMetallic: Boolean(up.paintIsMetallic),
      },
    } as UserPaint;
  });
}

export async function getWishlistPaints(): Promise<UserPaint[]> {
  const db = await getDb();
  const rows = await db.select<Record<string, unknown>[]>(
    `SELECT up.*, p.name as paint_name, p.brand as paint_brand, p.range as paint_range, p.hex_color as paint_hex_color, p.is_metallic as paint_is_metallic
     FROM user_paints up
     JOIN paints p ON p.id = up.paint_id
     WHERE up.in_wishlist = 1
     ORDER BY p.range ASC, p.name ASC`
  );
  return rows.map((r) => {
    const up = mapRow<UserPaint & { paintName: string; paintBrand: string; paintRange: string; paintHexColor: string | null; paintIsMetallic: number }>(r);
    return {
      id: up.id,
      paintId: up.paintId,
      inWishlist: up.inWishlist,
      createdAt: up.createdAt,
      paint: {
        id: up.paintId,
        name: up.paintName,
        brand: up.paintBrand,
        range: up.paintRange as Paint["range"],
        hexColor: up.paintHexColor,
        isMetallic: Boolean(up.paintIsMetallic),
      },
    } as UserPaint;
  });
}

export async function addUserPaint(paintId: string, inWishlist: boolean): Promise<void> {
  const db = await getDb();
  const id = uuid();
  await db.execute(
    `INSERT OR IGNORE INTO user_paints (id, paint_id, in_wishlist, created_at) VALUES ($1, $2, $3, $4)`,
    [id, paintId, inWishlist ? 1 : 0, now()]
  );
}

export async function addUserPaints(paintIds: string[], inWishlist: boolean): Promise<void> {
  const db = await getDb();
  const timestamp = now();
  for (const paintId of paintIds) {
    const id = uuid();
    await db.execute(
      `INSERT OR IGNORE INTO user_paints (id, paint_id, in_wishlist, created_at) VALUES ($1, $2, $3, $4)`,
      [id, paintId, inWishlist ? 1 : 0, timestamp]
    );
  }
}

export async function removeUserPaint(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM user_paints WHERE id = $1", [id]);
}

export async function moveToWishlist(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE user_paints SET in_wishlist = 1 WHERE id = $1", [id]);
}

export async function moveToCollection(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE user_paints SET in_wishlist = 0 WHERE id = $1", [id]);
}
