import type { Meta } from "./types";
import { buildChampions, buildPlayers, buildTeams, playerSlug, roleLabel } from "./stats";

export type SearchKind = "team" | "player" | "champion";

export interface SearchItem {
  kind: SearchKind;
  /** 唯一键，用于 React key 与选中判断 */
  id: string;
  /** 主标题（中文优先） */
  label: string;
  /** 副标题（英文名 / 队伍 / 位置） */
  sub: string;
  icon: string | null;
  /** 图标兜底文字（队标缺失时用队名缩写） */
  fallback: string;
  to: string;
  /** 参与匹配的额外关键词 */
  keys: string[];
}

export interface SearchGroup {
  kind: SearchKind;
  title: string;
  items: SearchItem[];
}

const KIND_TITLE: Record<SearchKind, string> = {
  team: "战队",
  player: "选手",
  champion: "英雄"
};

function norm(s: string): string {
  return s.toLowerCase().replace(/[\s'’.·\-_/]+/g, "");
}

/** 建立跨「战队 / 选手 / 英雄」的搜索索引。 */
export function buildSearchIndex(meta: Meta): SearchItem[] {
  const items: SearchItem[] = [];

  for (const t of buildTeams(meta)) {
    items.push({
      kind: "team",
      id: "team:" + t.slug,
      label: t.name,
      sub: [t.code, t.run].filter(Boolean).join(" · "),
      icon: t.logo,
      fallback: t.code,
      to: "/team/" + t.slug,
      keys: [t.name, t.code, t.slug, t.run]
    });
  }

  for (const p of buildPlayers(meta)) {
    items.push({
      kind: "player",
      id: "player:" + p.key,
      label: p.name,
      sub: [p.team, roleLabel(p.role)].filter(Boolean).join(" · "),
      icon: p.photo,
      fallback: p.name.slice(0, 1).toUpperCase(),
      to: "/player/" + playerSlug(p.team, p.name),
      keys: [p.name, p.team, p.teamCode, roleLabel(p.role), p.topChampion?.nameZh ?? ""]
    });
  }

  for (const c of buildChampions(meta)) {
    items.push({
      kind: "champion",
      id: "champion:" + c.slug,
      label: c.nameZh,
      sub: [c.name, c.title].filter(Boolean).join(" · "),
      icon: c.icon,
      fallback: c.nameZh.slice(0, 1),
      to: "/champion/" + c.slug,
      keys: [c.nameZh, c.name, c.title ?? "", c.key]
    });
  }

  return items;
}

/** 标题命中优先于关键词命中：搜「李青」先给英雄，再给以李青为本命英雄的选手。 */
function scoreOf(item: SearchItem, raw: string): number {
  const q = norm(raw);
  if (!q) return 0;

  const label = norm(item.label);
  let best = 0;
  if (label === q) best = 120;
  else if (label.startsWith(q)) best = 100;
  else if (label.includes(q)) best = 80;

  for (const key of item.keys) {
    if (!key) continue;
    const k = norm(key);
    if (!k || k === label) continue;
    if (k === q) best = Math.max(best, 90);
    else if (k.startsWith(q)) best = Math.max(best, 70);
    else if (k.includes(q)) best = Math.max(best, 50);
  }
  return best;
}

/** 按匹配度分组返回结果；空查询返回空数组。 */
export function searchEntities(index: SearchItem[], raw: string, perGroup = 5): SearchGroup[] {
  const q = raw.trim();
  if (q.length < 1) return [];

  const scored = index
    .map((item) => ({ item, score: scoreOf(item, q) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));

  const order: SearchKind[] = ["team", "player", "champion"];
  return order
    .map((kind) => {
      const hits = scored.filter((x) => x.item.kind === kind).slice(0, perGroup);
      return {
        kind,
        title: KIND_TITLE[kind],
        items: hits.map((x) => x.item),
        score: hits.length ? hits[0].score : -1
      };
    })
    .filter((g) => g.items.length > 0)
    // 命中更强的分组排前面；同分时按 战队 → 选手 → 英雄 的顺序，键盘 Enter 才落到最相关的一条
    .sort((a, b) => b.score - a.score || order.indexOf(a.kind) - order.indexOf(b.kind))
    .map(({ kind, title, items }) => ({ kind, title, items }));
}
