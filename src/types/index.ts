// ============================================================
// Warhammer Vault - Core Data Types
// ============================================================

// ---------- Base ----------
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- Game System ----------
export interface Game extends BaseEntity {
  name: string;
  description: string;
  coverImage: string | null;
  icon: string | null;
  sortOrder: number;
  isCustom: boolean;
  startDate: string | null;
}

// ---------- Army / Faction ----------
export interface Army extends BaseEntity {
  gameId: string;
  name: string;
  description: string;
  coverImage: string | null;
  colorPrimary: string | null;
  colorSecondary: string | null;
  sortOrder: number;
  startDate: string | null;
}

export interface ArmyWithStats extends Army {
  game?: Game;
  totalMiniatures: number;
  totalPainted: number;
  completionPercentage: number;
}

// ---------- Miniature / Unit ----------
export type MiniatureCategory =
  | 'infantry'
  | 'character'
  | 'vehicle'
  | 'monster'
  | 'squad'
  | 'terrain'
  | 'other';

export interface Miniature extends BaseEntity {
  armyId: string;
  name: string;
  category: MiniatureCategory;
  quantity: number;
  paintedCount: number;
  notes: string;
  isFavorite: boolean;
  sortOrder: number;
  purchasedAt: string | null;
  purchasePrice: number | null;
  store: string | null;
}

export interface MiniatureWithDetails extends Miniature {
  army?: Army;
  game?: Game;
  statuses: PaintStatusType[];
  images: MiniatureImage[];
  tags: Tag[];
  paintingProcesses: PaintingProcess[];
}

// ---------- Paint Status ----------
export type PaintStatusType =
  | 'unassembled'
  | 'assembled'
  | 'primed'
  | 'wip'
  | 'painted'
  | 'based'
  | 'varnished';

export interface PaintStatus {
  id: string;
  name: string;
  type: PaintStatusType;
  color: string;
  icon: string;
  sortOrder: number;
}

// ---------- Painting Process ----------
export interface PaintingProcess extends BaseEntity {
  miniatureId: string;
  stepOrder: number;
  title: string;
  description: string;
  colorsUsed: string;
  media: PaintingProcessMedia[];
}

export type PaintingProcessMediaType = 'image' | 'video';

export interface PaintingProcessMedia extends BaseEntity {
  processId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  mediaType: PaintingProcessMediaType;
  sortOrder: number;
}

// ---------- Images ----------
export interface MiniatureImage extends BaseEntity {
  miniatureId: string;
  filePath: string;
  fileName: string;
  fileSize: number;
  width: number;
  height: number;
  thumbnailPath: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

// ---------- Tags ----------
export interface Tag extends BaseEntity {
  name: string;
  color: string;
}

export interface MiniatureTag {
  miniatureId: string;
  tagId: string;
}

// ---------- Army Lists ----------
export interface ArmyList extends BaseEntity {
  name: string;
  gameId: string | null;
  armyId: string | null;
  points: number;
  gameDate: string | null;
  notes: string;
  pdfPath: string | null;
}

export interface ArmyListWithDetails extends ArmyList {
  gameName: string | null;
  armyName: string | null;
  miniatures: ArmyListMiniature[];
  images: ArmyListImage[];
  totalMiniatures: number;
  paintedMiniatures: number;
  completionPercentage: number;
}

export interface ArmyListMiniature {
  id: string;
  listId: string;
  miniatureId: string;
  quantity: number;
  sortOrder: number;
  miniature?: MiniatureWithDetails;
}

export interface ArmyListImage {
  id: string;
  listId: string;
  filePath: string;
  fileName: string;
  createdAt: string;
}

export interface CreateArmyListDTO {
  name: string;
  gameId?: string | null;
  armyId?: string | null;
  points?: number;
  gameDate?: string | null;
  notes?: string;
}

// ---------- Dashboard Stats ----------
export interface DashboardStats {
  totalGames: number;
  totalArmies: number;
  totalMiniatures: number;
  totalPainted: number;
  completionPercentage: number;
  recentMiniatures: MiniatureWithDetails[];
  armyProgress: ArmyWithStats[];
  statusDistribution: { status: string; count: number }[];
}

// ---------- Form DTOs ----------
export interface CreateGameDTO {
  name: string;
  description?: string;
  coverImage?: string | null;
  icon?: string | null;
  startDate?: string | null;
}

export interface UpdateGameDTO extends Partial<CreateGameDTO> {
  id: string;
}

export interface CreateArmyDTO {
  gameId: string;
  name: string;
  description?: string;
  coverImage?: string | null;
  colorPrimary?: string | null;
  colorSecondary?: string | null;
  startDate?: string | null;
}

export interface UpdateArmyDTO extends Partial<CreateArmyDTO> {
  id: string;
}

export interface CreateMiniatureDTO {
  armyId: string;
  name: string;
  category: MiniatureCategory;
  quantity: number;
  paintedCount?: number;
  notes?: string;
  statuses: PaintStatusType[];
  tags?: string[];
  purchasedAt?: string | null;
  purchasePrice?: number | null;
  store?: string | null;
}

export interface UpdateMiniatureDTO extends Partial<CreateMiniatureDTO> {
  id: string;
}

export interface CreatePaintingProcessDTO {
  miniatureId: string;
  stepOrder: number;
  title: string;
  description?: string;
  colorsUsed?: string;
}

export interface UpdatePaintingProcessDTO {
  id: string;
  title?: string;
  description?: string;
  colorsUsed?: string;
  stepOrder?: number;
}

// ---------- Predefined Data ----------

// ---------- Paint Collection ----------
export type PaintRange =
  | 'Base'
  | 'Layer'
  | 'Shade'
  | 'Dry'
  | 'Edge'
  | 'Glaze'
  | 'Texture'
  | 'Technical'
  | 'Contrast'
  | 'Air'
  | 'Model Color'
  | 'Auxiliary';

export interface Paint {
  id: string;
  name: string;
  brand: string;
  range: PaintRange;
  hexColor: string | null;
  isMetallic: boolean;
}

export interface UserPaint {
  id: string;
  paintId: string;
  paint?: Paint;
  inWishlist: boolean;
  createdAt: string;
}

export const PAINT_STATUSES: PaintStatus[] = [
  {
    id: '1',
    name: 'Sin montar',
    type: 'unassembled',
    color: '#6b7280',
    icon: 'package',
    sortOrder: 0,
  },
  {
    id: '2',
    name: 'Montada',
    type: 'assembled',
    color: '#a78bfa',
    icon: 'wrench',
    sortOrder: 1,
  },
  {
    id: '3',
    name: 'Imprimada',
    type: 'primed',
    color: '#60a5fa',
    icon: 'droplets',
    sortOrder: 2,
  },
  {
    id: '4',
    name: 'En proceso',
    type: 'wip',
    color: '#fbbf24',
    icon: 'palette',
    sortOrder: 3,
  },
  {
    id: '5',
    name: 'Pintada',
    type: 'painted',
    color: '#34d399',
    icon: 'brush',
    sortOrder: 4,
  },
  {
    id: '6',
    name: 'Peana',
    type: 'based',
    color: '#f472b6',
    icon: 'mountain',
    sortOrder: 5,
  },
  {
    id: '7',
    name: 'Barnizada',
    type: 'varnished',
    color: '#c084fc',
    icon: 'sparkles',
    sortOrder: 6,
  },
];

/** Get the highest reached step from a list of active statuses */
export function getCurrentPaintStep(
  statuses: PaintStatusType[],
): PaintStatus | null {
  const active = PAINT_STATUSES.filter((s) => statuses.includes(s.type));
  return active.length > 0
    ? active.reduce((a, b) => (a.sortOrder > b.sortOrder ? a : b))
    : null;
}

/** Get the next step after the current highest */
export function getNextPaintStep(
  statuses: PaintStatusType[],
): PaintStatus | null {
  const current = getCurrentPaintStep(statuses);
  const nextOrder = current ? current.sortOrder + 1 : 0;
  return PAINT_STATUSES.find((s) => s.sortOrder === nextOrder) ?? null;
}

/** A miniature is complete when it has reached "Barnizada" (varnished) */
export function isMiniatureComplete(statuses: PaintStatusType[]): boolean {
  return statuses.includes('varnished');
}

/** Given a clicked step, return all steps up to and including it */
export function getStatusesUpTo(
  statusType: PaintStatusType,
): PaintStatusType[] {
  const target = PAINT_STATUSES.find((s) => s.type === statusType);
  if (!target) return [];
  return PAINT_STATUSES.filter((s) => s.sortOrder <= target.sortOrder).map(
    (s) => s.type,
  );
}

export const MINIATURE_CATEGORIES: {
  value: MiniatureCategory;
  label: string;
  icon: string;
}[] = [
  { value: 'infantry', label: 'Infantería', icon: 'users' },
  { value: 'character', label: 'Personaje', icon: 'crown' },
  { value: 'vehicle', label: 'Vehículo', icon: 'truck' },
  { value: 'monster', label: 'Monstruo', icon: 'skull' },
  { value: 'squad', label: 'Escuadra', icon: 'shield' },
  { value: 'terrain', label: 'Terreno', icon: 'mountain' },
  { value: 'other', label: 'Otro', icon: 'box' },
];

export interface PresetGame {
  name: string;
  description: string;
  image: string;
}

/** Global app configuration managed by the admin. */
export interface AppConfig {
  announcement: string;
  announcementEnabled: boolean;
  signupsEnabled: boolean;
}

export const PRESET_GAMES: PresetGame[] = [
  {
    name: 'Warhammer 40,000',
    description: 'In the grim darkness of the far future, there is only war.',
    image: '/games/warhammer-40k.webp',
  },
  {
    name: 'Warhammer Age of Sigmar',
    description: 'Epic battles in the Mortal Realms.',
    image: '/games/age-of-sigmar.webp',
  },
  {
    name: 'Necromunda',
    description: 'Gang warfare in the underhive.',
    image: '/games/necromunda.webp',
  },
  {
    name: 'Middle-earth SBG',
    description: "Battles in J.R.R. Tolkien's Middle-earth.",
    image: '/games/middle-earth.webp',
  },
];

// ---------- Preset Armies / Factions ----------
export interface PresetArmy {
  name: string;
  description: string;
  color: string;
}

/**
 * Admin-managed faction preset, stored globally in `army_presets`.
 * Each faction belongs to a game (by name) and has its own cover image.
 */
export interface ArmyPreset extends BaseEntity {
  gameName: string;
  name: string;
  description: string;
  color: string;
  image: string | null;
  sortOrder: number;
}

export interface CreateArmyPresetDTO {
  gameName: string;
  name: string;
  description?: string;
  color?: string;
  image?: string | null;
  sortOrder?: number;
}

export interface UpdateArmyPresetDTO {
  id: string;
  name?: string;
  description?: string;
  color?: string;
  image?: string | null;
  sortOrder?: number;
}

/**
 * Default selectable factions per game, keyed by the game name.
 * Used to speed up army creation with sensible defaults.
 */
export const PRESET_ARMIES: Record<string, PresetArmy[]> = {
  'Warhammer 40,000': [
    {
      name: 'Space Marines',
      description: 'Los Ángeles de la Muerte de la Humanidad.',
      color: '#1f4e79',
    },
    {
      name: 'Necrons',
      description: 'Dinastías inmortales de metal viviente.',
      color: '#3f9c5a',
    },
    {
      name: 'Orks',
      description: 'Hordas salvajes hambrientas de guerra.',
      color: '#4a6b1f',
    },
    {
      name: 'Chaos Space Marines',
      description: 'Traidores al servicio de los Dioses Oscuros.',
      color: '#7a1f2b',
    },
    {
      name: 'Tyranids',
      description: 'La Gran Devoradora de mundos.',
      color: '#5a2b6b',
    },
    {
      name: 'Astra Militarum',
      description: 'La incontable Guardia Imperial.',
      color: '#3a5f3a',
    },
    {
      name: 'Aeldari',
      description: 'La antigua y sofisticada raza élfica.',
      color: '#1f6b6b',
    },
    {
      name: "T'au Empire",
      description: 'La tecnología del Bien Supremo.',
      color: '#b5651d',
    },
  ],
  'Warhammer Age of Sigmar': [
    {
      name: 'Stormcast Eternals',
      description: 'Guerreros forjados por Sigmar.',
      color: '#c9a227',
    },
    {
      name: 'Nighthaunt',
      description: 'Legiones de espectros vengativos.',
      color: '#2f6b6b',
    },
    {
      name: 'Orruk Warclans',
      description: 'Pieles verdes brutales y feroces.',
      color: '#4a6b1f',
    },
    {
      name: 'Cities of Sigmar',
      description: 'Bastiones de civilización mortal.',
      color: '#3a5f7a',
    },
    {
      name: 'Maggotkin of Nurgle',
      description: 'Portadores de plagas del Dios de la Putrefacción.',
      color: '#6b6b2b',
    },
    {
      name: 'Lumineth Realm-lords',
      description: 'Aelfs del reino de la Luz.',
      color: '#c9a227',
    },
  ],
  Necromunda: [
    {
      name: 'House Escher',
      description: 'Guerreras letales y venenos mortales.',
      color: '#b5651d',
    },
    {
      name: 'House Goliath',
      description: 'Brutos musculosos y resistentes.',
      color: '#7a1f2b',
    },
    {
      name: 'House Orlock',
      description: 'La Casa del Hierro y las armas.',
      color: '#3a5f7a',
    },
    {
      name: 'House Van Saar',
      description: 'Tecnología arcana y precisión.',
      color: '#1f6b6b',
    },
    {
      name: 'House Delaque',
      description: 'Espías y agentes de las sombras.',
      color: '#2b2f45',
    },
    {
      name: 'House Cawdor',
      description: 'Fanáticos religiosos de los desechos.',
      color: '#6b5a2b',
    },
  ],
  'Middle-earth SBG': [
    {
      name: 'Gondor',
      description: 'El reino de los hombres del oeste.',
      color: '#3a5f7a',
    },
    {
      name: 'Rohan',
      description: 'Los Señores de los Caballos.',
      color: '#6b5a2b',
    },
    {
      name: 'Mordor',
      description: 'Las huestes del Ojo Oscuro.',
      color: '#2b2b2b',
    },
    {
      name: 'Isengard',
      description: 'Los Uruk-hai de Saruman.',
      color: '#4a4a4a',
    },
    {
      name: 'Rivendell',
      description: 'Los altos elfos de Imladris.',
      color: '#c9a227',
    },
    {
      name: 'The Fellowship',
      description: 'La Comunidad del Anillo.',
      color: '#3f9c5a',
    },
  ],
};
