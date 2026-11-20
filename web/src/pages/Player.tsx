import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildPlayerRadar,
  buildPlayers,
  championSlug,
  findPlayerKey,
  fmtDuration,
  fmtPct,
  playerChampions,
  playerGames,
  roleLabel,
  stageLabel,
  teamSlug
} from "../lib/stats";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { useCrumb, type Crumb } from "../lib/trail";
import { AbilityRadar } from "../components/Radar";

const PLAYERS_CRUMB: Crumb = { path: "/players", label: "选手榜" };

export default function Player({ meta }: { meta: Meta }) {
  const { slug } = useParams();
  const key = useMemo(() => (slug ? findPlayerKey(meta, slug) : null), [meta, slug]);
  const row = useMemo(() => {
    if (!key) return null;
    return buildPlayers(meta).find((p) => p.key === key) ?? null;
  }, [meta, key]);
  const champions = useMemo(() => (key ? playerChampions(meta, key) : []), [meta, key]);
  const log = useMemo(() => (key ? playerGames(meta, key) : []), [meta, key]);
  const radar = useMemo(() => (key ? buildPlayerRadar(meta, key) : null), [meta, key]);
  const parent = useCrumb(row ? row.name : null, PLAYERS_CRUMB);

  if (!row) {
    return (
      <div className="page">
        <div className="state">
          <h2>没有这位选手</h2>
          <p>链接可能已经失效，或者名字拼写不同。</p>
          <Link className="link-arrow" to="/players">
            回到选手榜
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="crumbs" aria-label="位置">
        <Link to={parent.path}>{parent.label}</Link>
        <span aria-hidden="true">/</span>
        <span>{row.name}</span>
      </nav>

      <section className="player-hero">
        <div>
          <p className="eyebrow">2026 全球总决赛</p>
          <h1 className="player-name">{row.name}</h1>
          <p className="section-note">
            出场 {row.games} 局，{row.wins} 胜 {row.losses} 负。
            {row.topChampion
              ? ` 最常使用 ${row.topChampion.nameZh}（${row.topChampion.games} 局）。`
              : ""}
          </p>
          <p className="player-facts">
            {row.teamLogo ? <img className="team-logo" src={row.teamLogo} alt="" loading="lazy" /> : null}
            <Link className="player-team-link" to={"/team/" + teamSlug(row.team)}>
              {row.team}
            </Link>
            <span className="dot" aria-hidden="true">·</span>
            <span>{roleLabel(row.role)}</span>
            <span className="dot" aria-hidden="true">·</span>
            <span>{row.championCount} 个英雄</span>
          </p>
        </div>
        <div className="player-portrait">
          <PlayerAvatar row={row} size="portrait-size" />
        </div>
      </section>

      <section className="section">
        <div className="stats-grid">
          <div className="stat">
            <p className="stat-value">{row.games}</p>
            <p className="stat-label">出场局数</p>
            <p className="stat-hint">
              {row.wins} 胜 {row.losses} 负
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{fmtPct(row.winRate)}</p>
            <p className="stat-label">胜率</p>
            <p className="stat-hint">全部 {row.games} 局</p>
          </div>
          <div className="stat">
            <p className="stat-value">{row.kda === null ? "∞" : row.kda.toFixed(2)}</p>
            <p className="stat-label">KDA</p>
            <p className="stat-hint">(击杀 + 助攻) / 阵亡</p>
          </div>
          <div className="stat">
            <p className="stat-value compact">
              {(row.kills / row.games).toFixed(1)}
              <span className="slash"> / </span>
              {(row.deaths / row.games).toFixed(1)}
              <span className="slash"> / </span>
              {(row.assists / row.games).toFixed(1)}
            </p>
            <p className="stat-label">场均 K / D / A</p>
            <p className="stat-hint">
              合计 {row.kills} / {row.deaths} / {row.assists}
            </p>
          </div>
          <div className="stat">
            <p className="stat-value">{row.csPerMin.toFixed(1)}</p>
            <p className="stat-label">分均补刀</p>
            <p className="stat-hint">合计 {row.cs} 刀</p>
          </div>
          <div className="stat">
            <p className="stat-value">{row.championCount}</p>
            <p className="stat-label">使用英雄</p>
            <p className="stat-hint">{row.topChampion ? row.topChampion.nameZh + " 最多" : "—"}</p>
          </div>
        </div>
      </section>

      {radar ? (
        <section className="section radar-section">
          <div className="subhead">
            <h2 className="section-title">能力雷达</h2>
            <span>
              与 {roleLabel(radar.role)} 位置其他 {radar.peers - 1} 位选手横向对比 · 生存为场均死亡，越低越靠前
            </span>
          </div>
          <div className="radar-panel">
            <AbilityRadar series={[{ key: row.name, label: row.name, color: "#8a5b18", radar }]} />
            <ul className="radar-list">
              {radar.axes.map((axis) => (
                <li key={axis.key} className="radar-row" title={axis.hint}>
                  <span className="radar-row-label">{axis.label}</span>
                  <span className="radar-row-value">{axis.display}</span>
                  <span className="rate-bar radar-row-bar">
                    <span className="rate-fill" style={{ width: axis.pct + "%" }} />
                  </span>
                  <span className={"radar-row-rank" + (axis.rank <= 3 ? " is-top" : "")}>
                    第 {axis.rank} / {axis.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">英雄池</h2>
          <span>按出场次数排序</span>
        </div>
        <div className="table-wrap">
          <table className="table player-champs-table">
            <thead>
              <tr>
                <th>英雄</th>
                <th className="num">出场</th>
                <th className="num">胜 – 负</th>
                <th className="num">胜率</th>
                <th className="num">KDA</th>
                <th className="num">分均补刀</th>
              </tr>
            </thead>
            <tbody>
              {champions.map((c) => (
                <tr key={c.name}>
                  <td>
                    <Link className="champ-cell" to={"/champion/" + championSlug(meta, c.name)}>
                      {c.icon ? <img className="champ-icon" src={c.icon} alt="" loading="lazy" /> : null}
                      <span className="champ-cell-text">
                        <span className="champ-cell-name">{c.nameZh}</span>
                        <span className="champ-cell-en">{c.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="num">{c.games}</td>
                  <td className="num">
                    <span className="win">{c.wins}</span>
                    <span className="muted"> – </span>
                    <span className="loss">{c.games - c.wins}</span>
                  </td>
                  <td className="num">
                    <span className="rate-cell">
                      <span className="rate-bar">
                        <span className="rate-fill" style={{ width: c.winRate * 100 + "%" }} />
                      </span>
                      <span>{fmtPct(c.winRate)}</span>
                    </span>
                  </td>
                  <td className="num">{c.kda === null ? "∞" : c.kda.toFixed(2)}</td>
                  <td className="num muted">{c.csPerMin.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">逐局记录</h2>
          <span>{log.length} 局，按日期倒序</span>
        </div>
        <ul className="log-list">
          {log.map((g) => (
            <li key={g.game.game_id}>
              <Link
                className="log-row"
                to={"/match/" + g.game.series_id + "?g=" + g.game.game_id}
              >
                <span className="log-date">{g.game.date.slice(5)}</span>
                <span className="stage-tag">{stageLabel(g.game.tournament, g.game.stage)}</span>
                <span className="log-opponent">
                  {g.opponentLogo ? (
                    <img className="team-logo sm" src={g.opponentLogo} alt="" loading="lazy" />
                  ) : null}
                  <span>{g.opponent}</span>
                </span>
                <span className="log-champ">
                  {g.championZh}
                  <span className="log-champ-en">{g.champion}</span>
                </span>
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
    </div>
  );
}
