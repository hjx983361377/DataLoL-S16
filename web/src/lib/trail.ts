import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";

/** 面包屑的一节：点过的页面路径与它的名字。 */
export type Crumb = { path: string; label: string };

const KEY = "s16:trail";
const MAX = 20;

function load(): Crumb[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e): e is Crumb =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as Crumb).path === "string" &&
        typeof (e as Crumb).label === "string"
    );
  } catch {
    return [];
  }
}

function save(list: Crumb[]) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // 无痕模式等场景下不记录，浏览不受影响
  }
}

/** 记下这次点击落到的页面；路径之前出现过，说明是回退，把后面的记录截掉。 */
export function rememberCrumb(path: string, label: string) {
  const list = load();
  const idx = list.findIndex((e) => e.path === path);
  const kept = idx >= 0 ? list.slice(0, idx) : list;
  save([...kept, { path, label }].slice(-MAX));
}

/** 上一级：真实点击路径里的上一页；没有记录时用 fallback。 */
export function crumbParent(path: string, fallback: Crumb): Crumb {
  const list = load();
  const idx = list.findIndex((e) => e.path === path);
  const before = idx >= 0 ? list.slice(0, idx) : list;
  return before.length ? before[before.length - 1] : fallback;
}

/** 列表页只需要把自己登记进路径，供详情页取上一级。 */
export function useTrailEntry(label: string) {
  const { pathname } = useLocation();
  useEffect(() => {
    rememberCrumb(pathname, label);
  }, [pathname, label]);
}

/** 详情页：返回上一级，同时把自己登记进点击路径。 */
export function useCrumb(label: string | null, fallback: Crumb): Crumb {
  const { pathname } = useLocation();
  const parent = useMemo(() => crumbParent(pathname, fallback), [pathname, fallback.path]);
  useEffect(() => {
    if (label) rememberCrumb(pathname, label);
  }, [pathname, label]);
  return parent;
}
