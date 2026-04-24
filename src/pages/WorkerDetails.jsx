import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  subscribeWorkers,
  subscribeAttendance,
} from "../services/storage";
import {
  calculateWorkerSummary,
  calculateDailyEarning,
} from "../utils/calculations";
import { formatDate } from "../utils/date";
import { formatWorkerSummary, shareOnWhatsApp } from "../utils/share";
import { generateWorkerPDF } from "../utils/pdf";
import { ATTENDANCE_STATUS } from "../utils/constants";

export default function WorkerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);

  const [worker, setWorker] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

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

  // 🔥 COMPUTE DATA
  useEffect(() => {
    if (!id) return;

    const selected = workers.find((w) => w.id === id);

    if (!selected) {
      setWorker(null);
      return;
    }

    const workerRecords = attendance
      .filter((a) => a.workerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const result = calculateWorkerSummary(
      id,
      attendance,
      selected.wagePer8h
    );

    setWorker(selected);
    setRecords(workerRecords);
    setSummary(result);
  }, [id, workers, attendance]);

  const handleShare = () => {
    if (!worker || !summary) return;
    shareOnWhatsApp(formatWorkerSummary(worker, summary));
  };

  const handleDownloadPDF = () => {
    if (!worker || !summary) return;
    generateWorkerPDF(worker, summary, records);
  };

  const getInitials = (name) =>
    name
      .trim()
      .split(" ")
      .map((n) => n[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");

  const statusMeta = (status) => {
    if (status === ATTENDANCE_STATUS.FULL)
      return { label: "Full day", color: "#3B6D11", bg: "#EAF3DE", border: "#97C459" };
    if (status === ATTENDANCE_STATUS.OVERTIME)
      return { label: "Overtime", color: "#3C3489", bg: "#EEEDFE", border: "#7F77DD" };
    if (status === ATTENDANCE_STATUS.ABSENT)
      return { label: "Absent", color: "#993C1D", bg: "#FAECE7", border: "#F0997B" };
    return { label: status, color: "#888", bg: "#f5f5f5", border: "#ddd" };
  };

  if (!worker) {
    return (
      <div style={s.page}>
        <div style={s.emptyState}>
          <span style={s.emptyIcon}>👤</span>
          <p style={s.emptyText}>Worker not found</p>
          <button onClick={() => navigate("/")} style={s.backButton}>
            ← Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* Header with back button */}
        <div style={s.header}>
          <button onClick={() => navigate("/")} style={s.backButtonSmall}>
            ← Back
          </button>
          <div style={s.workerInfo}>
            <div style={s.avatar}>
              {getInitials(worker.name)}
            </div>
            <div>
              <h1 style={s.workerName}>{worker.name}</h1>
              <p style={s.wageText}>₹{worker.wagePer8h} / day</p>
            </div>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div style={s.summaryGrid}>
            <div style={s.summaryCard}>
              <span style={s.summaryLabel}>Total earned</span>
              <span style={s.summaryValue}>₹{summary.totalEarned}</span>
            </div>
            <div style={s.summaryCard}>
              <span style={s.summaryLabel}>Total advance</span>
              <span style={s.summaryValue}>₹{summary.totalAdvance}</span>
            </div>
            <div style={s.summaryCard}>
              <span style={s.summaryLabel}>Remaining</span>
              <span style={s.summaryValue}>₹{summary.remaining}</span>
            </div>
          </div>
        )}

        {/* Action buttons */}
        {summary && (
          <div style={s.actionButtons}>
            <button onClick={handleShare} style={s.secondaryBtn}>
              📤 Share
            </button>
            <button onClick={handleDownloadPDF} style={s.secondaryBtn}>
              📄 PDF
            </button>
          </div>
        )}

        {/* Attendance history */}
        <div style={s.historySection}>
          <h2 style={s.sectionTitle}>Attendance history</h2>
          {records.length === 0 ? (
            <div style={s.emptyHistory}>
              <p>No attendance records found.</p>
            </div>
          ) : (
            <div style={s.recordsList}>
              {records.map((r) => {
                const earning = calculateDailyEarning(
                  r.status,
                  worker.wagePer8h
                );
                const meta = statusMeta(r.status);

                return (
                  <div key={`${r.workerId}-${r.date}`} style={s.recordCard}>
                    <div style={s.recordLeft}>
                      <strong style={s.recordDate}>{formatDate(r.date)}</strong>
                      <span
                        style={{
                          ...s.statusPill,
                          background: meta.bg,
                          color: meta.color,
                          borderColor: meta.border,
                        }}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <div style={s.recordRight}>
                      <span style={s.earningText}>+₹{earning}</span>
                      {r.advance > 0 && (
                        <span style={s.advanceText}>-₹{r.advance}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 🎨 Minimal, clean styling matching the app's theme
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
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fff",
    borderRadius: "24px",
    border: "1px solid #f1f5f9",
    maxWidth: "400px",
    margin: "80px auto",
  },
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
    opacity: 0.6,
  },
  emptyText: {
    color: "#64748b",
    marginBottom: "20px",
  },
  backButton: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "40px",
    padding: "8px 20px",
    fontSize: "14px",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  header: {
    marginBottom: "32px",
  },
  backButtonSmall: {
    background: "transparent",
    border: "none",
    fontSize: "14px",
    color: "#4f46e5",
    cursor: "pointer",
    padding: "0 0 12px 0",
    fontWeight: "500",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
  },
  workerInfo: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  avatar: {
    width: "64px",
    height: "64px",
    borderRadius: "32px",
    background: "#e0e7ff",
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: "600",
  },
  workerName: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0f172a",
    margin: "0 0 6px 0",
    letterSpacing: "-0.01em",
  },
  wageText: {
    fontSize: "14px",
    color: "#475569",
    margin: 0,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "16px",
    marginBottom: "24px",
  },
  summaryCard: {
    background: "#fff",
    padding: "18px 16px",
    borderRadius: "20px",
    border: "1px solid #f0f2f5",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  summaryLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#64748b",
    letterSpacing: "0.3px",
  },
  summaryValue: {
    fontSize: "26px",
    fontWeight: "600",
    color: "#0f172a",
  },
  actionButtons: {
    display: "flex",
    gap: "12px",
    marginBottom: "40px",
  },
  secondaryBtn: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "40px",
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#334155",
    cursor: "pointer",
    transition: "all 0.2s",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  },
  historySection: {
    marginTop: "8px",
  },
  sectionTitle: {
    fontSize: "20px",
    fontWeight: "500",
    color: "#0f172a",
    margin: "0 0 20px 0",
  },
  emptyHistory: {
    background: "#fff",
    borderRadius: "20px",
    padding: "32px",
    textAlign: "center",
    color: "#64748b",
    border: "1px solid #f0f2f5",
  },
  recordsList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  recordCard: {
    background: "#fff",
    borderRadius: "20px",
    padding: "16px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid #f0f2f5",
    transition: "all 0.2s",
  },
  recordLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  recordDate: {
    fontSize: "15px",
    fontWeight: "500",
    color: "#0f172a",
  },
  statusPill: {
    fontSize: "12px",
    fontWeight: "500",
    padding: "4px 10px",
    borderRadius: "30px",
    border: "1px solid",
    width: "fit-content",
  },
  recordRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "4px",
  },
  earningText: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#15803d",
  },
  advanceText: {
    fontSize: "13px",
    color: "#b91c1c",
  },
};

// Add hover/focus interactions dynamically
const addStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    button, .record-card {
      transition: all 0.2s ease;
    }
    button:hover:not(:disabled) {
      transform: translateY(-1px);
      filter: brightness(0.96);
    }
    .record-card:hover {
      border-color: #e2e8f0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
    }
  `;
  document.head.appendChild(styleSheet);
};

if (typeof document !== "undefined") {
  addStyles();
}