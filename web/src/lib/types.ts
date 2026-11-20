export interface HeroRef {
  name: string;
  id: number;
}

export interface TeamBlock {
  name: string;
  side: "blue" | "red";
  win: boolean;
  kills: number;
  towers: number;
  dragons: number;
  barons: number;
  gold: number;
  first_blood: boolean;
  first_tower: boolean;
  dragon_types: string[];
}

export interface PlayerStatDetail {
  /** 本局总经济 */
  gold?: number;
  /** 本局经济占全队比例（百分数，如 19.0） */
  gold_share?: number;
  /** 分均经济 */
  gpm?: number;
  /** 本局总伤害 */
  damage?: number;
  /** 本局伤害占全队比例（百分数，如 19.7） */
  damage_share?: number;
  /** 分均伤害 */
  dpm?: number;
  /** 伤转：总伤害 / 总经济 */
  damage_per_gold?: number;
}

export interface PlayerStat {
  team: "blue" | "red";
  name: string;
  champion: string;
  champion_id: number;
  kda: [number, number, number];
  cs: number;
  items: string[];
  spells: string[];
  stats?: PlayerStatDetail;
}

export interface TimelineEvent {
  time: string;
  event: string;
  side: string;
}

export interface Game {
  game_id: number;
  duration_seconds: number;
  patch: string;
  gold_diff: { minutes: number[]; diff: number[] };
  teams: TeamBlock[];
  bans: { blue: HeroRef[]; red: HeroRef[] };
  picks: { blue: HeroRef[]; red: HeroRef[] };
  players: PlayerStat[];
  timeline: TimelineEvent[];
  series_id: number;
  stage: string;
  date: string;
  tournament: string;
  series_score: string;
  series_teams: string[];
}

export interface Series {
  series_id: number;
  label: string;
  stage: string;
  score: string;
  teams: string[];
  patch: string;
  date: string;
  tournament: string;
}

export interface ChampionMeta {
  golgg_name: string;
  golgg_id: number;
  riot_id: number;
  key: string;
  name: string;
  name_zh: string;
  name_zh_title?: string;
  icon: string;
  splash: string;
}

export interface TeamMeta {
  logo: string;
  api_name: string;
  code: string;
}

export interface PlayerMeta {
  team: string;
  role: string;
  photo: string | null;
  summoner?: string;
}

export interface ItemMeta {
  name: string;
  en: string;
}

export interface Meta {
  champions: Record<string, ChampionMeta>;
  teams: Record<string, TeamMeta>;
  players: Record<string, PlayerMeta>;
  items: Record<string, ItemMeta>;
}
