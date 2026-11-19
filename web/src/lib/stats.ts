import { games, series } from "./data";
import type { Game, Meta, Series } from "./types";

export const STAGE_ORDER = [
  "ROUND1",
  "ROUND2",
  "ROUND3",
  "ROUND4",
  "ROUND5",
  "QUARTERFINALS",
  "SEMIFINALS",
  "FINALS"
] as const;

const ROUND_CN = ["第一轮", "第二轮", "第三轮", "第四轮", "第五轮"];

export function stageLabel(tournament: string, stage: string): string {
  if (stage === "QUARTERFINALS") return "八强赛";
  if (stage === "SEMIFINALS") return "半决赛";
  if (stage === "FINALS") return "总决赛";
  const idx = ROUND_ORDER_INDEX(stage);
  const round = idx >= 0 ? ROUND_CN[idx] : stage;
  return tournament.includes("Play-In") ? `入围赛${round}` : `瑞士轮${round}`;
}

function TOURNAMENT_ORDER(tournament: string): number {
  if (tournament.includes("Play-In")) return 0;
  if (tournament.includes("Main Event")) return 1;
  return 2;
}

function ROUND_ORDER_INDEX(stage: string): number {
  return STAGE_ORDER.indexOf(stage as (typeof STAGE_ORDER)[number]);
}

export interface TeamRow {
  name: string;
  code: string;
  logo: string | null;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  blueGames: number;
  blueWins: number;
  redGames: number;
  redWins: number;
  kills: number;
  deaths: number;
  towers: number;
  dragons: number;
  barons: number;
}

export interface ChampionRow {
  name: string;
  nameZh: string;
  icon: string | null;
  picks: number;
  pickWins: number;
  bans: number;
  presenceGames: number;
  presenceRate: number;
  winRate: number | null;
}

export interface StageRow {
  tournament: string;
  stage: string;
  label: string;
  games: number;
  seriesCount: number;
}

export interface DurationRow {
  game: Game;
  label: string;
}

export interface Overview {
  totalGames: number;
  totalSeries: number;
  teamCount: number;
  playerCount: number;
  championPicked: number;
  championBanned: number;
  avgDurationSec: number;
  shortest: DurationRow | null;
  longest: DurationRow | null;
  firstDate: string;
  lastDate: string;
  patches: string[];
  stageRows: StageRow[];
  teams: TeamRow[];
  topPicks: ChampionRow[];
  topBans: ChampionRow[];
  recentSeries: Series[];
}

function matchup(game: Game): string {
  const blue = game.teams.find((t) => t.side === "blue");
  const red = game.teams.find((t) => t.side === "red");
  return `${blue?.name ?? "?"} vs ${red?.name ?? "?"}`;
}

export function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function fmtPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}

export function buildOverview(meta: Meta): Overview {
  const teamMap = new Map<string, TeamRow>();
  const champMap = new Map<
    string,
    { picks: number; pickWins: number; bans: number; presence: Set<number> }
  >();
  const playerSet = new Set<string>();
  const stageKey = new Map<string, { games: number; series: Set<number> }>();
  let durationSum = 0;
  let shortest: DurationRow | null = null;
  let longest: DurationRow | null = null;

  const champEntry = (name: string) => {
    let e = champMap.get(name);
    if (!e) {
      e = { picks: 0, pickWins: 0, bans: 0, presence: new Set<number>() };
      champMap.set(name, e);
    }
    return e;
  };

  for (const game of games) {
    durationSum += game.duration_seconds;
    const row: DurationRow = { game, label: matchup(game) };
    if (!shortest || game.duration_seconds < shortest.game.duration_seconds) shortest = row;
    if (!longest || game.duration_seconds > longest.game.duration_seconds) longest = row;

    const sk = `${game.tournament}||${game.stage}`;
    let se = stageKey.get(sk);
    if (!se) {
      se = { games: 0, series: new Set<number>() };
      stageKey.set(sk, se);
    }
    se.games += 1;
    se.series.add(game.series_id);

    for (const ref of [...game.picks.blue, ...game.picks.red]) {
      const e = champEntry(ref.name);
      e.picks += 1;
      e.presence.add(game.game_id);
      const winnerSide = game.teams.find((t) => t.win)?.side;
      const pickedByBlue = game.picks.blue.some((p) => p.name === ref.name);
      if ((winnerSide === "blue" && pickedByBlue) || (winnerSide === "red" && !pickedByBlue)) {
        e.pickWins += 1;
      }
    }
    for (const ref of [...game.bans.blue, ...game.bans.red]) {
      const e = champEntry(ref.name);
      e.bans += 1;
      e.presence.add(game.game_id);
    }

    for (const team of game.teams) {
      let t = teamMap.get(team.name);
      const league = meta.teams[team.name];
      if (!t) {
        t = {
          name: team.name,
          code: league?.code ?? team.name.slice(0, 3).toUpperCase(),
          logo: league?.logo ?? null,
          games: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          blueGames: 0,
          blueWins: 0,
          redGames: 0,
          redWins: 0,
          kills: 0,
          deaths: 0,
          towers: 0,
          dragons: 0,
          barons: 0
        };
        teamMap.set(team.name, t);
      }
      const other = game.teams.find((o) => o.side !== team.side);
      t.games += 1;
      t.wins += team.win ? 1 : 0;
      t.losses += team.win ? 0 : 1;
      t.kills += team.kills;
      t.deaths += other?.kills ?? 0;
      t.towers += team.towers;
      t.dragons += team.dragons;
      t.barons += team.barons;
      if (team.side === "blue") {
        t.blueGames += 1;
        t.blueWins += team.win ? 1 : 0;
      } else {
        t.redGames += 1;
        t.redWins += team.win ? 1 : 0;
      }
      for (const p of game.players) playerSet.add(p.name);
    }
  }

  const teams = [...teamMap.values()]
    .map((t) => ({ ...t, winRate: t.games ? t.wins / t.games : 0 }))
    .sort((a, b) => b.winRate - a.winRate || b.games - a.games);

  const championRows: ChampionRow[] = [...champMap.entries()].map(([name, e]) => {
    const c = meta.champions[name];
    return {
      name,
      nameZh: c?.name_zh ?? name,
      icon: c?.icon ?? null,
      picks: e.picks,
      pickWins: e.pickWins,
      bans: e.bans,
      presenceGames: e.presence.size,
      presenceRate: games.length ? e.presence.size / games.length : 0,
      winRate: e.picks ? e.pickWins / e.picks : null
    };
  });

  const stageRows: StageRow[] = [...stageKey.entries()]
    .map(([k, v]) => {
      const [tournament, stage] = k.split("||");
      return {
        tournament,
        stage,
        label: stageLabel(tournament, stage),
        games: v.games,
        seriesCount: v.series.size
      };
    })
    .sort(
      (a, b) =>
        TOURNAMENT_ORDER(a.tournament) - TOURNAMENT_ORDER(b.tournament) ||
        ROUND_ORDER_INDEX(a.stage) - ROUND_ORDER_INDEX(b.stage)
    );

  const recentSeries = [...series]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.series_id - a.series_id))
    .slice(0, 8);

  return {
    totalGames: games.length,
    totalSeries: series.length,
    teamCount: teams.length,
    playerCount: playerSet.size,
    championPicked: championRows.filter((c) => c.picks > 0).length,
    championBanned: championRows.filter((c) => c.bans > 0).length,
    avgDurationSec: games.length ? Math.round(durationSum / games.length) : 0,
    shortest,
    longest,
    firstDate: games.reduce((m, g) => (g.date < m ? g.date : m), games[0]?.date ?? ""),
    lastDate: games.reduce((m, g) => (g.date > m ? g.date : m), games[0]?.date ?? ""),
    patches: [...new Set(games.map((g) => g.patch))].sort(),
    stageRows,
    teams,
    topPicks: [...championRows].sort((a, b) => b.picks - a.picks || b.bans - a.bans).slice(0, 10),
    topBans: [...championRows].sort((a, b) => b.bans - a.bans || b.picks - a.picks).slice(0, 10),
    recentSeries
  };
}

export interface MatchFilter {
  tournament: string;
  stage: string;
  team: string;
}

export function filterSeries(filter: MatchFilter): Series[] {
  return series
    .filter((s) => filter.tournament === "ALL" || s.tournament === filter.tournament)
    // stage 选项用 "赛事||阶段" 的组合值，避免入围赛第一轮和瑞士轮第一轮混淆
    .filter((s) => filter.stage === "ALL" || filter.stage === s.tournament + "||" + s.stage)
    .filter((s) => filter.team === "ALL" || s.teams.includes(filter.team))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.series_id - a.series_id));
}

export function seriesOptions(): {
  tournaments: string[];
  stages: { key: string; label: string; tournament: string; value: string }[];
  teams: string[];
} {
  const tournaments = [...new Set(series.map((s) => s.tournament))];
  const stageKeys = new Map<string, { label: string; tournament: string }>();
  for (const s of series) {
    const key = `${s.tournament}||${s.stage}`;
    if (!stageKeys.has(key))
      stageKeys.set(key, { label: stageLabel(s.tournament, s.stage), tournament: s.tournament });
  }
  const stages = [...stageKeys.entries()]
    .map(([key, v]) => ({
      key: key.split("||")[1],
      label: v.label,
      tournament: v.tournament,
      value: key
    }))
    .sort(
      (a, b) =>
        TOURNAMENT_ORDER(a.tournament) - TOURNAMENT_ORDER(b.tournament) ||
        ROUND_ORDER_INDEX(a.key) - ROUND_ORDER_INDEX(b.key)
    );
  const teams = [...new Set(series.flatMap((s) => s.teams))].sort();
  return { tournaments, stages, teams };
}

export const ROLE_ORDER = ["top", "jungle", "mid", "bottom", "support"] as const;
export type Role = (typeof ROLE_ORDER)[number];

export const ROLE_CN: Record<string, string> = {
  top: "上单",
  jungle: "打野",
  mid: "中单",
  bottom: "下路",
  support: "辅助"
};

export function roleLabel(role: string): string {
  return ROLE_CN[role] ?? role;
}

export function roleIndex(role: string): number {
  const i = ROLE_ORDER.indexOf(role as Role);
  return i < 0 ? ROLE_ORDER.length : i;
}

export function playerKey(team: string, name: string): string {
  return (team + "|" + name).toLowerCase();
}

export function playerSlug(team: string, name: string): string {
  const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return slug(team) + "--" + slug(name);
}

export interface PlayerRow {
  key: string;
  name: string;
  team: string;
  teamCode: string;
  teamLogo: string | null;
  role: string;
  photo: string | null;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number | null;
  cs: number;
  minutes: number;
  csPerMin: number;
  championCount: number;
  topChampion: { name: string; nameZh: string; icon: string | null; games: number } | null;
}

export interface PlayerChampionRow {
  name: string;
  nameZh: string;
  icon: string | null;
  games: number;
  wins: number;
  winRate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number | null;
  csPerMin: number;
}

export interface PlayerGameRow {
  game: Game;
  opponent: string;
  opponentLogo: string | null;
  champion: string;
  championZh: string;
  win: boolean;
  k: number;
  d: number;
  a: number;
  cs: number;
}

interface PlayerAcc {
  name: string;
  team: string;
  games: number;
  wins: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  seconds: number;
  champions: Map<
    string,
    { games: number; wins: number; kills: number; deaths: number; assists: number; cs: number; seconds: number }
  >;
}

function accumulate(): Map<string, PlayerAcc> {
  const acc = new Map<string, PlayerAcc>();
  for (const game of games) {
    const sides = Object.fromEntries(game.teams.map((t) => [t.side, t]));
    for (const p of game.players) {
      const key = playerKey(sides[p.team]?.name ?? p.team, p.name);
      let row = acc.get(key);
      if (!row) {
        row = {
          name: p.name,
          team: sides[p.team]?.name ?? p.team,
          games: 0,
          wins: 0,
          kills: 0,
          deaths: 0,
          assists: 0,
          cs: 0,
          seconds: 0,
          champions: new Map()
        };
        acc.set(key, row);
      }
      const win = Boolean(sides[p.team]?.win);
      const [k, d, a] = p.kda;
      row.games += 1;
      row.wins += win ? 1 : 0;
      row.kills += k;
      row.deaths += d;
      row.assists += a;
      row.cs += p.cs;
      row.seconds += game.duration_seconds;

      let champ = row.champions.get(p.champion);
      if (!champ) {
        champ = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0, cs: 0, seconds: 0 };
        row.champions.set(p.champion, champ);
      }
      champ.games += 1;
      champ.wins += win ? 1 : 0;
      champ.kills += k;
      champ.deaths += d;
      champ.assists += a;
      champ.cs += p.cs;
      champ.seconds += game.duration_seconds;
    }
  }
  return acc;
}

function ratio(kills: number, deaths: number, assists: number): number | null {
  if (!deaths) return kills + assists > 0 ? null : 0;
  return (kills + assists) / deaths;
}

export function buildPlayers(meta: Meta): PlayerRow[] {
  const acc = accumulate();
  const rows: PlayerRow[] = [];
  for (const [key, a] of acc) {
    const info = meta.players[key];
    const league = meta.teams[a.team];
    const champs = [...a.champions.entries()]
      .map(([name, c]) => ({ name, c }))
      .sort((x, y) => y.c.games - x.c.games || y.c.wins - x.c.wins);
    const best = champs[0];
    const bestMeta = best ? meta.champions[best.name] : undefined;
    rows.push({
      key,
      name: a.name,
      team: a.team,
      teamCode: league?.code ?? a.team.slice(0, 3).toUpperCase(),
      teamLogo: league?.logo ?? null,
      role: info?.role ?? "mid",
      photo: info?.photo ?? null,
      games: a.games,
      wins: a.wins,
      losses: a.games - a.wins,
      winRate: a.games ? a.wins / a.games : 0,
      kills: a.kills,
      deaths: a.deaths,
      assists: a.assists,
      kda: ratio(a.kills, a.deaths, a.assists),
      cs: a.cs,
      minutes: a.seconds / 60,
      csPerMin: a.seconds ? a.cs / (a.seconds / 60) : 0,
      championCount: a.champions.size,
      topChampion: best
        ? { name: best.name, nameZh: bestMeta?.name_zh ?? best.name, icon: bestMeta?.icon ?? null, games: best.c.games }
        : null
    });
  }
  return rows.sort(
    (a, b) =>
      (b.kda ?? Number.POSITIVE_INFINITY) - (a.kda ?? Number.POSITIVE_INFINITY) ||
      b.games - a.games ||
      a.name.localeCompare(b.name)
  );
}

export function playerChampions(meta: Meta, key: string): PlayerChampionRow[] {
  const acc = accumulate().get(key);
  if (!acc) return [];
  return [...acc.champions.entries()]
    .map(([name, c]) => {
      const cm = meta.champions[name];
      return {
        name,
        nameZh: cm?.name_zh ?? name,
        icon: cm?.icon ?? null,
        games: c.games,
        wins: c.wins,
        winRate: c.games ? c.wins / c.games : 0,
        kills: c.kills,
        deaths: c.deaths,
        assists: c.assists,
        kda: ratio(c.kills, c.deaths, c.assists),
        csPerMin: c.seconds ? c.cs / (c.seconds / 60) : 0
      };
    })
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate || (b.kda ?? 0) - (a.kda ?? 0));
}

export function playerGames(meta: Meta, key: string): PlayerGameRow[] {
  const rows: PlayerGameRow[] = [];
  for (const game of games) {
    const sides = Object.fromEntries(game.teams.map((t) => [t.side, t]));
    for (const p of game.players) {
      if (playerKey(sides[p.team]?.name ?? p.team, p.name) !== key) continue;
      const other = game.teams.find((t) => t.side !== p.team);
      const otherMeta = other ? meta.teams[other.name] : undefined;
      const cm = meta.champions[p.champion];
      rows.push({
        game,
        opponent: other?.name ?? "?",
        opponentLogo: otherMeta?.logo ?? null,
        champion: p.champion,
        championZh: cm?.name_zh ?? p.champion,
        win: Boolean(sides[p.team]?.win),
        k: p.kda[0],
        d: p.kda[1],
        a: p.kda[2],
        cs: p.cs
      });
    }
  }
  return rows.sort((a, b) => (a.game.date < b.game.date ? 1 : a.game.date > b.game.date ? -1 : b.game.game_id - a.game.game_id));
}

export function findPlayerKey(meta: Meta, slug: string): string | null {
  for (const key of Object.keys(meta.players)) {
    const sep = key.indexOf("|");
    if (sep < 0) continue;
    if (playerSlug(key.slice(0, sep), key.slice(sep + 1)) === slug) return key;
  }
  return null;
}

/* ---------- 单场详情页 ---------- */

export function findSeries(seriesId: number): Series | null {
  return series.find((s) => s.series_id === seriesId) ?? null;
}

export function seriesGames(seriesId: number): Game[] {
  return games.filter((g) => g.series_id === seriesId).sort((a, b) => a.game_id - b.game_id);
}

export function fmtGold(gold: number): string {
  return gold.toLocaleString("en-US");
}

export const SPELL_CN: Record<string, string> = {
  SummonerFlash: "闪现",
  SummonerTeleport: "传送",
  SummonerSmite: "惩戒",
  SummonerHeal: "治疗",
  SummonerExhaust: "虚弱",
  SummonerBarrier: "屏障",
  SummonerHaste: "疾跑",
  SummonerBoost: "净化",
  SummonerDot: "点燃"
};

export const EVENT_CN: Record<string, string> = {
  "First blood": "一血",
  "First Tower": "一塔",
  "Rift Herald": "峡谷先锋",
  Nashor: "纳什男爵",
  "Elder Drake": "远古巨龙",
  "Infernal Drake": "炼火龙",
  "Chemtech Drake": "化学科技龙",
  "Hextech Drake": "海克斯龙",
  "Mountain Drake": "山脉龙",
  "Ocean Drake": "海洋龙",
  "Cloud Drake": "云端龙"
};

/* ---------- 队伍页 ---------- */

export function teamSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function findTeamName(meta: Meta, slug: string): string | null {
  for (const name of Object.keys(meta.teams)) if (teamSlug(name) === slug) return name;
  for (const s of series) for (const name of s.teams) if (teamSlug(name) === slug) return name;
  return null;
}

export interface TeamSeriesRow {
  series: Series;
  opponent: string;
  opponentLogo: string | null;
  own: number;
  opp: number;
  win: boolean;
  games: number;
}

export interface TeamChampionRow {
  name: string;
  nameZh: string;
  icon: string | null;
  games: number;
  wins: number;
  winRate: number | null;
}

export interface TeamSummary {
  name: string;
  slug: string;
  code: string;
  logo: string | null;
  seriesWins: number;
  seriesLosses: number;
  seriesWinRate: number;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  blueGames: number;
  blueWins: number;
  redGames: number;
  redWins: number;
  kills: number;
  deaths: number;
  towers: number;
  dragons: number;
  barons: number;
  seconds: number;
  run: string;
  runNote: string;
  seriesRows: TeamSeriesRow[];
  picks: TeamChampionRow[];
  bans: TeamChampionRow[];
}

/** 队伍走到的最深阶段：入围赛 < 主赛事各轮 < 八强 < 半决赛 < 决赛。 */
function seriesRank(s: Series): number {
  return (s.tournament.includes("Play-In") ? 0 : 100) + ROUND_ORDER_INDEX(s.stage);
}

function champRows(
  acc: Map<string, { games: number; wins: number }>,
  meta: Meta,
  withRate: boolean
): TeamChampionRow[] {
  return [...acc.entries()]
    .map(([name, e]) => {
      const c = meta.champions[name];
      return {
        name,
        nameZh: c?.name_zh ?? name,
        icon: c?.icon ?? null,
        games: e.games,
        wins: e.wins,
        winRate: withRate && e.games ? e.wins / e.games : null
      };
    })
    .sort((a, b) => b.games - a.games || b.wins - a.wins || a.name.localeCompare(b.name));
}

export function buildTeam(meta: Meta, name: string): TeamSummary | null {
  const related = series.filter((s) => s.teams.includes(name));
  const ownGames = games.filter((g) => g.teams.some((t) => t.name === name));
  if (!related.length && !ownGames.length) return null;

  const seriesRows: TeamSeriesRow[] = related
    .map((s) => {
      const idx = s.teams.indexOf(name);
      const parts = s.score.split(/\s*[-–]\s*/).map((x) => Number(x));
      const own = parts[idx] ?? 0;
      const opp = parts[1 - idx] ?? 0;
      const opponent = s.teams[1 - idx] ?? "?";
      return {
        series: s,
        opponent,
        opponentLogo: meta.teams[opponent]?.logo ?? null,
        own,
        opp,
        win: own > opp,
        games: own + opp
      };
    })
    .sort((a, b) =>
      a.series.date < b.series.date ? 1 : a.series.date > b.series.date ? -1 : b.series.series_id - a.series.series_id
    );

  let wins = 0;
  let losses = 0;
  let kills = 0;
  let deaths = 0;
  let towers = 0;
  let dragons = 0;
  let barons = 0;
  let seconds = 0;
  let blueGames = 0;
  let blueWins = 0;
  let redGames = 0;
  let redWins = 0;
  const picks = new Map<string, { games: number; wins: number }>();
  const bans = new Map<string, { games: number; wins: number }>();

  for (const game of ownGames) {
    const team = game.teams.find((t) => t.name === name);
    if (!team) continue;
    const other = game.teams.find((t) => t.side !== team.side);
    const win = team.win;
    wins += win ? 1 : 0;
    losses += win ? 0 : 1;
    kills += team.kills;
    deaths += other?.kills ?? 0;
    towers += team.towers;
    dragons += team.dragons;
    barons += team.barons;
    seconds += game.duration_seconds;
    if (team.side === "blue") {
      blueGames += 1;
      if (win) blueWins += 1;
    } else {
      redGames += 1;
      if (win) redWins += 1;
    }
    const picked = team.side === "blue" ? game.picks.blue : game.picks.red;
    const banned = team.side === "blue" ? game.bans.blue : game.bans.red;
    for (const p of picked) {
      const e = picks.get(p.name) ?? { games: 0, wins: 0 };
      e.games += 1;
      if (win) e.wins += 1;
      picks.set(p.name, e);
    }
    for (const b of banned) {
      const e = bans.get(b.name) ?? { games: 0, wins: 0 };
      e.games += 1;
      bans.set(b.name, e);
    }
  }

  const seriesWins = seriesRows.filter((r) => r.win).length;
  const seriesLosses = seriesRows.length - seriesWins;

  const deepest = [...related].sort(
    (a, b) => seriesRank(b) - seriesRank(a) || (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
  )[0];
  const deepestRow = deepest ? seriesRows.find((r) => r.series.series_id === deepest.series_id) ?? null : null;
  let run = "入围赛";
  if (deepest && !deepest.tournament.includes("Play-In")) {
    if (deepest.stage === "FINALS") run = deepestRow?.win ? "冠军" : "亚军";
    else if (deepest.stage === "SEMIFINALS") run = "四强";
    else if (deepest.stage === "QUARTERFINALS") run = "八强";
    else run = "瑞士轮";
  }
  const runNote = deepestRow
    ? stageLabel(deepestRow.series.tournament, deepestRow.series.stage) +
      " " + deepestRow.own + "–" + deepestRow.opp +
      (deepestRow.win ? " 胜 " : " 负 ") + deepestRow.opponent
    : "";

  return {
    name,
    slug: teamSlug(name),
    code: meta.teams[name]?.code ?? name.slice(0, 3).toUpperCase(),
    logo: meta.teams[name]?.logo ?? null,
    seriesWins,
    seriesLosses,
    seriesWinRate: seriesRows.length ? seriesWins / seriesRows.length : 0,
    games: ownGames.length,
    wins,
    losses,
    winRate: ownGames.length ? wins / ownGames.length : 0,
    blueGames,
    blueWins,
    redGames,
    redWins,
    kills,
    deaths,
    towers,
    dragons,
    barons,
    seconds,
    run,
    runNote,
    seriesRows,
    picks: champRows(picks, meta, true),
    bans: champRows(bans, meta, false)
  };
}

export function teamRoster(meta: Meta, name: string): PlayerRow[] {
  return buildPlayers(meta)
    .filter((p) => p.team === name)
    .sort((a, b) => roleIndex(a.role) - roleIndex(b.role) || b.games - a.games);
}

/** 把 dragon_types 归并成「化学科技龙 ×2、炼火龙」这种读法。 */
export function dragonSummary(types: string[]): string {
  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);
  if (counts.size === 0) return "—";
  return [...counts.entries()]
    .map(([t, n]) => (EVENT_CN[t] ?? t) + (n > 1 ? " ×" + n : ""))
    .join("、");
}

