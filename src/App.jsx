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

// ── Icons – redesigned to match new theme ──
const IconWorkers = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8"/>
    <path d="M2 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 11c1.657 0 3 1.343 3 3v6" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="17" cy="8" r="2.5" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8"/>
  </svg>
);

const IconAttendance = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8"/>
    <path d="M16 3v4M8 3v4M3 10h18" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 15l2.5 2.5L16 13" stroke={active ? "#1A1A1A" : "#9CA3AF"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── AppShell (decides when to hide nav) ──
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
                  color: isActive ? "#1A1A1A" : "#9CA3AF",
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
                  color: isActive ? "#1A1A1A" : "#9CA3AF",
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

// 🎨 Updated styling – matches the app’s design system
const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#F5F4F0",      // matches page background
    fontFamily: "'DM Sans', sans-serif",
  },
  content: {
    flex: 1,
    overflow: "auto",
  },
  nav: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#FFFFFF",
    borderTop: "1px solid #F0F0F0",
    padding: "8px 16px 12px",
    boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.02)",
  },
  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "5px",
    padding: "6px 0",
    transition: "transform 0.2s ease",
  },
  navLabel: {
    fontSize: "11px",
    letterSpacing: "0.3px",
    transition: "color 0.2s ease",
  },
  navLink: {
    textDecoration: "none",
    borderRadius: "40px",
    padding: "4px 12px",
    transition: "all 0.2s ease",
    WebkitTapHighlightColor: "transparent",
  },
};

// Add hover effect (subtle lift)
const addNavStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    a[href="/"]:hover div, a[href="/attendance"]:hover div {
      transform: translateY(-1px);
    }
  `;
  document.head.appendChild(styleSheet);
};

if (typeof document !== "undefined") {
  addNavStyles();
}