import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import {
  subscribeWorkers,
  addWorker,
  updateWorker,
  toggleWorkerStatus,
  subscribeAttendance,
} from "../services/storage";
import { generateMonthlyPDF } from "../utils/pdfMonthly";

/* helpers */
const initials = (name = "") =>
  name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const AVATAR_COLORS = [
  "#D1FAE5","#DBEAFE","#FEF3C7","#FCE7F3","#EDE9FE","#FFEDD5",
];
const avatarBg = (name = "") =>
  AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];

export default function Workers() {
  const [workers, setWorkers]       = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch]         = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm]     = useState(false);
  const [isEditing, setIsEditing]   = useState(false);
  const [form, setForm]             = useState({ id: null, name: "", phone: "", wagePer8h: "" });

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());

  const navigate = useNavigate();

  useEffect(() => { const u = subscribeWorkers(setWorkers);    return u; }, []);
  useEffect(() => { const u = subscribeAttendance(setAttendance); return u; }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const resetForm = () => {
    setForm({ id: null, name: "", phone: "", wagePer8h: "" });
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.wagePer8h || Number(form.wagePer8h) <= 0) return alert("Enter valid wage");
    try {
      if (isEditing) {
        await updateWorker({ ...form, wagePer8h: Number(form.wagePer8h) });
      } else {
        await addWorker({
          ...form,
          id: uuidv4(),
          wagePer8h: Number(form.wagePer8h),
          createdAt: Date.now(),
          isActive: true,
          archivedAt: null,
        });
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  };

  const handleEdit   = (w) => { setForm(w); setIsEditing(true); setShowForm(true); };
  const handleArchive = async (w) => {
    try { await toggleWorkerStatus(w.id, w.isActive); }
    catch (err) { console.error(err); alert("Failed to update status"); }
  };

  const activeWorkers   = workers.filter((w) => w.isActive);
  const archivedCount   = workers.length - activeWorkers.length;
  const filteredWorkers = workers
    .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    .filter((w) => (showArchived ? !w.isActive : w.isActive));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #F5F4F0; }

        .wk-page {
          min-height: 100dvh;
          padding: 0 0 env(safe-area-inset-bottom, 24px);
          font-family: 'DM Sans', sans-serif;
          background: #F5F4F0;
          color: #1A1A1A;
        }
        .wk-inner {
          max-width: 600px;
          margin: 0 auto;
          padding: 0 16px 32px;
        }

        /* topbar as a responsive card */
        .wk-topbar {
          position: sticky;
          top: 12px;
          z-index: 10;
          margin: 0 0 20px 0;
        }
        .wk-topbar-card {
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.04);
          padding: 20px 16px;
          transition: all 0.2s;
        }

        /* row 1: title + add button */
        .wk-title-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .wk-title {
          font-size: 26px;
          font-weight: 600;
          letter-spacing: -0.5px;
          line-height: 1.2;
        }
        .wk-sub {
          font-size: 13px;
          color: #6B7280;
          margin-top: 2px;
        }
        .wk-add-btn {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 50px;
          padding: 10px 18px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }

        /* row 2: search + toggle + report (all in one row) */
        .wk-filter-row {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .wk-search {
          flex: 2;
          min-width: 140px;
          background: #F9F9F8;
          border: 1.5px solid #E5E5E5;
          border-radius: 14px;
          padding: 10px 14px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
        }
        .wk-search:focus { border-color: #A3A3A3; background: #fff; }
        .wk-toggle {
          flex-shrink: 0;
          background: #fff;
          border: 1.5px solid #E5E5E5;
          border-radius: 14px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          white-space: nowrap;
        }
        .wk-toggle.active {
          background: #FFF7ED;
          border-color: #FED7AA;
          color: #92400E;
        }
        .wk-dl-btn {
          flex-shrink: 0;
          background: #ECFDF5;
          color: #065F46;
          border: 1.5px solid #A7F3D0;
          border-radius: 50px;
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
        }

        /* row 3: month picker only */
        .wk-month-row {
          display: flex;
        }
        .wk-month {
          flex: 1;
          background: #F9F9F8;
          border: 1.5px solid #E5E5E5;
          border-radius: 12px;
          padding: 10px 12px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          color: #1A1A1A;
          outline: none;
          cursor: pointer;
        }

        /* form card (unchanged) */
        .wk-form {
          background: #fff;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1.5px solid #E5E5E5;
        }
        .wk-form-title { font-size: 15px; font-weight: 600; margin-bottom: 12px; }
        .wk-input {
          width: 100%;
          background: #F9F9F8;
          border: 1.5px solid #E5E5E5;
          border-radius: 12px;
          padding: 12px 14px;
          font-size: 15px;
          margin-bottom: 12px;
        }
        .wk-input:focus { border-color: #A3A3A3; background: #fff; }
        .wk-form-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wk-form-row .wk-input { flex: 1; margin-bottom: 0; }
        .wk-submit {
          background: #111;
          color: #fff;
          border: none;
          border-radius: 14px;
          padding: 14px;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          width: 100%;
        }

        /* worker cards (already responsive) */
        .wk-card {
          background: #fff;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 12px;
          border: 1.5px solid #F0F0F0;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: transform .12s;
        }
        .wk-card:active { transform: scale(.985); }
        .wk-avatar {
          width: 46px;
          height: 46px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 600;
          flex-shrink: 0;
        }
        .wk-card-body {
          flex: 1;
          min-width: 0;
        }
        .wk-card-name {
          font-size: 15px;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .wk-card-meta {
          font-size: 13px;
          color: #6B7280;
          margin-top: 2px;
        }
        .wk-badge-archived {
          display: inline-block;
          background: #F3F4F6;
          color: #9CA3AF;
          font-size: 11px;
          padding: 2px 8px;
          border-radius: 50px;
          margin-top: 4px;
        }
        .wk-card-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .wk-btn-sm {
          border: 1.5px solid #E5E5E5;
          border-radius: 10px;
          background: transparent;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          color: #6B7280;
          cursor: pointer;
          white-space: nowrap;
        }
        .wk-btn-sm.danger {
          color: #92400E;
          border-color: #FED7AA;
        }
        .wk-empty {
          text-align: center;
          padding: 48px 0;
          color: #9CA3AF;
        }
        .wk-empty-icon { font-size: 36px; margin-bottom: 12px; }

        /* Responsive: on small screens the filter row stacks */
        @media (max-width: 480px) {
          .wk-topbar-card {
            padding: 16px;
          }
          .wk-title {
            font-size: 22px;
          }
          .wk-add-btn {
            padding: 8px 14px;
            font-size: 13px;
          }
          .wk-filter-row {
            flex-direction: column;
            align-items: stretch;
          }
          .wk-search, .wk-toggle, .wk-dl-btn {
            width: 100%;
            text-align: center;
          }
          .wk-card {
            padding: 12px;
            gap: 10px;
          }
          .wk-avatar {
            width: 40px;
            height: 40px;
            font-size: 13px;
          }
          .wk-card-actions {
            flex-direction: row;
            gap: 8px;
          }
          .wk-form-row {
            flex-direction: column;
          }
          .wk-form-row .wk-input {
            margin-bottom: 12px;
          }
        }
      `}</style>

      <div className="wk-page">
        <div className="wk-inner">
          {/* Sticky top bar – now a single card with 3 rows */}
          <div className="wk-topbar">
            <div className="wk-topbar-card">
              {/* Row 1: Title + Add */}
              <div className="wk-title-row">
                <div>
                  <h1 className="wk-title">Workers</h1>
                  <p className="wk-sub">
                    {activeWorkers.length} active · {archivedCount} archived
                  </p>
                </div>
                <button
                  className="wk-add-btn"
                  onClick={() => (showForm ? resetForm() : setShowForm(true))}
                >
                  {showForm ? "Cancel" : "+ Add"}
                </button>
              </div>

              {/* Row 2: Search + Active/Archived toggle + Report button (all in one row) */}
              <div className="wk-filter-row">
                <input
                  className="wk-search"
                  placeholder="Search workers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button
                  className={`wk-toggle${showArchived ? " active" : ""}`}
                  onClick={() => setShowArchived((p) => !p)}
                >
                  {showArchived ? "Archived" : "Active"}
                </button>
                <button
                  className="wk-dl-btn"
                  onClick={() =>
                    generateMonthlyPDF(activeWorkers, attendance, year, month)
                  }
                >
                  ↓ Report
                </button>
              </div>

              {/* Row 3: Month picker only */}
              <div className="wk-month-row">
                <input
                  type="month"
                  className="wk-month"
                  value={`${year}-${String(month + 1).padStart(2, "0")}`}
                  onChange={(e) => {
                    const [y, m] = e.target.value.split("-");
                    setYear(Number(y));
                    setMonth(Number(m) - 1);
                  }}
                />
              </div>
            </div>
          </div>

          {/* Add / edit form (outside the card) */}
          {showForm && (
            <div className="wk-form">
              <p className="wk-form-title">{isEditing ? "Edit Worker" : "New Worker"}</p>
              <input
                className="wk-input"
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
              />
              <div className="wk-form-row">
                <input
                  className="wk-input"
                  name="phone"
                  placeholder="Phone (optional)"
                  value={form.phone}
                  onChange={handleChange}
                />
                <input
                  className="wk-input"
                  name="wagePer8h"
                  type="number"
                  placeholder="₹ / 8h"
                  value={form.wagePer8h}
                  onChange={handleChange}
                />
              </div>
              <button className="wk-submit" onClick={handleSubmit}>
                {isEditing ? "Save Changes" : "Add Worker"}
              </button>
            </div>
          )}

          {/* Section label */}
          <p style={{ fontSize: 12, fontWeight: 600, color: "#9CA3AF", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 10 }}>
            {showArchived ? "Archived" : MONTH_NAMES[month]}
          </p>

          {/* Worker list – responsive cards */}
          {filteredWorkers.length === 0 ? (
            <div className="wk-empty">
              <div className="wk-empty-icon">👷</div>
              <p>{showArchived ? "No archived workers" : "No workers yet"}</p>
            </div>
          ) : (
            filteredWorkers.map((w) => (
              <div
                key={w.id}
                className="wk-card"
                onClick={() => navigate(`/worker/${w.id}`)}
              >
                <div
                  className="wk-avatar"
                  style={{ background: avatarBg(w.name), color: "#1A1A1A" }}
                >
                  {initials(w.name)}
                </div>
                <div className="wk-card-body">
                  <p className="wk-card-name">{w.name}</p>
                  <p className="wk-card-meta">₹{w.wagePer8h.toLocaleString()} / 8h</p>
                  {!w.isActive && <span className="wk-badge-archived">archived</span>}
                </div>
                <div
                  className="wk-card-actions"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button className="wk-btn-sm" onClick={() => handleEdit(w)}>
                    Edit
                  </button>
                  <button
                    className={`wk-btn-sm${w.isActive ? " danger" : ""}`}
                    onClick={() => handleArchive(w)}
                  >
                    {w.isActive ? "Archive" : "Restore"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}