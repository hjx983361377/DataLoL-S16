import { useMemo } from "react";
import { useTrailEntry } from "../lib/trail";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildPlayers,
  buildTeams,
  buildTeamStats,
  fmtPct,
  roleIndex,
  type PlayerRow,
  type TeamSummary
} from "../lib/stats";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { TeamStandings } from "../components/TeamStandings";

function TeamCard({ team, roster }: { team: TeamSummary; roster: PlayerRow[] }) {
  return (
    <Link className="team-card" to={"/team/" + team.slug}>
      <div className="team-card-head">
        <span className="team-card-rank">{String(team.rank).padStart(2, "0")}</span>
        {team.logo ? (
          <img className="team-card-logo" src={team.logo} alt={team.name} loading="lazy" />
        ) : (
          <span className="team-card-logo team-card-logo-fallback">{team.code}</span>
        )}
        <span className="team-card-name">{team.name}</span>
      </div>

      <div className="team-card-record">
        <span className="team-card-stat">
          <b>
            {team.seriesWins}–{team.seriesLosses}
          </b>
          <small>系列赛</small>
        </span>
        <span className="team-card-stat">
          <b>
            {team.wins}–{team.losses}
          </b>
          <small>局</small>
        </span>
        <span className="team-card-stat">
          <b>{fmtPct(team.winRate)}</b>
          <small>局胜率</small>
        </span>
        <span className={"team-card-run" + (team.run === "冠军" ? " is-champion" : "")}>{team.run}</span>
      </div>

      <span className="team-card-bar" aria-hidden="true">
        <span className="team-card-fill" style={{ width: team.winRate * 100 + "%" }} />
      </span>

      <span className="team-card-roster">
        {roster.map((p) => (
          <PlayerAvatar key={p.key} row={p} />
        ))}
      </span>
    </Link>
  );
}

export default function Teams({ meta }: { meta: Meta }) {
  useTrailEntry("战队巡礼");
  const teams = useMemo(() => buildTeams(meta), [meta]);
  const rankRows = useMemo(() => buildTeamStats(meta), [meta]);

  const rosters = useMemo(() => {
    const map = new Map<string, PlayerRow[]>();
    for (const p of buildPlayers(meta)) {
      const arr = map.get(p.team);
      if (arr) arr.push(p);
      else map.set(p.team, [p]);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => roleIndex(a.role) - roleIndex(b.role) || b.games - a.games);
    }
    return map;
  }, [meta]);

  const mainEvent = teams.filter((t) => t.run !== "入围赛").length;

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow rise d1">2026 全球总决赛</p>
        <h1 className="rise d2">战队巡礼</h1>
        <p className="section-note rise d3">
          19 支参赛队伍，{mainEvent} 支进入主赛事。名次按赛事轮次排定，冠军、亚军、四强、八强依次往后，同一轮次内比系列赛胜场、局差与胜率。点卡片查看赛程、阵容与英雄数据。
        </p>
      </section>

      <section className="section team-rank-section rise d4">
        <div className="subhead">
          <h2 className="section-title">队伍数据榜</h2>
          <span>点表头切换排序，默认按局胜率</span>
        </div>
        <TeamStandings rows={rankRows} />
      </section>

      <section className="section rise d5">
        <div className="subhead">
          <h2 className="section-title">参赛队伍</h2>
          <span>按赛事名次排序</span>
        </div>
        <div className="team-grid">
          {teams.map((t) => (
            <TeamCard key={t.name} team={t} roster={rosters.get(t.name) ?? []} />
          ))}
        </div>
      </section>
    </div>
  );
}
