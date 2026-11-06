import type { Disposition } from "./missions";

export type PlayFormat = "singles" | "doubles" | "teams";
export type PlayStatus = "draft" | "open" | "closed" | "in_progress" | "finished" | "cancelled";
export type Side = "a" | "b";

export interface PlayTournament {
  id: string;
  organizerId: string;
  organizerName: string;
  name: string;
  description: string;
  rules: string;
  coverImage: string | null;
  format: PlayFormat;
  /** Players per entry: 1 singles, 2 doubles, 3-8 teams. */
  teamSize: number;
  pointsLimit: number;
  rounds: number;
  pairingSystem: "swiss" | "manual" | "league";
  /** League: home and away. */
  leagueDouble: boolean;
  /** League: days per round (deadline spacing). */
  roundDays: number;
  /** Teams: how the games inside a match are paired. */
  teamPairing: "wtc" | "free";
  /** Teams: game points 20-0 per game (WTC) or games won. */
  scoring: "wtc" | "wins";
  uniqueFactions: boolean;
  /** Teams (or players, in singles). */
  maxEntries: number;
  locationType: "presencial" | "online";
  venueName: string;
  address: string;
  city: string;
  onlinePlatform: string;
  /** Per player. */
  entryFee: number;
  paymentInfo: string;
  startsOn: string;
  endsOn: string | null;
  startTime: string | null;
  registrationDeadline: string | null;
  listDeadline: string | null;
  missionPack: string;
  status: PlayStatus;
  listsPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EntryStatus = "registered" | "waitlist" | "withdrawn";
export type PaymentStatus = "pending" | "submitted" | "paid" | "waived" | "rejected";

export interface PlayEntry {
  id: string;
  tournamentId: string;
  name: string;
  teamId: string | null;
  captainId: string | null;
  status: EntryStatus;
  dropped: boolean;
  joinCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlayEntryPlayer {
  id: string;
  entryId: string;
  tournamentId: string;
  userId: string | null;
  displayName: string;
  faction: string;
  position: number;
  createdAt: string;
}

export interface PlayPayment {
  entryId: string;
  tournamentId: string;
  status: PaymentStatus;
  reference: string;
  receiptPath: string | null;
  organizerNote: string;
  reviewedAt: string | null;
  updatedAt: string;
}

export interface PlayList {
  entryPlayerId: string;
  tournamentId: string;
  entryId: string;
  faction: string;
  detachment: string;
  listText: string;
  submittedAt: string;
  updatedAt: string;
}

export interface PlayRound {
  id: string;
  tournamentId: string;
  number: number;
  status: "playing" | "finished";
  deployment: string;
  layout: string;
  notes: string;
  /** League: last day to play it. */
  deadline: string | null;
  createdAt: string;
}

export interface PlayMatch {
  id: string;
  tournamentId: string;
  roundId: string;
  tableNo: number;
  entryA: string;
  /** null: entry A has a bye. */
  entryB: string | null;
  createdAt: string;
}

export type GameStatus = "setup" | "playing" | "submitted" | "confirmed";

export interface SideSetup {
  detachment: string;
  disposition: Disposition | null;
  secondaryMode: "tactical" | "fixed";
  /** The two Fixed cards, when secondaryMode is "fixed". */
  fixed: string[];
  battleReady: boolean;
}

export interface GameSetup {
  a: SideSetup;
  b: SideSetup;
  deployment: string;
  layout: string;
  twist: string;
  /** Who chose to be the Attacker (deploys second). */
  attacker: Side | null;
  firstTurn: Side | null;
}

export interface ScoredSecondary {
  card: string;
  vp: number;
}

export interface SideRound {
  primary: number;
  secondaries: ScoredSecondary[];
}

/** rounds[0..4]: battle rounds 1-5; rounds[5]: end of the battle (primary only). */
export interface BattleRound {
  a: SideRound;
  b: SideRound;
}

export interface PlayGame {
  id: string;
  matchId: string;
  tournamentId: string;
  tableNo: number;
  playerA: string | null;
  playerB: string | null;
  status: GameStatus;
  setup: Partial<GameSetup>;
  rounds: BattleRound[];
  vpA: number;
  vpB: number;
  confirmedA: boolean;
  confirmedB: boolean;
  updatedAt: string;
}

/** A single game outside any tournament (friendly_games). Side A is whoever created it. */
export interface FriendlyGame {
  id: string;
  createdBy: string;
  playerA: string | null;
  /** null: the rival has no account (just a name). */
  playerB: string | null;
  nameA: string;
  nameB: string;
  factionA: string;
  factionB: string;
  listA: string;
  listB: string;
  pointsLimit: number;
  /** The pick-up game from the finder it comes from, if any. */
  matchId: string | null;
  playedOn: string;
  status: GameStatus;
  setup: Partial<GameSetup>;
  rounds: BattleRound[];
  vpA: number;
  vpB: number;
  confirmedA: boolean;
  confirmedB: boolean;
  createdAt: string;
  updatedAt: string;
}
