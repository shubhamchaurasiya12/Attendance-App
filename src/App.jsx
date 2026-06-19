import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";

import Workers from "./pages/Workers";
import Attendance from "./pages/Attendance";
import WorkerDetails from "./pages/WorkerDetails";

// ── Icons – updated to use white for inactive, light for active ──
const IconWorkers = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8"/>
    <path d="M2 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 11c1.657 0 3 1.343 3 3v6" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="17" cy="8" r="2.5" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8"/>
  </svg>
);

const IconAttendance = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8"/>
    <path d="M16 3v4M8 3v4M3 10h18" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 15l2.5 2.5L16 13" stroke={active ? "#FFFFFF" : "rgba(255,255,255,0.55)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── AppShell ──
function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/worker/");

  return (
    <div style={s.container}>
      <div style={s.content}>
        <Routes>
          <Route path="/" element={<Workers />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/worker/:id" element={<WorkerDetails />} />
        </Routes>
      </div>

      {!hideNav && (
        <nav style={s.nav}>
          <NavLink to="/" style={s.navLink}>
            {({ isActive }) => (
              <div style={s.navItem}>
                <IconWorkers active={isActive} />
                <span style={{
                  ...s.navLabel,
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                  fontWeight: isActive ? "600" : "500",
                }}>
                  Workers
                </span>
              </div>
            )}
          </NavLink>

          <NavLink to="/attendance" style={s.navLink}>
            {({ isActive }) => (
              <div style={s.navItem}>
                <IconAttendance active={isActive} />
                <span style={{
                  ...s.navLabel,
                  color: isActive ? "#FFFFFF" : "rgba(255,255,255,0.55)",
                  fontWeight: isActive ? "600" : "500",
                }}>
                  Attendance
                </span>
              </div>
            )}
          </NavLink>
        </nav>
      )}
    </div>
  );
}

// ── Root ──
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

// 🎨 Updated styles – dark theme with glassmorphism
const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#0B0B16",      // matches page background
    fontFamily: "'Inter', sans-serif",
    overflow: "hidden",
  },
  content: {
    flex: 1,
    overflow: "auto",
    // let the page components handle their own scroll
  },
  nav: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "rgba(11, 11, 22, 0.75)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    padding: "6px 16px 10px",
    paddingBottom: "calc(10px + env(safe-area-inset-bottom, 0px))",
    flexShrink: 0,
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
    padding: "6px 0",
    transition: "transform 0.2s ease",
    borderRadius: "30px",
    padding: "6px 14px",
  },
  navLabel: {
    fontSize: "11px",
    letterSpacing: "0.3px",
    transition: "color 0.2s ease",
  },
  navLink: {
    textDecoration: "none",
    borderRadius: "40px",
    padding: "2px 6px",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
    // subtle active background highlight
  },
};

// Add hover effect (subtle lift) and active background
const addNavStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    a[href="/"]:hover div, a[href="/attendance"]:hover div {
      transform: translateY(-1px);
    }
    a[href="/"].active div, a[href="/attendance"].active div {
      background: rgba(255,255,255,0.08);
      border-radius: 30px;
    }
  `;
  document.head.appendChild(styleSheet);
};

if (typeof document !== "undefined") {
  addNavStyles();
}