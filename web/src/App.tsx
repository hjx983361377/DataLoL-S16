import { useEffect, useState } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import { loadMeta } from "./lib/data";
import type { Meta } from "./lib/types";
import Overview from "./pages/Overview";
import Matches from "./pages/Matches";

export default function App() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadMeta()
      .then((m) => {
        if (alive) setMeta(m);
      })
      .catch((e: unknown) => {
        if (alive) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-inner">
          <NavLink to="/" className="brand">
            <span className="brand-mark">S16</span>
            <span className="brand-text">
              世界赛数据中心
              <small>WORLDS 2026 · DATA</small>
            </span>
          </NavLink>
          <nav className="nav">
            <NavLink to="/" end>
              赛事总览
            </NavLink>
            <NavLink to="/matches">比赛列表</NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        {error ? (
          <div className="state state-error">
            <h2>数据加载失败</h2>
            <p>{error}</p>
          </div>
        ) : !meta ? (
          <div className="state">
            <div className="spinner" />
            <p>正在装载 98 局比赛数据…</p>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Overview meta={meta} />} />
            <Route path="/matches" element={<Matches meta={meta} />} />
            <Route
              path="*"
              element={
                <div className="state">
                  <h2>页面还没做</h2>
                  <p>P0 只上线了赛事总览与比赛列表，单场详情、队伍页、选手榜在 P1。</p>
                </div>
              }
            />
          </Routes>
        )}
      </main>

      <footer className="footer">
        <p>
          数据来源：gol.gg 对局页（逐局抓取快照）· 素材：Riot DataDragon 16.20.1 / lolesports API
        </p>
        <p className="muted">
          英雄联盟及其相关素材版权归 Riot Games 所有，本站为非商业数据整理与展示。
        </p>
      </footer>
    </div>
  );
}
