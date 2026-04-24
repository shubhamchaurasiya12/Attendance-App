import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { getWorkers, getAttendance } from "../services/storage";
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

  const [worker, setWorker] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!id) return;
    const workers = getWorkers();
    const attendance = getAttendance();
    const selectedWorker = workers.find((w) => w.id === id);
    if (!selectedWorker) { setWorker(null); return; }

    const workerRecords = attendance
      .filter((a) => a.workerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const result = calculateWorkerSummary(id, attendance, selectedWorker.wagePer8h);

    setWorker(selectedWorker);
    setRecords(workerRecords);
    setSummary(result);
  }, [id]);

  const handleShare = () => {
    if (!worker || !summary) return;
    shareOnWhatsApp(formatWorkerSummary(worker, summary));
  };

  const handleDownloadPDF = () => {
    if (!worker || !summary) return;
    generateWorkerPDF(worker, summary, records);
  };

  const getInitials = (name) =>
    name.trim().split(" ").map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

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
          <div style={s.emptyIcon}>🔍</div>
          <p style={s.emptyTitle}>Worker not found</p>
          <button onClick={() => navigate("/")} style={s.backBtn}>Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <button onClick={() => navigate(-1)} style={s.backIconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="#534AB7" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div style={s.headerCenter}>
          <div style={s.avatar}>{getInitials(worker.name)}</div>
          <div>
            <p style={s.workerName}>{worker.name}</p>
            <p style={s.workerPhone}>{worker.phone || "No phone"}</p>
          </div>
        </div>
        <div style={s.wagePill}>
          ₹{Number(worker.wagePer8h).toLocaleString("en-IN")}
          <span style={s.wageSub}>/8h</span>
        </div>
      </div>

      {/* ── SUMMARY CARDS ── */}
      {summary && (
        <>
          <div style={s.metricsGrid}>
            <div style={s.metricCard}>
              <p style={s.metricLabel}>Full days</p>
              <p style={{ ...s.metricValue, color: "#3B6D11" }}>{summary.fullDays}</p>
            </div>
            <div style={s.metricCard}>
              <p style={s.metricLabel}>Overtime</p>
              <p style={{ ...s.metricValue, color: "#3C3489" }}>{summary.overtimeDays}</p>
            </div>
            <div style={s.metricCard}>
              <p style={s.metricLabel}>Absent</p>
              <p style={{ ...s.metricValue, color: "#993C1D" }}>{summary.absentDays}</p>
            </div>
          </div>

          {/* ── EARNINGS CARD ── */}
          <div style={s.earningsCard}>
            <div style={s.earningsRow}>
              <div style={s.earningsItem}>
                <p style={s.earningsLabel}>Total earned</p>
                <p style={s.earningsValue}>
                  ₹{Number(summary.totalEarned).toLocaleString("en-IN")}
                </p>
              </div>
              <div style={s.earningsDivider} />
              <div style={s.earningsItem}>
                <p style={s.earningsLabel}>Advance given</p>
                <p style={{ ...s.earningsValue, color: "#993C1D" }}>
                  − ₹{Number(summary.totalAdvance).toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            <div style={s.remainingRow}>
              <p style={s.remainingLabel}>Remaining to pay</p>
              <p style={s.remainingValue}>
                ₹{Number(summary.remaining).toLocaleString("en-IN")}
              </p>
            </div>
          </div>

          {/* ── ACTION BUTTONS ── */}
          <div style={s.actionRow}>
            <button style={s.whatsappBtn} onClick={handleShare}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                style={{ marginRight: "7px", flexShrink: 0 }}>
                <path fillRule="evenodd" clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                  fill="#25D366"/>
                <path d="M8.5 8.5c.2-.5.7-1 1.2-1 .3 0 .5.1.7.5l.8 2c.1.3 0 .6-.2.8l-.5.5c.5 1 1.4 1.9 2.4 2.4l.5-.5c.2-.2.5-.3.8-.2l2 .8c.4.2.5.4.5.7 0 .5-.5 1-1 1.2-2.5 1-6-2.5-5-5z"
                  fill="#fff"/>
              </svg>
              Share on WhatsApp
            </button>

            <button style={s.pdfBtn} onClick={handleDownloadPDF}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                style={{ marginRight: "7px", flexShrink: 0 }}>
                <path d="M12 16l-4-4h2.5V4h3v8H16l-4 4z" fill="#534AB7"/>
                <path d="M4 18h16v2H4v-2z" fill="#534AB7"/>
              </svg>
              Download PDF
            </button>
          </div>
        </>
      )}

      {/* ── HISTORY ── */}
      <div style={s.historySection}>
        <p style={s.sectionTitle}>Attendance history</p>

        {records.length === 0 ? (
          <div style={s.emptyState}>
            <div style={s.emptyIcon}>📋</div>
            <p style={s.emptyTitle}>No records yet</p>
          </div>
        ) : (
          <div style={s.recordList}>
            {records.map((r) => {
              const earning = calculateDailyEarning(r.status, worker.wagePer8h);
              const meta = statusMeta(r.status);

              return (
                <div key={`${r.workerId}-${r.date}`} style={s.recordCard}>
                  <div style={s.recordLeft}>
                    <p style={s.recordDate}>{formatDate(r.date)}</p>
                    <span style={{
                      ...s.statusPill,
                      background: meta.bg,
                      color: meta.color,
                      border: `1px solid ${meta.border}`,
                    }}>
                      {meta.label}
                    </span>
                  </div>

                  <div style={s.recordRight}>
                    <p style={s.recordEarning}>
                      ₹{Number(earning).toLocaleString("en-IN")}
                    </p>
                    {r.advance > 0 && (
                      <p style={s.recordAdvance}>
                        − ₹{Number(r.advance).toLocaleString("en-IN")} adv.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f4f3ff",
    paddingBottom: "40px",
  },

  // ── Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 16px",
    background: "#ffffff",
    borderBottom: "1px solid #eeecfd",
  },
  backIconBtn: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "1.5px solid #e4e2f8",
    background: "#faf9ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    padding: 0,
  },
  headerCenter: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "42px",
    height: "42px",
    minWidth: "42px",
    borderRadius: "50%",
    background: "#EEEDFE",
    color: "#3C3489",
    fontSize: "15px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  workerName: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1a1a2e",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  workerPhone: {
    fontSize: "12px",
    color: "#999",
    marginTop: "2px",
  },
  wagePill: {
    fontSize: "13px",
    fontWeight: "700",
    background: "#EAF3DE",
    color: "#3B6D11",
    padding: "5px 11px",
    borderRadius: "20px",
    flexShrink: 0,
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
  },
  wageSub: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#639922",
  },

  // ── Metrics grid
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    padding: "12px 12px 0",
  },
  metricCard: {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #eeecfd",
    padding: "12px 10px",
    textAlign: "center",
  },
  metricLabel: {
    fontSize: "11px",
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "6px",
  },
  metricValue: {
    fontSize: "26px",
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 1,
  },

  // ── Earnings card
  earningsCard: {
    background: "#ffffff",
    margin: "8px 12px 0",
    borderRadius: "14px",
    border: "1px solid #eeecfd",
    padding: "16px",
  },
  earningsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  earningsItem: { flex: 1, textAlign: "center" },
  earningsDivider: {
    width: "1px",
    height: "40px",
    background: "#eeecfd",
    flexShrink: 0,
  },
  earningsLabel: {
    fontSize: "11px",
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "5px",
  },
  earningsValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#1a1a2e",
  },
  remainingRow: {
    background: "#EEEDFE",
    borderRadius: "10px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  remainingLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#534AB7",
  },
  remainingValue: {
    fontSize: "20px",
    fontWeight: "700",
    color: "#3C3489",
  },

  // ── Action buttons
  actionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px 12px 0",
  },
  whatsappBtn: {
    width: "100%",
    height: "50px",
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },
  pdfBtn: {
    width: "100%",
    height: "50px",
    background: "#ffffff",
    color: "#534AB7",
    border: "1.5px solid #AFA9EC",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },

  // ── History
  historySection: {
    padding: "16px 12px 0",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: "10px",
  },
  recordList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  recordCard: {
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #eeecfd",
    padding: "12px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },
  recordLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  recordDate: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a2e",
  },
  statusPill: {
    display: "inline-block",
    fontSize: "11px",
    fontWeight: "600",
    padding: "3px 9px",
    borderRadius: "20px",
    alignSelf: "flex-start",
  },
  recordRight: {
    textAlign: "right",
    flexShrink: 0,
  },
  recordEarning: {
    fontSize: "15px",
    fontWeight: "700",
    color: "#1a1a2e",
  },
  recordAdvance: {
    fontSize: "12px",
    color: "#993C1D",
    marginTop: "3px",
    fontWeight: "500",
  },

  // ── Empty / not found
  emptyState: {
    padding: "36px 20px",
    background: "#ffffff",
    border: "2px dashed #d6d3f5",
    borderRadius: "16px",
    textAlign: "center",
  },
  emptyIcon: { fontSize: "36px", marginBottom: "10px" },
  emptyTitle: { fontSize: "15px", fontWeight: "600", color: "#555" },
  backBtn: {
    marginTop: "14px",
    height: "40px",
    padding: "0 20px",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};