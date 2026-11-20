import gamesJson from "../../../data/games.json";
import seriesJson from "../../../data/series.json";
import type { Game, Meta, Series } from "./types";

export const games = gamesJson as unknown as Game[];
export const series = seriesJson as unknown as Series[];

/** 站点部署在子路径时（GitHub Pages 的 /repo/），素材路径需要带上 BASE_URL 前缀。 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
export const asset = (p: string | undefined | null): string => {
  if (!p) return "";
  if (!p.startsWith("/")) return p;
  // 已经带过前缀的不要再加一层（loadMeta 里会给部分字段补前缀）
  if (BASE && (p === BASE || p.startsWith(BASE + "/"))) return p;
  return BASE + p;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载 ${url} 失败：${res.status}`);
  return (await res.json()) as T;
}

/** 素材索引（gol.gg 英雄名 → 图标/中文名，队名 → logo）在 public/assets/data 下，运行时加载。 */
export async function loadMeta(): Promise<Meta> {
  const [championMap, teams, players, items] = await Promise.all([
    getJson<Record<string, import("./types").ChampionMeta>>(
      asset("/assets/data/champion_map.json")
    ),
    getJson<Record<string, import("./types").TeamMeta>>(
      asset("/assets/data/team_map.json")
    ),
    getJson<Record<string, import("./types").PlayerMeta>>(
      asset("/assets/data/players_meta.json")
    ),
    getJson<Record<string, import("./types").ItemMeta>>(asset("/assets/data/items_map.json"))
  ]);
  // gol.gg 的名字有时带空格/撇号（"Lee Sin" / "KhaZix"），再补一份归一化键做兜底
  const champions: Meta["champions"] = { ...championMap };
  for (const [key, value] of Object.entries(championMap)) {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!champions[norm]) champions[norm] = value;
  }
  for (const v of Object.values(champions)) {
    if (v.icon) v.icon = asset(v.icon);
    if (v.splash) v.splash = asset(v.splash);
  }
  for (const v of Object.values(teams)) if (v.logo) v.logo = asset(v.logo);
  for (const v of Object.values(players)) if (v.photo) v.photo = asset(v.photo);
  return { champions, teams, players, items };
}
