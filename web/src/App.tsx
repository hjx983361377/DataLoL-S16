import { useEffect, useState } from "react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { loadMeta } from "./lib/data";
import type { Meta } from "./lib/types";
import Overview from "./pages/Overview";
import Matches from "./pages/Matches";
import Players from "./pages/Players";
import Player from "./pages/Player";
import Match from "./pages/Match";

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
          <NavLink to="/" className="brand" aria-label="S16 世界赛数据中心首页">
            <span className="brand-mark">S16</span>
            <span className="brand-text">世界赛数据中心</span>
          </NavLink>
          <nav className="nav" aria-label="主导航">
            <NavLink to="/" end>
              赛事总览
            </NavLink>
            <NavLink to="/matches">比赛列表</NavLink>
            <NavLink to="/players">选手榜</NavLink>
          </nav>
        </div>
      </header>

      <main className="main">
        {error ? (
          <div className="page">
            <div className="state">
              <h2>数据加载失败</h2>
              <p>{error}</p>
            </div>
          </div>
        ) : !meta ? (
          <div className="page">
            <div className="state">
              <div className="spinner" />
              <p>正在装载 98 局比赛数据…</p>
            </div>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Overview meta={meta} />} />
            <Route path="/matches" element={<Matches meta={meta} />} />
            <Route path="/players" element={<Players meta={meta} />} />
            <Route path="/player/:slug" element={<Player meta={meta} />} />
            <Route path="/match/:seriesId" element={<Match meta={meta} />} />
            <Route
              path="*"
              element={
                <div className="page">
                  <div className="state">
                    <h2>这一页不存在</h2>
                    <p>目前上线了赛事总览、比赛列表、选手榜与单场详情。</p>
                    <Link className="link-arrow" to="/">
                      回到赛事总览
                    </Link>
                  </div>
                </div>
              }
            />
          </Routes>
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div className="footer-top">
            <p className="footer-brand">S16 世界赛数据中心</p>
            <div className="footer-links">
              <Link to="/">赛事总览</Link>
              <Link to="/matches">比赛列表</Link>
              <Link to="/players">选手榜</Link>
              <a href="https://github.com/hjx983361377/DataLoL-S16" target="_blank" rel="noreferrer">
                数据仓库
              </a>
            </div>
          </div>
          <div className="footer-fine">
            <p>
              数据来源：gol.gg 对局页逐局快照（98 局 / 46 个系列赛）· 素材：Riot DataDragon 16.20.1、lolesports API
            </p>
            <p>
              英雄联盟及其相关素材版权归 Riot Games 所有。本站为非商业的数据整理与展示，与 Riot Games 无隶属关系。
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}