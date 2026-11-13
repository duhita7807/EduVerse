import React, { useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Light/dark switch. The initial theme is set in index.html before first paint. */
const ThemeToggle = () => {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || "light");
  const next = theme === "dark" ? "light" : "dark";

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("eduverse_theme", next);
    } catch {
      /* storage unavailable: theme still applies for this visit */
    }
    setTheme(next);
  };

  return (
    <button type="button" className="icon-btn theme-toggle" onClick={toggle} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`}>
      {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
};

export default ThemeToggle;
