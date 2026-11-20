import type { PlayerRadar } from "../lib/stats";

export interface RadarSeries {
  key: string;
  label: string;
  color: string;
  radar: PlayerRadar;
}

const CX = 180;
const CY = 166;
const R = 112;
const RINGS = [0.25, 0.5, 0.75, 1];

const angle = (i: number) => ((-90 + i * 60) * Math.PI) / 180;

const point = (i: number, ratio: number): [number, number] => [
  CX + Math.cos(angle(i)) * R * ratio,
  CY + Math.sin(angle(i)) * R * ratio
];

const ringPoints = (count: number, ratio: number) =>
  Array.from({ length: count }, (_, i) =>
    point(i, ratio)
      .map((n) => n.toFixed(1))
      .join(",")
  ).join(" ");

export function AbilityRadar({ series }: { series: RadarSeries[] }) {
  const axes = series[0]?.radar.axes ?? [];
  if (!axes.length) return null;

  return (
    <svg
      className="radar-svg"
      viewBox="0 0 360 336"
      role="img"
      aria-label={
        "能力雷达：" +
        series.map((s) => s.label + " " + s.radar.axes.map((a) => a.label + a.pct).join("、")).join("；")
      }
    >
      {RINGS.map((ratio) => (
        <polygon
          key={ratio}
          className={"radar-ring" + (ratio === 1 ? " outer" : "")}
          points={ringPoints(axes.length, ratio)}
        />
      ))}
      {axes.map((axis, i) => {
        const [x, y] = point(i, 1);
        return <line key={axis.key} className="radar-spoke" x1={CX} y1={CY} x2={x} y2={y} />;
      })}
      {series.map((s) => {
        const shape = s.radar.axes
          .map((axis, i) => {
            const [x, y] = point(i, Math.max(0.08, axis.pct / 100));
            return x.toFixed(1) + "," + y.toFixed(1);
          })
          .join(" ");
        return (
          <g key={s.key}>
            <polygon className="radar-area" points={shape} style={{ stroke: s.color, fill: s.color }} />
            {s.radar.axes.map((axis, i) => {
              const [x, y] = point(i, Math.max(0.08, axis.pct / 100));
              return <circle key={axis.key} className="radar-dot" cx={x} cy={y} r={2.6} style={{ fill: s.color }} />;
            })}
          </g>
        );
      })}
      {axes.map((axis, i) => {
        const cos = Math.cos(angle(i));
        const sin = Math.sin(angle(i));
        const x = CX + cos * (R + 24);
        const y = CY + sin * (R + 24);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <text
            key={axis.key}
            className="radar-axis-label"
            x={x}
            y={y}
            textAnchor={anchor}
            dominantBaseline="middle"
          >
            {axis.label}
          </text>
        );
      })}
    </svg>
  );
}
