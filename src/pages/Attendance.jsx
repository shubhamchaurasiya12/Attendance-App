import { useEffect, useState, useRef, useCallback } from "react";
import {
  subscribeWorkers,
  subscribeAttendance,
  upsertAttendance,
} from "../services/storage";
import { getTodayDate } from "../utils/date";
import { ATTENDANCE_STATUS } from "../utils/constants";
import { createAttendanceEntry } from "../utils/attendance";

export default function Attendance() {
  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [date, setDate] = useState(getTodayDate());
  const [draft, setDraft] = useState({});
  const [message, setMessage] = useState("");

  const debounceTimers = useRef({});

  useEffect(() => {
    const unsub = subscribeWorkers(setWorkers);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeAttendance(setAttendance);
    return () => unsub();
  }, []);

  const activeWorkers = workers.filter((w) => w.isActive);

  // Build draft – default to ABSENT
  useEffect(() => {
    const initial = {};
    activeWorkers.forEach((w) => {
      const existing = attendance.find(
        (a) => a.workerId === w.id && a.date === date
      );
      initial[w.id] = {
        status: existing?.status ?? ATTENDANCE_STATUS.ABSENT,
        advance: existing?.advance ?? 0,
      };
    });
    setDraft(initial);
  }, [workers, attendance, date]);

  const saveWorker = useCallback(
    async (workerId, status, advance) => {
      try {
        const entry = createAttendanceEntry({ workerId, date, status, advance });
        await upsertAttendance(entry);
        setMessage("Saved");
        setTimeout(() => setMessage(""), 1000);
      } catch (err) {
        console.error(err);
        setMessage("Save failed");
        setTimeout(() => setMessage(""), 1500);
      }
    },
    [date]
  );

  const debouncedSave = useCallback(
    (workerId, status, advance) => {
      if (debounceTimers.current[workerId]) clearTimeout(debounceTimers.current[workerId]);
      debounceTimers.current[workerId] = setTimeout(() => {
        saveWorker(workerId, status, advance);
        delete debounceTimers.current[workerId];
      }, 500);
    },
    [saveWorker]
  );

  const setStatus = (workerId, status) => {
    setDraft((prev) => {
      const newDraft = { ...prev, [workerId]: { ...prev[workerId], status } };
      debouncedSave(workerId, status, newDraft[workerId].advance);
      return newDraft;
    });
  };

  const setAdvance = (workerId, value) => {
    const numericValue = Number(value) || 0;
    setDraft((prev) => {
      const newDraft = { ...prev, [workerId]: { ...prev[workerId], advance: numericValue } };
      debouncedSave(workerId, newDraft[workerId].status, numericValue);
      return newDraft;
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0B0B16;
          -webkit-font-smoothing: antialiased;
        }
      `}</style>

      <div style={s.page}>
        {/* ─── DARK HEADER ─── */}
        <div style={s.header}>
          <div style={s.headerGlow} />
          <div style={s.headerInner}>
            <div style={s.titleGroup}>
              <h1 style={s.title}>Attendance</h1>
              <p style={s.subtitle}>Mark daily attendance</p>
            </div>
            <div style={s.statPill}>
              <span style={s.statDot} />
              {activeWorkers.length} active
            </div>
          </div>
        </div>

        {/* ─── FLOATING WHITE PANEL ─── */}
        <div style={s.panel}>
          <div style={s.handle} />

          {/* Date picker */}
          <div style={s.dateRow}>
            <label style={s.dateLabel}>Date</label>
            <input
              type="date"
              style={s.dateInput}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Toast message */}
          {message && <div style={s.toast}>{message}</div>}

          {/* Workers list */}
          {activeWorkers.length === 0 ? (
            <div style={s.empty}>
              <div style={s.emptyIcon}>👷</div>
              <p style={s.emptyTitle}>No active workers</p>
            </div>
          ) : (
            activeWorkers.map((w) => {
              const current = draft[w.id] || { status: ATTENDANCE_STATUS.ABSENT, advance: 0 };
              const selectedStatus = current.status;

              return (
                <div key={w.id} style={s.workerCard}>
                  <div style={s.workerName} title={w.name}>
                    {w.name}
                  </div>
                  <div style={s.statusGroup}>
                    <button
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#fee2e2" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#f87171" : "#ECECF2",
                        color: "#b91c1c",
                      }}
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.ABSENT)}
                    >
                      A
                    </button>
                    <button
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.FULL ? "#dcfce7" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.FULL ? "#4ade80" : "#ECECF2",
                        color: "#166534",
                      }}
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.FULL)}
                    >
                      P
                    </button>
                    <button
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#fef9c3" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#facc15" : "#ECECF2",
                        color: "#854d0e",
                      }}
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.OVERTIME)}
                    >
                      P+
                    </button>
                  </div>
                  <input
                    type="number"
                    placeholder="₹"
                    style={s.advanceInput}
                    value={current.advance || ""}
                    onChange={(e) => setAdvance(w.id, e.target.value)}
                  />
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────
const s = {
  page: {
    minHeight: "100dvh",
    background: "#0B0B16",
    fontFamily: "'Inter', sans-serif",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },

  // Dark header
  header: {
    background: "#0B0B16",
    padding: "48px 24px 28px",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  headerGlow: {
    position: "absolute",
    inset: 0,
    background:
      "radial-gradient(ellipse 340px 240px at 90% -10%, rgba(111,107,255,0.22) 0%, transparent 70%)," +
      "radial-gradient(ellipse 220px 200px at -10% 80%, rgba(138,135,255,0.12) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  headerInner: {
    maxWidth: "600px",
    margin: "0 auto",
    position: "relative",
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  titleGroup: {
    minWidth: 0,
  },
  title: {
    fontSize: "34px",
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: "-1px",
    lineHeight: 1.1,
  },
  subtitle: {
    fontSize: "14px",
    color: "rgba(255,255,255,0.60)",
    marginTop: "4px",
  },
  statPill: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 16px",
    background: "rgba(255,255,255,0.07)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: "30px",
    color: "#FFFFFF",
    fontSize: "13px",
    fontWeight: "600",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  statDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22C55E",
    boxShadow: "0 0 8px rgba(34,197,94,0.6)",
  },

  // Panel
  panel: {
    background: "#F8F9FC",
    borderRadius: "32px 32px 0 0",
    marginTop: "-16px",
    padding: "0 16px 40px",
    flex: 1,
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    boxShadow: "0 -4px 24px rgba(0,0,0,0.18)",
    position: "relative",
    zIndex: 2,
  },
  handle: {
    width: "36px",
    height: "4px",
    background: "#D1D5DB",
    borderRadius: "4px",
    margin: "14px auto 20px",
  },

  // Date picker
  dateRow: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#FFFFFF",
    borderRadius: "24px",
    padding: "16px 18px",
    marginBottom: "16px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
  },
  dateLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  dateInput: {
    flex: 1,
    background: "#F8F9FC",
    border: "1.5px solid #ECECF2",
    borderRadius: "14px",
    padding: "10px 14px",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    color: "#111827",
    outline: "none",
    transition: "all 0.2s",
    minWidth: 0,
  },

  // Toast
  toast: {
    position: "fixed",
    top: "20px",
    right: "20px",
    background: "#111827",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "500",
    zIndex: 1000,
    boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
    pointerEvents: "none",
    fontFamily: "'Inter', sans-serif",
  },

  // Worker cards
  workerCard: {
    background: "#FFFFFF",
    borderRadius: "20px",
    padding: "12px 16px",
    marginBottom: "10px",
    display: "flex",
    alignItems: "center",
    gap: "12px",
    border: "1.5px solid transparent",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
    transition: "all 0.2s",
    flexWrap: "wrap",
  },
  workerName: {
    flex: "1 1 100px",
    fontSize: "15px",
    fontWeight: "600",
    color: "#111827",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    minWidth: 0,
  },
  statusGroup: {
    display: "flex",
    gap: "8px",
    flexShrink: 0,
  },
  statusBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "44px",
    border: "1.5px solid #ECECF2",
    background: "#FFFFFF",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    transition: "all 0.15s",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    fontFamily: "'Inter', sans-serif",
  },
  advanceInput: {
    width: "80px",
    background: "#F8F9FC",
    border: "1.5px solid #ECECF2",
    borderRadius: "40px",
    padding: "10px 6px",
    fontSize: "14px",
    fontFamily: "'Inter', sans-serif",
    textAlign: "center",
    outline: "none",
    transition: "all 0.2s",
    flexShrink: 0,
  },

  // Empty
  empty: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px 0",
    color: "#9CA3AF",
  },
  emptyIcon: {
    fontSize: "36px",
    marginBottom: "12px",
  },
  emptyTitle: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#6B7280",
  },

  // Responsive
  "@media (max-width: 480px)": {
    header: {
      padding: "40px 18px 24px",
    },
    title: {
      fontSize: "28px",
    },
    statPill: {
      fontSize: "12px",
      padding: "6px 12px",
    },
    workerCard: {
      padding: "10px 12px",
      gap: "10px",
    },
    statusBtn: {
      width: "38px",
      height: "38px",
      fontSize: "13px",
    },
    advanceInput: {
      width: "70px",
      fontSize: "13px",
      padding: "8px 4px",
    },
    dateRow: {
      padding: "14px 16px",
      flexWrap: "wrap",
    },
    dateLabel: {
      width: "100%",
      marginBottom: "4px",
    },
    dateInput: {
      width: "100%",
    },
  },
};