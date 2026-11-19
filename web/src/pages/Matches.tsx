import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Meta, Series } from "../lib/types";
import { filterSeries, seriesOptions, stageLabel } from "../lib/stats";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function scoreParts(score: string): [number, number] {
  const parts = score.split(/\s*[-–]\s*/).map((x) => Number(x));
  if (parts.length === 2 && parts.every((n) => Number.isFinite(n))) return [parts[0], parts[1]];
  return [0, 0];
}

function SeriesItem({ s, meta }: { s: Series; meta: Meta }) {
  const [a, b] = scoreParts(s.score);
  const team0 = s.teams[0] ?? "?";
  const team1 = s.teams[1] ?? "?";
  const logo0 = meta.teams[team0]?.logo;
  const logo1 = meta.teams[team1]?.logo;
  const chip0 = meta.teams[team0]?.code ?? team0.slice(0, 3).toUpperCase();
  const chip1 = meta.teams[team1]?.code ?? team1.slice(0, 3).toUpperCase();

  return (
    <li>
      <Link className="series-row" to={"/match/" + s.series_id}>
        <span className="series-meta">
          <span className="series-date">{s.date.slice(5)}</span>
          <span className="stage-tag">{stageLabel(s.tournament, s.stage)}</span>
        </span>
        <span className="series-teams">
          <span className={"side" + (a > b ? " won" : a < b ? " lost" : "")}>
            {logo0 ? (
              <img className="team-logo sm" src={logo0} alt={team0} loading="lazy" />
            ) : (
              <span className="team-logo team-logo-fallback sm">{chip0}</span>
            )}
            <span>{team0}</span>
          </span>
          <span className="vs">vs</span>
          <span className={"side right" + (b > a ? " won" : b < a ? " lost" : "")}>
            <span>{team1}</span>
            {logo1 ? (
              <img className="team-logo sm" src={logo1} alt={team1} loading="lazy" />
            ) : (
              <span className="team-logo team-logo-fallback sm">{chip1}</span>
            )}
          </span>
        </span>
        <span className="series-score">
          {a} – {b}
        </span>
        <span className="series-games">{a + b} 局</span>
        <Chevron />
      </Link>
    </li>
  );
}

export default function Matches({ meta }: { meta: Meta }) {
  const [tournament, setTournament] = useState("ALL");
  const [stage, setStage] = useState("ALL");
  const [team, setTeam] = useState("ALL");

  const opts = useMemo(() => seriesOptions(), []);
  const rows = useMemo(() => filterSeries({ tournament, stage, team }), [tournament, stage, team]);

  const stages = useMemo(
    () => opts.stages.filter((s) => tournament === "ALL" || s.tournament === tournament),
    [opts, tournament]
  );

  const dirty = tournament !== "ALL" || stage !== "ALL" || team !== "ALL";

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow rise d1">比赛列表</p>
        <h1 className="rise d2">46 个系列赛，逐局可查。</h1>
        <p className="section-note rise d3">
          入围赛 22 局、正赛 76 局，按阶段与队伍筛选。每一行是一个系列赛（BO3 / BO5），比分在前的是胜者。
        </p>
      </section>

      <div className="filters">
        <label className="filter">
          <span>赛事</span>
          <select
            value={tournament}
            onChange={(e) => {
              setTournament(e.target.value);
              setStage("ALL");
            }}
          >
            <option value="ALL">全部赛事</option>
            {opts.tournaments.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span>阶段</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="ALL">全部阶段</option>
            {stages.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span>队伍</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="ALL">全部队伍</option>
            {opts.teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {dirty ? (
          <button
            className="reset"
            onClick={() => {
              setTournament("ALL");
              setStage("ALL");
              setTeam("ALL");
            }}
          >
            重置
          </button>
        ) : null}
        <span className="filter-count">{rows.length} 个系列赛</span>
      </div>

      {rows.length === 0 ? (
        <div className="state">
          <h2>没有符合条件的比赛</h2>
          <p>换个阶段或队伍试试。</p>
        </div>
      ) : (
        <ul className="series-list">
          {rows.map((s) => (
            <SeriesItem key={s.series_id} s={s} meta={meta} />
          ))}
        </ul>
      )}
    </div>
  );
}