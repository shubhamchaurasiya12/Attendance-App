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

/* ── helpers (unchanged) ─────────────────────────────────── */
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

/* ── inline SVG icons ────────────────────────────────────── */
const SearchIcon = () => (
  <svg
    width="15" height="15" viewBox="0 0 16 16" fill="none"
    style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", flexShrink:0 }}
  >
    <circle cx="6.5" cy="6.5" r="5" stroke="#9CA3AF" strokeWidth="1.5"/>
    <path d="M10.5 10.5L14 14" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const DownloadIcon = () => (
  <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════════════════ */
export default function Workers() {
  /* ── state (unchanged) ── */
  const [workers, setWorkers]           = useState([]);
  const [attendance, setAttendance]     = useState([]);
  const [search, setSearch]             = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm]         = useState(false);
  const [isEditing, setIsEditing]       = useState(false);
  const [form, setForm]                 = useState({ id: null, name: "", phone: "", wagePer8h: "" });

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());

  const navigate = useNavigate();

  useEffect(() => { const u = subscribeWorkers(setWorkers);    return u; }, []);
  useEffect(() => { const u = subscribeAttendance(setAttendance); return u; }, []);

  /* ── handlers (unchanged) ── */
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

  const handleEdit    = (w) => { setForm(w); setIsEditing(true); setShowForm(true); };
  const handleArchive = async (w) => {
    try { await toggleWorkerStatus(w.id, w.isActive); }
    catch (err) { console.error(err); alert("Failed to update status"); }
  };

  /* ── derived (unchanged) ── */
  const activeWorkers   = workers.filter((w) => w.isActive);
  const archivedCount   = workers.length - activeWorkers.length;
  const filteredWorkers = workers
    .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    .filter((w) => (showArchived ? !w.isActive : w.isActive));

  /* ═══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── STYLES ──────────────────────────────────────── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: 'Inter', sans-serif;
          background: #0B0B16;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* ─── PAGE SHELL ─── */
        .wk-page {
          min-height: 100dvh;
          font-family: 'Inter', sans-serif;
          background: #0B0B16;
          color: #111827;
        }

        /* ─── HERO / DARK HEADER ─── */
        .wk-hero {
          background: #0B0B16;
          padding: 56px 24px 88px;
          position: relative;
          overflow: hidden;
        }

        /* Ambient light blobs */
        .wk-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse 340px 240px at 90% -10%, rgba(111,107,255,0.22) 0%, transparent 70%),
            radial-gradient(ellipse 220px 200px at -10% 80%,  rgba(138,135,255,0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .wk-hero-inner {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          z-index: 1;
        }

        /* Eyebrow */
        .wk-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #6F6BFF;
          margin-bottom: 14px;
        }
        .wk-eyebrow-pip {
          width: 22px;
          height: 2px;
          background: linear-gradient(90deg, #6F6BFF, #8A87FF);
          border-radius: 2px;
          flex-shrink: 0;
        }

        /* Main heading */
        .wk-hero-title {
          font-size: 38px;
          font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -1px;
          line-height: 1.1;
          margin-bottom: 24px;
        }

        /* Glassmorphism stat pills */
        .wk-stats {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        .wk-stat {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 9px 16px;
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255,255,255,0.11);
          border-radius: 22px;
          transition: background 0.2s;
        }
        .wk-stat:hover { background: rgba(255,255,255,0.10); }
        .wk-stat-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .wk-stat-dot--green {
          background: #22C55E;
          box-shadow: 0 0 8px rgba(34,197,94,0.6);
        }
        .wk-stat-dot--amber { background: #F59E0B; }
        .wk-stat-label { font-size: 13px; color: rgba(255,255,255,0.60); }
        .wk-stat-count { font-size: 13px; font-weight: 700; color: #FFFFFF; }

        /* ─── FLOATING WHITE PANEL ─── */
        .wk-panel {
          background: #F8F9FC;
          border-radius: 32px 32px 0 0;
          margin-top: -36px;
          padding: 0 20px 56px;
          position: relative;
          z-index: 2;
          min-height: calc(100dvh - 210px);
          /* subtle top shadow so it lifts off the hero */
          box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
        }

        /* Drag handle */
        .wk-handle {
          width: 36px;
          height: 4px;
          background: #D1D5DB;
          border-radius: 4px;
          margin: 14px auto 22px;
        }

        .wk-panel-inner { max-width: 600px; margin: 0 auto; }

        /* ─── TOOLBAR CARD ─── */
        .wk-toolbar {
          background: #FFFFFF;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.07);
          padding: 18px 18px 16px;
          margin-bottom: 16px;
          animation: wk-up 0.42s cubic-bezier(.22,.8,.36,1) both;
        }

        /* Row A – Add button (right-aligned) */
        .wk-row-a {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 14px;
        }
        .wk-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #6F6BFF;
          color: #fff;
          border: none;
          border-radius: 20px;
          padding: 11px 22px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          box-shadow: 0 4px 16px rgba(111,107,255,0.40);
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          white-space: nowrap;
          letter-spacing: -0.1px;
        }
        .wk-add-btn:hover {
          background: #8A87FF;
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(111,107,255,0.52);
        }
        .wk-add-btn:active { transform: scale(0.97); }
        .wk-add-btn--cancel {
          background: #F3F4F6;
          color: #6B7280;
          box-shadow: none;
        }
        .wk-add-btn--cancel:hover {
          background: #E5E7EB;
          transform: none;
          box-shadow: none;
        }

        /* Row B – Search */
        .wk-row-b {
          position: relative;
          margin-bottom: 12px;
        }
        .wk-search {
          width: 100%;
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 16px;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .wk-search:focus {
          border-color: #6F6BFF;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(111,107,255,0.10);
        }
        .wk-search::placeholder { color: #9CA3AF; }

        /* Row C – Controls */
        .wk-row-c {
          display: flex;
          gap: 9px;
          align-items: center;
          flex-wrap: wrap;
        }
        .wk-toggle {
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 14px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: #6B7280;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .wk-toggle--archived {
          background: #FFFBEB;
          border-color: #FDE68A;
          color: #92400E;
        }
        .wk-report-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #F0FDF4;
          border: 1.5px solid #BBF7D0;
          border-radius: 14px;
          padding: 9px 14px;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: #15803D;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .wk-report-btn:hover { background: #DCFCE7; transform: translateY(-1px); }
        .wk-month {
          flex: 1;
          min-width: 130px;
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 14px;
          padding: 9px 14px;
          font-size: 13.5px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          outline: none;
          cursor: pointer;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .wk-month:focus {
          border-color: #6F6BFF;
          box-shadow: 0 0 0 3px rgba(111,107,255,0.10);
        }

        /* ─── FORM CARD ─── */
        .wk-form-card {
          background: #fff;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.07);
          padding: 22px;
          margin-bottom: 16px;
          border: 1.5px solid rgba(111,107,255,0.16);
          animation: wk-up 0.3s cubic-bezier(.22,.8,.36,1) both;
        }
        .wk-form-head {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 18px;
        }
        .wk-form-ico {
          width: 40px;
          height: 40px;
          background: rgba(111,107,255,0.10);
          border-radius: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 19px;
          flex-shrink: 0;
        }
        .wk-form-title { font-size: 16px; font-weight: 600; color: #111827; }

        .wk-input {
          width: 100%;
          background: #F8F9FC;
          border: 1.5px solid #ECECF2;
          border-radius: 14px;
          padding: 13px 16px;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          color: #111827;
          margin-bottom: 12px;
          outline: none;
          transition: all 0.2s;
        }
        .wk-input:focus {
          border-color: #6F6BFF;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(111,107,255,0.10);
        }
        .wk-input::placeholder { color: #9CA3AF; }
        .wk-form-row { display: flex; gap: 10px; }
        .wk-form-row .wk-input { flex: 1; }

        .wk-submit {
          background: #111827;
          color: #fff;
          border: none;
          border-radius: 16px;
          padding: 15px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'Inter', sans-serif;
          cursor: pointer;
          width: 100%;
          margin-top: 2px;
          transition: background 0.2s, transform 0.2s, box-shadow 0.2s;
          letter-spacing: -0.1px;
        }
        .wk-submit:hover {
          background: #1F2937;
          transform: translateY(-1px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.16);
        }
        .wk-submit:active { transform: scale(0.98); }

        /* ─── SECTION DIVIDER ─── */
        .wk-section {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.11em;
          text-transform: uppercase;
          color: #9CA3AF;
          margin-bottom: 12px;
          padding-left: 2px;
        }
        .wk-section::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #E5E7EB;
        }

        /* ─── WORKER CARDS ─── */
        .wk-card {
          background: #FFFFFF;
          border-radius: 20px;
          padding: 16px;
          margin-bottom: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.05);
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: transform 0.22s cubic-bezier(.22,.8,.36,1),
                      box-shadow 0.22s ease,
                      border-color 0.22s ease;
          animation: wk-up 0.35s cubic-bezier(.22,.8,.36,1) both;
          will-change: transform;
        }
        .wk-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(0,0,0,0.09);
          border-color: rgba(111,107,255,0.13);
        }
        .wk-card:active { transform: scale(0.984); box-shadow: 0 4px 12px rgba(0,0,0,0.06); }

        /* Square avatar */
        .wk-avatar {
          width: 48px;
          height: 48px;
          border-radius: 15px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: -0.3px;
          flex-shrink: 0;
        }

        .wk-card-body { flex: 1; min-width: 0; }
        .wk-card-name {
          font-size: 15px;
          font-weight: 600;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          margin-bottom: 3px;
          letter-spacing: -0.1px;
        }
        .wk-card-meta { font-size: 13px; color: #6B7280; }
        .wk-badge-archived {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: #F3F4F6;
          color: #9CA3AF;
          font-size: 11px;
          font-weight: 500;
          padding: 3px 9px;
          border-radius: 50px;
          margin-top: 5px;
        }

        /* Card action buttons */
        .wk-card-actions {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-end;
          flex-shrink: 0;
        }
        .wk-btn {
          border: 1.5px solid #ECECF2;
          border-radius: 11px;
          background: #F8F9FC;
          padding: 7px 13px;
          font-size: 12px;
          font-weight: 500;
          font-family: 'Inter', sans-serif;
          color: #6B7280;
          cursor: pointer;
          white-space: nowrap;
          transition: background 0.15s, border-color 0.15s;
        }
        .wk-btn:hover { background: #EDEDF5; }
        .wk-btn--danger { color: #EF4444; border-color: #FECACA; background: #FFF5F5; }
        .wk-btn--danger:hover { background: #FEE2E2; border-color: #FCA5A5; }
        .wk-btn--restore { color: #059669; border-color: #A7F3D0; background: #F0FDF4; }
        .wk-btn--restore:hover { background: #DCFCE7; }

        /* ─── EMPTY STATE ─── */
        .wk-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 64px 0 32px;
          animation: wk-up 0.3s cubic-bezier(.22,.8,.36,1) both;
        }
        .wk-empty-box {
          width: 74px;
          height: 74px;
          background: #F3F4F6;
          border-radius: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 28px;
          margin-bottom: 18px;
        }
        .wk-empty-title {
          font-size: 16px;
          font-weight: 600;
          color: #374151;
          margin-bottom: 6px;
        }
        .wk-empty-sub { font-size: 13px; color: #9CA3AF; text-align: center; }

        /* ─── KEYFRAMES ─── */
        @keyframes wk-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }

        /* ─── RESPONSIVE ─── */
        @media (max-width: 480px) {
          .wk-hero { padding: 44px 18px 76px; }
          .wk-hero-title { font-size: 32px; }
          .wk-panel { padding-left: 14px; padding-right: 14px; }
          .wk-toolbar { padding: 16px 14px 14px; }
          .wk-row-c { flex-wrap: wrap; }
          .wk-month { min-width: 100%; }
          .wk-form-row { flex-direction: column; }
          .wk-card-actions { flex-direction: row; }
          .wk-card { padding: 14px 12px; }
          .wk-avatar { width: 42px; height: 42px; font-size: 13px; border-radius: 13px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .wk-toolbar, .wk-form-card, .wk-card, .wk-empty { animation: none; }
          .wk-card { transition: none; }
          .wk-add-btn:hover, .wk-submit:hover, .wk-report-btn:hover { transform: none; }
        }
      `}</style>

      <div className="wk-page">

        {/* ══════════════════════════════════════════
            DARK HERO HEADER
        ══════════════════════════════════════════ */}
        <div className="wk-hero">
          <div className="wk-hero-inner">

            <div className="wk-eyebrow">
              <span className="wk-eyebrow-pip" />
              HRMS Dashboard
            </div>

            <h1 className="wk-hero-title">Workforce</h1>

            <div className="wk-stats">
              <div className="wk-stat">
                <span className="wk-stat-dot wk-stat-dot--green" />
                <span className="wk-stat-label">Active</span>
                <span className="wk-stat-count">{activeWorkers.length}</span>
              </div>
              <div className="wk-stat">
                <span className="wk-stat-dot wk-stat-dot--amber" />
                <span className="wk-stat-label">Archived</span>
                <span className="wk-stat-count">{archivedCount}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ══════════════════════════════════════════
            FLOATING WHITE PANEL
        ══════════════════════════════════════════ */}
        <div className="wk-panel">
          <div className="wk-handle" />
          <div className="wk-panel-inner">

            {/* ── Toolbar card ── */}
            <div className="wk-toolbar">

              {/* Row A – Add Worker */}
              <div className="wk-row-a">
                <button
                  className={`wk-add-btn${showForm ? " wk-add-btn--cancel" : ""}`}
                  onClick={() => (showForm ? resetForm() : setShowForm(true))}
                >
                  {showForm ? "✕ Cancel" : "+ Add Worker"}
                </button>
              </div>

              {/* Row B – Search */}
              <div className="wk-row-b">
                <SearchIcon />
                <input
                  className="wk-search"
                  placeholder="Search workers…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Row C – Toggle · Report · Month */}
              <div className="wk-row-c">
                <button
                  className={`wk-toggle${showArchived ? " wk-toggle--archived" : ""}`}
                  onClick={() => setShowArchived((p) => !p)}
                >
                  {showArchived ? "Archived" : "Active"}
                </button>

                <button
                  className="wk-report-btn"
                  onClick={() => generateMonthlyPDF(activeWorkers, attendance, year, month)}
                >
                  <DownloadIcon />
                  Report
                </button>

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

            {/* ── Add / Edit form ── */}
            {showForm && (
              <div className="wk-form-card">
                <div className="wk-form-head">
                  <div className="wk-form-ico">{isEditing ? "✏️" : "👷"}</div>
                  <p className="wk-form-title">
                    {isEditing ? "Edit Worker" : "New Worker"}
                  </p>
                </div>

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

            {/* ── Section label ── */}
            <p className="wk-section">
              {showArchived ? "Archived" : MONTH_NAMES[month]}
            </p>

            {/* ── Worker list ── */}
            {filteredWorkers.length === 0 ? (
              <div className="wk-empty">
                <div className="wk-empty-box">👷</div>
                <p className="wk-empty-title">
                  {showArchived ? "No archived workers" : "No workers yet"}
                </p>
                <p className="wk-empty-sub">
                  {showArchived
                    ? "Archived workers will appear here"
                    : "Add your first worker to get started"}
                </p>
              </div>
            ) : (
              filteredWorkers.map((w, i) => (
                <div
                  key={w.id}
                  className="wk-card"
                  style={{ animationDelay: `${i * 0.055}s` }}
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
                    {!w.isActive && (
                      <span className="wk-badge-archived">archived</span>
                    )}
                  </div>

                  <div
                    className="wk-card-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button className="wk-btn" onClick={() => handleEdit(w)}>
                      Edit
                    </button>
                    <button
                      className={`wk-btn${
                        w.isActive ? " wk-btn--danger" : " wk-btn--restore"
                      }`}
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
      </div>
    </>
  );
}