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

        /* ─── PAGE SHELL ─── */
        .att-page {
          min-height: 100dvh;
          font-family: 'Inter', sans-serif;
          background: #0B0B16;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        /* ─── DARK HEADER ─── */
        .att-header {
          background: #0B0B16;
          padding: 48px 24px 28px;
          position: relative;
          overflow: hidden;
          flex-shrink: 0;
        }
        .att-header::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 340px 240px at 90% -10%, rgba(111,107,255,0.22) 0%, transparent 70%),
            radial-gradient(ellipse 220px 200px at -10% 80%, rgba(138,135,255,0.12) 0%, transparent 70%);
          pointer-events: none;
        }
        .att-header-inner {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .att-title-group { min-width: 0; }
        .att-title {
          font-size: 34px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -1px;
          line-height: 1.1;
        }
        .att-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.60);
          margin-top: 4px;
        }
        .att-stat-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 30px;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .att-stat-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #22C55E;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }

        /* ─── FLOATING PANEL ─── */
        .att-panel {
          background: #F8F9FC;
          border-radius: 32px 32px 0 0;
          margin-top: -16px;
          padding: 0 16px 40px;
          flex: 1;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
          position: relative;
          z-index: 2;
        }
        .att-handle {
          width: 36px;
          height: 4px;
          background: #D1D5DB;
          border-radius: 4px;
          margin: 14px auto 20px;
        }

        /* ─── DATE ROW ─── */
        .att-date-row {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #FFFFFF;
          border-radius: 24px;
          padding: 16px 18px;
          margin-bottom: 16px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.04);
        }
        .att-date-label {
          font-size: 13px;
          font-weight: 600;
          color: #6B7280;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }
        .att-date-input {
          flex: 1;
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          outline: none;
          transition: all 0.2s;
          min-width: 0;
        }
        .att-date-input:focus {
          border-color: #6F6BFF;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(111,107,255,0.10);
        }

        /* ─── TOAST ─── */
        .att-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #111827;
          color: #fff;
          padding: 10px 20px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 500;
          z-index: 1000;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          pointer-events: none;
          font-family: 'Inter', sans-serif;
        }

        /* ─── WORKER CARDS ─── */
        .att-worker-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 12px 16px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 1.5px solid transparent;
          box-shadow: 0 2px 12px rgba(0,0,0,0.04);
          transition: all 0.2s;
          flex-wrap: wrap;
        }
        .att-worker-name {
          flex: 1 1 100px;
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .att-status-group {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .att-status-btn {
          width: 44px;
          height: 44px;
          border-radius: 44px;
          border: 1.5px solid #ECECF2;
          background: #FFFFFF;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
        }
        .att-status-btn:active { transform: scale(0.94); }
        .att-advance-input {
          width: 80px;
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 40px;
          padding: 10px 6px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          text-align: center;
          outline: none;
          transition: all 0.2s;
          flex-shrink: 0;
        }
        .att-advance-input:focus {
          border-color: #6F6BFF;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(111,107,255,0.10);
        }

        /* ─── EMPTY ─── */
        .att-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 48px 0;
          color: #9CA3AF;
        }
        .att-empty-icon { font-size: 36px; margin-bottom: 12px; }
        .att-empty-title {
          font-size: 15px;
          font-weight: 500;
          color: #6B7280;
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 480px) {
          .att-header { padding: 40px 18px 24px; }
          .att-title { font-size: 28px; }
          .att-stat-pill { font-size: 12px; padding: 6px 12px; }
          .att-date-row {
            flex-wrap: wrap;
            padding: 14px 16px;
          }
          .att-date-label { width: 100%; margin-bottom: 4px; }
          .att-date-input { width: 100%; }
          .att-worker-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .att-worker-name {
            flex: 1 1 100%;
            white-space: normal;
            font-size: 14px;
            margin-bottom: 2px;
          }
          .att-status-group { gap: 6px; }
          .att-status-btn {
            width: 38px;
            height: 38px;
            font-size: 13px;
          }
          .att-advance-input {
            width: 70px;
            font-size: 13px;
            padding: 8px 4px;
          }
        }

        @media (max-width: 400px) {
          .att-status-btn {
            width: 34px;
            height: 34px;
            font-size: 12px;
          }
          .att-advance-input {
            width: 60px;
            font-size: 12px;
            padding: 6px 4px;
          }
        }
      `}</style>

      <div className="att-page">
        {/* ─── DARK HEADER ─── */}
        <div className="att-header">
          <div className="att-header-inner">
            <div className="att-title-group">
              <h1 className="att-title">Attendance</h1>
              <p className="att-subtitle">Mark daily attendance</p>
            </div>
            <div className="att-stat-pill">
              <span className="att-stat-dot" />
              {activeWorkers.length} active
            </div>
          </div>
        </div>

        {/* ─── FLOATING PANEL ─── */}
        <div className="att-panel">
          <div className="att-handle" />

          {/* Date picker */}
          <div className="att-date-row">
            <span className="att-date-label">Date</span>
            <input
              type="date"
              className="att-date-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Toast message */}
          {message && <div className="att-toast">{message}</div>}

          {/* Workers list */}
          {activeWorkers.length === 0 ? (
            <div className="att-empty">
              <div className="att-empty-icon">👷</div>
              <p className="att-empty-title">No active workers</p>
            </div>
          ) : (
            activeWorkers.map((w) => {
              const current = draft[w.id] || { status: ATTENDANCE_STATUS.ABSENT, advance: 0 };
              const selectedStatus = current.status;

              return (
                <div key={w.id} className="att-worker-card">
                  <div className="att-worker-name" title={w.name}>
                    {w.name}
                  </div>
                  <div className="att-status-group">
                    <button
                      className="att-status-btn"
                      style={{
                        background: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#fee2e2" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#f87171" : "#ECECF2",
                        color: "#b91c1c",
                      }}
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.ABSENT)}
                    >
                      A
                    </button>
                    <button
                      className="att-status-btn"
                      style={{
                        background: selectedStatus === ATTENDANCE_STATUS.FULL ? "#dcfce7" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.FULL ? "#4ade80" : "#ECECF2",
                        color: "#166534",
                      }}
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.FULL)}
                    >
                      P
                    </button>
                    <button
                      className="att-status-btn"
                      style={{
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
                    className="att-advance-input"
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