import gamesJson from "../../../data/games.json";
import seriesJson from "../../../data/series.json";
import type { Game, Meta, Series } from "./types";

export const games = gamesJson as unknown as Game[];
export const series = seriesJson as unknown as Series[];

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载 ${url} 失败：${res.status}`);
  return (await res.json()) as T;
}

/** 素材索引（gol.gg 英雄名 → 图标/中文名，队名 → logo）在 public/assets/data 下，运行时加载。 */
export async function loadMeta(): Promise<Meta> {
  const [championMap, teams, players, items] = await Promise.all([
    getJson<Record<string, import("./types").ChampionMeta>>(
      "/assets/data/champion_map.json"
    ),
    getJson<Record<string, import("./types").TeamMeta>>(
      "/assets/data/team_map.json"
    ),
    getJson<Record<string, import("./types").PlayerMeta>>(
      "/assets/data/players_meta.json"
    ),
    getJson<Record<string, import("./types").ItemMeta>>("/assets/data/items_map.json")
  ]);
  // gol.gg 的名字有时带空格/撇号（"Lee Sin" / "KhaZix"），再补一份归一化键做兜底
  const champions: Meta["champions"] = { ...championMap };
  for (const [key, value] of Object.entries(championMap)) {
    const norm = key.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!champions[norm]) champions[norm] = value;
  }
  return { champions, teams, players, items };
}
