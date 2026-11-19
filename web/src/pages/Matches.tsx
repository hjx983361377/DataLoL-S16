import { useMemo, useState } from "react";
import type { Meta } from "../lib/types";
import { filterSeries, seriesOptions, stageLabel } from "../lib/stats";

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

  return (
    <div className="page">
      <section className="page-head">
        <h1>比赛列表</h1>
        <p className="hero-sub">
          共 {rows.length} 个系列赛 · 点击筛选阶段、队伍查看具体对阵
        </p>
      </section>

      <div className="filters">
        <label>
          赛事
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
        <label>
          阶段
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="ALL">全部阶段</option>
            {stages.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          队伍
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="ALL">全部队伍</option>
            {opts.teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
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
      </div>

      {rows.length === 0 ? (
        <div className="state">
          <p>没有符合条件的比赛。</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table matches">
            <thead>
              <tr>
                <th className="num">日期</th>
                <th>阶段</th>
                <th>对阵</th>
                <th className="num">比分</th>
                <th className="num">局数</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.series_id}>
                  <td className="num muted">{s.date}</td>
                  <td>
                    <span className="pill">{stageLabel(s.tournament, s.stage)}</span>
                  </td>
                  <td>
                    <span className="vs-row">
                      {s.teams[0] && meta.teams[s.teams[0]]?.logo ? (
                        <img
                          className="team-logo sm"
                          src={meta.teams[s.teams[0]].logo}
                          alt={s.teams[0]}
                          loading="lazy"
                        />
                      ) : null}
                      <span>{s.teams[0] ?? "?"}</span>
                      <span className="vs">vs</span>
                      <span>{s.teams[1] ?? "?"}</span>
                      {s.teams[1] && meta.teams[s.teams[1]]?.logo ? (
                        <img
                          className="team-logo sm"
                          src={meta.teams[s.teams[1]].logo}
                          alt={s.teams[1]}
                          loading="lazy"
                        />
                      ) : null}
                    </span>
                  </td>
                  <td className="num score">{s.score}</td>
                  <td className="num muted">{s.score.split(" - ").reduce((a, b) => a + Number(b), 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
