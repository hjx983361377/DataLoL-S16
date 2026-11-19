import { useMemo, useState } from "react";
import { useTrailEntry } from "../lib/trail";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildPlayers,
  fmtPct,
  playerSlug,
  roleLabel,
  type PlayerRow
} from "../lib/stats";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PlayerAvatar({ row, size }: { row: Pick<PlayerRow, "name" | "photo">; size?: string }) {
  const initial = row.name.trim().charAt(0).toUpperCase();
  return row.photo ? (
    <img className={"avatar" + (size ? " " + size : "")} src={row.photo} alt={row.name + " 头像"} loading="lazy" />
  ) : (
    <span className={"avatar avatar-fallback" + (size ? " " + size : "")} aria-hidden="true">
      {initial}
    </span>
  );
}

const SORTS = [
  { key: "kda", label: "KDA" },
  { key: "games", label: "出场局数" },
  { key: "winRate", label: "胜率" },
  { key: "csPerMin", label: "分均补刀" }
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function sortRows(rows: PlayerRow[], key: SortKey): PlayerRow[] {
  const copy = [...rows];
  if (key === "kda") return copy.sort((a, b) => (b.kda ?? -1) - (a.kda ?? -1) || b.games - a.games);
  if (key === "games") return copy.sort((a, b) => b.games - a.games || (b.kda ?? 0) - (a.kda ?? 0));
  if (key === "winRate") return copy.sort((a, b) => b.winRate - a.winRate || b.games - a.games);
  return copy.sort((a, b) => b.csPerMin - a.csPerMin || b.games - a.games);
}

export default function Players({ meta }: { meta: Meta }) {
  useTrailEntry("选手榜");
  const all = useMemo(() => buildPlayers(meta), [meta]);
  const [role, setRole] = useState("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("kda");

  const teams = useMemo(
    () => [...new Set(all.map((p) => p.team))].sort((a, b) => a.localeCompare(b)),
    [all]
  );

  const rows = useMemo(() => {
    const filtered = all.filter(
      (p) => (role === "ALL" || p.role === role) && (team === "ALL" || p.team === team)
    );
    return sortRows(filtered, sort);
  }, [all, role, team, sort]);

  const dirty = role !== "ALL" || team !== "ALL" || sort !== "kda";

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow rise d1">2026 全球总决赛</p>
        <h1 className="rise d2">选手榜</h1>
        <p className="section-note rise d3">
          96 位选手，逐局记录每位选手的英雄、KDA 与补刀。按位置与队伍筛选，点名字进入个人页。
        </p>
      </section>

      <div className="filters">
        <label className="filter">
          <span>位置</span>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="ALL">全部位置</option>
            {["top", "jungle", "mid", "bottom", "support"].map((r) => (
              <option key={r} value={r}>
                {roleLabel(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span>队伍</span>
          <select value={team} onChange={(e) => setTeam(e.target.value)}>
            <option value="ALL">全部队伍</option>
            {teams.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="filter">
          <span>排序</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        {dirty ? (
          <button
            className="reset"
            onClick={() => {
              setRole("ALL");
              setTeam("ALL");
              setSort("kda");
            }}
          >
            重置
          </button>
        ) : null}
        <span className="filter-count">{rows.length} 位选手</span>
      </div>

      {rows.length === 0 ? (
        <div className="state">
          <h2>没有符合条件的选手</h2>
          <p>换个位置或队伍试试。</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table players-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>选手</th>
                <th>位置</th>
                <th className="num">出场</th>
                <th className="num">胜 – 负</th>
                <th className="num">胜率</th>
                <th className="num">KDA</th>
                <th className="num">场均 K / D / A</th>
                <th className="num">分均补刀</th>
                <th className="num">英雄</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const link = "/player/" + playerSlug(p.team, p.name);
                return (
                  <tr key={p.key}>
                    <td className="num rank">{i + 1}</td>
                    <td>
                      <Link className="player-cell" to={link}>
                        <PlayerAvatar row={p} />
                        <span className="player-cell-body">
                          <span className="player-cell-name">{p.name}</span>
                          <span className="player-cell-team">
                            {p.teamLogo ? (
                              <img className="team-logo xs" src={p.teamLogo} alt="" loading="lazy" />
                            ) : null}
                            {p.teamCode}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td>
                      <span className="role-tag">{roleLabel(p.role)}</span>
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
                    <td className="num muted">
                      {(p.kills / p.games).toFixed(1)} / {(p.deaths / p.games).toFixed(1)} /{" "}
                      {(p.assists / p.games).toFixed(1)}
                    </td>
                    <td className="num muted">{p.csPerMin.toFixed(1)}</td>
                    <td className="num muted">{p.championCount}</td>
                    <td className="chevron-cell">
                      <Chevron />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
