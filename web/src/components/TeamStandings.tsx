import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { fmtDuration, fmtGold, fmtPct, type TeamStatRow } from "../lib/stats";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

type SortKey =
  | "name"
  | "placement"
  | "winRate"
  | "seriesWinRate"
  | "seriesWins"
  | "games"
  | "kda"
  | "avgKills"
  | "avgDeaths"
  | "avgAssists"
  | "avgGold"
  | "goldDiff15"
  | "avgTowers"
  | "avgDragons"
  | "avgBarons"
  | "firstBloodRate"
  | "firstTowerRate"
  | "avgSeconds"
  | "blueWinRate"
  | "redWinRate"
  | "csPerMin";

type SortDir = "asc" | "desc";

interface Metric {
  key: SortKey;
  label: string;
  /** 切换到这个指标时的默认方向。 */
  dir: SortDir;
  value: (row: TeamStatRow) => number | string | null;
  format: (row: TeamStatRow) => string;
}

const signed = (value: number) =>
  (value >= 0 ? "+" : "−") + Math.abs(Math.round(value)).toLocaleString("en-US");

const METRICS: Metric[] = [
  { key: "winRate", label: "局胜率", dir: "desc", value: (r) => r.winRate, format: (r) => fmtPct(r.winRate) },
  {
    key: "seriesWinRate",
    label: "系列赛胜率",
    dir: "desc",
    value: (r) => r.seriesWinRate,
    format: (r) => fmtPct(r.seriesWinRate)
  },
  { key: "seriesWins", label: "系列赛胜场", dir: "desc", value: (r) => r.seriesWins, format: (r) => String(r.seriesWins) },
  { key: "games", label: "出场局数", dir: "desc", value: (r) => r.games, format: (r) => String(r.games) },
  { key: "kda", label: "KDA", dir: "desc", value: (r) => r.kda, format: (r) => (r.kda === null ? "∞" : r.kda.toFixed(2)) },
  { key: "avgKills", label: "场均击杀", dir: "desc", value: (r) => r.avgKills, format: (r) => r.avgKills.toFixed(1) },
  { key: "avgDeaths", label: "场均死亡", dir: "asc", value: (r) => r.avgDeaths, format: (r) => r.avgDeaths.toFixed(1) },
  { key: "avgAssists", label: "场均助攻", dir: "desc", value: (r) => r.avgAssists, format: (r) => r.avgAssists.toFixed(1) },
  { key: "avgGold", label: "场均经济", dir: "desc", value: (r) => r.avgGold, format: (r) => fmtGold(Math.round(r.avgGold)) },
  {
    key: "goldDiff15",
    label: "15 分钟经济差",
    dir: "desc",
    value: (r) => r.goldDiff15,
    format: (r) => signed(r.goldDiff15)
  },
  { key: "avgTowers", label: "场均推塔", dir: "desc", value: (r) => r.avgTowers, format: (r) => r.avgTowers.toFixed(1) },
  { key: "avgDragons", label: "场均小龙", dir: "desc", value: (r) => r.avgDragons, format: (r) => r.avgDragons.toFixed(1) },
  { key: "avgBarons", label: "场均大龙", dir: "desc", value: (r) => r.avgBarons, format: (r) => r.avgBarons.toFixed(2) },
  {
    key: "firstBloodRate",
    label: "一血率",
    dir: "desc",
    value: (r) => r.firstBloodRate,
    format: (r) => fmtPct(r.firstBloodRate)
  },
  {
    key: "firstTowerRate",
    label: "一塔率",
    dir: "desc",
    value: (r) => r.firstTowerRate,
    format: (r) => fmtPct(r.firstTowerRate)
  },
  {
    key: "blueWinRate",
    label: "蓝方胜率",
    dir: "desc",
    value: (r) => r.blueWinRate,
    format: (r) => fmtPct(r.blueWinRate)
  },
  {
    key: "redWinRate",
    label: "红方胜率",
    dir: "desc",
    value: (r) => r.redWinRate,
    format: (r) => fmtPct(r.redWinRate)
  },
  {
    key: "avgSeconds",
    label: "场均时长",
    dir: "asc",
    value: (r) => r.avgSeconds,
    format: (r) => fmtDuration(r.avgSeconds)
  },
  { key: "csPerMin", label: "分均补刀", dir: "desc", value: (r) => r.csPerMin, format: (r) => r.csPerMin.toFixed(1) },
  { key: "placement", label: "赛事名次", dir: "asc", value: (r) => r.placement, format: (r) => r.run },
  { key: "name", label: "队伍名", dir: "asc", value: (r) => r.name, format: (r) => r.name }
];

const specOf = (key: SortKey) => METRICS.find((m) => m.key === key) ?? METRICS[0];
const defaultDir = (key: SortKey): SortDir => specOf(key).dir;

function sortRows(rows: TeamStatRow[], key: SortKey, dir: SortDir): TeamStatRow[] {
  const spec = specOf(key);
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = spec.value(a);
    const vb = spec.value(b);
    if (va === null && vb === null) return a.placement - b.placement;
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp =
      typeof va === "string" || typeof vb === "string"
        ? String(va).localeCompare(String(vb), "zh-Hans-CN")
        : (va as number) - (vb as number);
    if (cmp !== 0) return cmp * sign;
    return a.placement - b.placement || b.seriesWins - a.seriesWins || a.name.localeCompare(b.name);
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
    <th className={numeric ? "num" : undefined} aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}>
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

function RunTag({ run }: { run: string }) {
  return <span className={"team-card-run" + (run === "冠军" ? " is-champion" : "")}>{run}</span>;
}

export function TeamStandings({ rows }: { rows: TeamStatRow[] }) {
  const [group, setGroup] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("winRate");
  const [dir, setDir] = useState<SortDir>("desc");

  const pickSort = (key: SortKey) => {
    if (key === sort) {
      setDir(dir === "asc" ? "desc" : "asc");
      return;
    }
    setSort(key);
    setDir(defaultDir(key));
  };

  const visible = useMemo(() => {
    const filtered = rows.filter((r) =>
      group === "ALL" ? true : group === "PLAYIN" ? r.run === "入围赛" : r.run !== "入围赛"
    );
    return sortRows(filtered, sort, dir);
  }, [rows, group, sort, dir]);

  const metric = specOf(sort);
  const podium = visible.slice(0, 3);
  const dirty = group !== "ALL" || sort !== "winRate" || dir !== "desc";

  return (
    <>
      <div className="filters">
        <label className="filter">
          <span>分组</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="ALL">全部队伍</option>
            <option value="MAIN">主赛事</option>
            <option value="PLAYIN">入围赛</option>
          </select>
        </label>
        <label className="filter">
          <span>指标</span>
          <select
            value={sort}
            onChange={(e) => {
              const key = e.target.value as SortKey;
              setSort(key);
              setDir(defaultDir(key));
            }}
          >
            {METRICS.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
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
              setGroup("ALL");
              setSort("winRate");
              setDir("desc");
            }}
          >
            重置
          </button>
        ) : null}
        <span className="filter-count">{visible.length} 支队伍</span>
      </div>

      {podium.length === 3 ? (
        <div className="rank-podium">
          {podium.map((row, i) => (
            <Link key={row.name} to={"/team/" + row.slug} className={"rank-podium-card" + (i === 0 ? " is-first" : "")}>
              <span className="rank-podium-top">
                <span className="rank-podium-num">{String(i + 1).padStart(2, "0")}</span>
                {row.logo ? (
                  <img className="rank-podium-logo" src={row.logo} alt="" loading="lazy" />
                ) : (
                  <span className="rank-podium-logo-fallback">{row.code}</span>
                )}
                <span className="rank-podium-name">{row.name}</span>
                <RunTag run={row.run} />
              </span>
              <span className="rank-podium-value">
                <b>{metric.format(row)}</b>
                <small>{metric.label}</small>
              </span>
              <span className="rank-podium-foot">
                {row.games} 局 · {row.wins}–{row.losses} · 系列赛 {row.seriesWins}–{row.seriesLosses}
              </span>
            </Link>
          ))}
        </div>
      ) : null}

      <div className="table-wrap">
        <table className="table team-rank-table">
          <thead>
            <tr>
              <th className="num">#</th>
              <SortHeader label="队伍" sortKey="name" sort={sort} dir={dir} onSort={pickSort} numeric={false} />
              <SortHeader label="赛事" sortKey="placement" sort={sort} dir={dir} onSort={pickSort} numeric={false} />
              <SortHeader label="系列赛" sortKey="seriesWins" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="局胜率" sortKey="winRate" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="KDA" sortKey="kda" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均击杀" sortKey="avgKills" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均死亡" sortKey="avgDeaths" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均经济" sortKey="avgGold" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="15′经济差" sortKey="goldDiff15" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均推塔" sortKey="avgTowers" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均小龙" sortKey="avgDragons" sort={sort} dir={dir} onSort={pickSort} />
              <SortHeader label="场均大龙" sortKey="avgBarons" sort={sort} dir={dir} onSort={pickSort} />
              <th aria-hidden="true" />
            </tr>
          </thead>
          <tbody>
            {visible.map((r, i) => (
              <tr key={r.name}>
                <td className={"num rank" + (i < 3 ? " is-top" : "")}>{i + 1}</td>
                <td>
                  <Link className="team-cell" to={"/team/" + r.slug}>
                    {r.logo ? (
                      <img className="team-logo sm" src={r.logo} alt="" loading="lazy" />
                    ) : (
                      <span className="team-logo-fallback sm">{r.code}</span>
                    )}
                    <span className="team-cell-name">{r.name}</span>
                  </Link>
                </td>
                <td>
                  <RunTag run={r.run} />
                </td>
                <td className="num">
                  <span className="win">{r.seriesWins}</span>
                  <span className="muted"> – </span>
                  <span className="loss">{r.seriesLosses}</span>
                </td>
                <td className="num">
                  <span className="rate-cell">
                    <span className="rate-bar">
                      <span className="rate-fill" style={{ width: r.winRate * 100 + "%" }} />
                    </span>
                    <span>{fmtPct(r.winRate)}</span>
                  </span>
                </td>
                <td className="num">{r.kda === null ? "∞" : r.kda.toFixed(2)}</td>
                <td className="num muted">{r.avgKills.toFixed(1)}</td>
                <td className="num muted">{r.avgDeaths.toFixed(1)}</td>
                <td className="num muted">{fmtGold(Math.round(r.avgGold))}</td>
                <td className={"num " + (r.goldDiff15 >= 0 ? "delta-up" : "delta-down")}>{signed(r.goldDiff15)}</td>
                <td className="num muted">{r.avgTowers.toFixed(1)}</td>
                <td className="num muted">{r.avgDragons.toFixed(1)}</td>
                <td className="num muted">{r.avgBarons.toFixed(2)}</td>
                <td className="chevron-cell">
                  <Chevron />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
