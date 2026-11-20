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
  roleIndex,
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



type SortKey =
  | "kda"
  | "winRate"
  | "games"
  | "csPerMin"
  | "kills"
  | "deaths"
  | "assists"
  | "wins"
  | "losses"
  | "championCount"
  | "name"
  | "role";

type SortDir = "asc" | "desc";

interface SortSpec {
  key: SortKey;
  label: string;
  dir: SortDir;
  value: (row: PlayerRow) => number | string | null;
}

const perGame = (total: number, row: PlayerRow) => total / Math.max(1, row.games);

const SORTS: SortSpec[] = [
  { key: "kda", label: "KDA", dir: "desc", value: (row) => row.kda },
  { key: "winRate", label: "胜率", dir: "desc", value: (row) => row.winRate },
  { key: "games", label: "出场局数", dir: "desc", value: (row) => row.games },
  { key: "csPerMin", label: "分均补刀", dir: "desc", value: (row) => row.csPerMin },
  { key: "kills", label: "场均击杀", dir: "desc", value: (row) => perGame(row.kills, row) },
  { key: "deaths", label: "场均死亡", dir: "asc", value: (row) => perGame(row.deaths, row) },
  { key: "assists", label: "场均助攻", dir: "desc", value: (row) => perGame(row.assists, row) },
  { key: "wins", label: "胜场", dir: "desc", value: (row) => row.wins },
  { key: "losses", label: "负场", dir: "desc", value: (row) => row.losses },
  { key: "championCount", label: "使用英雄", dir: "desc", value: (row) => row.championCount },
  { key: "name", label: "选手名", dir: "asc", value: (row) => row.name },
  { key: "role", label: "位置", dir: "asc", value: (row) => roleIndex(row.role) }
];

const specOf = (key: SortKey) => SORTS.find((item) => item.key === key) ?? SORTS[0];
const defaultDir = (key: SortKey): SortDir => specOf(key).dir;

function sortRows(rows: PlayerRow[], key: SortKey, dir: SortDir): PlayerRow[] {
  const spec = specOf(key);
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = spec.value(a);
    const vb = spec.value(b);
    if (va === null && vb === null) return b.games - a.games;
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp =
      typeof va === "string" || typeof vb === "string"
        ? String(va).localeCompare(String(vb), "zh-Hans-CN")
        : (va as number) - (vb as number);
    if (cmp !== 0) return cmp * sign;
    return b.games - a.games;
  });
}

function SortHeader({
  label,
  sortKey,
  sort,
  dir,
  onSort,
  numeric = true
}: {
  label: string;
  sortKey: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (key: SortKey) => void;
  numeric?: boolean;
}) {
  const active = sort === sortKey;
  return (
    <th
      className={numeric ? "num" : undefined}
      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
    >
      <button
        type="button"
        className={"th-sort" + (active ? " is-on" : "")}
        onClick={() => onSort(sortKey)}
        title={"按" + label + "排序"}
      >
        {label}
      </button>
    </th>
  );
}

export default function Players({ meta }: { meta: Meta }) {
  useTrailEntry("选手榜");
  const all = useMemo(() => buildPlayers(meta), [meta]);
  const [role, setRole] = useState("ALL");
  const [team, setTeam] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("kda");
  const [dir, setDir] = useState<SortDir>("desc");
  const [params, setParams] = useSearchParams();
  const vsSlugs = (params.get("vs") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean)
    .slice(0, 3);
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
    updateVs([...vsSlugs, slug].slice(-3));
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

  const pickSort = (key: SortKey) => {
    if (key === sort) {
      setDir(dir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(key);
    setDir(defaultDir(key));
  };

  const rows = useMemo(() => {
    const filtered = all.filter(
      (p) => (role === "ALL" || p.role === role) && (team === "ALL" || p.team === team)
    );
    return sortRows(filtered, sort, dir);
  }, [all, role, team, sort, dir]);

  const dirty = role !== "ALL" || team !== "ALL" || sort !== "kda" || dir !== "desc";

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow rise d1">2026 全球总决赛</p>
        <h1 className="rise d2">选手榜</h1>
        <p className="section-note rise d3">
          96 位选手，逐局记录每位选手的英雄、KDA 与补刀。按位置与队伍筛选，点表头任意数据列切换排序，点名字进入个人页；也可以挑两到三位选手做一次正面对比。
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
          <select
            value={sort}
            onChange={(e) => {
              const key = e.target.value as SortKey;
              setSort(key);
              setDir(defaultDir(key));
            }}
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="sort-dir"
          onClick={() => setDir(dir === "asc" ? "desc" : "asc")}
          title="切换升序 / 降序"
        >
          <span className="sort-dir-caret" aria-hidden="true">
            {dir === "asc" ? "↑" : "↓"}
          </span>
          {dir === "asc" ? "升序" : "降序"}
        </button>
        {dirty ? (
          <button
            className="reset"
            onClick={() => {
              setRole("ALL");
              setTeam("ALL");
              setSort("kda");
              setDir("desc");
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
          {[0, 1, 2].map((index) => {
            const pickedRow = pickedRows[index];
            if (!pickedRow) {
              return (
                <span className="compare-slot" key={index}>
                  {["选手 A", "选手 B", "选手 C"][index]}
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
              ? "在下方列表点圆圈选两到三位选手"
              : pickedRows.length === 1
                ? "再选一位就能对比"
                : pickedRows.length === 2
                  ? "两位已就位，还可以再选一位做三人对比"
                  : "三位都选好了"}
          </span>
          {pickedRows.length ? (
            <button type="button" className="reset" onClick={() => updateVs([])}>
              清空
            </button>
          ) : null}
        </div>
      ) : null}

      {compareMode && picked.length >= 2 ? (
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
                <SortHeader label="选手" sortKey="name" sort={sort} dir={dir} onSort={pickSort} numeric={false} />
                <SortHeader label="位置" sortKey="role" sort={sort} dir={dir} onSort={pickSort} numeric={false} />
                <SortHeader label="出场" sortKey="games" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="胜 – 负" sortKey="wins" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="胜率" sortKey="winRate" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="KDA" sortKey="kda" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="场均 K / D / A" sortKey="kills" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="分均补刀" sortKey="csPerMin" sort={sort} dir={dir} onSort={pickSort} />
                <SortHeader label="英雄" sortKey="championCount" sort={sort} dir={dir} onSort={pickSort} />
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
