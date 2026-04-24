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

// ── Icons ─────────────────────────────────────────
const IconWorkers = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="7" r="3.5" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8"/>
    <path d="M2 20c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M17 11c1.657 0 3 1.343 3 3v6" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="17" cy="8" r="2.5" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8"/>
  </svg>
);

const IconAttendance = ({ active }) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2.5" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8"/>
    <path d="M16 3v4M8 3v4M3 10h18" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M8 15l2.5 2.5L16 13" stroke={active ? "#4f46e5" : "#94a3b8"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── AppShell ─────────────────────────────────────
function AppShell() {
  const location = useLocation();
  const hideNav = location.pathname.startsWith("/worker/");

  return (
    <div style={s.container}>
      {/* CONTENT */}
      <div style={s.content}>
        <Routes>
          <Route path="/" element={<Workers />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/worker/:id" element={<WorkerDetails />} />
        </Routes>
      </div>

      {/* BOTTOM NAVIGATION - minimal & clean */}
      {!hideNav && (
        <nav style={s.nav}>
          <NavLink to="/" style={s.navLink}>
            {({ isActive }) => (
              <div style={s.navItem}>
                <IconWorkers active={isActive} />
                <span
                  style={{
                    ...s.navLabel,
                    color: isActive ? "#4f46e5" : "#64748b",
                    fontWeight: isActive ? "500" : "400",
                  }}
                >
                  Workers
                </span>
              </div>
            )}
          </NavLink>

          <NavLink to="/attendance" style={s.navLink}>
            {({ isActive }) => (
              <div style={s.navItem}>
                <IconAttendance active={isActive} />
                <span
                  style={{
                    ...s.navLabel,
                    color: isActive ? "#4f46e5" : "#64748b",
                    fontWeight: isActive ? "500" : "400",
                  }}
                >
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

// ── Root ─────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}

// 🎨 Minimal, clean styling for bottom navigation
const s = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f8fafc", // matches page background
  },

  content: {
    flex: 1,
    overflow: "auto",
  },

  nav: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    background: "#ffffff",
    borderTop: "1px solid #edf2f7",
    padding: "10px 16px 12px",
    boxShadow: "0 -2px 8px rgba(0, 0, 0, 0.02)",
  },

  navItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "6px 0",
  },

  navLabel: {
    fontSize: "12px",
    letterSpacing: "0.3px",
    transition: "color 0.2s ease",
  },

  navLink: {
    textDecoration: "none",
    borderRadius: "40px",
    padding: "4px 12px",
    transition: "all 0.2s ease",
  },
};

// Add subtle hover effect for nav links
const addNavStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    a[style*="text-decoration: none"]:hover div {
      transform: translateY(-1px);
    }
    a[style*="text-decoration: none"]:hover span {
      color: #4f46e5;
    }
  `;
  document.head.appendChild(styleSheet);
};

if (typeof document !== "undefined") {
  addNavStyles();
}