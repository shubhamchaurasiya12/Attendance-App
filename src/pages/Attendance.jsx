import { useEffect, useState } from "react";
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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  // 🔥 REALTIME WORKERS
  useEffect(() => {
    const unsub = subscribeWorkers(setWorkers);
    return () => unsub();
  }, []);

  // 🔥 REALTIME ATTENDANCE
  useEffect(() => {
    const unsub = subscribeAttendance(setAttendance);
    return () => unsub();
  }, []);

  const activeWorkers = workers.filter((w) => w.isActive);

  // 🔥 AUTO BUILD DRAFT FROM FIRESTORE
  useEffect(() => {
    const initial = {};

    activeWorkers.forEach((w) => {
      const existing = attendance.find(
        (a) => a.workerId === w.id && a.date === date
      );

      initial[w.id] = {
        status: existing?.status || null,
        advance: existing?.advance || 0,
      };
    });

    setDraft(initial);
  }, [workers, attendance, date]);

  const setStatus = (workerId, status) => {
    setDraft((prev) => ({
      ...prev,
      [workerId]: { ...prev[workerId], status },
    }));
  };

  const setAdvance = (workerId, value) => {
    setDraft((prev) => ({
      ...prev,
      [workerId]: {
        ...prev[workerId],
        advance: Number(value) || 0,
      },
    }));
  };

  const isUnmarked = (workerId) => !draft[workerId]?.status;

  const unmarkedCount = activeWorkers.filter((w) =>
    isUnmarked(w.id)
  ).length;

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(""), 1500);
  };

  // 🔥 SAVE DIRECTLY TO FIRESTORE
  const handleSave = async () => {
    if (isSaving) return;
    if (!confirm("Save attendance?")) return;

    setIsSaving(true);

    try {
      await Promise.all(
        activeWorkers.map((w) => {
          const entry = createAttendanceEntry({
            workerId: w.id,
            date,
            status:
              draft[w.id]?.status ||
              ATTENDANCE_STATUS.ABSENT,
            advance: draft[w.id]?.advance,
          });

          return upsertAttendance(entry);
        })
      );

      showMessage("Saved!");
    } catch (err) {
      console.error(err);
      showMessage("Save failed");
    }

    setTimeout(() => setIsSaving(false), 1500);
  };

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header */}
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Attendance</h1>
            <p style={s.subHeading}>
              {unmarkedCount > 0
                ? `${unmarkedCount} worker${unmarkedCount !== 1 ? "s" : ""} not marked`
                : "All workers marked"}
            </p>
          </div>
          <div style={s.dateWrapper}>
            <label style={s.dateLabel}>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={s.dateInput}
            />
          </div>
        </div>

        {/* Toast message */}
        {message && <div style={s.toast}>{message}</div>}

        {/* Workers list */}
        {activeWorkers.length === 0 ? (
          <div style={s.emptyState}>
            <span style={s.emptyIcon}>👷</span>
            <p>No active workers</p>
          </div>
        ) : (
          <div style={s.listContainer}>
            {activeWorkers.map((w) => {
              const current = draft[w.id] || {};
              const selectedStatus = current.status;

              return (
                <div key={w.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <strong style={s.workerName}>{w.name}</strong>
                    {selectedStatus && (
                      <span style={s.statusBadge}>
                        {selectedStatus === ATTENDANCE_STATUS.FULL && "8h"}
                        {selectedStatus === ATTENDANCE_STATUS.OVERTIME && "12h"}
                        {selectedStatus === ATTENDANCE_STATUS.ABSENT && "Absent"}
                      </span>
                    )}
                  </div>

                  <div style={s.statusButtons}>
                    <button
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.ABSENT)}
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#f1f5f9" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#cbd5e1" : "#e2e8f0",
                        color: "#1e293b",
                      }}
                    >
                      Absent
                    </button>
                    <button
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.FULL)}
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.FULL ? "#e0e7ff" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.FULL ? "#a5b4fc" : "#e2e8f0",
                        color: selectedStatus === ATTENDANCE_STATUS.FULL ? "#4338ca" : "#1e293b",
                      }}
                    >
                      8h
                    </button>
                    <button
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.OVERTIME)}
                      style={{
                        ...s.statusBtn,
                        background: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#fef3c7" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#fcd34d" : "#e2e8f0",
                        color: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#b45309" : "#1e293b",
                      }}
                    >
                      12h
                    </button>
                  </div>

                  <div style={s.advanceField}>
                    <label style={s.advanceLabel}>Advance (₹)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={current.advance || ""}
                      onChange={(e) => setAdvance(w.id, e.target.value)}
                      style={s.advanceInput}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save button */}
        {activeWorkers.length > 0 && (
          <div style={s.footer}>
            <button
              onClick={handleSave}
              disabled={isSaving}
              style={{
                ...s.saveBtn,
                opacity: isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? "Saving..." : "Save attendance"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// 🎨 Clean, minimal styling
const s = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    maxWidth: "720px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "20px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: "-0.01em",
    margin: "0 0 6px 0",
  },
  subHeading: {
    fontSize: "14px",
    color: "#475569",
    margin: 0,
  },
  dateWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  dateLabel: {
    fontSize: "12px",
    fontWeight: "500",
    color: "#64748b",
    letterSpacing: "0.3px",
  },
  dateInput: {
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "40px",
    fontSize: "14px",
    fontFamily: "inherit",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s",
  },
  toast: {
    background: "#1e293b",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "40px",
    fontSize: "14px",
    textAlign: "center",
    marginBottom: "24px",
    width: "fit-content",
    marginLeft: "auto",
    marginRight: "auto",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fff",
    borderRadius: "24px",
    border: "1px solid #f1f5f9",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
    opacity: 0.7,
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  card: {
    background: "#fff",
    borderRadius: "24px",
    padding: "20px",
    border: "1px solid #f0f2f5",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.02)",
    transition: "all 0.2s",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px",
  },
  workerName: {
    fontSize: "18px",
    fontWeight: "600",
    color: "#0f172a",
  },
  statusBadge: {
    fontSize: "12px",
    fontWeight: "500",
    background: "#f1f5f9",
    padding: "4px 10px",
    borderRadius: "30px",
    color: "#334155",
  },
  statusButtons: {
    display: "flex",
    gap: "10px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  statusBtn: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "40px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
    background: "#fff",
    textAlign: "center",
  },
  advanceField: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
  advanceLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
  },
  advanceInput: {
    flex: 1,
    padding: "8px 12px",
    border: "1px solid #e2e8f0",
    borderRadius: "24px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
  },
  footer: {
    marginTop: "40px",
    display: "flex",
    justifyContent: "flex-end",
  },
  saveBtn: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "40px",
    padding: "12px 28px",
    fontSize: "15px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
    width: "100%",
    maxWidth: "200px",
  },
};

// Add interactive hover/focus styles dynamically
const addStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    button, input[type="date"], input[type="number"] {
      transition: all 0.2s ease;
    }
    button:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(0.96);
    }
    input:focus, input[type="date"]:focus, input[type="number"]:focus {
      border-color: #a5b4fc !important;
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }
    div[style*="border-radius: 24px"]:hover {
      border-color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
  `;
  document.head.appendChild(styleSheet);
};

if (typeof document !== "undefined") {
  addStyles();
}