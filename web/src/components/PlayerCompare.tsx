import { useMemo } from "react";
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

const COLOR_A = "#8a5b18";
const COLOR_B = "#3e5d78";

interface MetricCell {
  value: number | null;
  text: string;
}

interface Metric {
  label: string;
  hint?: string;
  better: "high" | "low";
  a: MetricCell;
  b: MetricCell;
}

function leaderOf(metric: Metric): "a" | "b" | null {
  if (metric.a.value === null || metric.b.value === null) return null;
  if (Math.abs(metric.a.value - metric.b.value) < 1e-9) return null;
  if (metric.better === "high") return metric.a.value > metric.b.value ? "a" : "b";
  return metric.a.value < metric.b.value ? "a" : "b";
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
  const shared = useMemo(() => {
    if (champs.length < 2) return [] as { a: PlayerChampionRow; b: PlayerChampionRow }[];
    const other = new Map(champs[1].map((c) => [c.name, c]));
    return champs[0]
      .filter((c) => other.has(c.name))
      .map((c) => ({ a: c, b: other.get(c.name) as PlayerChampionRow }))
      .sort((x, y) => y.a.games + y.b.games - (x.a.games + x.b.games));
  }, [champs]);

  if (rows.length < 2 || !radars[0] || !radars[1]) return null;

  const [a, b] = rows;
  const kp = (i: number) => radars[i]?.axes.find((axis) => axis.key === "kp")?.value ?? null;
  const kpText = (i: number) => {
    const value = kp(i);
    return value === null ? "—" : Math.round(value * 100) + "%";
  };
  const per = (row: PlayerRow, total: number) => total / Math.max(1, row.games);
  const kdaText = (row: PlayerRow) => (row.kda === null ? "∞" : row.kda.toFixed(2));

  const metrics: Metric[] = [
    {
      label: "出场局数",
      better: "high",
      a: { value: a.games, text: String(a.games) },
      b: { value: b.games, text: String(b.games) }
    },
    {
      label: "胜率",
      better: "high",
      a: { value: a.winRate, text: fmtPct(a.winRate) },
      b: { value: b.winRate, text: fmtPct(b.winRate) }
    },
    {
      label: "KDA",
      hint: "（击杀 + 助攻）÷ 死亡",
      better: "high",
      a: { value: a.kda ?? Number.POSITIVE_INFINITY, text: kdaText(a) },
      b: { value: b.kda ?? Number.POSITIVE_INFINITY, text: kdaText(b) }
    },
    {
      label: "场均击杀",
      better: "high",
      a: { value: per(a, a.kills), text: per(a, a.kills).toFixed(1) },
      b: { value: per(b, b.kills), text: per(b, b.kills).toFixed(1) }
    },
    {
      label: "场均死亡",
      hint: "越低越好",
      better: "low",
      a: { value: per(a, a.deaths), text: per(a, a.deaths).toFixed(1) },
      b: { value: per(b, b.deaths), text: per(b, b.deaths).toFixed(1) }
    },
    {
      label: "场均助攻",
      better: "high",
      a: { value: per(a, a.assists), text: per(a, a.assists).toFixed(1) },
      b: { value: per(b, b.assists), text: per(b, b.assists).toFixed(1) }
    },
    {
      label: "分均补刀",
      better: "high",
      a: { value: a.csPerMin, text: a.csPerMin.toFixed(1) },
      b: { value: b.csPerMin, text: b.csPerMin.toFixed(1) }
    },
    {
      label: "参团率",
      hint: "（击杀 + 助攻）÷ 队伍击杀",
      better: "high",
      a: { value: kp(0), text: kpText(0) },
      b: { value: kp(1), text: kpText(1) }
    },
    {
      label: "使用英雄",
      better: "high",
      a: { value: a.championCount, text: String(a.championCount) },
      b: { value: b.championCount, text: String(b.championCount) }
    }
  ];

  const onlyA = champs[0].length - shared.length;
  const onlyB = champs[1].length - shared.length;

  return (
    <section className="section compare-panel">
      <div className="subhead">
        <h2 className="section-title">选手对比</h2>
        <span>
          {a.role === b.role
            ? "同位置对比，百分位按" + roleLabel(a.role) + "计算"
            : "位置不同，百分位按各自位置计算，形状仍可比"}
        </span>
      </div>

      <div className="compare-versus">
        <div className="compare-side">
          <PlayerAvatar row={a} size="compare-avatar" />
          <div className="compare-ident">
            <Link className="compare-name" to={"/player/" + playerSlug(a.team, a.name)}>
              {a.name}
            </Link>
            <p className="compare-meta">
              {a.team} · {roleLabel(a.role)} · {a.games} 场 {a.wins} 胜 {a.losses} 负
            </p>
          </div>
        </div>
        <div className="compare-vs" aria-hidden="true">
          VS
        </div>
        <div className="compare-side is-right">
          <PlayerAvatar row={b} size="compare-avatar" />
          <div className="compare-ident">
            <Link className="compare-name" to={"/player/" + playerSlug(b.team, b.name)}>
              {b.name}
            </Link>
            <p className="compare-meta">
              {b.team} · {roleLabel(b.role)} · {b.games} 场 {b.wins} 胜 {b.losses} 负
            </p>
          </div>
        </div>
      </div>

      <div className="compare-body">
        <div className="compare-chart">
          <AbilityRadar
            series={[
              { key: "a", label: a.name, color: COLOR_A, radar: radars[0] },
              { key: "b", label: b.name, color: COLOR_B, radar: radars[1] }
            ]}
          />
          <ul className="compare-legend">
            <li>
              <span className="legend-dot" style={{ background: COLOR_A }} />
              {a.name}
            </li>
            <li>
              <span className="legend-dot" style={{ background: COLOR_B }} />
              {b.name}
            </li>
          </ul>
        </div>
        <table className="table compare-table">
          <thead>
            <tr>
              <th>指标</th>
              <th className="num">{a.name}</th>
              <th className="num">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric) => {
              const lead = leaderOf(metric);
              return (
                <tr key={metric.label}>
                  <td className="compare-metric" title={metric.hint}>
                    {metric.label}
                  </td>
                  <td className={"num" + (lead === "a" ? " lead" : "")}>{metric.a.text}</td>
                  <td className={"num" + (lead === "b" ? " lead" : "")}>{metric.b.text}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="compare-champs">
        <div className="subhead subhead-slim">
          <h3 className="section-title">共同英雄</h3>
          <span>{shared.length ? "按双方合计出场排序" : "两位选手本届没有使用过同一个英雄"}</span>
        </div>
        {shared.length ? (
          <div className="table-wrap">
            <table className="table compare-champ-table">
              <thead>
                <tr>
                  <th>英雄</th>
                  <th className="num">{a.name}</th>
                  <th className="num">{b.name}</th>
                </tr>
              </thead>
              <tbody>
                {shared.map((pair) => (
                  <tr key={pair.a.name}>
                    <td>
                      <Link className="champ-cell" to={"/champion/" + championSlug(meta, pair.a.name)}>
                        {pair.a.icon ? <img className="champ-icon" src={pair.a.icon} alt="" loading="lazy" /> : null}
                        <span className="champ-cell-text">
                          <span className="champ-cell-name">{pair.a.nameZh}</span>
                          <span className="champ-cell-en">{pair.a.name}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="num">
                      {pair.a.games} 场 · {fmtPct(pair.a.winRate)}
                    </td>
                    <td className="num">
                      {pair.b.games} 场 · {fmtPct(pair.b.winRate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
        <p className="compare-note">
          独有英雄：{a.name} {onlyA} 个 · {b.name} {onlyB} 个；两人本届共使用 {a.championCount} / {b.championCount} 个英雄。
        </p>
      </div>
    </section>
  );
}
