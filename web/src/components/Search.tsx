import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Meta } from "../lib/types";
import { buildSearchIndex, searchEntities, type SearchItem } from "../lib/search";

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className="search-glyph">
      <circle cx="10.5" cy="10.5" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15.4 15.4L20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/** 把命中的片段包成 <mark>，英文按大小写不敏感匹配。 */
function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark>{text.slice(idx, idx + q.length)}</mark>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function Search({ meta }: { meta: Meta }) {
  const index = useMemo(() => buildSearchIndex(meta), [meta]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const groups = useMemo(() => searchEntities(index, query), [index, query]);
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onSlash(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      event.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onSlash);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onSlash);
    };
  }, []);

  function go(item: SearchItem) {
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
    navigate(item.to);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (!flat.length) return;
      setOpen(true);
      setActive((i) => (i + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (!flat.length) return;
      setOpen(true);
      setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      const item = flat[active];
      if (item) {
        event.preventDefault();
        go(item);
      }
    } else if (event.key === "Escape") {
      if (query) setQuery("");
      else setOpen(false);
      inputRef.current?.blur();
    }
  }

  const showPanel = open && query.trim().length > 0;
  let cursor = -1;

  return (
    <div className={"search" + (showPanel ? " is-open" : "")} ref={rootRef}>
      <div className="search-field">
        <SearchIcon />
        <input
          ref={inputRef}
          className="search-input"
          type="text"
          value={query}
          placeholder="搜索战队、选手或英雄"
          aria-label="搜索战队、选手或英雄"
          autoComplete="off"
          spellCheck={false}
          role="combobox"
          aria-expanded={showPanel}
          aria-controls="search-results"
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button
            type="button"
            className="search-clear"
            aria-label="清空搜索"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            ×
          </button>
        ) : (
          <kbd className="search-kbd">/</kbd>
        )}
      </div>

      {showPanel ? (
        <div className="search-panel" id="search-results" role="listbox">
          {groups.length ? (
            groups.map((group) => (
              <div className="search-group" key={group.kind}>
                <p className="search-group-title">{group.title}</p>
                <ul>
                  {group.items.map((item) => {
                    cursor += 1;
                    const idx = cursor;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={idx === active}
                          className={"search-item" + (idx === active ? " is-active" : "")}
                          onMouseEnter={() => setActive(idx)}
                          onClick={() => go(item)}
                        >
                          {item.icon ? (
                            <img
                              className={"search-icon search-icon-" + item.kind}
                              src={item.icon}
                              alt=""
                              loading="lazy"
                            />
                          ) : (
                            <span className={"search-icon search-icon-" + item.kind + " search-icon-fallback"}>
                              {item.fallback}
                            </span>
                          )}
                          <span className="search-text">
                            <span className="search-label">{highlight(item.label, query)}</span>
                            <span className="search-sub">{item.sub}</span>
                          </span>
                          <span className="search-kind">{group.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          ) : (
            <p className="search-empty">
              没有找到「{query.trim()}」。试试队名（BLG）、选手（Faker）或英雄（李青）。
            </p>
          )}
          <p className="search-hint">
            <span>↑ ↓ 选择</span>
            <span>Enter 打开</span>
            <span>Esc 关闭</span>
          </p>
        </div>
      ) : null}
    </div>
  );
}
