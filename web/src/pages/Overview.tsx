import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildOverview,
  fmtDuration,
  fmtPct,
  stageLabel,
  type ChampionRow,
  type TeamRow
} from "../lib/stats";

function Kpi(props: { label: string; value: string; hint?: string }) {
  return (
    <div className="kpi">
      <div className="kpi-label">{props.label}</div>
      <div className="kpi-value">{props.value}</div>
      {props.hint ? <div className="kpi-hint">{props.hint}</div> : null}
    </div>
  );
}

function ChampionList(props: { rows: ChampionRow[]; metric: "picks" | "bans" }) {
  const rows = props.rows;
  const max = Math.max(1, ...rows.map((r) => (props.metric === "picks" ? r.picks : r.bans)));
  return (
    <ul className="champ-list">
      {rows.map((r, i) => {
        const count = props.metric === "picks" ? r.picks : r.bans;
        return (
          <li className="champ" key={r.name}>
            <span className="champ-rank">{i + 1}</span>
            {r.icon ? (
              <img className="champ-icon" src={r.icon} alt={r.nameZh} loading="lazy" />
            ) : (
              <span className="champ-icon champ-icon-fallback" />
            )}
            <span className="champ-name">
              {r.nameZh}
              <small>{r.name}</small>
            </span>
            <span className="champ-bar">
              <span className="champ-bar-fill" style={{ width: (count / max) * 100 + "%" }} />
            </span>
            <span className="champ-count">{count}</span>
            <span className="champ-extra">
              {props.metric === "picks"
                ? "胜率 " + (r.winRate === null ? "-" : fmtPct(r.winRate))
                : "出场率 " + fmtPct(r.presenceRate)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TeamTable(props: { rows: TeamRow[] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>队伍</th>
            <th className="num">场次</th>
            <th className="num">胜 - 负</th>
            <th className="num">胜率</th>
            <th className="num">蓝方</th>
            <th className="num">红方</th>
            <th className="num">K / D</th>
            <th className="num">场均小龙</th>
            <th className="num">场均大龙</th>
          </tr>
        </thead>
        <tbody>
          {props.rows.map((t, i) => (
            <tr key={t.name}>
              <td className="num muted">{i + 1}</td>
              <td>
                <span className="team-cell">
                  {t.logo ? (
                    <img className="team-logo" src={t.logo} alt={t.name} loading="lazy" />
                  ) : (
                    <span className="team-logo team-logo-fallback">{t.code}</span>
                  )}
                  <span>{t.name}</span>
                </span>
              </td>
              <td className="num">{t.games}</td>
              <td className="num">
                <span className="win">{t.wins}</span>
                <span className="muted"> - </span>
                <span className="loss">{t.losses}</span>
              </td>
              <td className="num">
                <span className="rate-cell">
                  <span className="rate-bar">
                    <span className="rate-fill" style={{ width: t.winRate * 100 + "%" }} />
                  </span>
                  {fmtPct(t.winRate)}
                </span>
              </td>
              <td className="num muted">
                {t.blueGames ? fmtPct(t.blueWins / t.blueGames) : "-"}
              </td>
              <td className="num muted">
                {t.redGames ? fmtPct(t.redWins / t.redGames) : "-"}
              </td>
              <td className="num muted">
                {t.kills} / {t.deaths}
              </td>
              <td className="num muted">{(t.dragons / t.games).toFixed(2)}</td>
              <td className="num muted">{(t.barons / t.games).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Overview({ meta }: { meta: Meta }) {
  const ov = useMemo(() => buildOverview(meta), [meta]);
  const maxStage = Math.max(1, ...ov.stageRows.map((s) => s.games));

  return (
    <div className="page">
      <section className="hero">
        <div className="hero-eyebrow">LEAGUE OF LEGENDS · SEASON 16</div>
        <h1>
          2026 全球总决赛<span className="hero-dot">·</span>数据总览
        </h1>
        <p className="hero-sub">
          {ov.firstDate} — {ov.lastDate} · 补丁 {ov.patches.join(" / ")} · 入围赛 + 瑞士轮 + 淘汰赛
          全部 {ov.totalGames} 局
        </p>
      </section>

      <section className="kpis">
        <Kpi label="对局" value={String(ov.totalGames)} hint="含入围赛 22 局" />
        <Kpi label="系列赛" value={String(ov.totalSeries)} hint="BO3 / BO5" />
        <Kpi label="队伍" value={String(ov.teamCount)} hint="来自 5 个赛区" />
        <Kpi label="出场选手" value={String(ov.playerCount)} hint="每局 10 人" />
        <Kpi label="平均时长" value={fmtDuration(ov.avgDurationSec)} hint={ov.shortest && ov.longest ? "最短 " + fmtDuration(ov.shortest.game.duration_seconds) + " / 最长 " + fmtDuration(ov.longest.game.duration_seconds) : undefined} />
        <Kpi label="登场英雄" value={String(ov.championPicked)} hint={"另有 " + ov.championBanned + " 个只上 ban 位"} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>赛程阶段分布</h2>
            <span className="panel-note">局数 / 系列赛</span>
          </div>
          <ul className="stage-list">
            {ov.stageRows.map((s) => (
              <li key={s.tournament + s.stage}>
                <span className="stage-label">{s.label}</span>
                <span className="stage-bar">
                  <span className="stage-bar-fill" style={{ width: (s.games / maxStage) * 100 + "%" }} />
                </span>
                <span className="stage-value">
                  {s.games} <small>/ {s.seriesCount}</small>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="panel-head">
            <h2>最新战报</h2>
            <Link className="panel-link" to="/matches">
              全部比赛 →
            </Link>
          </div>
          <ul className="match-list">
            {ov.recentSeries.map((s) => (
              <li key={s.series_id}>
                <span className="match-date">{s.date.slice(5)}</span>
                <span className="match-stage">{stageLabel(s.tournament, s.stage)}</span>
                <span className="match-teams">{s.label}</span>
                <span className="match-score">{s.score}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <h2>队伍战绩</h2>
          <span className="panel-note">按胜率排序 · 胜率仅统计场次不区分对手强度</span>
        </div>
        <TeamTable rows={ov.teams} />
      </section>

      <div className="grid-2">
        <section className="panel">
          <div className="panel-head">
            <h2>出场最多</h2>
            <span className="panel-note">BP 选择次数</span>
          </div>
          <ChampionList rows={ov.topPicks} metric="picks" />
        </section>
        <section className="panel">
          <div className="panel-head">
            <h2>Ban 位最热</h2>
            <span className="panel-note">被禁用次数</span>
          </div>
          <ChampionList rows={ov.topBans} metric="bans" />
        </section>
      </div>
    </div>
  );
}
