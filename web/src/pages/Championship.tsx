import { useMemo } from "react";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import { asset, series } from "../lib/data";
import {
  buildTeam,
  fmtDuration,
  fmtPct,
  playerSlug,
  roleLabel,
  seriesGames,
  stageLabel,
  teamSlug,
  teamRoster
} from "../lib/stats";
import { useCrumb } from "../lib/trail";
import Reveal from "../components/Reveal";

const CHAMPION = "Bilibili Gaming";
const HOME_CRUMB = { path: "/", label: "赛事总览" };

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Championship({ meta }: { meta: Meta }) {
  const parent = useCrumb("夺冠纪念", HOME_CRUMB);

  const team = useMemo(() => buildTeam(meta, CHAMPION), [meta]);
  const roster = useMemo(() => teamRoster(meta, CHAMPION), [meta]);
  const logo = meta.teams[CHAMPION]?.logo ?? null;

  const finals = useMemo(() => series.filter((s) => s.stage === "FINALS")[0] ?? null, []);
  const finalsGames = useMemo(() => (finals ? seriesGames(finals.series_id) : []), [finals]);

  const run = useMemo(() => {
    if (!team) return [];
    return [...team.seriesRows].sort((a, b) =>
      a.series.date < b.series.date ? -1 : a.series.date > b.series.date ? 1 : a.series.series_id - b.series.series_id
    );
  }, [team]);

  if (!team) {
    return (
      <div className="page">
        <div className="state">
          <h2>没有找到冠军数据</h2>
          <Link className="link-arrow" to="/">
            回到赛事总览
          </Link>
        </div>
      </div>
    );
  }

  const avgSeconds = team.games ? team.seconds / team.games : 0;
  const avgKills = team.games ? team.kills / team.games : 0;
  const avgDeaths = team.games ? team.deaths / team.games : 0;
  const swissRows = run.filter((r) => !["QUARTERFINALS", "SEMIFINALS", "FINALS"].includes(r.series.stage));
  const swissWins = swissRows.filter((r) => r.win).length;

  const finalsScore = (finals?.score ?? "").split(/\s*[-–]\s*/).map((x) => Number(x));
  const blgIndex = finals ? finals.teams.indexOf(CHAMPION) : 0;
  const ownScore = Number.isFinite(finalsScore[blgIndex]) ? finalsScore[blgIndex] : 3;
  const oppScore = Number.isFinite(finalsScore[1 - blgIndex]) ? finalsScore[1 - blgIndex] : 1;
  const rival = finals ? finals.teams[1 - blgIndex] ?? "Gen.G" : "Gen.G";

  return (
    <div className="page">
      <nav className="crumbs" aria-label="面包屑">
        <Link to={parent.path}>{parent.label}</Link>
        <span aria-hidden="true">/</span>
        <span>夺冠纪念</span>
      </nav>

      <section className="champ-hero">
        <picture>
          <source media="(max-width: 720px)" srcSet={asset("/assets/brand/blg-champions-hero-mobile.jpg")} />
          <img
            className="champ-hero-art"
            src={asset("/assets/brand/blg-champions-hero.jpg")}
            alt="Bilibili Gaming 六名选手在 2026 全球总决赛决赛舞台上共同举起召唤师杯"
            loading="eager"
            decoding="async"
          />
        </picture>
        <div className="champ-hero-inner">
          <p className="champ-eyebrow">2026 全球总决赛 · 冠军</p>
          <h1 className="champ-title">{CHAMPION}</h1>
          <p className="champ-score">
            {ownScore} <span className="champ-dash">–</span> {oppScore}
            <span className="champ-score-note">
              {finals ? finals.date : "2026-11-14"} · 决赛 {finalsGames.length} 局 · 补丁 {finals?.patch ?? "16.20"}
            </span>
          </p>
          <p className="champ-lede">
            从瑞士轮 3 胜 2 负，到八强 3 – 0、半决赛 3 – 1、决赛 3 – 1，Bilibili Gaming 拿到队史第一座召唤师奖杯。
          </p>
          <div className="champ-actions">
            <Link className="btn btn-primary" to={"/team/" + teamSlug(CHAMPION)}>
              战队主页
              <Chevron />
            </Link>
            {finals ? (
              <Link className="link-arrow champ-link" to={"/match/" + finals.series_id}>
                看决赛逐局
              </Link>
            ) : null}
          </div>
          {logo ? <img className="champ-logo" src={logo} alt={CHAMPION + " 队标"} /> : null}
        </div>
        <p className="champ-art-credit">图：官方摄影（2026-11-14 决赛现场）</p>
      </section>

      <section className="section champ-stats">
        <Reveal>
          <div className="stats-grid">
            <div className="stat">
              <p className="stat-value">
                {team.seriesWins} – {team.seriesLosses}
              </p>
              <p className="stat-label">系列赛</p>
              <p className="stat-hint">{team.seriesRows.length} 个系列赛</p>
            </div>
            <div className="stat">
              <p className="stat-value">
                {team.wins} – {team.losses}
              </p>
              <p className="stat-label">局战绩</p>
              <p className="stat-hint">胜率 {fmtPct(team.winRate)}</p>
            </div>
            <div className="stat">
              <p className="stat-value">{fmtDuration(avgSeconds)}</p>
              <p className="stat-label">场均时长</p>
              <p className="stat-hint">共 {team.games} 局</p>
            </div>
            <div className="stat">
              <p className="stat-value">{avgKills.toFixed(1)}</p>
              <p className="stat-label">场均击杀</p>
              <p className="stat-hint">合计 {team.kills} 次</p>
            </div>
            <div className="stat">
              <p className="stat-value">{avgDeaths.toFixed(1)}</p>
              <p className="stat-label">场均阵亡</p>
              <p className="stat-hint">合计 {team.deaths} 次</p>
            </div>
            <div className="stat">
              <p className="stat-value">{swissWins}</p>
              <p className="stat-label">瑞士轮战绩</p>
              <p className="stat-hint">{swissWins} 胜 {swissRows.length - swissWins} 负出线</p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="section">
        <Reveal>
          <div className="subhead">
            <h2 className="section-title">冠军之路</h2>
            <span>{run.length} 个系列赛，按日期排列</span>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <ul className="champ-run">
            {run.map((row) => (
              <li key={row.series.series_id}>
                <Link className="champ-run-row" to={"/match/" + row.series.series_id}>
                  <span className="champ-run-date">{row.series.date.slice(5)}</span>
                  <span className="stage-tag">{stageLabel(row.series.tournament, row.series.stage)}</span>
                  <span className="champ-run-opponent">
                    {row.opponentLogo ? <img src={row.opponentLogo} alt="" loading="lazy" /> : null}
                    <span>{row.opponent}</span>
                  </span>
                  <span className="champ-run-score">
                    {row.own} – {row.opp}
                  </span>
                  <span className={"champ-run-result " + (row.win ? "win" : "loss")}>{row.win ? "胜" : "负"}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      </section>

      <section className="section">
        <Reveal>
          <div className="subhead">
            <h2 className="section-title">决赛四局</h2>
            {finals ? <span>vs {rival} · {fmtPct(ownScore / Math.max(1, finalsGames.length))} 胜率</span> : null}
          </div>
        </Reveal>
        <Reveal delay={60}>
          <ul className="champ-games">
            {finalsGames.map((game, i) => {
              const winner = game.teams.find((t) => t.win);
              const blg = game.teams.find((t) => t.name === CHAMPION);
              const other = game.teams.find((t) => t.name !== CHAMPION);
              return (
                <li key={game.game_id}>
                  <Link className="champ-game" to={"/match/" + game.series_id + "?g=" + game.game_id}>
                    <span className="champ-game-top">
                      <span className="champ-game-index">第 {i + 1} 局</span>
                      <span className="champ-game-time">{fmtDuration(game.duration_seconds)}</span>
                    </span>
                    <span className="champ-game-kda">
                      {blg?.kills ?? 0}
                      <span className="muted"> : </span>
                      {other?.kills ?? 0}
                      <small>击杀</small>
                    </span>
                    <span className={"champ-game-result " + (winner?.name === CHAMPION ? "win" : "loss")}>
                      {winner?.name === CHAMPION ? "胜" : "负"} · {winner?.name}
                    </span>
                    <span className="chev" aria-hidden="true">
                      <Chevron />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </section>

      <section className="section">
        <Reveal>
          <div className="subhead">
            <h2 className="section-title">夺冠阵容</h2>
            <span>按位置排序</span>
          </div>
        </Reveal>
        <Reveal delay={60}>
          <div className="table-wrap">
            <table className="table champ-roster">
              <thead>
                <tr>
                  <th>位置</th>
                  <th>选手</th>
                  <th className="num">出场</th>
                  <th className="num">胜 – 负</th>
                  <th className="num">K / D / A</th>
                  <th className="num">常用英雄</th>
                </tr>
              </thead>
              <tbody>
                {roster.map((p) => (
                  <tr key={p.key}>
                    <td className="muted">{roleLabel(p.role)}</td>
                    <td>
                      <Link className="player-cell" to={"/player/" + playerSlug(p.team, p.name)}>
                        {p.photo ? <img className="avatar" src={p.photo} alt="" loading="lazy" /> : <span className="avatar avatar-fallback">{p.name.slice(0, 1)}</span>}
                        <span>{p.name}</span>
                      </Link>
                    </td>
                    <td className="num">{p.games}</td>
                    <td className="num">
                      <span className="win">{p.wins}</span>
                      <span className="muted"> – </span>
                      <span className="loss">{p.losses}</span>
                    </td>
                    <td className="num muted">
                      {p.games ? ((p.kills / p.games).toFixed(1) + " / " + (p.deaths / p.games).toFixed(1) + " / " + (p.assists / p.games).toFixed(1)) : "—"}
                    </td>
                    <td className="num muted">{p.topChampion ? p.topChampion.nameZh + " · " + p.topChampion.games + " 局" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
      </section>

      <section className="section champ-epilogue">
        <Reveal>
          <p className="champ-quote">“从 10 月 23 日的瑞士轮第一场，到 11 月 14 日的决赛，26 天。”</p>
          <p className="champ-quote-note">
            本页数字取自 98 局逐局快照：{team.games} 局、{team.seriesRows.length} 个系列赛；
            决赛 4 局的比分、击杀、经济曲线可在单场页核对。
          </p>
        </Reveal>
      </section>
    </div>
  );
}
