// ============================================================
// Warhammer Vault - Core Data Types
// ============================================================

import type { ParsedArmyList } from '@/lib/armyListParser';

// ---------- Base ----------
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ---------- User profile ----------
/** Public personalization data for a user (avatar, bio, ...) — separate from Supabase auth metadata. */
export interface Profile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string;
  location: string;
  favoriteFaction: string | null;
  website: string | null;
  links: ProfileLink[];
  role: UserRole;
  /** Accepts news and reminder emails (only on the user's own profile). */
  emailUpdates?: boolean;
  /** Finished or skipped the welcome wizard; null for a brand-new account. */
  onboardedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'user' | 'admin';

export interface ProfileLink {
  label: string;
  url: string;
}

export interface UpdateProfileDTO {
  displayName?: string;
  /** News and reminder emails (Ajustes). */
  emailUpdates?: boolean;
  avatarUrl?: string | null;
  bio?: string;
  location?: string;
  favoriteFaction?: string | null;
  website?: string | null;
  links?: ProfileLink[];
  /** Marks the welcome wizard as done. */
  onboarded?: boolean;
}

export interface ProfileStats {
  friends: number;
  photos: number;
  guides: number;
  lists: number;
}

// ---------- Community: shared army lists ----------
export interface CommunityList extends BaseEntity {
  userId: string;
  authorName: string;
  title: string;
  factionName: string;
  totalPoints: number;
  /** The author's explanation of the list (at least 20 characters). */
  description: string;
  detachmentName: string | null;
  listData: ParsedArmyList;
  /** Tournament result as "V-D-E", when the author played it in one. */
  result: string | null;
  /** Tournament it was played at, when it's one listed on the site. */
  tournamentId: string | null;
  /** Tournament name (listed or free text), for display and search. */
  tournamentName: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
}

export interface CreateCommunityListDTO {
  title: string;
  factionName: string;
  totalPoints: number;
  description: string;
  detachmentName?: string | null;
  listData: ParsedArmyList;
  result?: string | null;
  tournamentId?: string | null;
  tournamentName?: string | null;
}

export type UpdateCommunityListDTO = Partial<CreateCommunityListDTO> & { id: string };

/** Platform-wide counters for the admin dashboard (admin_overview RPC). */
export interface AdminOverview {
  users: number;
  users_7d: number;
  admins: number;
  photos: number;
  photos_7d: number;
  lists: number;
  lists_7d: number;
  featured_lists: number;
  comments_7d: number;
  likes_7d: number;
  tournaments_active: number;
  attendees: number;
  tournaments_without_rules: number;
  articles: number;
  drafts: number;
  guides: number;
  ads_active: number;
}

/** Row of the admin user directory (admin_list_users RPC). */
export interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: UserRole;
  isSuperadmin: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

// ---------- Social ----------
export type FriendshipStatus = 'pending' | 'accepted';

export interface Friendship extends BaseEntity {
  requesterId: string;
  addresseeId: string;
  status: FriendshipStatus;
}

export type NotificationType =
  | 'friend_request'
  | 'friend_accepted'
  | 'like'
  | 'comment'
  | 'comment_like'
  | 'team_invite'
  | 'team_joined'
  | 'match_joined'
  | 'match_left'
  | 'match_cancelled'
  | 'match_invite';

/** In-app notification, written by database triggers for the recipient. */
export interface AppNotification {
  id: string;
  userId: string;
  actorId: string | null;
  type: NotificationType;
  /** What the notification links to. */
  targetType: 'article' | 'guide' | 'photo' | 'list' | 'team' | 'match' | null;
  targetId: string | null;
  /** Title of the liked item, or the text of the comment. */
  excerpt: string;
  readAt: string | null;
  createdAt: string;
}

/** Friendship from the current user's point of view, with the other person's profile. */
export interface FriendEntry {
  friendship: Friendship;
  other: Profile;
  /** True when the current user sent the (pending) request. */
  outgoing: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  recipientId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface Conversation {
  other: Profile;
  lastMessage: Message | null;
  unread: number;
}

// ---------- Advertising ----------
export type AdPosition = 'left' | 'right';

export interface Ad extends BaseEntity {
  title: string;
  image: string;
  url: string;
  position: AdPosition;
  sortOrder: number;
  active: boolean;
}

export interface CreateAdDTO {
  title?: string;
  image: string;
  url: string;
  position: AdPosition;
  sortOrder?: number;
  active?: boolean;
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
  totalPoints: number;
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
  catalogUnitId?: string | null;
  pointsSnapshot?: CatalogPricingTier[] | null;
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

export interface CatalogCostOption {
  models: number;
  points: number;
  desc?: string;
  addon?: boolean;
}

export interface CatalogPricingTier {
  range?: string;
  label: string;
  costs: CatalogCostOption[];
}

/** Global datasheet from the Munitorum Field Manual. */
export interface UnitCatalogEntry extends BaseEntity {
  gameName: string;
  factionSlug: string;
  factionName: string;
  name: string;
  category: MiniatureCategory;
  groupTitle: string | null;
  pricing: CatalogPricingTier[];
  wargear: { item: string; points: number }[];
  leaderTo: string[];
  supportTo: string[];
  legends: boolean;
  defaultQuantity: number;
  mfmVersion: string | null;
}

export interface DetachmentEnhancement {
  name: string;
  points: number;
  leaderTo?: string[];
  supportTo?: string[];
}

/** A single detachment (army-building rule set) for a faction, from the MFM. */
export interface Detachment {
  name: string;
  /** Detachment points cost, when the MFM lists one (null for most detachments). */
  dp: number | null;
  objectives: string[];
  /** Name of the detachment's unique rule, when the MFM names one. */
  unique?: string;
  enhancements: DetachmentEnhancement[];
}

/** Per-faction reference data from the Munitorum Field Manual: art + detachments. */
export interface FactionCatalogEntry extends BaseEntity {
  gameName: string;
  factionSlug: string;
  factionName: string;
  image: string | null;
  parentFaction: string | null;
  detachments: Detachment[];
  mfmVersion: string | null;
}

/** A downloadable PDF mirrored from Warhammer Community's downloads page. */
export interface DownloadEntry extends BaseEntity {
  gameName: string;
  slug: string;
  title: string;
  category: string;
  fileUrl: string;
  fileSize: string | null;
  thumbnail: string | null;
  topics: string[];
  sourceUpdatedAt: string | null;
  isNew: boolean;
}

/** An entry in the "Últimos updates" feed — a detected points or download change. */
export interface CatalogUpdate extends BaseEntity {
  gameName: string;
  type: 'points' | 'download';
  title: string;
  description: string;
  link: string | null;
  occurredAt: string;
  /** Structured point change for 'points' updates; null on older rows. */
  pointsBefore?: number | null;
  pointsAfter?: number | null;
  pointsDelta?: number | null;
}

/** "Miniatura del mes" — the admin publishes one, the home page shows the latest. */
export interface MiniatureSpotlight extends BaseEntity {
  title: string;
  gameName: string | null;
  factionName: string | null;
  painterName: string | null;
  description: string;
  image: string | null;
}

export type TournamentStatus = 'upcoming' | 'ongoing' | 'finished';

export interface Tournament extends BaseEntity {
  name: string;
  gameName: string | null;
  description: string;
  coverImage: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  status: TournamentStatus;
  externalLink: string | null;
  published: boolean;
  /** Tournament rules ("bases") as TipTap JSON. */
  rules: RichContent;
  pointsLimit: number | null;
  maxPlayers: number | null;
  entryFee: string | null;
  /** Club, shop or association running it. */
  organizer: string | null;
  /** Sign-ups closed (shown instead of the "Inscribirse" button). */
  registrationClosed: boolean;
  /** Users who pressed "Asistiré" (kept in sync by a trigger). */
  attendeeCount: number;
}

/** Admin-authored public showcase list — not a real user's private army list. */
export interface FeaturedList extends BaseEntity {
  title: string;
  gameName: string | null;
  factionName: string | null;
  totalPoints: number | null;
  authorName: string;
  description: string;
  coverImage: string | null;
  published: boolean;
  /** Parsed army-list export; null for lists created before this existed. */
  listData: ParsedArmyList | null;
  /** Tournament result as "V-D-E". */
  result: string | null;
  tournamentName: string | null;
}

export type LikeTargetType = 'article' | 'guide' | 'comment' | 'photo' | 'list';
export type CommentTargetType = 'article' | 'guide' | 'photo' | 'list';

export interface Comment extends BaseEntity {
  userId: string;
  authorName: string;
  targetType: CommentTargetType;
  targetId: string;
  content: string;
  likeCount: number;
  /** Populated client-side from the current user's own likes — not a DB column. */
  likedByMe?: boolean;
}

export interface CreateCommentDTO {
  targetType: CommentTargetType;
  targetId: string;
  content: string;
}

/** A user-shared photo of their collection — always public, shown on the home feed. */
export interface SharedPhoto extends BaseEntity {
  userId: string;
  authorName: string;
  image: string;
  /** Short title shown under the image; `caption` is the longer description. */
  title: string;
  caption: string;
  gameName: string | null;
  armyName: string | null;
  likeCount: number;
  commentCount: number;
  /** Populated client-side from the current user's own likes — not a DB column. */
  likedByMe?: boolean;
  /** Populated client-side from the current user's saved posts. */
  savedByMe?: boolean;
}

export interface CreateSharedPhotoDTO {
  image: string;
  title?: string;
  caption?: string;
  gameName?: string | null;
  armyName?: string | null;
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
  catalogUnitId?: string | null;
  pointsSnapshot?: CatalogPricingTier[] | null;
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

export function getMiniatureStatusSummary(statuses: PaintStatusType[]): {
  complete: boolean;
  inProgress: boolean;
  label: string;
} {
  const complete = isMiniatureComplete(statuses);
  const current = getCurrentPaintStep(statuses);
  if (complete) {
    return { complete: true, inProgress: false, label: 'Barnizada · Completada' };
  }
  if (current?.type === 'wip') {
    return { complete: false, inProgress: true, label: 'En proceso' };
  }
  if (current) {
    return {
      complete: false,
      inProgress: current.sortOrder >= 3,
      label: current.name,
    };
  }
  return { complete: false, inProgress: false, label: 'Sin empezar' };
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


/** Global app configuration managed by the admin. */
export interface AppConfig {
  announcement: string;
  announcementEnabled: boolean;
  signupsEnabled: boolean;
  /** Daily "te echamos de menos" email to inactive users (Admin → Correos). */
  reengagementEnabled: boolean;
  reengagementDays: number;
  reengagementCooldownDays: number;
  /** Email everyone automatically when the official points change. */
  pointsEmailEnabled: boolean;
}

/** A sent email campaign, as logged by /api/email. */
export interface EmailCampaign {
  id: string;
  kind: 'manual' | 'automatic' | 'test';
  template: string;
  subject: string;
  audience: string;
  recipients: number;
  sent: number;
  failed: number;
  error: string | null;
  createdAt: string;
}

/** External address that agreed to receive Administratum emails. */
export interface EmailContact {
  email: string;
  /** How and when they gave consent (kept as proof, GDPR art. 7.1). */
  source: string;
  createdAt: string;
  /** 'usuario': has since signed up and follows their own preferences. */
  status: 'activo' | 'baja' | 'usuario';
}

export type EmailContactAddStatus = 'añadido' | 'existente' | 'usuario' | 'baja' | 'inválido';

// ---------- Community: Articles (admin news) ----------
/** Rich-text document stored as TipTap JSON. */
export type RichContent = Record<string, unknown> | null;

export interface Article extends BaseEntity {
  authorId: string | null;
  title: string;
  excerpt: string;
  content: RichContent;
  coverImage: string | null;
  tags: string[];
  published: boolean;
  likeCount: number;
}

export interface CreateArticleDTO {
  title: string;
  excerpt?: string;
  content?: RichContent;
  coverImage?: string | null;
  tags?: string[];
  published?: boolean;
}

export interface UpdateArticleDTO {
  id: string;
  title?: string;
  excerpt?: string;
  content?: RichContent;
  coverImage?: string | null;
  tags?: string[];
  published?: boolean;
}

export interface CreateMiniatureSpotlightDTO {
  title: string;
  gameName?: string | null;
  factionName?: string | null;
  painterName?: string | null;
  description?: string;
  image?: string | null;
}

export interface CreateTournamentDTO {
  name: string;
  gameName?: string | null;
  description?: string;
  coverImage?: string | null;
  location?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: TournamentStatus;
  externalLink?: string | null;
  published?: boolean;
  rules?: RichContent;
  pointsLimit?: number | null;
  maxPlayers?: number | null;
  entryFee?: string | null;
  organizer?: string | null;
  registrationClosed?: boolean;
}

export interface UpdateTournamentDTO extends Partial<CreateTournamentDTO> {
  id: string;
}

export interface CreateFeaturedListDTO {
  title: string;
  gameName?: string | null;
  factionName?: string | null;
  totalPoints?: number | null;
  authorName?: string;
  description?: string;
  coverImage?: string | null;
  published?: boolean;
  listData?: ParsedArmyList | null;
  result?: string | null;
  tournamentName?: string | null;
}

export interface UpdateFeaturedListDTO extends Partial<CreateFeaturedListDTO> {
  id: string;
}

// ---------- Community: Painting guides (user-authored) ----------
/** A paint referenced inside a guide. */
export interface GuidePaint {
  id: string;
  name: string;
  hex?: string;
}

export interface PaintingGuide extends BaseEntity {
  userId: string;
  authorName: string;
  title: string;
  summary: string;
  content: RichContent;
  coverImage: string | null;
  images: string[];
  tags: string[];
  gameName: string | null;
  armyName: string | null;
  paints: GuidePaint[];
  ratingSum: number;
  ratingCount: number;
  likeCount: number;
  published: boolean;
}

export interface CreateGuideDTO {
  title: string;
  summary?: string;
  content?: RichContent;
  coverImage?: string | null;
  images?: string[];
  tags?: string[];
  gameName?: string | null;
  armyName?: string | null;
  paints?: GuidePaint[];
  published?: boolean;
}

export interface UpdateGuideDTO {
  id: string;
  title?: string;
  summary?: string;
  content?: RichContent;
  coverImage?: string | null;
  images?: string[];
  tags?: string[];
  gameName?: string | null;
  armyName?: string | null;
  paints?: GuidePaint[];
  published?: boolean;
}

export type GuideSort = 'recent' | 'top';

export interface GuideQuery {
  search?: string;
  tags?: string[];
  gameName?: string | null;
  sort?: GuideSort;
  userId?: string;
}



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
};

// ---------- Teams ----------
export type TeamRole = 'owner' | 'admin' | 'member';

export interface Team {
  id: string;
  name: string;
  description: string;
  emblem: string | null;
  banner: string | null;
  location: string;
  createdBy: string;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMember {
  teamId: string;
  userId: string;
  role: TeamRole;
  joinedAt: string;
}

export interface TeamInvitation {
  id: string;
  teamId: string;
  userId: string;
  invitedBy: string;
  createdAt: string;
}

export interface TeamPost {
  id: string;
  teamId: string;
  authorId: string;
  kind: 'post' | 'list';
  body: string;
  image: string | null;
  listTitle: string | null;
  listData: ParsedArmyList | null;
  pinned: boolean;
  commentCount: number;
  createdAt: string;
}

export interface TeamPostComment {
  id: string;
  postId: string;
  teamId: string;
  authorId: string;
  body: string;
  createdAt: string;
}

/** A line in a group chat (team or game). */
export interface ChatMessage {
  id: string;
  authorId: string;
  body: string;
  createdAt: string;
}

// ---------- Open games ("partidas") ----------
export type MatchFormat = 'equilibrado' | 'cruzada' | 'narrativo' | 'patrulla' | 'incursion' | 'otro';
export type MatchLevel = 'iniciacion' | 'casual' | 'intermedio' | 'competitivo';
export type VenueType = 'online' | 'tienda' | 'club' | 'casa' | 'otro';

export interface Match {
  id: string;
  hostId: string;
  title: string;
  description: string;
  format: MatchFormat;
  pointsLimit: number | null;
  hostFaction: string | null;
  level: MatchLevel;
  venueType: VenueType;
  venueName: string;
  city: string;
  lat: number | null;
  lng: number | null;
  startsOn: string;
  timeMode: 'fixed' | 'flexible';
  startTime: string | null;
  endTime: string | null;
  timeNote: string;
  maxPlayers: number;
  playerCount: number;
  /** Seats held by pending invitations. */
  reservedCount: number;
  status: 'open' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  /** From the searcher's position; null for online games or with no position. */
  distanceKm?: number | null;
}

export interface MatchPlayer {
  matchId: string;
  userId: string;
  faction: string | null;
  joinedAt: string;
}

export interface MatchInvitation {
  id: string;
  matchId: string;
  invitedUser: string | null;
  email: string | null;
  invitedBy: string;
  status: 'pending' | 'accepted' | 'declined';
  emailedAt: string | null;
  createdAt: string;
}

/** Who to invite while creating a game: a player, or any email address. */
export type MatchInvitee = { kind: 'user'; profile: Profile } | { kind: 'email'; email: string };

export type CreateMatchDTO = Omit<Match, 'id' | 'hostId' | 'playerCount' | 'reservedCount' | 'status' | 'createdAt' | 'updatedAt' | 'distanceKm'> & {
  /** Exact address, shown to the players only. */
  address?: string;
};

