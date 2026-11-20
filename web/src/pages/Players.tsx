import { useMemo, useState } from "react";
import { useTrailEntry } from "../lib/trail";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { ComparePanel } from "../components/PlayerCompare";
import { Link, useSearchParams } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildPlayers,
  findPlayerKey,
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
  const [params, setParams] = useSearchParams();
  const vsSlugs = (params.get("vs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 2);
  const compareMode = params.get("compare") === "1";
  const picked = useMemo(
    () => vsSlugs.map((slug) => findPlayerKey(meta, slug)).filter((key): key is string => Boolean(key)),
    [meta, vsSlugs.join(",")]
  );
  const pickedRows = useMemo(
    () => picked.map((key) => all.find((p) => p.key === key)).filter((p): p is PlayerRow => Boolean(p)),
    [all, picked.join(",")]
  );
  const pickedSet = new Set(picked);

  const updateVs = (next: string[]) => {
    const nextParams = new URLSearchParams(params);
    if (next.length) nextParams.set("vs", next.join(","));
    else nextParams.delete("vs");
    setParams(nextParams, { replace: true });
  };

  const togglePick = (row: PlayerRow) => {
    const slug = playerSlug(row.team, row.name);
    if (vsSlugs.includes(slug)) {
      updateVs(vsSlugs.filter((item) => item !== slug));
      return;
    }
    updateVs([...vsSlugs, slug].slice(-2));
  };

  const openCompare = () => {
    const nextParams = new URLSearchParams(params);
    nextParams.set("compare", "1");
    setParams(nextParams, { replace: true });
  };

  const closeCompare = () => setParams(new URLSearchParams(), { replace: true });

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
          96 位选手，逐局记录每位选手的英雄、KDA 与补刀。按位置与队伍筛选，点名字进入个人页；也可以挑两位选手做一次正面对比。
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
        <button
          type="button"
          className={"compare-toggle" + (compareMode ? " is-on" : "")}
          onClick={compareMode ? closeCompare : openCompare}
        >
          {compareMode ? "退出对比" : "选手对比"}
        </button>
        <span className="filter-count">{rows.length} 位选手</span>
      </div>

      {compareMode ? (
        <div className="compare-dock">
          <span className="compare-dock-label">对比</span>
          {[0, 1].map((index) => {
            const pickedRow = pickedRows[index];
            if (!pickedRow) {
              return (
                <span className="compare-slot" key={index}>
                  {index === 0 ? "选手 A" : "选手 B"}
                </span>
              );
            }
            const slug = playerSlug(pickedRow.team, pickedRow.name);
            return (
              <span className="compare-slot is-filled" key={index}>
                <PlayerAvatar row={pickedRow} size="compare-slot-avatar" />
                <span className="compare-slot-name">{pickedRow.name}</span>
                <span className="compare-slot-team">{pickedRow.teamCode}</span>
                <button
                  type="button"
                  className="compare-slot-x"
                  aria-label={"移除 " + pickedRow.name}
                  onClick={() => updateVs(vsSlugs.filter((item) => item !== slug))}
                >
                  ×
                </button>
              </span>
            );
          })}
          <span className="compare-dock-hint">
            {pickedRows.length === 0
              ? "在下方列表点圆圈选两位选手"
              : pickedRows.length === 1
                ? "再选一位就能对比"
                : "两位都选好了"}
          </span>
          {pickedRows.length ? (
            <button type="button" className="reset" onClick={() => updateVs([])}>
              清空
            </button>
          ) : null}
        </div>
      ) : null}

      {compareMode && picked.length === 2 ? (
        <ComparePanel meta={meta} keys={picked} />
      ) : null}

      {rows.length === 0 ? (
        <div className="state">
          <h2>没有符合条件的选手</h2>
          <p>换个位置或队伍试试。</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className={"table players-table" + (compareMode ? " is-compare" : "")}>
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
                  <tr key={p.key} className={pickedSet.has(p.key) ? "is-picked" : undefined}>
                    <td className="num rank">{i + 1}</td>
                    <td>
                      <div className="pick-row">
                        {compareMode ? (
                          <button
                            type="button"
                            className={"pick" + (pickedSet.has(p.key) ? " is-on" : "")}
                            aria-pressed={pickedSet.has(p.key)}
                            aria-label={"选择 " + p.name + " 进行对比"}
                            title="加入对比"
                            onClick={() => togglePick(p)}
                          >
                            <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true">
                              <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>
                        ) : null}
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
                      </div>
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
