import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { Game, Meta, PlayerStat, TeamBlock } from "../lib/types";
import {
  EVENT_CN,
  ROLE_ORDER,
  SPELL_CN,
  dragonSummary,
  findSeries,
  fmtDuration,
  fmtGold,
  playerKey,
  playerSlug,
  roleLabel,
  seriesGames,
  stageLabel
} from "../lib/stats";

/** 饰品（远见改造 / 神谕透镜 / 侦查守卫）与真眼在 items 里混排，展示时单独拎出来。 */
const TRINKETS = new Set(["3340", "3350", "3363", "3364"]);
const CONTROL_WARD = "2055";

function SideTag({ side }: { side: "blue" | "red" }) {
  return <span className={"side-tag side-" + side}>{side === "blue" ? "蓝方" : "红方"}</span>;
}

function ItemsCell({ items, meta }: { items: string[]; meta: Meta }) {
  const trinket = items.find((id) => TRINKETS.has(id)) ?? null;
  const wards = items.filter((id) => id === CONTROL_WARD).length;
  const build = items.filter((id) => id !== trinket && id !== CONTROL_WARD);
  const label = (id: string) => meta.items[id]?.name ?? id;

  return (
    <span className="equip-cell">
      {build.map((id, i) => (
        <img key={id + "-" + i} src={"/assets/items/" + id + ".png"} alt="" title={label(id)} loading="lazy" />
      ))}
      {wards > 0 ? (
        <span className="ward">
          <img src={"/assets/items/" + CONTROL_WARD + ".png"} alt="" title={label(CONTROL_WARD)} loading="lazy" />
          <span aria-hidden="true">×{wards}</span>
        </span>
      ) : null}
      {trinket ? (
        <img
          className="trinket"
          src={"/assets/items/" + trinket + ".png"}
          alt=""
          title={label(trinket)}
          loading="lazy"
        />
      ) : null}
    </span>
  );
}

function SpellsCell({ spells }: { spells: string[] }) {
  return (
    <span className="spell-cell">
      {spells.map((s) => (
        <img key={s} src={"/assets/spells/" + s + ".png"} alt="" title={SPELL_CN[s] ?? s} loading="lazy" />
      ))}
    </span>
  );
}

function GoldChart({
  minutes,
  diff,
  blueName,
  redName
}: {
  minutes: number[];
  diff: number[];
  blueName: string;
  redName: string;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => {
      const next = entries[0]?.contentRect.width ?? 0;
      if (next > 0) setWidth(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mobile = width > 0 && width < 560;
  const W = Math.max(280, Math.round(width));
  const H = mobile ? 190 : 252;
  const L = mobile ? 38 : 50;
  const R = mobile ? 10 : 18;
  const T = mobile ? 14 : 18;
  const B = mobile ? 24 : 30;
  const innerW = W - L - R;
  const innerH = H - T - B;
  const n = diff.length;
  const peak = Math.max(1000, ...diff.map((v) => Math.abs(v)));
  // 取 2000 的整数倍做半程刻度，标签永远是整 k（避免出现 ±9.5k 这种读数）
  const top = Math.max(2000, Math.ceil(peak / 2000) * 2000);
  const x = (i: number) => L + (i * innerW) / Math.max(1, n - 1);
  const y = (v: number) => T + ((top - v) / (2 * top)) * innerH;
  const base = y(0);
  const points = diff.map((v, i) => x(i).toFixed(1) + "," + y(v).toFixed(1));
  const area =
    "M " + L + "," + base.toFixed(1) + " L " + points.join(" L ") + " L " + x(n - 1).toFixed(1) + "," + base.toFixed(1) + " Z";
  const line = "M " + points.join(" L ");
  const ticks = [-top, -top / 2, 0, top / 2, top];
  const fmtK = (v: number) => (v === 0 ? "0" : (v > 0 ? "+" : "−") + Math.abs(v) / 1000 + "k");
  // 原始数据里末分钟常出现两次（整分钟 + 结束时的残分钟），刻度按分钟去重、保留最后一次出现的位置
  const lastByMinute = new Map<number, number>();
  minutes.forEach((m, i) => lastByMinute.set(m, i));
  const minuteTicks = [...lastByMinute.entries()]
    .filter(([m]) => m % 5 === 0)
    .sort((a, b) => a[0] - b[0])
    .map(([m, i]) => ({ m, i }));

  return (
    <div className="gold-chart-wrap" ref={wrapRef} style={width > 0 ? undefined : { height: H }}>
      {width > 0 ? (
        <svg
          className="gold-chart"
          viewBox={"0 0 " + W + " " + H}
          role="img"
          aria-label={"经济曲线：" + blueName + " 与 " + redName + " 的金币差"}
        >
          <defs>
            <clipPath id="gold-above">
              <rect x={L} y={T} width={innerW} height={Math.max(0, base - T)} />
            </clipPath>
            <clipPath id="gold-below">
              <rect x={L} y={base} width={innerW} height={Math.max(0, H - B - base)} />
            </clipPath>
          </defs>
          {ticks.map((v) => (
            <g key={v}>
              <line className={v === 0 ? "axis-base" : "axis"} x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
              <text x={L - 8} y={y(v) + 4} textAnchor="end">
                {fmtK(v)}
              </text>
            </g>
          ))}
          {minuteTicks.map(({ m, i }) => (
            <line className="axis-minor" key={"g" + m} x1={x(i)} x2={x(i)} y1={T} y2={H - B} />
          ))}
          <path d={area} fill="#3e5d78" fillOpacity="0.16" clipPath="url(#gold-above)" />
          <path d={area} fill="#9c3b2e" fillOpacity="0.14" clipPath="url(#gold-below)" />
          <path className="gold-line" d={line} />
          <circle className="gold-end" cx={x(n - 1)} cy={y(diff[n - 1])} r={2.6} />
          {minuteTicks.map(({ m, i }) => (
            <text key={m} x={x(i)} y={H - 7} textAnchor="middle">
              {m}'
            </text>
          ))}
        </svg>
      ) : null}
    </div>
  );
}

function Lineup({
  meta,
  game,
  team,
  side,
  players
}: {
  meta: Meta;
  game: Game;
  team: TeamBlock;
  side: "blue" | "red";
  players: PlayerStat[];
}) {
  const bans = game.bans[side];

  return (
    <div className="lineup">
      <header className="lineup-head">
        <SideTag side={side} />
        {meta.teams[team.name]?.logo ? (
          <img className="team-logo" src={meta.teams[team.name].logo} alt="" loading="lazy" />
        ) : null}
        <span className="lineup-name">{team.name}</span>
        {team.win ? <span className="win-tag">本局胜</span> : null}
        <span className="lineup-right">
          {team.kills} 杀 · {team.towers} 塔 · {team.dragons} 龙 · {team.barons} 大龙
        </span>
      </header>

      <div className="bans">
        <span className="bans-label">禁用</span>
        {bans.map((b) => {
          const c = meta.champions[b.name];
          return (
            <span className="ban" key={b.id} title={c?.name_zh ?? b.name}>
              {c?.icon ? <img src={c.icon} alt="" loading="lazy" /> : <span>{b.name.slice(0, 2)}</span>}
            </span>
          );
        })}
      </div>

      <div className="table-wrap">
        <table className="table lineup-table">
          <thead>
            <tr>
              <th>位置</th>
              <th>选手</th>
              <th>英雄</th>
              <th className="num">K / D / A</th>
              <th className="num">补刀</th>
              <th>装备</th>
              <th>召唤师技能</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => {
              const cm = meta.champions[p.champion];
              const pm = meta.players[playerKey(team.name, p.name)];
              return (
                <tr key={p.name}>
                  <td className="role-tag">{roleLabel(ROLE_ORDER[i] ?? "mid")}</td>
                  <td>
                    <Link className="player-cell" to={"/player/" + playerSlug(team.name, p.name)}>
                      {pm?.photo ? (
                        <img className="avatar" src={pm.photo} alt="" loading="lazy" />
                      ) : (
                        <span className="avatar avatar-fallback">{p.name.slice(0, 1)}</span>
                      )}
                      <span className="player-cell-body">
                        <span className="player-cell-role">{roleLabel(ROLE_ORDER[i] ?? "mid")}</span>
                        <span className="player-cell-name">{p.name}</span>
                      </span>
                    </Link>
                  </td>
                  <td>
                    <span className="champ-cell">
                      {cm?.icon ? <img className="champ-icon" src={cm.icon} alt="" loading="lazy" /> : null}
                      <span className="champ-cell-text">
                        <span className="champ-cell-name">{cm?.name_zh ?? p.champion}</span>
                        <span className="champ-cell-en">{p.champion}</span>
                      </span>
                    </span>
                  </td>
                  <td className="num">
                    {p.kda[0]} / {p.kda[1]} / {p.kda[2]}
                  </td>
                  <td className="num">{p.cs}</td>
                  <td>
                    <ItemsCell items={p.items} meta={meta} />
                  </td>
                  <td>
                    <SpellsCell spells={p.spells} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function Match({ meta }: { meta: Meta }) {
  const { seriesId } = useParams();
  const [params, setParams] = useSearchParams();

  const series = useMemo(() => {
    const id = Number(seriesId);
    return Number.isFinite(id) ? findSeries(id) : null;
  }, [seriesId]);

  const games = useMemo(() => (series ? seriesGames(series.series_id) : []), [series]);

  const wanted = params.get("g");
  const game = useMemo(
    () => games.find((g) => String(g.game_id) === wanted) ?? games[0] ?? null,
    [games, wanted]
  );

  const wins = useMemo(() => {
    const map = new Map<string, number>();
    for (const g of games) {
      const winner = g.teams.find((t) => t.win);
      if (winner) map.set(winner.name, (map.get(winner.name) ?? 0) + 1);
    }
    return map;
  }, [games]);

  if (!series || !game) {
    return (
      <div className="page">
        <div className="state">
          <h2>没有这场比赛</h2>
          <p>链接可能已经失效，或者这场比赛不在收录的 46 个系列赛里。</p>
          <Link className="link-arrow" to="/matches">
            回到比赛列表
          </Link>
        </div>
      </div>
    );
  }

  const teamA = series.teams[0] ?? "?";
  const teamB = series.teams[1] ?? "?";
  const [scoreA, scoreB] = series.score.split(/\s*[-–]\s*/);
  const target = Math.max(Number(scoreA) || 0, Number(scoreB) || 0);
  const format = target >= 3 ? "BO5" : target === 2 ? "BO3" : "BO1";

  const blue = game.teams.find((t) => t.side === "blue") ?? game.teams[0];
  const red = game.teams.find((t) => t.side === "red") ?? game.teams[1];
  const bluePlayers = game.players.filter((p) => p.team === "blue");
  const redPlayers = game.players.filter((p) => p.team === "red");
  const gameIndex = games.findIndex((g) => g.game_id === game.game_id) + 1;

  const rows = [
    { label: "击杀", a: blue.kills, b: red.kills, fmt: null },
    { label: "总经济", a: blue.gold, b: red.gold, fmt: fmtGold },
    { label: "防御塔", a: blue.towers, b: red.towers, fmt: null },
    { label: "小龙", a: blue.dragons, b: red.dragons, fmt: null },
    { label: "大龙", a: blue.barons, b: red.barons, fmt: null }
  ] as { label: string; a: number; b: number; fmt: ((n: number) => string) | null }[];

  const logoA = meta.teams[teamA]?.logo;
  const logoB = meta.teams[teamB]?.logo;
  const winsA = wins.get(teamA) ?? 0;
  const winsB = wins.get(teamB) ?? 0;

  return (
    <div className="page">
      <nav className="crumbs" aria-label="位置">
        <Link to="/matches">比赛列表</Link>
        <span aria-hidden="true">/</span>
        <span>
          {teamA} vs {teamB}
        </span>
      </nav>

      <section className="match-hero">
        <p className="eyebrow">
          2026 全球总决赛 · {stageLabel(series.tournament, series.stage)}
        </p>
        <div className="match-hero-body">
          <div className="match-side">
            {logoA ? <img className="match-logo" src={logoA} alt="" loading="lazy" /> : null}
            <div className="match-side-body">
              <p className="match-side-name">{teamA}</p>
              <p className="match-side-meta">
                {winsA} 胜 {games.length - winsA} 负
              </p>
            </div>
          </div>
          <div className="match-center">
            <p className="match-score">
              {scoreA}
              <span className="dash"> – </span>
              {scoreB}
            </p>
            <p className="match-meta">
              {format} · {games.length} 局
            </p>
          </div>
          <div className="match-side right">
            <div className="match-side-body">
              <p className="match-side-name">{teamB}</p>
              <p className="match-side-meta">
                {winsB} 胜 {games.length - winsB} 负
              </p>
            </div>
            {logoB ? <img className="match-logo" src={logoB} alt="" loading="lazy" /> : null}
          </div>
        </div>
        <p className="match-hero-foot">
          {series.date} · 补丁 {series.patch} · {series.tournament}
        </p>
      </section>

      <div className="game-tabs" role="tablist" aria-label="逐局">
        {games.map((g, i) => {
          const active = g.game_id === game.game_id;
          const winner = g.teams.find((t) => t.win);
          return (
            <button
              key={g.game_id}
              type="button"
              role="tab"
              aria-selected={active}
              className={"game-tab" + (active ? " is-active" : "")}
              onClick={() => setParams({ g: String(g.game_id) }, { replace: true })}
            >
              <span>第 {i + 1} 局</span>
              <small>
                {fmtDuration(g.duration_seconds)}
                {winner ? <span className="tab-winner"> · {winner.name}</span> : null}
              </small>
            </button>
          );
        })}
      </div>

      <section className="game-board" aria-label={"第 " + gameIndex + " 局数据"}>
        <div className="board-head">
          <div className="board-team">
            <SideTag side="blue" />
            {meta.teams[blue.name]?.logo ? (
              <img className="team-logo" src={meta.teams[blue.name].logo} alt="" loading="lazy" />
            ) : null}
            <span className="board-team-name">{blue.name}</span>
            {blue.win ? <span className="win-tag">胜</span> : null}
          </div>
          <div className="board-mid">
            <span>第 {gameIndex} 局</span>
            <span>{fmtDuration(game.duration_seconds)}</span>
          </div>
          <div className="board-team right">
            {red.win ? <span className="win-tag">胜</span> : null}
            <span className="board-team-name">{red.name}</span>
            {meta.teams[red.name]?.logo ? (
              <img className="team-logo" src={meta.teams[red.name].logo} alt="" loading="lazy" />
            ) : null}
            <SideTag side="red" />
          </div>
        </div>

        <ul className="board-rows">
          {rows.map((row) => {
            const av = row.fmt ? row.fmt(row.a) : String(row.a);
            const bv = row.fmt ? row.fmt(row.b) : String(row.b);
            return (
              <li className="board-row" key={row.label}>
                <span className={"board-value" + (row.a > row.b ? " lead" : row.a < row.b ? " muted" : "")}>{av}</span>
                <span className="board-label">{row.label}</span>
                <span
                  className={
                    "board-value right" + (row.b > row.a ? " lead" : row.b < row.a ? " muted" : "")
                  }
                >
                  {bv}
                </span>
              </li>
            );
          })}
        </ul>

        <div className="board-flags">
          <span>
            一血 <b>{blue.first_blood ? blue.name : red.first_blood ? red.name : "无"}</b>
          </span>
          <span>
            一塔 <b>{blue.first_tower ? blue.name : red.first_tower ? red.name : "无"}</b>
          </span>
          <span>
            胜方 <b>{blue.win ? blue.name : red.name}</b>
          </span>
        </div>
        <div className="board-dragons">
          <span>
            {blue.name} 小龙：{dragonSummary(blue.dragon_types)}
          </span>
          <span>
            {red.name} 小龙：{dragonSummary(red.dragon_types)}
          </span>
        </div>
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">经济曲线</h2>
          <span>蓝方经济 − 红方经济，每 5 分钟一刻度</span>
        </div>
        {game.gold_diff.diff.length > 1 ? (
          <>
            <GoldChart
              minutes={game.gold_diff.minutes}
              diff={game.gold_diff.diff}
              blueName={blue.name}
              redName={red.name}
            />
            <p className="chart-legend">
              <span>
                <i className="legend-blue" aria-hidden="true" />
                {blue.name} 领先
              </span>
              <span>
                <i className="legend-red" aria-hidden="true" />
                {red.name} 领先
              </span>
            </p>
          </>
        ) : (
          <p className="section-note">这一局没有可用的经济曲线数据。</p>
        )}
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">双方阵容</h2>
          <span>第 {gameIndex} 局 · 补丁 {game.patch}</span>
        </div>
        <div className="lineups">
          <Lineup meta={meta} game={game} team={blue} side="blue" players={bluePlayers} />
          <Lineup meta={meta} game={game} team={red} side="red" players={redPlayers} />
        </div>
      </section>

      <section className="section">
        <div className="subhead">
          <h2 className="section-title">比赛进程</h2>
          <span>{game.timeline.length} 个节点</span>
        </div>
        {game.timeline.length > 0 ? (
          <ul className="timeline">
            {game.timeline.map((e, i) => {
              const side = e.side === "red" ? "red" : "blue";
              const team = side === "blue" ? blue : red;
              const logo = meta.teams[team.name]?.logo;
              return (
                <li className="timeline-row" key={e.time + "-" + e.event + "-" + i}>
                  <span className="timeline-time">{e.time}</span>
                  <span className={"timeline-dot " + side} aria-hidden="true" />
                  <span className="timeline-event">{EVENT_CN[e.event] ?? e.event}</span>
                  <span className="timeline-team">
                    {logo ? <img className="team-logo xs" src={logo} alt="" loading="lazy" /> : null}
                    {team.name}
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="section-note">这一局没有可用的节点记录。</p>
        )}
      </section>
    </div>
  );
}
