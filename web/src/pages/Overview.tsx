import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Meta, Series } from "../lib/types";
import { series } from "../lib/data";
import {
  buildOverview,
  fmtDuration,
  fmtPct,
  stageLabel,
  type ChampionRow,
  type TeamRow
} from "../lib/stats";
import Reveal from "../components/Reveal";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden="true">
      <path d="M12 4v16M6 14l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TeamTable({ rows }: { rows: TeamRow[] }) {
  return (
    <div className="table-wrap">
      <table className="table teams-table">
        <thead>
          <tr>
            <th className="num">#</th>
            <th>队伍</th>
            <th className="num">场次</th>
            <th className="num">胜 – 负</th>
            <th className="num">胜率</th>
            <th className="num">蓝方</th>
            <th className="num">红方</th>
            <th className="num">K / D</th>
            <th className="num">场均小龙</th>
            <th className="num">场均大龙</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t, i) => (
            <tr key={t.name}>
              <td className="num rank">{i + 1}</td>
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
                <span className="muted"> – </span>
                <span className="loss">{t.losses}</span>
              </td>
              <td className="num">
                <span className="rate-cell">
                  <span className="rate-bar">
                    <span className="rate-fill" style={{ width: t.winRate * 100 + "%" }} />
                  </span>
                  <span>{fmtPct(t.winRate)}</span>
                </span>
              </td>
              <td className="num muted">{t.blueGames ? fmtPct(t.blueWins / t.blueGames) : "—"}</td>
              <td className="num muted">{t.redGames ? fmtPct(t.redWins / t.redGames) : "—"}</td>
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

function ChampionRows({ rows, metric }: { rows: ChampionRow[]; metric: "picks" | "bans" }) {
  return (
    <ul className="champ-list">
      {rows.map((r, i) => {
        const count = metric === "picks" ? r.picks : r.bans;
        return (
          <li className="champ-row" key={r.name}>
            <span className="champ-rank">{i + 1}</span>
            {r.icon ? (
              <img className="champ-icon" src={r.icon} alt={r.nameZh} />
            ) : (
              <span className="champ-icon" />
            )}
            <span className="champ-name">
              <b>{r.nameZh}</b>
              <small>{r.name}</small>
            </span>
            <span className="champ-count">{count}</span>
            <span className="champ-extra">
              {metric === "picks"
                ? "胜率 " + (r.winRate === null ? "—" : fmtPct(r.winRate))
                : "出场率 " + fmtPct(r.presenceRate)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function scoreParts(score: string): [number, number] {
  const parts = score.split(/\s*[-–]\s*/).map((x) => Number(x));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) return [parts[0], parts[1]];
  return [0, 0];
}

function RecentRow({ s }: { s: Series }) {
  const [a, b] = scoreParts(s.score);
  const t0 = s.teams[0] ?? "?";
  const t1 = s.teams[1] ?? "?";
  return (
    <li className="recent-row">
      <span className="recent-date">{s.date.slice(5)}</span>
      <span className="recent-stage">{stageLabel(s.tournament, s.stage)}</span>
      <span className="recent-teams">
        <span className={a > b ? "won" : ""}>{t0}</span>
        <span className="vs"> vs </span>
        <span className={b > a ? "won" : ""}>{t1}</span>
      </span>
      <span className="recent-score">
        {a} – {b}
      </span>
    </li>
  );
}

export default function Overview({ meta }: { meta: Meta }) {
  const ov = useMemo(() => buildOverview(meta), [meta]);
  const maxStage = Math.max(1, ...ov.stageRows.map((s) => s.games));

  const finals = useMemo(() => {
    const list = series.filter((s) => s.stage === "FINALS");
    return list.length ? list[list.length - 1] : null;
  }, []);

  const finalsView = useMemo(() => {
    if (!finals) return null;
    const parts = finals.score.split("-").map((x) => Number(x.trim()));
    const a = { name: finals.teams[0] ?? "?", score: parts[0] ?? 0 };
    const b = { name: finals.teams[1] ?? "?", score: parts[1] ?? 0 };
    const first = a.score >= b.score ? a : b;
    const second = a.score >= b.score ? b : a;
    return { first, second, games: a.score + b.score };
  }, [finals]);

  const heroSplash =
    meta.champions["Ezreal"]?.splash ??
    ov.topPicks.map((c) => meta.champions[c.name]?.splash).find(Boolean) ??
    "";

  const playInGames = series.filter((s) => s.tournament.includes("Play-In")).length ? 22 : 0;

  const kpis = [
    { value: String(ov.totalGames), label: "局比赛", hint: "入围赛 22 局 + 正赛 76 局" },
    { value: String(ov.totalSeries), label: "个系列赛", hint: "BO3 / BO5" },
    { value: String(ov.teamCount), label: "支队伍", hint: "来自 5 个赛区" },
    { value: String(ov.playerCount), label: "位选手", hint: "每局 10 人" },
    { value: fmtDuration(ov.avgDurationSec), label: "场均时长", hint: ov.shortest && ov.longest ? "最短 " + fmtDuration(ov.shortest.game.duration_seconds) + " · 最长 " + fmtDuration(ov.longest.game.duration_seconds) : undefined },
    { value: String(ov.championPicked), label: "个英雄登场", hint: "另有 " + ov.championBanned + " 个只上 ban 位" }
  ];

  return (
    <div className="page">
      <section className="hero">
        <p className="eyebrow rise d1">League of Legends · Season 16</p>
        <h1 className="rise d2">
          九十八局。
          <br />
          一个赛季。
        </h1>
        <p className="hero-sub rise d3">
          从 10 月 15 日的入围赛到 11 月 14 日的总决赛：{ov.totalSeries} 个系列赛、{ov.teamCount} 支队伍、{ov.playerCount} 位选手，每一局的 BP 与胜负。
        </p>
        <div className="hero-actions rise d4">
          <Link className="btn btn-primary" to="/matches">
            浏览全部比赛
            <Chevron />
          </Link>
          <a className="link-arrow" href="#season">
            先看总览
            <ArrowDown />
          </a>
        </div>

        <Reveal delay={120}>
          <div className="hero-media">
            <div className="hero-media-bg" style={{ backgroundImage: "url(" + heroSplash + ")" }} />
            <div className="hero-media-body">
              <p className="media-eyebrow">总决赛 · {finals?.date ?? "2026-11-14"}</p>
              {finalsView ? (
                <>
                  <p className="media-teams">
                    {finalsView.first.name} vs {finalsView.second.name}
                  </p>
                  <p className="media-score">
                    {finalsView.first.score} – {finalsView.second.score}
                  </p>
                  <p className="media-note">
                    {finalsView.games} 局 · 补丁 {finals?.patch ?? "16.20"} · 冠军 {finalsView.first.name}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section" id="season">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">赛季概览</p>
            <h2 className="section-title">把 98 局，压成几个数。</h2>
            <p className="section-note">
              全部数字来自逐局抓取的原始页面快照，而不是二手整理。日期、补丁、BP 顺序、经济曲线都保留在原始数据里。
            </p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="stats-grid">
            {kpis.map((k) => (
              <div className="stat" key={k.label}>
                <p className="stat-value">{k.value}</p>
                <p className="stat-label">{k.label}</p>
                {k.hint ? <p className="stat-hint">{k.hint}</p> : null}
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      <div className="grid-two">
        <Reveal>
          <div>
            <div className="subhead">
              <h3>赛程阶段</h3>
              <span>局数 / 系列赛</span>
            </div>
            <ul className="row-list">
              {ov.stageRows.map((s) => (
                <li className="row" key={s.tournament + s.stage}>
                  <span className="stage-name">{s.label}</span>
                  <span className="stage-bar">
                    <i style={{ width: (s.games / maxStage) * 100 + "%" }} />
                  </span>
                  <span className="stage-value">
                    {s.games} <small>/ {s.seriesCount}</small>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal delay={100}>
          <div>
            <div className="subhead">
              <h3>最新战报</h3>
              <Link className="link-arrow" to="/matches">
                全部比赛
                <Chevron />
              </Link>
            </div>
            <ul className="row-list">
              {ov.recentSeries.map((s) => (
                <RecentRow key={s.series_id} s={s} />
              ))}
            </ul>
          </div>
        </Reveal>
      </div>

      <section className="section">
        <Reveal>
          <div className="subhead">
            <h2 className="section-title">队伍战绩</h2>
            <span>按胜率排序，不区分对手强度</span>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <TeamTable rows={ov.teams} />
        </Reveal>
      </section>

      <section className="section">
        <Reveal>
          <div className="section-head">
            <p className="eyebrow">英雄焦点</p>
            <h2 className="section-title">这个版本，谁被围绕着打。</h2>
            <p className="section-note">
              出场最多的四个英雄。胜率按"选到该英雄的一方是否取胜"统计，包含所有 98 局。
            </p>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="tiles">
            {ov.topPicks.slice(0, 4).map((c) => {
              const splash = meta.champions[c.name]?.splash;
              return (
                <div className="tile" key={c.name}>
                  {splash ? <img src={splash} alt={c.nameZh + " 原画"} /> : null}
                  <div className="tile-body">
                    <p className="tile-name">{c.nameZh}</p>
                    <p className="tile-en">{c.name}</p>
                    <p className="tile-meta">
                      {c.picks} 次出场 · 胜率 {c.winRate === null ? "—" : fmtPct(c.winRate)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </Reveal>
      </section>

      <div className="grid-two">
        <Reveal>
          <div>
            <div className="subhead">
              <h3>出场最多</h3>
              <span>BP 选择次数</span>
            </div>
            <ChampionRows rows={ov.topPicks} metric="picks" />
          </div>
        </Reveal>
        <Reveal delay={100}>
          <div>
            <div className="subhead">
              <h3>Ban 位最热</h3>
              <span>被禁用次数</span>
            </div>
            <ChampionRows rows={ov.topBans} metric="bans" />
          </div>
        </Reveal>
      </div>
    </div>
  );
}