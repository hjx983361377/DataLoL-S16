import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildTeam,
  findTeamName,
  fmtDuration,
  fmtPct,
  playerSlug,
  roleLabel,
  stageLabel,
  teamRoster,
  type TeamChampionRow
} from "../lib/stats";
import { PlayerAvatar } from "./Players";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChampionList({ rows, metric }: { rows: TeamChampionRow[]; metric: "picks" | "bans" }) {
  return (
    <ul className="champ-list">
      {rows.map((r, i) => (
        <li className="champ-row" key={r.name}>
          <span className="champ-rank">{i + 1}</span>
          {r.icon ? (
            <img className="champ-icon" src={r.icon} alt={r.nameZh} loading="lazy" />
          ) : (
            <span className="champ-icon" />
          )}
          <span className="champ-name">
            <b>{r.nameZh}</b>
            <small>{r.name}</small>
          </span>
          <span className="champ-count">{r.games}</span>
          <span className="champ-extra">
            {metric === "picks" ? "胜率 " + (r.winRate === null ? "—" : fmtPct(r.winRate)) : null}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function Team({ meta }: { meta: Meta }) {
  const { slug } = useParams();
  const name = useMemo(() => (slug ? findTeamName(meta, slug) : null), [meta, slug]);
  const team = useMemo(() => (name ? buildTeam(meta, name) : null), [meta, name]);
  const roster = useMemo(() => (name ? teamRoster(meta, name) : []), [meta, name]);

  if (!name || !team) {
    return (
      <div className="page">
        <div className="state">
          <h2>没有这支队伍</h2>
          <p>链接可能已经失效，或者队名拼写不同。</p>
          <Link className="link-arrow" to="/">
            回到赛事总览
          </Link>
        </div>
      </div>
    );
  }

  const avg = (v: number) => (team.games ? v / team.games : 0);

  return (
    <div className="page">
      <nav className="crumbs" aria-label="位置">
        <Link to="/">赛事总览</Link>
        <span aria-hidden="true">/</span>
        <span>{team.name}</span>
      </nav>

      <section className="team-hero">
        <div>
          <p className="eyebrow">2026 全球总决赛 · {team.run}</p>
          <h1 className="team-name">{team.name}</h1>
          <p className="section-note">
            系列赛 {team.seriesWins} 胜 {team.seriesLosses} 负，局战绩 {team.wins} 胜 {team.losses} 负。
            {team.runNote ? " " + team.runNote + "。" : ""}
          </p>
          <p className="player-facts">
            <span className="team-code">{team.code}</span>
            <span>{team.seriesRows.length} 个系列赛</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>{team.games} 局</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>{roster.length} 位选手</span>
          </p>
        </div>
        <div className="team-plate">
          {team.logo ? (
            <img src={team.logo} alt={team.name + " 队标"} />
          ) : (
            <span className="team-plate-fallback">{team.code}</span>
          )}
        </div>
      </section>

      <section className="section">
        <div className="stats-grid">
          <div className="stat">
            <p className="stat-value">
              {team.seriesWins} – {team.seriesLosses}
            </p>
            <p className="stat-label">系列赛</p>
            <p className="stat-hint">胜率 {fmtPct(team.seriesWinRate)}</p>
          </div>
          <div className="stat">
            <p className="stat-value">
              {team.wins} – {team.losses}
            </p>
            <p className="stat-label">局战绩</p>
            <p className="stat-hint">胜率 {fmtPct(team.winRate)}</p>
          </div>
          <div className="stat">
            <p className="stat-value">{fmtPct(team.blueGames ? team.blueWins / team.blueGames : 0)}</p>
            <p className="stat-label">蓝方胜率</p>
            <p className="stat-hint">{team.blueGames} 局</p>
          </div>
          <div className="stat">
            <p className="stat-value">{fmtPct(team.redGames ? team.redWins / team.redGames : 0)}</p>
            <p className="stat-label">红方胜率</p>
            <p className="stat-hint">{team.redGames} 局</p>
          </div>
          <div className="stat">
            <p className="stat-value compact">
              {avg(team.kills).toFixed(1)}
              <span className="slash"> / </span>
              {avg(team.deaths).toFixed(1)}
            </p>
            <p className="stat-label">场均击杀 / 阵亡</p>
            <p className="stat-hint">
              合计 {team.kills} / {team.deaths}
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{fmtDuration(Math.round(avg(team.seconds)))}</p>
            <p className="stat-label">场均时长</p>
            <p className="stat-hint">
              场均 {avg(team.dragons).toFixed(2)} 龙 · {avg(team.barons).toFixed(2)} 大龙
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">赛程战绩</h2>
          <span>{team.seriesRows.length} 个系列赛，按日期倒序</span>
        </div>
        <ul className="ts-list">
          {team.seriesRows.map((r) => (
            <li key={r.series.series_id}>
              <Link className="ts-row" to={"/match/" + r.series.series_id}>
                <span className="ts-date">{r.series.date.slice(5)}</span>
                <span className="stage-tag">{stageLabel(r.series.tournament, r.series.stage)}</span>
                <span className="ts-opponent">
                  {r.opponentLogo ? (
                    <img className="team-logo sm" src={r.opponentLogo} alt="" loading="lazy" />
                  ) : null}
                  <span>{r.opponent}</span>
                </span>
                <span className="ts-score">
                  {r.own} – {r.opp}
                </span>
                <span className={"ts-result " + (r.win ? "won" : "lost")}>{r.win ? "胜" : "负"}</span>
                <span className="ts-games">{r.games} 局</span>
                <Chevron />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">阵容</h2>
          <span>按位置排序</span>
        </div>
        <div className="table-wrap">
          <table className="table roster-table">
            <thead>
              <tr>
                <th>位置</th>
                <th>选手</th>
                <th className="num">出场</th>
                <th className="num">胜 – 负</th>
                <th className="num">胜率</th>
                <th className="num">KDA</th>
                <th className="num roster-hide">分均补刀</th>
                <th className="roster-hide">常用英雄</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => (
                <tr key={p.key}>
                  <td>
                    <span className="role-tag">{roleLabel(p.role)}</span>
                  </td>
                  <td>
                    <Link className="player-cell" to={"/player/" + playerSlug(p.team, p.name)}>
                      <PlayerAvatar row={p} />
                      <span className="player-cell-body">
                        <span className="player-cell-name">{p.name}</span>
                        <span className="player-cell-team">{p.championCount} 个英雄</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num">{p.games}</td>
                  <td className="num">
                    <span className="win">{p.wins}</span>
                    <span className="muted"> – </span>
                    <span className="loss">{p.losses}</span>
                  </td>
                  <td className="num">
                    <span className="rate-cell">
                      <span className="rate-bar">
                        <span className="rate-fill" style={{ width: p.winRate * 100 + "%" }} />
                      </span>
                      <span>{fmtPct(p.winRate)}</span>
                    </span>
                  </td>
                  <td className="num">{p.kda === null ? "∞" : p.kda.toFixed(2)}</td>
                  <td className="num muted roster-hide">{p.csPerMin.toFixed(1)}</td>
                  <td className="roster-hide">
                    {p.topChampion ? (
                      <span className="champ-cell">
                        {p.topChampion.icon ? (
                          <img className="champ-icon" src={p.topChampion.icon} alt="" loading="lazy" />
                        ) : null}
                        <span className="champ-cell-name">{p.topChampion.nameZh}</span>
                        <span className="muted champ-count-inline">{p.topChampion.games} 局</span>
                      </span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid-two">
        <section>
          <div className="subhead">
            <h3>常用英雄</h3>
            <span>本队选用次数</span>
          </div>
          <ChampionList rows={team.picks.slice(0, 10)} metric="picks" />
        </section>
        <section>
          <div className="subhead">
            <h3>禁用最多</h3>
            <span>本队 ban 位次数</span>
          </div>
          <ChampionList rows={team.bans.slice(0, 10)} metric="bans" />
        </section>
      </div>
    </div>
  );
}
