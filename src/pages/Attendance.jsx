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
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F5F4F0; }

        .att-page {
          min-height: 100dvh;
          padding: 0 0 env(safe-area-inset-bottom, 24px);
          font-family: 'DM Sans', sans-serif;
          background: #F5F4F0;
          color: #1A1A1A;
        }
        .att-inner {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 16px 32px;
        }

        /* top card (sticky) */
        .att-topbar {
          position: sticky;
          top: 12px;
          z-index: 10;
          margin: 0 0 20px 0;
        }
        .att-card {
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          padding: 20px 16px;
        }
        .att-title {
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.5px;
          margin-bottom: 4px;
        }
        .att-sub {
          font-size: 13px;
          color: #6B7280;
          margin-bottom: 16px;
        }
        .att-date-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .att-date-label {
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
        }
        .att-date-input {
          flex: 1;
          background: #F9F9F8;
          border: 1.5px solid #E5E5E5;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
        }
        .att-date-input:focus {
          border-color: #A3A3A3;
          background: #fff;
        }

        /* toast fixed */
        .att-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #1e293b;
          color: #fff;
          padding: 10px 20px;
          border-radius: 40px;
          font-size: 14px;
          z-index: 1000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          pointer-events: none;
        }

        /* worker card (same design as Workers page) */
        .att-worker-card {
          background: #fff;
          border-radius: 20px;
          padding: 12px 16px;
          margin-bottom: 12px;
          border: 1.5px solid #F0F0F0;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: transform .12s;
        }
        .att-worker-card:active {
          transform: scale(.985);
        }
        .att-worker-name {
          flex: 1;
          font-weight: 500;
          font-size: 15px;
          color: #1A1A1A;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
        }
        .att-status-buttons {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .att-circle-btn {
          width: 44px;
          height: 44px;
          border-radius: 44px;
          border: 1.5px solid #E5E5E5;
          background: #fff;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .att-circle-btn:active {
          transform: scale(0.96);
        }
        .att-advance-input {
          width: 90px;
          background: #F9F9F8;
          border: 1.5px solid #E5E5E5;
          border-radius: 40px;
          padding: 10px 8px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          text-align: center;
          outline: none;
          flex-shrink: 0;
        }
        .att-advance-input:focus {
          border-color: #A3A3A3;
          background: #fff;
        }
        .att-empty {
          text-align: center;
          padding: 48px 0;
          color: #9CA3AF;
        }
        .att-empty-icon {
          font-size: 36px;
          margin-bottom: 12px;
        }

        /* responsive */
        @media (max-width: 480px) {
          .att-card {
            padding: 16px;
          }
          .att-title {
            font-size: 22px;
          }
          .att-date-row {
            flex-direction: column;
            align-items: stretch;
          }
          .att-worker-card {
            padding: 10px 12px;
            gap: 8px;
          }
          .att-circle-btn {
            width: 38px;
            height: 38px;
            font-size: 14px;
          }
          .att-advance-input {
            width: 70px;
            font-size: 13px;
            padding: 8px 4px;
          }
          .att-worker-name {
            font-size: 14px;
          }
        }
      `}</style>

      <div className="att-page">
        <div className="att-inner">
          {/* Sticky top card with date picker */}
          <div className="att-topbar">
            <div className="att-card">
              <h1 className="att-title">Attendance</h1>
              <p className="att-sub">Mark daily attendance</p>
              <div className="att-date-row">
                <span className="att-date-label">Date</span>
                <input
                  type="date"
                  className="att-date-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Toast message */}
          {message && <div className="att-toast">{message}</div>}

          {/* Workers list */}
          {activeWorkers.length === 0 ? (
            <div className="att-empty">
              <div className="att-empty-icon">👷</div>
              <p>No active workers</p>
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
                  <div className="att-status-buttons">
                    <button
                      className="att-circle-btn"
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.ABSENT)}
                      style={{
                        background: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#fee2e2" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.ABSENT ? "#f87171" : "#E5E5E5",
                        color: "#b91c1c",
                      }}
                    >
                      A
                    </button>
                    <button
                      className="att-circle-btn"
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.FULL)}
                      style={{
                        background: selectedStatus === ATTENDANCE_STATUS.FULL ? "#dcfce7" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.FULL ? "#4ade80" : "#E5E5E5",
                        color: "#166534",
                      }}
                    >
                      P
                    </button>
                    <button
                      className="att-circle-btn"
                      onClick={() => setStatus(w.id, ATTENDANCE_STATUS.OVERTIME)}
                      style={{
                        background: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#fef9c3" : "#fff",
                        borderColor: selectedStatus === ATTENDANCE_STATUS.OVERTIME ? "#facc15" : "#E5E5E5",
                        color: "#854d0e",
                      }}
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