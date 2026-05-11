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
  | "infantry"
  | "character"
  | "vehicle"
  | "monster"
  | "squad"
  | "terrain"
  | "other";

export interface Miniature extends BaseEntity {
  armyId: string;
  name: string;
  category: MiniatureCategory;
  quantity: number;
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
  | "unassembled"
  | "assembled"
  | "primed"
  | "wip"
  | "painted"
  | "based"
  | "varnished";

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

// ---------- Predefined Data ----------
export const PAINT_STATUSES: PaintStatus[] = [
  { id: "1", name: "Sin montar", type: "unassembled", color: "#6b7280", icon: "package", sortOrder: 0 },
  { id: "2", name: "Montada", type: "assembled", color: "#a78bfa", icon: "wrench", sortOrder: 1 },
  { id: "3", name: "Imprimada", type: "primed", color: "#60a5fa", icon: "droplets", sortOrder: 2 },
  { id: "4", name: "En proceso", type: "wip", color: "#fbbf24", icon: "palette", sortOrder: 3 },
  { id: "5", name: "Pintada", type: "painted", color: "#34d399", icon: "brush", sortOrder: 4 },
  { id: "6", name: "Basada", type: "based", color: "#f472b6", icon: "mountain", sortOrder: 5 },
  { id: "7", name: "Barnizada", type: "varnished", color: "#c084fc", icon: "sparkles", sortOrder: 6 },
];

export const MINIATURE_CATEGORIES: { value: MiniatureCategory; label: string; icon: string }[] = [
  { value: "infantry", label: "Infantería", icon: "users" },
  { value: "character", label: "Personaje", icon: "crown" },
  { value: "vehicle", label: "Vehículo", icon: "truck" },
  { value: "monster", label: "Monstruo", icon: "skull" },
  { value: "squad", label: "Escuadra", icon: "shield" },
  { value: "terrain", label: "Terreno", icon: "mountain" },
  { value: "other", label: "Otro", icon: "box" },
];

export interface PresetGame {
  name: string;
  description: string;
  image: string;
}

export const PRESET_GAMES: PresetGame[] = [
  { name: "Warhammer 40,000", description: "In the grim darkness of the far future, there is only war.", image: "/games/warhammer-40k.webp" },
  { name: "Warhammer Age of Sigmar", description: "Epic battles in the Mortal Realms.", image: "/games/age-of-sigmar.webp" },
  { name: "Necromunda", description: "Gang warfare in the underhive.", image: "/games/necromunda.webp" },
  { name: "Middle-earth SBG", description: "Battles in J.R.R. Tolkien's Middle-earth.", image: "/games/middle-earth.webp" },
];
