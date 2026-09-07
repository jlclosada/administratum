import { PAINT_CATALOG, PAINT_CATALOG_BY_ID } from '@/data/paints';
import { supabase } from '@/lib/supabase';
import type {
  AppConfig,
  Army,
  ArmyList,
  ArmyListImage,
  ArmyListMiniature,
  ArmyListWithDetails,
  ArmyPreset,
  ArmyWithStats,
  CreateArmyDTO,
  CreateArmyListDTO,
  CreateArmyPresetDTO,
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
  UpdateArmyPresetDTO,
  UpdateGameDTO,
  UpdateMiniatureDTO,
  UserPaint,
} from '@/types';

// ======================== HELPERS ========================

function mapRow<T>(row: Record<string, unknown>): T {
  const mapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c: string) =>
      c.toUpperCase(),
    );
    mapped[camelKey] = value;
  }
  return mapped as T;
}

function mapRows<T>(rows: Record<string, unknown>[]): T[] {
  return rows.map((r) => mapRow<T>(r));
}

const STATUS_ORDER: PaintStatusType[] = [
  'unassembled',
  'assembled',
  'primed',
  'wip',
  'painted',
  'based',
  'varnished',
];

/** Aggregate quantity/painted counts per army. */
async function armyStats(
  armyIds: string[],
): Promise<Map<string, { total: number; painted: number }>> {
  const map = new Map<string, { total: number; painted: number }>();
  if (armyIds.length === 0) return map;
  const { data, error } = await supabase
    .from('miniatures')
    .select('army_id, quantity, painted_count')
    .in('army_id', armyIds);
  if (error) throw error;
  for (const row of (data ?? []) as Record<string, unknown>[]) {
    const armyId = String(row.army_id);
    const entry = map.get(armyId) ?? { total: 0, painted: 0 };
    entry.total += Number(row.quantity ?? 0);
    entry.painted += Number(row.painted_count ?? 0);
    map.set(armyId, entry);
  }
  return map;
}

async function hydrateProcessesWithMedia(
  processRows: Record<string, unknown>[],
): Promise<PaintingProcess[]> {
  if (processRows.length === 0) return [];
  const processes = mapRows<Omit<PaintingProcess, 'media'>>(processRows);
  return Promise.all(
    processes.map(async (p) => {
      const { data, error } = await supabase
        .from('painting_process_media')
        .select('*')
        .eq('process_id', p.id)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return {
        ...p,
        media: mapRows<PaintingProcessMedia>(data ?? []),
      } as PaintingProcess;
    }),
  );
}

// ======================== GAMES ========================

export async function getAllGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return mapRows<Game>(data ?? []);
}

export async function getGameById(id: string): Promise<Game | null> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow<Game>(data) : null;
}

export async function createGame(dto: CreateGameDTO): Promise<Game> {
  const { data, error } = await supabase
    .from('games')
    .insert({
      name: dto.name,
      description: dto.description ?? '',
      cover_image: dto.coverImage ?? null,
      icon: dto.icon ?? null,
      start_date: dto.startDate ?? null,
      is_custom: true,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Game>(data);
}

export async function updateGame(dto: UpdateGameDTO): Promise<Game> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.description !== undefined) payload.description = dto.description;
  if (dto.coverImage !== undefined) payload.cover_image = dto.coverImage;
  if (dto.icon !== undefined) payload.icon = dto.icon;
  if (dto.startDate !== undefined) payload.start_date = dto.startDate;

  const { data, error } = await supabase
    .from('games')
    .update(payload)
    .eq('id', dto.id)
    .select()
    .single();
  if (error) throw error;
  return mapRow<Game>(data);
}

export async function deleteGame(id: string): Promise<void> {
  const { error } = await supabase.from('games').delete().eq('id', id);
  if (error) throw error;
}

// ======================== ARMIES ========================

function applyArmyStats<T extends ArmyWithStats>(
  army: T,
  stats: Map<string, { total: number; painted: number }>,
): T {
  const s = stats.get(army.id) ?? { total: 0, painted: 0 };
  army.totalMiniatures = s.total;
  army.totalPainted = s.painted;
  army.completionPercentage =
    s.total > 0 ? Math.round((s.painted / s.total) * 100) : 0;
  return army;
}

export async function getAllArmies(): Promise<
  (ArmyWithStats & { gameName: string })[]
> {
  const { data, error } = await supabase.from('armies').select('*');
  if (error) throw error;
  const armies = mapRows<ArmyWithStats & { gameName: string }>(data ?? []);

  const games = await getAllGames();
  const gameNames = new Map(games.map((g) => [g.id, g.name]));
  const stats = await armyStats(armies.map((a) => a.id));

  return armies
    .map((a) => {
      a.gameName = gameNames.get(a.gameId) ?? '';
      return applyArmyStats(a, stats);
    })
    .sort(
      (a, b) =>
        a.gameName.localeCompare(b.gameName) || a.name.localeCompare(b.name),
    );
}

export async function getArmiesByGame(
  gameId: string,
): Promise<ArmyWithStats[]> {
  const { data, error } = await supabase
    .from('armies')
    .select('*')
    .eq('game_id', gameId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  const armies = mapRows<ArmyWithStats>(data ?? []);
  const stats = await armyStats(armies.map((a) => a.id));
  return armies.map((a) => applyArmyStats(a, stats));
}

export async function getArmyById(id: string): Promise<ArmyWithStats | null> {
  const { data, error } = await supabase
    .from('armies')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const army = mapRow<ArmyWithStats>(data);
  const stats = await armyStats([army.id]);
  return applyArmyStats(army, stats);
}

export async function createArmy(dto: CreateArmyDTO): Promise<Army> {
  const { data, error } = await supabase
    .from('armies')
    .insert({
      game_id: dto.gameId,
      name: dto.name,
      description: dto.description ?? '',
      cover_image: dto.coverImage ?? null,
      color_primary: dto.colorPrimary ?? null,
      color_secondary: dto.colorSecondary ?? null,
      start_date: dto.startDate ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Army>(data);
}

export async function updateArmy(dto: UpdateArmyDTO): Promise<Army> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.description !== undefined) payload.description = dto.description;
  if (dto.coverImage !== undefined) payload.cover_image = dto.coverImage;
  if (dto.colorPrimary !== undefined) payload.color_primary = dto.colorPrimary;
  if (dto.colorSecondary !== undefined)
    payload.color_secondary = dto.colorSecondary;
  if (dto.startDate !== undefined) payload.start_date = dto.startDate;

  const { data, error } = await supabase
    .from('armies')
    .update(payload)
    .eq('id', dto.id)
    .select()
    .single();
  if (error) throw error;
  return mapRow<Army>(data);
}

export async function deleteArmy(id: string): Promise<void> {
  const { error } = await supabase.from('armies').delete().eq('id', id);
  if (error) throw error;
}

// ======================== MINIATURES ========================

async function hydrateMiniature(m: Miniature): Promise<MiniatureWithDetails> {
  const [statusRes, imageRes, tagRes, processRes] = await Promise.all([
    supabase
      .from('miniature_statuses')
      .select('status_type')
      .eq('miniature_id', m.id),
    supabase
      .from('miniature_images')
      .select('*')
      .eq('miniature_id', m.id)
      .order('sort_order', { ascending: true }),
    supabase.from('miniature_tags').select('tags(*)').eq('miniature_id', m.id),
    supabase
      .from('painting_processes')
      .select('*')
      .eq('miniature_id', m.id)
      .order('step_order', { ascending: true }),
  ]);
  if (statusRes.error) throw statusRes.error;
  if (imageRes.error) throw imageRes.error;
  if (tagRes.error) throw tagRes.error;
  if (processRes.error) throw processRes.error;

  const tagRows = (tagRes.data ?? []).flatMap((r) => {
    const t = (r as unknown as { tags: unknown }).tags;
    if (Array.isArray(t)) return t as Record<string, unknown>[];
    return t ? [t as Record<string, unknown>] : [];
  });

  return {
    ...m,
    statuses: (statusRes.data ?? []).map((r) =>
      String((r as { status_type: string }).status_type),
    ) as PaintStatusType[],
    images: mapRows<MiniatureImage>(imageRes.data ?? []),
    tags: mapRows<Tag>(tagRows),
    paintingProcesses: await hydrateProcessesWithMedia(processRes.data ?? []),
  };
}

export async function getMiniaturesByArmy(
  armyId: string,
): Promise<MiniatureWithDetails[]> {
  const { data, error } = await supabase
    .from('miniatures')
    .select('*')
    .eq('army_id', armyId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  const miniatures = mapRows<Miniature>(data ?? []);
  return Promise.all(miniatures.map((m) => hydrateMiniature(m)));
}

export async function getMiniatureById(
  id: string,
): Promise<MiniatureWithDetails | null> {
  const { data, error } = await supabase
    .from('miniatures')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return hydrateMiniature(mapRow<Miniature>(data));
}

export async function createMiniature(
  dto: CreateMiniatureDTO,
): Promise<MiniatureWithDetails> {
  const { data, error } = await supabase
    .from('miniatures')
    .insert({
      army_id: dto.armyId,
      name: dto.name,
      category: dto.category,
      quantity: dto.quantity,
      painted_count: dto.paintedCount ?? 0,
      notes: dto.notes ?? '',
      purchased_at: dto.purchasedAt ?? null,
      purchase_price: dto.purchasePrice ?? null,
      store: dto.store ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  const id = String(data.id);

  if (dto.statuses.length > 0) {
    const { error: sErr } = await supabase
      .from('miniature_statuses')
      .insert(
        dto.statuses.map((status_type) => ({ miniature_id: id, status_type })),
      );
    if (sErr) throw sErr;
  }

  if (dto.tags && dto.tags.length > 0) {
    const { error: tErr } = await supabase
      .from('miniature_tags')
      .insert(dto.tags.map((tag_id) => ({ miniature_id: id, tag_id })));
    if (tErr) throw tErr;
  }

  return (await getMiniatureById(id))!;
}

export async function updateMiniature(
  dto: UpdateMiniatureDTO,
): Promise<MiniatureWithDetails> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.category !== undefined) payload.category = dto.category;
  if (dto.quantity !== undefined) payload.quantity = dto.quantity;
  if (dto.paintedCount !== undefined) payload.painted_count = dto.paintedCount;
  if (dto.notes !== undefined) payload.notes = dto.notes;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from('miniatures')
      .update(payload)
      .eq('id', dto.id);
    if (error) throw error;
  }

  if (dto.statuses) {
    await supabase
      .from('miniature_statuses')
      .delete()
      .eq('miniature_id', dto.id);
    if (dto.statuses.length > 0) {
      const { error } = await supabase.from('miniature_statuses').insert(
        dto.statuses.map((status_type) => ({
          miniature_id: dto.id,
          status_type,
        })),
      );
      if (error) throw error;
    }
  }

  if (dto.tags) {
    await supabase.from('miniature_tags').delete().eq('miniature_id', dto.id);
    if (dto.tags.length > 0) {
      const { error } = await supabase
        .from('miniature_tags')
        .insert(dto.tags.map((tag_id) => ({ miniature_id: dto.id, tag_id })));
      if (error) throw error;
    }
  }

  return (await getMiniatureById(dto.id))!;
}

export async function deleteMiniature(id: string): Promise<void> {
  const { error } = await supabase.from('miniatures').delete().eq('id', id);
  if (error) throw error;
}

export async function toggleFavorite(id: string): Promise<void> {
  const { data, error } = await supabase
    .from('miniatures')
    .select('is_favorite')
    .eq('id', id)
    .single();
  if (error) throw error;
  const { error: uErr } = await supabase
    .from('miniatures')
    .update({ is_favorite: !(data as { is_favorite: boolean }).is_favorite })
    .eq('id', id);
  if (uErr) throw uErr;
}

// ======================== PAINTING PROCESSES ========================

export async function addPaintingProcess(
  dto: CreatePaintingProcessDTO,
): Promise<PaintingProcess> {
  const { data, error } = await supabase
    .from('painting_processes')
    .insert({
      miniature_id: dto.miniatureId,
      step_order: dto.stepOrder,
      title: dto.title,
      description: dto.description ?? '',
      colors_used: dto.colorsUsed ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return {
    ...mapRow<Omit<PaintingProcess, 'media'>>(data),
    media: [],
  } as PaintingProcess;
}

export async function updatePaintingProcess(
  id: string,
  title: string,
  description: string,
  colorsUsed: string,
): Promise<void> {
  const { error } = await supabase
    .from('painting_processes')
    .update({ title, description, colors_used: colorsUsed })
    .eq('id', id);
  if (error) throw error;
}

export async function deletePaintingProcess(id: string): Promise<void> {
  const { error } = await supabase
    .from('painting_processes')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ======================== PAINTING PROCESS MEDIA ========================

export async function addPaintingProcessMedia(
  processId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
  mediaType: PaintingProcessMediaType,
): Promise<PaintingProcessMedia> {
  const { count } = await supabase
    .from('painting_process_media')
    .select('*', { count: 'exact', head: true })
    .eq('process_id', processId);

  const { data, error } = await supabase
    .from('painting_process_media')
    .insert({
      process_id: processId,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      media_type: mediaType,
      sort_order: count ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<PaintingProcessMedia>(data);
}

export async function deletePaintingProcessMedia(id: string): Promise<void> {
  const { error } = await supabase
    .from('painting_process_media')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ======================== IMAGES ========================

export async function addImage(
  miniatureId: string,
  filePath: string,
  fileName: string,
  fileSize: number,
): Promise<MiniatureImage> {
  const { count } = await supabase
    .from('miniature_images')
    .select('*', { count: 'exact', head: true })
    .eq('miniature_id', miniatureId);
  const imgCount = count ?? 0;

  const { data, error } = await supabase
    .from('miniature_images')
    .insert({
      miniature_id: miniatureId,
      file_path: filePath,
      file_name: fileName,
      file_size: fileSize,
      is_primary: imgCount === 0,
      sort_order: imgCount,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<MiniatureImage>(data);
}

export async function deleteImage(id: string): Promise<void> {
  const { error } = await supabase
    .from('miniature_images')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ======================== TAGS ========================

export async function getAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return mapRows<Tag>(data ?? []);
}

export async function createTag(name: string, color: string): Promise<Tag> {
  const { data, error } = await supabase
    .from('tags')
    .insert({ name, color })
    .select()
    .single();
  if (error) throw error;
  return mapRow<Tag>(data);
}

// ======================== GALLERY ========================

export async function getAllImages(): Promise<
  (MiniatureImage & { miniatureName: string })[]
> {
  const { data, error } = await supabase
    .from('miniature_images')
    .select('*, miniatures(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown> & {
      miniatures: { name: string } | null;
    };
    const mapped = mapRow<MiniatureImage & { miniatureName: string }>(row);
    mapped.miniatureName = row.miniatures?.name ?? '';
    return mapped;
  });
}

export async function getImagesByArmy(
  armyId: string,
): Promise<(MiniatureImage & { miniatureName: string })[]> {
  const { data, error } = await supabase
    .from('miniature_images')
    .select('*, miniatures!inner(name, army_id)')
    .eq('miniatures.army_id', armyId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as Record<string, unknown> & {
      miniatures: { name: string } | null;
    };
    const mapped = mapRow<MiniatureImage & { miniatureName: string }>(row);
    mapped.miniatureName = row.miniatures?.name ?? '';
    return mapped;
  });
}

// ======================== DASHBOARD ========================

export async function getDashboardStats(): Promise<DashboardStats> {
  const [gamesRes, armiesRes, minisRes, statusRes, recentRes] =
    await Promise.all([
      supabase.from('games').select('*', { count: 'exact', head: true }),
      supabase.from('armies').select('*'),
      supabase
        .from('miniatures')
        .select('id, army_id, quantity, painted_count'),
      supabase.from('miniature_statuses').select('miniature_id, status_type'),
      supabase
        .from('miniatures')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(5),
    ]);
  if (armiesRes.error) throw armiesRes.error;
  if (minisRes.error) throw minisRes.error;
  if (statusRes.error) throw statusRes.error;
  if (recentRes.error) throw recentRes.error;

  const miniRows = (minisRes.data ?? []) as Record<string, unknown>[];
  const totalMinis = miniRows.reduce(
    (sum, m) => sum + Number(m.quantity ?? 0),
    0,
  );
  const totalPaint = miniRows.reduce(
    (sum, m) => sum + Number(m.painted_count ?? 0),
    0,
  );

  // Highest status per miniature -> distribution
  const highestByMini = new Map<string, PaintStatusType>();
  for (const row of (statusRes.data ?? []) as Record<string, unknown>[]) {
    const miniId = String(row.miniature_id);
    const status = String(row.status_type) as PaintStatusType;
    const current = highestByMini.get(miniId);
    if (
      !current ||
      STATUS_ORDER.indexOf(status) > STATUS_ORDER.indexOf(current)
    ) {
      highestByMini.set(miniId, status);
    }
  }
  const distCounts = new Map<string, number>();
  for (const status of highestByMini.values()) {
    distCounts.set(status, (distCounts.get(status) ?? 0) + 1);
  }
  const statusDistribution = Array.from(distCounts.entries())
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count);

  // Army progress
  const armies = mapRows<ArmyWithStats>(armiesRes.data ?? []);
  const stats = new Map<string, { total: number; painted: number }>();
  for (const m of miniRows) {
    const armyId = String(m.army_id);
    const entry = stats.get(armyId) ?? { total: 0, painted: 0 };
    entry.total += Number(m.quantity ?? 0);
    entry.painted += Number(m.painted_count ?? 0);
    stats.set(armyId, entry);
  }
  const armyProgress = armies
    .map((a) => applyArmyStats(a, stats))
    .sort((a, b) => a.name.localeCompare(b.name));

  const recentMiniatures = (
    await Promise.all(
      (recentRes.data ?? []).map(async (r) => {
        try {
          return await getMiniatureById(String((r as { id: string }).id));
        } catch {
          return null;
        }
      }),
    )
  ).filter((m): m is MiniatureWithDetails => m !== null);

  return {
    totalGames: gamesRes.count ?? 0,
    totalArmies: (armiesRes.data ?? []).length,
    totalMiniatures: totalMinis,
    totalPainted: totalPaint,
    completionPercentage:
      totalMinis > 0 ? Math.round((totalPaint / totalMinis) * 100) : 0,
    recentMiniatures,
    armyProgress,
    statusDistribution,
  };
}

// ======================== ARMY LISTS ========================

async function hydrateArmyList(
  raw: Record<string, unknown> & {
    games?: { name: string } | null;
    armies?: { name: string } | null;
  },
): Promise<ArmyListWithDetails> {
  const mapped = mapRow<
    ArmyList & { gameName: string | null; armyName: string | null }
  >(raw);
  mapped.gameName = raw.games?.name ?? null;
  mapped.armyName = raw.armies?.name ?? null;

  const minis = await getArmyListMiniatures(mapped.id);
  const images = await getArmyListImages(mapped.id);
  const totalMiniatures = minis.reduce((sum, m) => sum + m.quantity, 0);
  const paintedMiniatures = minis
    .filter((m) =>
      m.miniature?.statuses?.some((s) =>
        ['painted', 'based', 'varnished'].includes(s),
      ),
    )
    .reduce((sum, m) => sum + m.quantity, 0);
  return {
    ...mapped,
    miniatures: minis,
    images,
    totalMiniatures,
    paintedMiniatures,
    completionPercentage:
      totalMiniatures > 0
        ? Math.round((paintedMiniatures / totalMiniatures) * 100)
        : 0,
  };
}

export async function getAllArmyLists(): Promise<ArmyListWithDetails[]> {
  const { data, error } = await supabase
    .from('army_lists')
    .select('*, games(name), armies(name)')
    .order('created_at', { ascending: false });
  if (error) throw error;
  const lists: ArmyListWithDetails[] = [];
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    lists.push(await hydrateArmyList(r));
  }
  return lists;
}

export async function getArmyListById(
  id: string,
): Promise<ArmyListWithDetails | null> {
  const { data, error } = await supabase
    .from('army_lists')
    .select('*, games(name), armies(name)')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return hydrateArmyList(data as Record<string, unknown>);
}

export async function createArmyList(
  dto: CreateArmyListDTO,
): Promise<ArmyListWithDetails> {
  const { data, error } = await supabase
    .from('army_lists')
    .insert({
      name: dto.name,
      game_id: dto.gameId ?? null,
      army_id: dto.armyId ?? null,
      points: dto.points ?? 0,
      game_date: dto.gameDate ?? null,
      notes: dto.notes ?? '',
    })
    .select()
    .single();
  if (error) throw error;
  return (await getArmyListById(String(data.id)))!;
}

export async function updateArmyList(
  id: string,
  dto: Partial<CreateArmyListDTO>,
): Promise<ArmyListWithDetails> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.gameId !== undefined) payload.game_id = dto.gameId;
  if (dto.armyId !== undefined) payload.army_id = dto.armyId;
  if (dto.points !== undefined) payload.points = dto.points;
  if (dto.gameDate !== undefined) payload.game_date = dto.gameDate;
  if (dto.notes !== undefined) payload.notes = dto.notes;

  if (Object.keys(payload).length > 0) {
    const { error } = await supabase
      .from('army_lists')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
  }
  return (await getArmyListById(id))!;
}

export async function deleteArmyList(id: string): Promise<void> {
  const { error } = await supabase.from('army_lists').delete().eq('id', id);
  if (error) throw error;
}

export async function addMiniatureToList(
  listId: string,
  miniatureId: string,
  quantity: number,
): Promise<void> {
  const { count } = await supabase
    .from('army_list_miniatures')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', listId);
  const { error } = await supabase.from('army_list_miniatures').insert({
    list_id: listId,
    miniature_id: miniatureId,
    quantity,
    sort_order: count ?? 0,
  });
  if (error) throw error;
}

export async function removeMiniatureFromList(id: string): Promise<void> {
  const { error } = await supabase
    .from('army_list_miniatures')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

async function getArmyListMiniatures(
  listId: string,
): Promise<ArmyListMiniature[]> {
  const { data, error } = await supabase
    .from('army_list_miniatures')
    .select('*')
    .eq('list_id', listId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  const result: ArmyListMiniature[] = [];
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const mapped = mapRow<ArmyListMiniature>(r);
    const mini = await getMiniatureById(mapped.miniatureId);
    result.push({ ...mapped, miniature: mini ?? undefined });
  }
  return result;
}

async function getArmyListImages(listId: string): Promise<ArmyListImage[]> {
  const { data, error } = await supabase
    .from('army_list_images')
    .select('*')
    .eq('list_id', listId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return mapRows<ArmyListImage>(data ?? []);
}

export async function addImageToList(
  listId: string,
  filePath: string,
  fileName: string,
): Promise<void> {
  const { error } = await supabase
    .from('army_list_images')
    .insert({ list_id: listId, file_path: filePath, file_name: fileName });
  if (error) throw error;
}

export async function removeImageFromList(imageId: string): Promise<void> {
  const { error } = await supabase
    .from('army_list_images')
    .delete()
    .eq('id', imageId);
  if (error) throw error;
}

export async function updateArmyListPdf(
  listId: string,
  pdfPath: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('army_lists')
    .update({ pdf_path: pdfPath })
    .eq('id', listId);
  if (error) throw error;
}

export async function getAllMiniaturesFlat(): Promise<
  (MiniatureWithDetails & { armyName: string; gameName: string })[]
> {
  const { data, error } = await supabase
    .from('miniatures')
    .select('*, armies!inner(name, game_id, games!inner(name))');
  if (error) throw error;

  const result: (MiniatureWithDetails & {
    armyName: string;
    gameName: string;
  })[] = [];
  for (const r of (data ?? []) as Record<string, unknown>[]) {
    const armies = r.armies as {
      name: string;
      games: { name: string } | null;
    } | null;
    const mapped = mapRow<
      MiniatureWithDetails & { armyName: string; gameName: string }
    >(r);
    mapped.armyName = armies?.name ?? '';
    mapped.gameName = armies?.games?.name ?? '';

    const { data: statusData } = await supabase
      .from('miniature_statuses')
      .select('status_type')
      .eq('miniature_id', mapped.id);
    mapped.statuses = (statusData ?? []).map(
      (sr) =>
        String((sr as { status_type: string }).status_type) as PaintStatusType,
    );
    mapped.images = [];
    mapped.tags = [];
    mapped.paintingProcesses = [];
    result.push(mapped);
  }
  result.sort(
    (a, b) =>
      a.gameName.localeCompare(b.gameName) ||
      a.armyName.localeCompare(b.armyName) ||
      a.name.localeCompare(b.name),
  );
  return result;
}

// ======================== PAINTS (static catalog) ========================

export async function getAllPaints(): Promise<Paint[]> {
  return [...PAINT_CATALOG].sort(
    (a, b) =>
      a.brand.localeCompare(b.brand) ||
      a.range.localeCompare(b.range) ||
      a.name.localeCompare(b.name),
  );
}

export async function searchPaints(query: string): Promise<Paint[]> {
  const q = query.toLowerCase().trim();
  if (!q) return getAllPaints();
  return PAINT_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.range.toLowerCase().includes(q) ||
      p.brand.toLowerCase().includes(q),
  )
    .sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      return (
        aStarts - bStarts ||
        a.brand.localeCompare(b.brand) ||
        a.range.localeCompare(b.range) ||
        a.name.localeCompare(b.name)
      );
    })
    .slice(0, 100);
}

function hydrateUserPaint(row: Record<string, unknown>): UserPaint {
  const up = mapRow<UserPaint>(row);
  return {
    id: up.id,
    paintId: up.paintId,
    inWishlist: up.inWishlist,
    createdAt: up.createdAt,
    paint: PAINT_CATALOG_BY_ID.get(up.paintId),
  };
}

export async function getUserPaints(): Promise<UserPaint[]> {
  const { data, error } = await supabase
    .from('user_paints')
    .select('*')
    .eq('in_wishlist', false);
  if (error) throw error;
  return (data ?? [])
    .map((r) => hydrateUserPaint(r as Record<string, unknown>))
    .filter((up) => up.paint)
    .sort(
      (a, b) =>
        a.paint!.range.localeCompare(b.paint!.range) ||
        a.paint!.name.localeCompare(b.paint!.name),
    );
}

export async function getWishlistPaints(): Promise<UserPaint[]> {
  const { data, error } = await supabase
    .from('user_paints')
    .select('*')
    .eq('in_wishlist', true);
  if (error) throw error;
  return (data ?? [])
    .map((r) => hydrateUserPaint(r as Record<string, unknown>))
    .filter((up) => up.paint)
    .sort(
      (a, b) =>
        a.paint!.range.localeCompare(b.paint!.range) ||
        a.paint!.name.localeCompare(b.paint!.name),
    );
}

export async function addUserPaint(
  paintId: string,
  inWishlist: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('user_paints')
    .upsert(
      { paint_id: paintId, in_wishlist: inWishlist },
      { onConflict: 'user_id,paint_id,in_wishlist', ignoreDuplicates: true },
    );
  if (error) throw error;
}

export async function addUserPaints(
  paintIds: string[],
  inWishlist: boolean,
): Promise<void> {
  if (paintIds.length === 0) return;
  const { error } = await supabase.from('user_paints').upsert(
    paintIds.map((paint_id) => ({ paint_id, in_wishlist: inWishlist })),
    { onConflict: 'user_id,paint_id,in_wishlist', ignoreDuplicates: true },
  );
  if (error) throw error;
}

export async function removeUserPaint(id: string): Promise<void> {
  const { error } = await supabase.from('user_paints').delete().eq('id', id);
  if (error) throw error;
}

export async function moveToWishlist(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_paints')
    .update({ in_wishlist: true })
    .eq('id', id);
  if (error) throw error;
}

export async function moveToCollection(id: string): Promise<void> {
  const { error } = await supabase
    .from('user_paints')
    .update({ in_wishlist: false })
    .eq('id', id);
  if (error) throw error;
}

// ======================== APP CONFIG (ADMIN) ========================

const DEFAULT_APP_CONFIG: AppConfig = {
  announcement: '',
  announcementEnabled: false,
  signupsEnabled: true,
};

/**
 * Read the global app configuration. Degrades gracefully to defaults if the
 * `app_config` table has not been created yet.
 */
export async function getAppConfig(): Promise<AppConfig> {
  try {
    const { data, error } = await supabase
      .from('app_config')
      .select('announcement, announcement_enabled, signups_enabled')
      .eq('id', 'global')
      .maybeSingle();
    if (error || !data) return DEFAULT_APP_CONFIG;
    return { ...DEFAULT_APP_CONFIG, ...mapRow<AppConfig>(data) };
  } catch {
    return DEFAULT_APP_CONFIG;
  }
}

/** Update the global app configuration (admin only, enforced by RLS). */
export async function updateAppConfig(config: AppConfig): Promise<void> {
  const { error } = await supabase.from('app_config').upsert({
    id: 'global',
    announcement: config.announcement,
    announcement_enabled: config.announcementEnabled,
    signups_enabled: config.signupsEnabled,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

// ======================== ARMY PRESETS (ADMIN) ========================

/**
 * List admin-managed faction presets. Optionally filter by game name.
 * Degrades to an empty list if the `army_presets` table does not exist yet.
 */
export async function getArmyPresets(gameName?: string): Promise<ArmyPreset[]> {
  try {
    let query = supabase
      .from('army_presets')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });
    if (gameName) query = query.eq('game_name', gameName);
    const { data, error } = await query;
    if (error || !data) return [];
    return mapRows<ArmyPreset>(data);
  } catch {
    return [];
  }
}

export async function createArmyPreset(
  dto: CreateArmyPresetDTO,
): Promise<ArmyPreset> {
  const { data, error } = await supabase
    .from('army_presets')
    .insert({
      game_name: dto.gameName,
      name: dto.name,
      description: dto.description ?? '',
      color: dto.color ?? '#8b5cf6',
      image: dto.image ?? null,
      sort_order: dto.sortOrder ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return mapRow<ArmyPreset>(data);
}

export async function updateArmyPreset(
  dto: UpdateArmyPresetDTO,
): Promise<ArmyPreset> {
  const payload: Record<string, unknown> = {};
  if (dto.name !== undefined) payload.name = dto.name;
  if (dto.description !== undefined) payload.description = dto.description;
  if (dto.color !== undefined) payload.color = dto.color;
  if (dto.image !== undefined) payload.image = dto.image;
  if (dto.sortOrder !== undefined) payload.sort_order = dto.sortOrder;

  const { data, error } = await supabase
    .from('army_presets')
    .update(payload)
    .eq('id', dto.id)
    .select()
    .single();
  if (error) throw error;
  return mapRow<ArmyPreset>(data);
}

export async function deleteArmyPreset(id: string): Promise<void> {
  const { error } = await supabase.from('army_presets').delete().eq('id', id);
  if (error) throw error;
}
