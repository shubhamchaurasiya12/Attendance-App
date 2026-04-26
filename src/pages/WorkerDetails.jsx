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
import { formatWorkerSummary, shareOnWhatsApp } from "../utils/share";
import { generateWorkerPDF } from "../utils/pdf";
import { ATTENDANCE_STATUS } from "../utils/constants";

export default function WorkerDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [workers, setWorkers]       = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [worker, setWorker]         = useState(null);
  const [records, setRecords]       = useState([]);
  const [summary, setSummary]       = useState(null);

  useEffect(() => {
    const unsub = subscribeWorkers(setWorkers);
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = subscribeAttendance(setAttendance);
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!id) return;
    const selected = workers.find((w) => w.id === id);
    if (!selected) { setWorker(null); return; }

    const workerRecords = attendance
      .filter((a) => a.workerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const result = calculateWorkerSummary(id, attendance, selected.wagePer8h);

    setWorker(selected);
    setRecords(workerRecords);
    setSummary(result);
  }, [id, workers, attendance]);

  const handleShare       = () => { if (!worker || !summary) return; shareOnWhatsApp(formatWorkerSummary(worker, summary)); };
  const handleDownloadPDF = () => { if (!worker || !summary) return; generateWorkerPDF(worker, summary, records); };

  const getInitials = (name) =>
    name.trim().split(" ").map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  // ── Group records by "Month Year" ─────────────────────
  const groupByMonth = (recs) => {
    const map = {};
    recs.forEach((r) => {
      const d   = new Date(r.date);
      const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    // Sort each month's records by day ascending for the table
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.date) - new Date(b.date))
    );
    return map;
  };

  const attendanceSymbol = (status) => {
    if (status === ATTENDANCE_STATUS.FULL)     return { symbol: "P",  color: "#3B6D11", bg: "#EAF3DE" };
    if (status === ATTENDANCE_STATUS.OVERTIME) return { symbol: "P+", color: "#3C3489", bg: "#EEEDFE" };
    if (status === ATTENDANCE_STATUS.ABSENT)   return { symbol: "—",  color: "#aaa",    bg: "transparent" };
    return { symbol: "—", color: "#aaa", bg: "transparent" };
  };

  const grouped = groupByMonth(records);
  const months  = Object.keys(grouped);

  // ── Not found ──────────────────────────────────────────
  if (!worker) {
    return (
      <div style={s.page}>
        <div style={s.centeredEmpty}>
          <div style={s.emptyIcon}>🔍</div>
          <p style={s.emptyTitle}>Worker not found</p>
          <button onClick={() => navigate("/")} style={s.backBtn}>Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>

      {/* ── STICKY HEADER ── */}
      <div style={s.header}>
        <button onClick={() => navigate(-1)} style={s.backIconBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 19l-7-7 7-7" stroke="#534AB7" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <div style={s.headerCenter}>
          <div style={s.avatar}>{getInitials(worker.name)}</div>
          <div style={{ minWidth: 0 }}>
            <p style={s.workerName}>{worker.name}</p>
            <p style={s.workerPhone}>{worker.phone || "No phone"}</p>
          </div>
        </div>

        <div style={s.wagePill}>
          ₹{Number(worker.wagePer8h).toLocaleString("en-IN")}
          <span style={s.wageSub}>/8h</span>
        </div>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={s.body}>

        {summary && (
          <>
            {/* Metrics */}
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

            {/* Earnings */}
            <div style={s.earningsCard}>
              <div style={s.earningsRow}>
                <div style={s.earningsItem}>
                  <p style={s.earningsLabel}>Total earned</p>
                  <p style={s.earningsValue}>
                    ₹{Number(summary.totalEarned).toLocaleString("en-IN")}
                  </p>
                </div>
                <div style={s.earningsDivider}/>
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

            {/* Action buttons */}
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

        {/* ── ATTENDANCE HISTORY TABLE ── */}
        <div style={s.historySection}>
          <div style={s.historyHeader}>
            <p style={s.sectionTitle}>Attendance history</p>
            {records.length > 0 && (
              <span style={s.recordCountBadge}>{records.length} records</span>
            )}
          </div>

          {records.length === 0 ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>📋</div>
              <p style={s.emptyTitle}>No records yet</p>
              <p style={s.emptyHint}>Mark attendance from the Attendance tab</p>
            </div>
          ) : (
            <div style={s.monthsWrap}>
              {months.map((month) => {
                const monthRecords = grouped[month];

                // Totals for this month's footer
                const monthEarned  = monthRecords.reduce((sum, r) => sum + calculateDailyEarning(r.status, worker.wagePer8h), 0);
                const monthAdvance = monthRecords.reduce((sum, r) => sum + (r.advance || 0), 0);

                return (
                  <div key={month} style={s.monthBlock}>

                    {/* Month heading */}
                    <div style={s.monthHeading}>
                      <span style={s.monthLabel}>{month}</span>
                      <span style={s.monthDays}>
                        {monthRecords.filter(r => r.status !== ATTENDANCE_STATUS.ABSENT).length} days present
                      </span>
                    </div>

                    {/* Table */}
                    <div style={s.tableWrap}>
                      <table style={s.table}>
                        <thead>
                          <tr>
                            <th style={{ ...s.th, textAlign: "left",   width: "42%" }}>Date</th>
                            <th style={{ ...s.th, textAlign: "center", width: "24%" }}>Attendance</th>
                            <th style={{ ...s.th, textAlign: "right",  width: "34%" }}>Advance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthRecords.map((r, idx) => {
                            const d    = new Date(r.date);
                            const day  = d.getDate();
                            const wday = d.toLocaleDateString("en-IN", { weekday: "short" });
                            const sym  = attendanceSymbol(r.status);
                            const isLast = idx === monthRecords.length - 1;

                            return (
                              <tr key={r.date} style={{
                                background: idx % 2 === 0 ? "#ffffff" : "#faf9ff",
                              }}>
                                {/* Date cell */}
                                <td style={{
                                  ...s.td,
                                  borderBottom: isLast ? "none" : "1px solid #f0effe",
                                }}>
                                  <span style={s.dayNum}>{day}</span>
                                  <span style={s.dayName}>{wday}</span>
                                </td>

                                {/* Attendance cell */}
                                <td style={{
                                  ...s.td,
                                  textAlign: "center",
                                  borderBottom: isLast ? "none" : "1px solid #f0effe",
                                }}>
                                  <span style={{
                                    ...s.symbolBadge,
                                    background: sym.bg,
                                    color:      sym.color,
                                    fontWeight: sym.symbol === "—" ? "400" : "700",
                                  }}>
                                    {sym.symbol}
                                  </span>
                                </td>

                                {/* Advance cell */}
                                <td style={{
                                  ...s.td,
                                  textAlign: "right",
                                  borderBottom: isLast ? "none" : "1px solid #f0effe",
                                }}>
                                  {r.advance > 0 ? (
                                    <span style={s.advanceAmt}>
                                      ₹{Number(r.advance).toLocaleString("en-IN")}
                                    </span>
                                  ) : (
                                    <span style={s.advanceNil}>—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Month footer totals */}
                        <tfoot>
                          <tr style={s.tfootRow}>
                            <td style={s.tfootCell}>
                              <span style={s.tfootLabel}>Month total</span>
                            </td>
                            <td style={{ ...s.tfootCell, textAlign: "center" }}>
                              <span style={s.tfootEarned}>
                                ₹{Number(monthEarned).toLocaleString("en-IN")}
                              </span>
                            </td>
                            <td style={{ ...s.tfootCell, textAlign: "right" }}>
                              {monthAdvance > 0 ? (
                                <span style={s.tfootAdvance}>
                                  ₹{Number(monthAdvance).toLocaleString("en-IN")}
                                </span>
                              ) : (
                                <span style={s.advanceNil}>—</span>
                              )}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>{/* end body */}
    </div>
  );
}

const s = {
  // ── Layout
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    background: "#f4f3ff",
    overflow: "hidden",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    padding: "0 0 20px 0",
  },

  // ── Header
  header: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "#ffffff",
    borderBottom: "1px solid #eeecfd",
    flexShrink: 0,
  },
  backIconBtn: {
    width: "36px",
    height: "36px",
    minWidth: "36px",
    borderRadius: "50%",
    border: "1.5px solid #e4e2f8",
    background: "#faf9ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    WebkitTapHighlightColor: "transparent",
  },
  headerCenter: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    background: "#EEEDFE",
    color: "#3C3489",
    fontSize: "14px",
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
    fontSize: "12px",
    fontWeight: "700",
    background: "#EAF3DE",
    color: "#3B6D11",
    padding: "4px 10px",
    borderRadius: "20px",
    flexShrink: 0,
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    whiteSpace: "nowrap",
  },
  wageSub: {
    fontSize: "10px",
    fontWeight: "500",
    color: "#639922",
  },

  // ── Metrics
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "8px",
    padding: "12px 12px 0",
  },
  metricCard: {
    background: "#ffffff",
    borderRadius: "12px",
    border: "1px solid #eeecfd",
    padding: "10px 8px",
    textAlign: "center",
  },
  metricLabel: {
    fontSize: "10px",
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "5px",
  },
  metricValue: {
    fontSize: "24px",
    fontWeight: "700",
    lineHeight: 1,
  },

  // ── Earnings
  earningsCard: {
    background: "#ffffff",
    margin: "8px 12px 0",
    borderRadius: "14px",
    border: "1px solid #eeecfd",
    padding: "14px",
  },
  earningsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  earningsItem:    { flex: 1, textAlign: "center" },
  earningsDivider: { width: "1px", height: "36px", background: "#eeecfd", flexShrink: 0 },
  earningsLabel: {
    fontSize: "10px",
    color: "#aaa",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "4px",
  },
  earningsValue: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#1a1a2e",
  },
  remainingRow: {
    background: "#EEEDFE",
    borderRadius: "10px",
    padding: "10px 14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  remainingLabel: { fontSize: "13px", fontWeight: "600", color: "#534AB7" },
  remainingValue: { fontSize: "18px", fontWeight: "700", color: "#3C3489" },

  // ── Actions
  actionRow: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    padding: "10px 12px 0",
  },
  whatsappBtn: {
    width: "100%",
    height: "48px",
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },
  pdfBtn: {
    width: "100%",
    height: "48px",
    background: "#ffffff",
    color: "#534AB7",
    border: "1.5px solid #AFA9EC",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    WebkitTapHighlightColor: "transparent",
  },

  // ── History section
  historySection: {
    padding: "14px 12px 0",
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "10px",
  },
  sectionTitle: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  recordCountBadge: {
    fontSize: "11px",
    fontWeight: "600",
    background: "#EEEDFE",
    color: "#534AB7",
    padding: "2px 8px",
    borderRadius: "20px",
  },

  // ── Month blocks
  monthsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  monthBlock: {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1px solid #eeecfd",
    overflow: "hidden",        // clips table corners cleanly
  },
  monthHeading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    background: "#534AB7",
  },
  monthLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#ffffff",
  },
  monthDays: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#c8c4f0",
  },

  // ── Table
  tableWrap: {
    overflowX: "auto",         // handles very narrow screens
    WebkitOverflowScrolling: "touch",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    tableLayout: "fixed",
  },
  th: {
    padding: "8px 14px",
    fontSize: "11px",
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    background: "#f5f4fe",
    borderBottom: "1.5px solid #eeecfd",
  },
  td: {
    padding: "9px 14px",
    fontSize: "13px",
    color: "#1a1a2e",
    verticalAlign: "middle",
  },

  // Date cell parts
  dayNum: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a2e",
    marginRight: "6px",
  },
  dayName: {
    fontSize: "11px",
    color: "#aaa",
    fontWeight: "500",
  },

  // Attendance symbol badge
  symbolBadge: {
    display: "inline-block",
    minWidth: "30px",
    padding: "3px 8px",
    borderRadius: "20px",
    fontSize: "12px",
    textAlign: "center",
  },

  // Advance cell
  advanceAmt: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#993C1D",
  },
  advanceNil: {
    fontSize: "13px",
    color: "#ccc",
  },

  // Table footer totals row
  tfootRow: {
    background: "#f5f4fe",
    borderTop: "1.5px solid #eeecfd",
  },
  tfootCell: {
    padding: "9px 14px",
    verticalAlign: "middle",
  },
  tfootLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#888",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  tfootEarned: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#3B6D11",
  },
  tfootAdvance: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#993C1D",
  },

  // ── Empty states
  centeredEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
  },
  emptyState: {
    padding: "30px 20px",
    background: "#ffffff",
    border: "2px dashed #d6d3f5",
    borderRadius: "16px",
    textAlign: "center",
  },
  emptyIcon:  { fontSize: "34px", marginBottom: "10px" },
  emptyTitle: { fontSize: "15px", fontWeight: "600", color: "#555" },
  emptyHint:  { fontSize: "12px", color: "#aaa", marginTop: "5px" },
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