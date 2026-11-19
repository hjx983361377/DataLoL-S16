import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import { buildChampions, fmtPct, roleLabel, type ChampionSummary } from "../lib/stats";
import { useTrailEntry } from "../lib/trail";

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" className="chev">
      <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SORTS = [
  { key: "picks", label: "出场" },
  { key: "winRate", label: "胜率" },
  { key: "bans", label: "被 Ban" },
  { key: "presence", label: "BP 率" }
] as const;

type SortKey = (typeof SORTS)[number]["key"];

function sortRows(rows: ChampionSummary[], key: SortKey): ChampionSummary[] {
  const copy = [...rows];
  if (key === "winRate") {
    return copy.sort((a, b) => (b.winRate ?? -1) - (a.winRate ?? -1) || b.picks - a.picks);
  }
  if (key === "bans") return copy.sort((a, b) => b.bans - a.bans || b.picks - a.picks);
  if (key === "presence") {
    return copy.sort((a, b) => b.presenceGames - a.presenceGames || b.picks - a.picks);
  }
  return copy.sort((a, b) => b.picks - a.picks || b.bans - a.bans || a.name.localeCompare(b.name));
}

export default function Champions({ meta }: { meta: Meta }) {
  useTrailEntry("英雄榜");
  const all = useMemo(() => buildChampions(meta), [meta]);
  const [role, setRole] = useState("ALL");
  const [sort, setSort] = useState<SortKey>("picks");

  const picked = useMemo(() => all.filter((c) => c.picks > 0).length, [all]);
  const bannedOnly = all.length - picked;

  const rows = useMemo(() => {
    const filtered = all.filter((c) => role === "ALL" || c.roles[0]?.role === role);
    return sortRows(filtered, sort);
  }, [all, role, sort]);

  const dirty = role !== "ALL" || sort !== "picks";

  return (
    <div className="page">
      <section className="page-head">
        <p className="eyebrow rise d1">2026 全球总决赛</p>
        <h1 className="rise d2">英雄榜</h1>
        <p className="section-note rise d3">
          {all.length} 个英雄进入 BP：{picked} 个登场，{bannedOnly} 个只上 ban
          位。按位置筛选，点名字查看使用队伍、选手与逐局记录。
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
              setSort("picks");
            }}
          >
            重置
          </button>
        ) : null}
        <span className="filter-count">{rows.length} 个英雄</span>
      </div>

      {rows.length === 0 ? (
        <div className="state">
          <h2>没有符合条件的英雄</h2>
          <p>换个位置试试。</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table champions-table">
            <thead>
              <tr>
                <th className="num">#</th>
                <th>英雄</th>
                <th>位置</th>
                <th className="num">出场</th>
                <th className="num">胜 – 负</th>
                <th className="num">胜率</th>
                <th className="num">被 Ban</th>
                <th className="num">BP 率</th>
                <th aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => {
                const primary = c.roles[0]?.role ?? null;
                return (
                  <tr key={c.name}>
                    <td className="num rank">{i + 1}</td>
                    <td>
                      <Link className="champ-cell" to={"/champion/" + c.slug}>
                        {c.icon ? <img className="champ-icon" src={c.icon} alt="" loading="lazy" /> : null}
                        <span className="champ-cell-text">
                          <span className="champ-cell-name">{c.nameZh}</span>
                          <span className="champ-cell-en">{c.key}</span>
                        </span>
                      </Link>
                    </td>
                    <td>{primary ? <span className="role-tag">{roleLabel(primary)}</span> : <span className="muted">—</span>}</td>
                    <td className="num">{c.picks}</td>
                    <td className="num">
                      {c.picks ? (
                        <>
                          <span className="win">{c.wins}</span>
                          <span className="muted"> – </span>
                          <span className="loss">{c.losses}</span>
                        </>
                      ) : (
                        <span className="muted">—</span>
                      )}
                    </td>
                    <td className="num">
                      {c.winRate === null ? (
                        <span className="muted">—</span>
                      ) : (
                        <span className="rate-cell">
                          <span className="rate-bar">
                            <span className="rate-fill" style={{ width: c.winRate * 100 + "%" }} />
                          </span>
                          <span>{fmtPct(c.winRate)}</span>
                        </span>
                      )}
                    </td>
                    <td className="num">{c.bans}</td>
                    <td className="num muted">{fmtPct(c.presenceRate)}</td>
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
