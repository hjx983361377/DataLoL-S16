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
