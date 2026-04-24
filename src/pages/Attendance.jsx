import { useEffect, useState } from "react";
import {
  getWorkers,
  getAttendance,
  upsertAttendance,
} from "../services/storage";
import { getTodayDate } from "../utils/date";
import { ATTENDANCE_STATUS } from "../utils/constants";
import { createAttendanceEntry } from "../utils/attendance";
import { syncToCloud } from "../services/sync";

export default function Attendance() {
  const [workers, setWorkers] = useState([]);
  const [date, setDate] = useState(getTodayDate());
  const [draft, setDraft] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    setWorkers(getWorkers());
  }, []);

  const activeWorkers = workers.filter((w) => w.isActive);

  useEffect(() => {
    const attendance = getAttendance();
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
  }, [date, workers]);

  const setStatus = (workerId, status) => {
    setDraft((prev) => ({
      ...prev,
      [workerId]: { ...prev[workerId], status },
    }));
  };

  const setAdvance = (workerId, value) => {
    setDraft((prev) => ({
      ...prev,
      [workerId]: { ...prev[workerId], advance: Number(value) || 0 },
    }));
  };

  const isUnmarked = (workerId) => !draft[workerId]?.status;

  const unmarkedCount = activeWorkers.filter((w) => isUnmarked(w.id)).length;

  const showMessage = (text, type = "info") => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(""), 1800);
  };

  const handleSave = () => {
    if (isSaving) return;
    if (!confirm("Save attendance for this date?")) return;
    setIsSaving(true);
    try {
      activeWorkers.forEach((w) => {
        const entry = createAttendanceEntry({
          workerId: w.id,
          date,
          status: draft[w.id]?.status || ATTENDANCE_STATUS.ABSENT,
          advance: draft[w.id]?.advance,
        });
        upsertAttendance(entry);
      });
      showMessage("Attendance saved!", "success");
    } catch (err) {
      console.error(err);
      showMessage("Save failed", "error");
    }
    setTimeout(() => setIsSaving(false), 1800);
  };

  const handleSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await syncToCloud();
      showMessage("Synced successfully!", "success");
    } catch (err) {
      console.error(err);
      showMessage("Sync failed", "error");
    }
    setTimeout(() => setIsSyncing(false), 2000);
  };

  const getInitials = (name) =>
    name.trim().split(" ").map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  const statusLabel = (status) => {
    if (status === ATTENDANCE_STATUS.FULL)     return "Present — 8 hrs";
    if (status === ATTENDANCE_STATUS.OVERTIME) return "Overtime — 12 hrs";
    if (status === ATTENDANCE_STATUS.ABSENT)   return "Absent";
    return "Not marked yet";
  };

  const statusOptions = [
    { key: ATTENDANCE_STATUS.ABSENT,   label: "Absent", activeStyle: s.btnAbsentActive },
    { key: ATTENDANCE_STATUS.FULL,     label: "8 hrs",  activeStyle: s.btnFullActive   },
    { key: ATTENDANCE_STATUS.OVERTIME, label: "12 hrs", activeStyle: s.btnOTActive     },
  ];

  return (
    // Outer wrapper: fills the scroll container passed down from App.jsx
    <div style={s.page}>

      {/* ── STICKY HEADER ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.heading}>Attendance</h2>
          <p style={s.subHeading}>
            {activeWorkers.length === 0
              ? "No active workers"
              : unmarkedCount > 0
              ? `${unmarkedCount} worker${unmarkedCount > 1 ? "s" : ""} unmarked`
              : "All workers marked ✓"}
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={isSyncing}
          style={{ ...s.syncBtn, opacity: isSyncing ? 0.5 : 1 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
            style={{ marginRight: "5px", flexShrink: 0 }}>
            <path d="M4 12a8 8 0 0114.93-4M20 12a8 8 0 01-14.93 4"
              stroke="#534AB7" strokeWidth="2.2" strokeLinecap="round"/>
            <path d="M18.5 4.5L19 8h-3.5M5.5 19.5L5 16h3.5"
              stroke="#534AB7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {isSyncing ? "Syncing..." : "Sync"}
        </button>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={s.body}>

        {/* Date picker */}
        <div style={s.dateCard}>
          <label style={s.dateLabel}>Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={s.dateInput}
          />
        </div>

        {/* Toast */}
        {message && (
          <div style={{
            ...s.toast,
            background:  messageType === "success" ? "#EAF3DE" : messageType === "error" ? "#FAECE7" : "#EEEDFE",
            color:       messageType === "success" ? "#3B6D11" : messageType === "error" ? "#993C1D" : "#3C3489",
            borderColor: messageType === "success" ? "#97C459" : messageType === "error" ? "#F0997B" : "#AFA9EC",
          }}>
            {message}
          </div>
        )}

        {/* Worker cards */}
        {activeWorkers.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>👷</div>
            <p style={s.emptyTitle}>No active workers</p>
            <p style={s.emptyHint}>Add or restore workers from the Workers tab</p>
          </div>
        ) : (
          <div style={s.list}>
            {activeWorkers.map((w) => {
              const current = draft[w.id] || {};
              const unmarked = isUnmarked(w.id);

              return (
                <div
                  key={w.id}
                  style={{
                    ...s.card,
                    borderColor: unmarked ? "#FAC775" : "#eeecfd",
                    background:  unmarked ? "#FAEEDA" : "#ffffff",
                  }}
                >
                  {/* Top row */}
                  <div style={s.cardTop}>
                    <div style={{
                      ...s.avatar,
                      background: unmarked ? "#FAC775" : "#EEEDFE",
                      color:      unmarked ? "#633806" : "#3C3489",
                    }}>
                      {getInitials(w.name)}
                    </div>

                    <div style={s.workerInfo}>
                      <p style={s.workerName}>{w.name}</p>
                      <p style={{
                        ...s.workerStatus,
                        color: unmarked
                          ? "#854F0B"
                          : current.status === ATTENDANCE_STATUS.ABSENT
                          ? "#993C1D"
                          : "#3B6D11",
                      }}>
                        {statusLabel(current.status)}
                      </p>
                    </div>

                    {!unmarked && (
                      <span style={{
                        ...s.statusDot,
                        background: current.status === ATTENDANCE_STATUS.ABSENT
                          ? "#FAECE7"
                          : current.status === ATTENDANCE_STATUS.OVERTIME
                          ? "#EEEDFE"
                          : "#EAF3DE",
                        color: current.status === ATTENDANCE_STATUS.ABSENT
                          ? "#993C1D"
                          : current.status === ATTENDANCE_STATUS.OVERTIME
                          ? "#3C3489"
                          : "#3B6D11",
                      }}>
                        {current.status === ATTENDANCE_STATUS.ABSENT
                          ? "A"
                          : current.status === ATTENDANCE_STATUS.FULL
                          ? "8h" : "12h"}
                      </span>
                    )}
                  </div>

                  {/* Status buttons */}
                  <div style={s.statusRow}>
                    {statusOptions.map((opt) => (
                      <button
                        key={opt.key}
                        style={{
                          ...s.statusBtn,
                          ...(current.status === opt.key ? opt.activeStyle : {}),
                        }}
                        onClick={() => setStatus(w.id, opt.key)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {/* Advance */}
                  <div style={s.advanceRow}>
                    <label style={s.advanceLabel}>Advance (₹)</label>
                    <input
                      type="number"
                      inputMode="numeric"
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
      </div>

      {/* ── STICKY SAVE FOOTER ── */}
      {activeWorkers.length > 0 && (
        <div style={s.saveFooter}>
          {unmarkedCount > 0 && (
            <p style={s.saveWarning}>
              {unmarkedCount} unmarked worker{unmarkedCount > 1 ? "s" : ""} will be saved as Absent
            </p>
          )}
          <button
            style={{ ...s.saveBtn, opacity: isSaving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Attendance"}
          </button>
        </div>
      )}

    </div>
  );
}

const s = {
  // Fills the scroll container from App.jsx — no min-height or padding-bottom hacks
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100%",           // fills the content div in App.jsx exactly
    background: "#f4f3ff",
    overflow: "hidden",       // page itself doesn't scroll — body div does
  },

  // ── Sticky header — never scrolls away
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 16px 12px",
    background: "#ffffff",
    borderBottom: "1px solid #eeecfd",
    flexShrink: 0,            // won't compress
  },
  heading: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 1.2,
  },
  subHeading: {
    fontSize: "12px",
    color: "#888",
    marginTop: "2px",
  },
  syncBtn: {
    display: "flex",
    alignItems: "center",
    height: "34px",
    padding: "0 14px",
    background: "#EEEDFE",
    color: "#534AB7",
    border: "1.5px solid #AFA9EC",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
  },

  // ── Scrollable middle — grows to fill remaining space
  body: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    padding: "0 0 8px 0",
  },

  // ── Date card
  dateCard: {
    background: "#ffffff",
    margin: "10px 12px 0",
    borderRadius: "14px",
    padding: "12px 16px",
    border: "1px solid #eeecfd",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  dateLabel: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#555",
  },
  dateInput: {
    height: "36px",
    padding: "0 10px",
    border: "1.5px solid #e4e2f8",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#1a1a2e",
    background: "#faf9ff",
    outline: "none",
    WebkitAppearance: "none",
  },

  // ── Toast
  toast: {
    margin: "8px 12px 0",
    padding: "9px 14px",
    borderRadius: "10px",
    border: "1px solid",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
  },

  // ── Empty state
  emptyState: {
    margin: "12px",
    padding: "36px 20px",
    background: "#ffffff",
    border: "2px dashed #d6d3f5",
    borderRadius: "16px",
    textAlign: "center",
  },
  emptyIcon:  { fontSize: "36px", marginBottom: "10px" },
  emptyTitle: { fontSize: "15px", fontWeight: "600", color: "#444" },
  emptyHint:  { fontSize: "13px", color: "#aaa", marginTop: "6px", lineHeight: 1.5 },

  // ── Worker list
  list: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "10px 12px 0",
  },

  // ── Worker card
  card: {
    borderRadius: "14px",
    border: "1.5px solid",
    padding: "12px 14px",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  avatar: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  workerInfo: { flex: 1, minWidth: 0 },
  workerName: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a2e",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  workerStatus: {
    fontSize: "12px",
    fontWeight: "500",
    marginTop: "2px",
  },
  statusDot: {
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 9px",
    borderRadius: "20px",
    flexShrink: 0,
  },

  // ── Status buttons
  statusRow: {
    display: "flex",
    gap: "6px",
    marginBottom: "10px",
  },
  statusBtn: {
    flex: 1,
    height: "38px",
    border: "1.5px solid #e4e2f8",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: "600",
    background: "#faf9ff",
    color: "#888",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },
  btnAbsentActive: {
    background: "#FAECE7",
    borderColor: "#F0997B",
    color: "#993C1D",
  },
  btnFullActive: {
    background: "#EAF3DE",
    borderColor: "#97C459",
    color: "#3B6D11",
  },
  btnOTActive: {
    background: "#EEEDFE",
    borderColor: "#7F77DD",
    color: "#3C3489",
  },

  // ── Advance input
  advanceRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  advanceLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#888",
    flexShrink: 0,
  },
  advanceInput: {
    flex: 1,
    height: "38px",
    padding: "0 12px",
    border: "1.5px solid #e4e2f8",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#1a1a2e",
    background: "#faf9ff",
    outline: "none",
    WebkitAppearance: "none",
    boxSizing: "border-box",
  },

  // ── Sticky save footer — pinned to bottom of page, above nav
  saveFooter: {
    padding: "10px 12px",
    background: "#f4f3ff",
    borderTop: "1px solid #eeecfd",
    flexShrink: 0,            // never shrinks away
  },
  saveWarning: {
    fontSize: "12px",
    color: "#854F0B",
    background: "#FAEEDA",
    border: "1px solid #FAC775",
    borderRadius: "8px",
    padding: "7px 12px",
    marginBottom: "8px",
    textAlign: "center",
    fontWeight: "500",
  },
  saveBtn: {
    width: "100%",
    height: "48px",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    WebkitTapHighlightColor: "transparent",
  },
};