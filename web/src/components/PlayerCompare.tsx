import { Fragment, useMemo } from "react";
import { Link } from "react-router-dom";
import type { Meta } from "../lib/types";
import {
  buildPlayerRadar,
  buildPlayers,
  championSlug,
  fmtPct,
  playerChampions,
  playerSlug,
  roleLabel,
  type PlayerChampionRow,
  type PlayerRow
} from "../lib/stats";
import { AbilityRadar } from "./Radar";
import { PlayerAvatar } from "./PlayerAvatar";

const COLORS = ["#8a5b18", "#3e5d78", "#4d6b4a"];

interface MetricCell {
  value: number | null;
  text: string;
}

interface Metric {
  label: string;
  hint?: string;
  better: "high" | "low";
  cells: MetricCell[];
}

interface SharedChampion {
  champ: PlayerChampionRow;
  cells: PlayerChampionRow[];
}

function leaderIndex(metric: Metric): number | null {
  const values = metric.cells.map((cell) => cell.value);
  if (values.some((value) => value === null)) return null;
  const nums = values as number[];
  const best = metric.better === "high" ? Math.max(...nums) : Math.min(...nums);
  if (!Number.isFinite(best)) return null;
  const hits = nums.filter((value) => Math.abs(value - best) < 1e-9).length;
  if (hits !== 1) return null;
  return nums.findIndex((value) => Math.abs(value - best) < 1e-9);
}

export function ComparePanel({ meta, keys }: { meta: Meta; keys: string[] }) {
  const signal = keys.join(",");

  const rows = useMemo(() => {
    const all = buildPlayers(meta);
    return keys
      .map((key) => all.find((p) => p.key === key))
      .filter((p): p is PlayerRow => Boolean(p));
  }, [meta, signal]);

  const radars = useMemo(() => keys.map((key) => buildPlayerRadar(meta, key)), [meta, signal]);
  const champs = useMemo(() => keys.map((key) => playerChampions(meta, key)), [meta, signal]);

  const shared = useMemo<SharedChampion[]>(() => {
    if (champs.length < 2) return [];
    const maps = champs.map((list) => new Map(list.map((champ) => [champ.name, champ] as const)));
    const out: SharedChampion[] = [];
    for (const champ of champs[0]) {
      const cells = maps.map((map) => map.get(champ.name));
      if (cells.every((cell): cell is PlayerChampionRow => Boolean(cell))) {
        out.push({ champ, cells });
      }
    }
    const total = (item: SharedChampion) => item.cells.reduce((sum, cell) => sum + cell.games, 0);
    return out.sort((x, y) => total(y) - total(x));
  }, [champs]);

  const radarList = radars.filter((radar): radar is NonNullable<(typeof radars)[number]> => Boolean(radar));

  if (rows.length < 2 || radarList.length !== rows.length || champs.length !== rows.length) return null;

  const many = rows.length > 2;
  const role = rows[0].role;
  const sameRole = rows.every((row) => row.role === role);

  const kp = (index: number) => radarList[index].axes.find((axis) => axis.key === "kp")?.value ?? null;
  const kpText = (index: number) => {
    const value = kp(index);
    return value === null ? "—" : Math.round(value * 100) + "%";
  };
  const per = (row: PlayerRow, total: number) => total / Math.max(1, row.games);
  const kdaText = (row: PlayerRow) => (row.kda === null ? "∞" : row.kda.toFixed(2));
  const metric = (
    label: string,
    hint: string | undefined,
    better: "high" | "low",
    cells: MetricCell[]
  ): Metric => ({ label, hint, better, cells });

  const metrics: Metric[] = [
    metric("出场局数", undefined, "high", rows.map((row) => ({ value: row.games, text: String(row.games) }))),
    metric("胜率", undefined, "high", rows.map((row) => ({ value: row.winRate, text: fmtPct(row.winRate) }))),
    metric("KDA", "（击杀 + 助攻）÷ 死亡", "high", rows.map((row) => ({
      value: row.kda === null ? Number.POSITIVE_INFINITY : row.kda,
      text: kdaText(row)
    }))),
    metric("场均击杀", undefined, "high", rows.map((row) => ({
      value: per(row, row.kills),
      text: per(row, row.kills).toFixed(1)
    }))),
    metric("场均死亡", "越低越好", "low", rows.map((row) => ({
      value: per(row, row.deaths),
      text: per(row, row.deaths).toFixed(1)
    }))),
    metric("场均助攻", undefined, "high", rows.map((row) => ({
      value: per(row, row.assists),
      text: per(row, row.assists).toFixed(1)
    }))),
    metric("分均补刀", undefined, "high", rows.map((row) => ({
      value: row.csPerMin,
      text: row.csPerMin.toFixed(1)
    }))),
    metric("参团率", "（击杀 + 助攻）÷ 队伍击杀", "high", rows.map((row, index) => ({
      value: kp(index),
      text: kpText(index)
    }))),
    metric("使用英雄", undefined, "high", rows.map((row) => ({
      value: row.championCount,
      text: String(row.championCount)
    })))
  ];

  return (
    <section className="section compare-panel">
      <div className="subhead">
        <h2 className="section-title">选手对比</h2>
        <span>
          {sameRole
            ? "同位置对比，百分位按" + roleLabel(role) + "计算"
            : "位置不同，百分位按各自位置计算，形状仍可比"}
        </span>
      </div>

      <div className={"compare-versus" + (many ? " is-triple" : "")}>
        {rows.map((row, index) => (
          <Fragment key={row.key}>
            {!many && index === 1 ? (
              <div className="compare-vs" aria-hidden="true">
                VS
              </div>
            ) : null}
            <div
              className={
                "compare-side" +
                (!many && index === 1 ? " is-right" : "") +
                (many ? " is-column" : "")
              }
            >
              <PlayerAvatar row={row} size="compare-avatar" />
              <div className="compare-ident">
                <Link className="compare-name" to={"/player/" + playerSlug(row.team, row.name)}>
                  {many ? (
                    <span className="compare-swatch" style={{ background: COLORS[index] }} aria-hidden="true" />
                  ) : null}
                  {row.name}
                </Link>
                <p className="compare-meta">
                  {row.team} · {roleLabel(row.role)} · {row.games} 场 {row.wins} 胜 {row.losses} 负
                </p>
              </div>
            </div>
          </Fragment>
        ))}
      </div>

      <div className="compare-body">
        <div className="compare-chart">
          <AbilityRadar
            series={rows.map((row, index) => ({
              key: "p" + index,
              label: row.name,
              color: COLORS[index],
              radar: radarList[index]
            }))}
          />
          <ul className="compare-legend">
            {rows.map((row, index) => (
              <li key={row.key}>
                <span className="legend-dot" style={{ background: COLORS[index] }} />
                {row.name}
              </li>
            ))}
          </ul>
        </div>
        <table className="table compare-table">
          <thead>
            <tr>
              <th>指标</th>
              {rows.map((row) => (
                <th key={row.key} className="num">
                  {row.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((item) => {
              const lead = leaderIndex(item);
              return (
                <tr key={item.label}>
                  <td className="compare-metric" title={item.hint}>
                    {item.label}
                  </td>
                  {item.cells.map((cell, index) => (
                    <td key={rows[index].key} className={"num" + (lead === index ? " lead" : "")}>
                      {cell.text}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="compare-champs">
        <div className="subhead subhead-slim">
          <h3 className="section-title">共同英雄</h3>
          <span>
            {shared.length
              ? "按" + (many ? "三人" : "双方") + "合计出场排序"
              : many
                ? "三位选手本届没有共同使用过的英雄"
                : "两位选手本届没有使用过同一个英雄"}
          </span>
        </div>
        {shared.length ? (
          <div className="table-wrap">
            <table className="table compare-champ-table">
              <thead>
                <tr>
                  <th>英雄</th>
                  {rows.map((row) => (
                    <th key={row.key} className="num">
                      {row.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shared.map((item) => (
                  <tr key={item.champ.name}>
                    <td>
                      <Link className="champ-cell" to={"/champion/" + championSlug(meta, item.champ.name)}>
                        {item.champ.icon ? <img className="champ-icon" src={item.champ.icon} alt="" loading="lazy" /> : null}
                        <span className="champ-cell-text">
                          <span className="champ-cell-name">{item.champ.nameZh}</span>
                          <span className="champ-cell-en">{item.champ.name}</span>
                        </span>
                      </Link>
                    </td>
                    {item.cells.map((cell, index) => (
                      <td key={rows[index].key} className="num">
                        {cell.games} 场 · {fmtPct(cell.winRate)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="compare-note">
          独有英雄：
          {rows
            .map((row, index) => row.name + " " + (champs[index].length - shared.length) + " 个")
            .join(" · ")}
          ；{many ? "三人" : "两人"}本届共使用{" "}
          {rows.map((row) => row.championCount).join(" / ")} 个英雄。
        </p>
      </div>
    </section>
  );
}
