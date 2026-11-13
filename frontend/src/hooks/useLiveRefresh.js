import { useEffect, useRef } from "react";
import { PROFILE_UPDATED_EVENT } from "../context/AuthContext.jsx";

/**
 * Re-runs `refresh` whenever the student's data may have changed: after any
 * profile update in this tab, and when the tab regains focus (edits made in
 * another tab or by the server). Calls closer than 3s apart are skipped.
 */
const useLiveRefresh = (refresh) => {
  const fn = useRef(refresh);
  fn.current = refresh;

  useEffect(() => {
    let last = 0;
    const run = (force) => {
      if (!force && Date.now() - last < 3000) return;
      last = Date.now();
      fn.current();
    };
    const onProfile = () => run(true);
    const onFocus = () => document.visibilityState === "visible" && run(false);
    window.addEventListener(PROFILE_UPDATED_EVENT, onProfile);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener(PROFILE_UPDATED_EVENT, onProfile);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);
};

export default useLiveRefresh;
