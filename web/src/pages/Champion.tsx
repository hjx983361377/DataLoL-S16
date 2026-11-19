import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  findChampion,
  fmtDuration,
  fmtPct,
  playerSlug,
  roleLabel,
  stageLabel,
  teamSlug
} from "../lib/stats";
import { useCrumb, type Crumb } from "../lib/trail";

const CHAMPIONS_CRUMB: Crumb = { path: "/champions", label: "英雄榜" };

export default function Champion({ meta }: { meta: Meta }) {
  const { slug } = useParams();
  const champion = useMemo(() => (slug ? findChampion(meta, slug) : null), [meta, slug]);
  const parent = useCrumb(champion ? champion.nameZh : null, CHAMPIONS_CRUMB);

  if (!champion) {
    return (
      <div className="page">
        <div className="state">
          <h2>没有这个英雄</h2>
          <p>链接可能已经失效，或者名字拼写不同。</p>
          <Link className="link-arrow" to="/champions">
            回到英雄榜
          </Link>
        </div>
      </div>
    );
  }

  const primary = champion.roles[0] ?? null;

  return (
    <div className="page">
      <nav className="crumbs" aria-label="位置">
        <Link to={parent.path}>{parent.label}</Link>
        <span aria-hidden="true">/</span>
        <span>{champion.nameZh}</span>
      </nav>

      <section className="player-hero champion-hero">
        <div>
          <p className="eyebrow">
            2026 全球总决赛{champion.title ? " · " + champion.title : ""}
          </p>
          <h1 className="player-name champion-name">{champion.nameZh}</h1>
          <p className="champion-name-en">{champion.name}</p>
          <p className="section-note">
            登场 {champion.picks} 局，{champion.wins} 胜 {champion.losses} 负；被 Ban{" "}
            {champion.bans} 次，BP 率 {fmtPct(champion.presenceRate)}。
          </p>
          <p className="player-facts">
            {primary ? <span className="role-tag">{roleLabel(primary.role)}</span> : null}
            <span className="dot" aria-hidden="true">·</span>
            <span>
              蓝方 {champion.bluePicks} 局 · 红方 {champion.redPicks} 局
            </span>
            <span className="dot" aria-hidden="true">·</span>
            <span>场均 BP 顺位 {champion.avgPickOrder ? champion.avgPickOrder.toFixed(1) : "—"}</span>
          </p>
        </div>
      </section>

      {champion.splash ? (
        <figure className="champion-art">
          <img src={champion.splash} alt={champion.nameZh + " 原画"} loading="lazy" />
        </figure>
      ) : null}

      <section className="section">
        <div className="stats-grid">
          <div className="stat">
            <p className="stat-value">{champion.picks}</p>
            <p className="stat-label">出场局数</p>
            <p className="stat-hint">
              {champion.wins} 胜 {champion.losses} 负
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{champion.winRate === null ? "—" : fmtPct(champion.winRate)}</p>
            <p className="stat-label">胜率</p>
            <p className="stat-hint">
              {champion.picks ? "全部 " + champion.picks + " 局" : "没有登场记录"}
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{champion.kda === null ? "∞" : champion.kda.toFixed(2)}</p>
            <p className="stat-label">KDA</p>
            <p className="stat-hint">(击杀 + 助攻) / 阵亡</p>
          </div>
          <div className="stat">
            <p className="stat-value compact">
              {champion.picks ? (champion.kills / champion.picks).toFixed(1) : "—"}
              <span className="slash"> / </span>
              {champion.picks ? (champion.deaths / champion.picks).toFixed(1) : "—"}
              <span className="slash"> / </span>
              {champion.picks ? (champion.assists / champion.picks).toFixed(1) : "—"}
            </p>
            <p className="stat-label">场均 K / D / A</p>
            <p className="stat-hint">
              合计 {champion.kills} / {champion.deaths} / {champion.assists}
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{champion.bans}</p>
            <p className="stat-label">被 Ban 次数</p>
            <p className="stat-hint">{champion.bans ? "对手宁可放别的" : "没有人禁它"}</p>
          </div>
          <div className="stat">
            <p className="stat-value">{fmtPct(champion.presenceRate)}</p>
            <p className="stat-label">BP 率</p>
            <p className="stat-hint">
              {champion.presenceGames} / 98 局出现
            </p>
          </div>
        </div>
      </section>

      {champion.roles.length > 0 ? (
        <section className="section">
          <div className="subhead">
            <h2 className="section-title">位置分布</h2>
            <span>出场 / 胜率</span>
          </div>
          <ul className="row-list champion-roles">
            {champion.roles.map((r) => (
              <li className="row" key={r.role}>
                <span className="stage-name">{roleLabel(r.role)}</span>
                <span className="stage-bar">
                  <i style={{ width: (r.picks / champion.roles[0].picks) * 100 + "%" }} />
                </span>
                <span className="stage-value">
                  {r.picks} <small>/ {fmtPct(r.winRate)}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">使用队伍</h2>
          <span>出场与禁用次数</span>
        </div>
        <div className="table-wrap">
          <table className="table champion-teams-table">
            <thead>
              <tr>
                <th>队伍</th>
                <th className="num">出场</th>
                <th className="num">胜 – 负</th>
                <th className="num">胜率</th>
                <th className="num">禁用</th>
              </tr>
            </thead>
            <tbody>
              {champion.teams.map((t) => (
                <tr key={t.name}>
                  <td>
                    <Link className="team-cell" to={"/team/" + teamSlug(t.name)}>
                      {t.logo ? <img className="team-logo sm" src={t.logo} alt="" loading="lazy" /> : null}
                      <span>{t.name}</span>
                    </Link>
                  </td>
                  <td className="num">{t.picks}</td>
                  <td className="num">
                    {t.picks ? (
                      <>
                        <span className="win">{t.wins}</span>
                        <span className="muted"> – </span>
                        <span className="loss">{t.picks - t.wins}</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="num">
                    {t.winRate === null ? <span className="muted">—</span> : fmtPct(t.winRate)}
                  </td>
                  <td className="num muted">{t.bans}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {champion.players.length > 0 ? (
        <section className="section">
          <div className="subhead">
            <h2 className="section-title">使用选手</h2>
            <span>按出场次数排序</span>
          </div>
          <div className="table-wrap">
            <table className="table champion-players-table">
              <thead>
                <tr>
                  <th>选手</th>
                  <th>队伍</th>
                  <th>位置</th>
                  <th className="num">出场</th>
                  <th className="num">胜 – 负</th>
                  <th className="num">胜率</th>
                  <th className="num">KDA</th>
                </tr>
              </thead>
              <tbody>
                {champion.players.map((p) => (
                  <tr key={p.key}>
                    <td>
                      <Link className="player-cell" to={"/player/" + playerSlug(p.team, p.name)}>
                        {p.photo ? (
                          <img className="avatar" src={p.photo} alt="" loading="lazy" />
                        ) : (
                          <span className="avatar avatar-fallback" aria-hidden="true">
                            {p.name.trim().charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="player-cell-name">{p.name}</span>
                      </Link>
                    </td>
                    <td>
                      <span className="player-cell-team">
                        {p.logo ? <img className="team-logo xs" src={p.logo} alt="" loading="lazy" /> : null}
                        {p.teamCode}
                      </span>
                    </td>
                    <td>{p.role ? <span className="role-tag">{roleLabel(p.role)}</span> : <span className="muted">—</span>}</td>
                    <td className="num">{p.picks}</td>
                    <td className="num">
                      <span className="win">{p.wins}</span>
                      <span className="muted"> – </span>
                      <span className="loss">{p.picks - p.wins}</span>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {champion.games.length > 0 ? (
        <section className="section">
          <div className="subhead">
            <h2 className="section-title">逐局记录</h2>
            <span>{champion.games.length} 局，按日期倒序</span>
          </div>
          <ul className="log-list">
            {champion.games.map((g) => (
              <li key={g.game.game_id}>
                <Link className="log-row champion-log" to={"/match/" + g.game.series_id + "?g=" + g.game.game_id}>
                  <span className="log-date">{g.game.date.slice(5)}</span>
                  <span className="stage-tag">{stageLabel(g.game.tournament, g.game.stage)}</span>
                  <span className="log-opponent">
                    {g.teamLogo ? <img className="team-logo sm" src={g.teamLogo} alt="" loading="lazy" /> : null}
                    <span className="log-team-body">
                      <span>{g.team}</span>
                      <span className="log-team-player">
                        {g.role ? roleLabel(g.role) : ""}
                        {g.player ? " · " + g.player : ""}
                      </span>
                    </span>
                  </span>
                  <span className="log-champ">{g.opponent}</span>
                  <span className="log-spacer" aria-hidden="true" />
                  <span className={"log-result " + (g.win ? "won" : "lost")}>{g.win ? "胜" : "负"}</span>
                  <span className="log-kda">
                    {g.k} / {g.d} / {g.a}
                  </span>
                  <span className="log-cs">{g.cs} 刀</span>
                  <span className="log-time">{fmtDuration(g.game.duration_seconds)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

