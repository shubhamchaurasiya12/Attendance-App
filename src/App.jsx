import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";
import { useEffect, useState } from "react";

import Workers from "./pages/Workers";
import Attendance from "./pages/Attendance";
import WorkerDetails from "./pages/WorkerDetails";

import { syncToCloud, syncFromCloud } from "./services/sync";

// ── Icons ──────────────────────────────────────────────────
const IconWorkers = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8"/>
    <path d="M2 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 11c1.657 0 3 1.343 3 3v6" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="17" cy="8" r="2.5" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8"/>
  </svg>
);

const IconAttendance = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8"/>
    <path d="M16 3v4M8 3v4M3 10h18" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 15l2.5 2.5L16 13" stroke={active ? "#534AB7" : "#aaa"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── AppShell ───────────────────────────────────────────────
function AppShell({ isSyncing, isOnline, message, onSync }) {
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/worker/");

  const navItems = [
    { to: "/",           label: "Workers",    Icon: IconWorkers    },
    { to: "/attendance", label: "Attendance", Icon: IconAttendance },
  ];

  return (
    <div style={s.container}>

      {/* ── STATUS BAR ── */}
      <div style={s.statusBar}>
        <div style={s.statusLeft}>
          <span style={{
            ...s.dot,
            background:  isOnline ? "#3B6D11"          : "#993C1D",
            boxShadow:   isOnline ? "0 0 0 3px #EAF3DE" : "0 0 0 3px #FAECE7",
          }}/>
          <span style={{
            ...s.statusText,
            color: isOnline ? "#3B6D11" : "#993C1D",
          }}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {message && (
          <span style={s.messageText}>{message}</span>
        )}

        <button
          onClick={onSync}
          disabled={isSyncing || !isOnline}
          style={{
            ...s.syncBtn,
            opacity: isSyncing || !isOnline ? 0.45 : 1,
          }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            style={{ marginRight: "5px", flexShrink: 0 }}>
            <path d="M4 12a8 8 0 0114.93-4M20 12a8 8 0 01-14.93 4"
              stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M18.5 4.5L19 8h-3.5M5.5 19.5L5 16h3.5"
              stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {/* ── SCROLLABLE CONTENT ── */}
      <div style={s.content}>
        <Routes>
          <Route path="/"           element={<Workers />}       />
          <Route path="/attendance" element={<Attendance />}    />
          <Route path="/worker/:id" element={<WorkerDetails />} />
        </Routes>
      </div>

      {/* ── BOTTOM NAV ── */}
      {!hideNav && (
        <nav style={s.nav}>
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={{ textDecoration: "none", flex: 1 }}
            >
              {({ isActive }) => (
                <div style={s.navItem}>
                  <div style={{
                    ...s.iconWrap,
                    background: isActive ? "#EEEDFE" : "transparent",
                  }}>
                    <Icon active={isActive} />
                  </div>
                  <span style={{
                    ...s.navLabel,
                    color:      isActive ? "#534AB7" : "#aaa",
                    fontWeight: isActive ? "600"     : "400",
                  }}>
                    {label}
                  </span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>
      )}

    </div>
  );
}

// ── Root ───────────────────────────────────────────────────
export default function App() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline,  setIsOnline]  = useState(navigator.onLine);
  const [message,   setMessage]   = useState("");

  useEffect(() => {
    const init = async () => {
      try { await syncFromCloud(); }
      catch { console.log("Cloud load skipped"); }
    };
    init();
  }, []);

  useEffect(() => {
    const handleOnline  = () => { setIsOnline(true);  autoSync(); };
    const handleOffline = () => { setIsOnline(false); setMessage("Offline mode"); };

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const autoSync = async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    setMessage("Syncing...");
    try {
      await syncToCloud();
      setMessage("Synced");
    } catch {
      setMessage("Sync failed");
    }
    setTimeout(() => { setIsSyncing(false); setMessage(""); }, 1500);
  };

  const handleManualSync = () => {
    if (isSyncing) return;
    autoSync();
  };

  return (
    <BrowserRouter>
      <AppShell
        isSyncing={isSyncing}
        isOnline={isOnline}
        message={message}
        onSync={handleManualSync}
      />
    </BrowserRouter>
  );
}

const s = {
  // ── Container — locked to viewport, nothing overflows
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    maxHeight: "100vh",       // lock to viewport height
    overflow: "hidden",       // prevent full-page scroll
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: "#f4f3ff",
    maxWidth: "480px",
    margin: "0 auto",
  },

  // ── Status bar — pinned at top
  statusBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    background: "#ffffff",
    borderBottom: "1px solid #eeecfd",
    minHeight: "42px",
    flexShrink: 0,            // never shrink — always visible
    gap: "8px",
  },
  statusLeft: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "12px",
    fontWeight: "600",
  },
  messageText: {
    fontSize: "12px",
    color: "#888",
    flex: 1,
    textAlign: "center",
  },
  syncBtn: {
    display: "flex",
    alignItems: "center",
    height: "30px",
    padding: "0 12px",
    fontSize: "12px",
    fontWeight: "600",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "20px",
    cursor: "pointer",
    flexShrink: 0,
  },

  // ── Content — only this div scrolls
  content: {
    flex: 1,                          // fills all space between status bar and nav
    overflowY: "auto",                // scrolls independently
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch", // smooth momentum scroll on iOS
  },

  // ── Bottom nav — pinned at bottom
  nav: {
    display: "flex",
    background: "#ffffff",
    borderTop: "1px solid #eeecfd",
    padding: "6px 16px",
    paddingBottom: "max(10px, env(safe-area-inset-bottom))", // iPhone home bar safe area
    gap: "8px",
    flexShrink: 0,            // never shrink — always visible
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "4px 0",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },
  iconWrap: {
    width: "48px",
    height: "30px",
    borderRadius: "20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    fontSize: "11px",
    letterSpacing: "0.01em",
  },
};