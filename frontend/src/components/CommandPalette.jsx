import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, CornerDownLeft, LogOut } from "lucide-react";

/**
 * Ctrl/Cmd+K quick-jump. Lists every page the current role can reach (plus
 * log out), filters as you type, and works entirely from the keyboard:
 * up/down to move, Enter to go, Esc to close.
 */
const CommandPalette = ({ items, onClose, onLogout }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const all = useMemo(() => [...items.map((i) => ({ ...i, kind: "go" })), { label: "Log out", icon: LogOut, kind: "logout" }], [items]);
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? all.filter((i) => i.label.toLowerCase().includes(q)) : all;
  }, [all, query]);

  useEffect(() => inputRef.current?.focus(), []);
  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    listRef.current?.querySelector(".cmd-item.active")?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (item) => {
    if (!item) return;
    onClose();
    if (item.kind === "logout") onLogout();
    else navigate(item.to);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); run(results[active]); }
  };

  return (
    <div className="cmd-overlay" onMouseDown={onClose}>
      <div className="cmd" role="dialog" aria-label="Quick jump" onMouseDown={(e) => e.stopPropagation()} onKeyDown={onKeyDown}>
        <div className="cmd-input">
          <Search size={16} />
          <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Jump to a page…" aria-label="Search pages" />
          <kbd>Esc</kbd>
        </div>
        <div className="cmd-list" ref={listRef}>
          {results.length === 0 && <div className="cmd-empty">No page matches “{query}”.</div>}
          {results.map((item, i) => {
            const Icon = item.icon;
            return (
              <button key={item.label} className={`cmd-item ${i === active ? "active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => run(item)}>
                <Icon size={16} />
                <span>{item.label}</span>
                {i === active && <CornerDownLeft size={13} className="cmd-return" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
