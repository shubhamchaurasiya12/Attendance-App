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

  const [workers, setWorkers] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [worker, setWorker] = useState(null);
  const [records, setRecords] = useState([]);
  const [summary, setSummary] = useState(null);

  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

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

    const allRecords = attendance
      .filter((a) => a.workerId === id)
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const result = calculateWorkerSummary(id, attendance, selected.wagePer8h);

    setWorker(selected);
    setRecords(allRecords);
    setSummary(result);
  }, [id, workers, attendance]);

  const filteredRecords = records.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const groupByMonth = (recs) => {
    const map = {};
    recs.forEach((r) => {
      const d = new Date(r.date);
      const key = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    Object.values(map).forEach((arr) =>
      arr.sort((a, b) => new Date(a.date) - new Date(b.date))
    );
    return map;
  };

  const grouped = groupByMonth(filteredRecords);
  const months = Object.keys(grouped);

  const attendanceSymbol = (status) => {
    if (status === ATTENDANCE_STATUS.FULL) return { symbol: "P", color: "#166534", bg: "#dcfce7" };
    if (status === ATTENDANCE_STATUS.OVERTIME) return { symbol: "P+", color: "#854d0e", bg: "#fef9c3" };
    if (status === ATTENDANCE_STATUS.ABSENT) return { symbol: "—", color: "#9CA3AF", bg: "#F3F4F6" };
    return { symbol: "—", color: "#9CA3AF", bg: "#F3F4F6" };
  };

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
            <button onClick={() => navigate(-1)} style={s.backIconBtn}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path d="M15 19l-7-7 7-7" stroke="#FFFFFF" strokeWidth="2.2"
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            <div style={s.avatarContainer}>
              <div style={s.avatar}>{getInitials(worker.name)}</div>
              <div style={s.nameGroup}>
                <p style={s.workerName}>{worker.name}</p>
                <p style={s.workerPhone}>{worker.phone || "No phone"}</p>
              </div>
            </div>

            <div style={s.wagePill}>
              ₹{Number(worker.wagePer8h).toLocaleString("en-IN")}
              <span style={s.wageSub}>/8h</span>
            </div>
          </div>

          {/* Quick stats pills */}
          {summary && (
            <div style={s.quickStats}>
              <span style={s.quickStat}>
                <span style={{ ...s.quickDot, background: "#22C55E" }} />
                Full {summary.fullDays}
              </span>
              <span style={s.quickStat}>
                <span style={{ ...s.quickDot, background: "#F59E0B" }} />
                OT {summary.overtimeDays}
              </span>
              <span style={s.quickStat}>
                <span style={{ ...s.quickDot, background: "#9CA3AF" }} />
                Abs {summary.absentDays}
              </span>
            </div>
          )}
        </div>

        {/* ─── FLOATING WHITE PANEL ─── */}
        <div style={s.panel}>
          <div style={s.handle} />

          {summary && (
            <>
              {/* Earnings card */}
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
                    <p style={{ ...s.earningsValue, color: "#b91c1c" }}>
                      − ₹{Number(summary.totalAdvance).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>
                <div style={s.remainingRow}>
                  <span style={s.remainingLabel}>Remaining to pay</span>
                  <span style={s.remainingValue}>
                    ₹{Number(summary.remaining).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Action buttons */}
              <div style={s.actionRow}>
                <button style={s.whatsappBtn} onClick={handleShare}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ marginRight: "7px", flexShrink: 0 }}>
                    <path fillRule="evenodd" clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.418A9.96 9.96 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"
                      fill="#25D366"/>
                    <path d="M8.5 8.5c.2-.5.7-1 1.2-1 .3 0 .5.1.7.5l.8 2c.1.3 0 .6-.2.8l-.5.5c.5 1 1.4 1.9 2.4 2.4l.5-.5c.2-.2.5-.3.8-.2l2 .8c.4.2.5.4.5.7 0 .5-.5 1-1 1.2-2.5 1-6-2.5-5-5z"
                      fill="#fff"/>
                  </svg>
                  Share
                </button>

                <button style={s.pdfBtn} onClick={handleDownloadPDF}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ marginRight: "7px", flexShrink: 0 }}>
                    <path d="M12 16l-4-4h2.5V4h3v8H16l-4 4z" fill="#1A1A1A"/>
                    <path d="M4 18h16v2H4v-2z" fill="#1A1A1A"/>
                  </svg>
                  PDF
                </button>
              </div>
            </>
          )}

          {/* Attendance history */}
          <div style={s.historySection}>
            <div style={s.historyHeader}>
              <p style={s.sectionTitle}>Attendance</p>
              <input
                type="month"
                className="month-input"
                value={`${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`}
                onChange={(e) => {
                  const [y, m] = e.target.value.split("-");
                  setSelectedYear(Number(y));
                  setSelectedMonth(Number(m) - 1);
                }}
                style={s.monthPicker}
              />
            </div>

            {filteredRecords.length === 0 ? (
              <div style={s.emptyState}>
                <div style={s.emptyIcon}>📅</div>
                <p style={s.emptyTitle}>No records</p>
                <p style={s.emptyHint}>Select another month</p>
              </div>
            ) : (
              <div style={s.monthsWrap}>
                {months.map((month) => {
                  const monthRecords = grouped[month];
                  const monthEarned = monthRecords.reduce((sum, r) => sum + calculateDailyEarning(r.status, worker.wagePer8h), 0);
                  const monthAdvance = monthRecords.reduce((sum, r) => sum + (r.advance || 0), 0);

                  return (
                    <div key={month} style={s.monthCard}>
                      <div style={s.monthHeader}>
                        <span style={s.monthTitle}>{month}</span>
                        <span style={s.monthPresentCount}>
                          {monthRecords.filter(r => r.status !== ATTENDANCE_STATUS.ABSENT).length} present
                        </span>
                      </div>

                      <div style={s.dayList}>
                        {monthRecords.map((r) => {
                          const d = new Date(r.date);
                          const day = d.getDate();
                          const wday = d.toLocaleDateString("en-IN", { weekday: "short" });
                          const sym = attendanceSymbol(r.status);

                          return (
                            <div key={r.date} style={s.dayRow}>
                              <div style={s.dateBlock}>
                                <span style={s.dayNum}>{day}</span>
                                <span style={s.dayName}>{wday}</span>
                              </div>
                              <div style={s.badgeBlock}>
                                <span style={{ ...s.attendanceBadge, background: sym.bg, color: sym.color }}>
                                  {sym.symbol}
                                </span>
                              </div>
                              <div style={s.advanceBlock}>
                                {r.advance > 0 ? (
                                  <span style={s.advanceAmount}>₹{Number(r.advance).toLocaleString("en-IN")}</span>
                                ) : (
                                  <span style={s.advanceNil}>—</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div style={s.monthFooter}>
                        <span style={s.footerLabel}>Month total</span>
                        <div style={s.footerRight}>
                          <span style={s.footerEarned}>₹{Number(monthEarned).toLocaleString("en-IN")}</span>
                          <span style={s.footerDivider}>·</span>
                          {monthAdvance > 0 ? (
                            <span style={s.footerAdvance}>₹{Number(monthAdvance).toLocaleString("en-IN")} adv.</span>
                          ) : (
                            <span style={s.advanceNil}>no adv.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
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
    padding: "40px 20px 28px",
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
    gap: "12px",
  },
  backIconBtn: {
    width: "40px",
    height: "40px",
    minWidth: "40px",
    borderRadius: "50%",
    border: "1.5px solid rgba(255,255,255,0.20)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    padding: 0,
    transition: "all 0.2s",
    flexShrink: 0,
  },
  avatarContainer: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "48px",
    height: "48px",
    minWidth: "48px",
    borderRadius: "16px",
    background: "#D1FAE5", // default; will be overridden by worker's color? we can keep as dynamic later
    color: "#1A1A1A",
    fontSize: "16px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  nameGroup: {
    minWidth: 0,
  },
  workerName: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#FFFFFF",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    letterSpacing: "-0.3px",
  },
  workerPhone: {
    fontSize: "13px",
    color: "rgba(255,255,255,0.60)",
    marginTop: "2px",
  },
  wagePill: {
    fontSize: "13px",
    fontWeight: "600",
    background: "rgba(255,255,255,0.10)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#FFFFFF",
    padding: "6px 14px",
    borderRadius: "30px",
    flexShrink: 0,
    display: "flex",
    alignItems: "baseline",
    gap: "2px",
    whiteSpace: "nowrap",
  },
  wageSub: {
    fontSize: "10px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.50)",
  },

  quickStats: {
    display: "flex",
    gap: "16px",
    marginTop: "18px",
    justifyContent: "center",
    position: "relative",
    zIndex: 1,
    maxWidth: "600px",
    marginLeft: "auto",
    marginRight: "auto",
  },
  quickStat: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "12px",
    fontWeight: "500",
    color: "rgba(255,255,255,0.70)",
    background: "rgba(255,255,255,0.06)",
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: "4px 14px",
    borderRadius: "30px",
  },
  quickDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    display: "inline-block",
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

  // Earnings card
  earningsCard: {
    background: "#FFFFFF",
    borderRadius: "24px",
    padding: "18px 16px",
    marginBottom: "12px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
  },
  earningsRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "12px",
  },
  earningsItem: {
    flex: 1,
    textAlign: "center",
  },
  earningsDivider: {
    width: "1px",
    height: "36px",
    background: "#ECECF2",
    flexShrink: 0,
  },
  earningsLabel: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: "4px",
  },
  earningsValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
  },
  remainingRow: {
    background: "#F8F9FC",
    borderRadius: "14px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  remainingLabel: {
    fontSize: "13px",
    fontWeight: "500",
    color: "#111827",
  },
  remainingValue: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
  },

  // Action buttons
  actionRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  whatsappBtn: {
    flex: 1,
    height: "48px",
    background: "#25D366",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s",
    boxShadow: "0 4px 12px rgba(37,211,102,0.30)",
  },
  pdfBtn: {
    flex: 1,
    height: "48px",
    background: "#FFFFFF",
    color: "#111827",
    border: "1.5px solid #ECECF2",
    borderRadius: "16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', sans-serif",
    transition: "all 0.15s",
  },

  // History
  historySection: {
    marginTop: "4px",
  },
  historyHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "14px",
  },
  sectionTitle: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  monthPicker: {
    background: "#FFFFFF",
    border: "1.5px solid #ECECF2",
    borderRadius: "14px",
    padding: "6px 12px",
    fontSize: "13px",
    fontFamily: "'Inter', sans-serif",
    color: "#111827",
    outline: "none",
    cursor: "pointer",
  },

  monthsWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  monthCard: {
    background: "#FFFFFF",
    borderRadius: "20px",
    overflow: "hidden",
    boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
  },
  monthHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#111827",
  },
  monthTitle: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#FFFFFF",
  },
  monthPresentCount: {
    fontSize: "11px",
    fontWeight: "500",
    color: "#D1D5DB",
  },
  dayList: {
    padding: "0",
  },
  dayRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    borderBottom: "1px solid #F0F0F0",
    gap: "8px",
  },
  dateBlock: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
    minWidth: "64px",
  },
  dayNum: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#111827",
  },
  dayName: {
    fontSize: "11px",
    color: "#9CA3AF",
    fontWeight: "500",
  },
  badgeBlock: {
    flexShrink: 0,
  },
  attendanceBadge: {
    display: "inline-block",
    minWidth: "36px",
    padding: "4px 10px",
    borderRadius: "40px",
    fontSize: "13px",
    fontWeight: "600",
    textAlign: "center",
  },
  advanceBlock: {
    flexShrink: 0,
    minWidth: "60px",
    textAlign: "right",
  },
  advanceAmount: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#b91c1c",
  },
  advanceNil: {
    fontSize: "13px",
    color: "#D1D5DB",
  },
  monthFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 16px",
    background: "#FAFAFA",
    borderTop: "1px solid #F0F0F0",
  },
  footerLabel: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: "0.03em",
  },
  footerRight: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  footerEarned: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#166534",
  },
  footerDivider: {
    fontSize: "13px",
    color: "#D1D5DB",
  },
  footerAdvance: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#b91c1c",
  },

  // Empty states
  centeredEmpty: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
    background: "#0B0B16",
    minHeight: "100dvh",
  },
  emptyState: {
    padding: "30px 20px",
    background: "#FFFFFF",
    border: "2px dashed #E5E7EB",
    borderRadius: "20px",
    textAlign: "center",
  },
  emptyIcon: { fontSize: "34px", marginBottom: "10px" },
  emptyTitle: { fontSize: "15px", fontWeight: "600", color: "#111827" },
  emptyHint: { fontSize: "12px", color: "#9CA3AF", marginTop: "5px" },
  backBtn: {
    marginTop: "14px",
    height: "40px",
    padding: "0 20px",
    background: "#111827",
    color: "#fff",
    border: "none",
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "'Inter', sans-serif",
  },
};