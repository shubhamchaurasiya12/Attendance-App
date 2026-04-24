import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import {
  getWorkers,
  addWorker,
  updateWorker,
  toggleWorkerStatus,
} from "../services/storage";

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", phone: "", wagePer8h: "" });
  const [isEditing, setIsEditing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setWorkers(getWorkers());
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ id: null, name: "", phone: "", wagePer8h: "" });
    setIsEditing(false);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.wagePer8h || Number(form.wagePer8h) <= 0) return alert("Enter valid wage");

    if (isEditing) {
      const updated = updateWorker({ ...form, wagePer8h: Number(form.wagePer8h) });
      setWorkers(updated);
    } else {
      const updated = addWorker({
        ...form,
        id: uuidv4(),
        wagePer8h: Number(form.wagePer8h),
        createdAt: Date.now(),
        isActive: true,
        archivedAt: null,
      });
      setWorkers(updated);
    }
    resetForm();
  };

  const handleEdit = (worker) => {
    setForm(worker);
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleArchive = (workerId) => {
    const updated = toggleWorkerStatus(workerId);
    setWorkers(updated);
  };

  const goToDetails = (id) => navigate(`/worker/${id}`);

  const getInitials = (name) =>
    name.trim().split(" ").map((n) => n[0]?.toUpperCase() ?? "").slice(0, 2).join("");

  const filteredWorkers = workers
    .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    .filter((w) => (showArchived ? !w.isActive : w.isActive));

  const activeCount   = workers.filter((w) => w.isActive).length;
  const archivedCount = workers.filter((w) => !w.isActive).length;

  return (
    <div style={s.page}>

      {/* ── HEADER ── */}
      <div style={s.header}>
        <div>
          <h2 style={s.heading}>Workers</h2>
          <p style={s.subHeading}>
            {activeCount} active · {archivedCount} archived
          </p>
        </div>
        <span style={s.countBadge}>{activeCount}</span>
      </div>

      {/* ── SEARCH + TOGGLE ── */}
      <div style={s.searchRow}>
        <div style={s.searchWrap}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={s.searchIcon}>
            <circle cx="11" cy="11" r="7" stroke="#aaa" strokeWidth="2"/>
            <path d="M16.5 16.5L21 21" stroke="#aaa" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            placeholder="Search worker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={s.searchInput}
          />
          {search.length > 0 && (
            <button onClick={() => setSearch("")} style={s.clearBtn}>✕</button>
          )}
        </div>

        <button
          onClick={() => setShowArchived(!showArchived)}
          style={{
            ...s.toggleBtn,
            background: showArchived ? "#FAEEDA" : "#EEEDFE",
            color:      showArchived ? "#633806"  : "#3C3489",
            border:     `1.5px solid ${showArchived ? "#FAC775" : "#AFA9EC"}`,
          }}
        >
          {showArchived ? "Active" : "Archived"}
        </button>
      </div>

      {/* ── FORM ── */}
      <div style={s.formCard}>
        <p style={s.formLabel}>
          {isEditing ? "✏️  Editing worker" : "➕  New worker"}
        </p>

        <div style={s.field}>
          <label style={s.label}>Full name *</label>
          <input
            name="name"
            placeholder="e.g. Ramesh Kumar"
            value={form.name}
            onChange={handleChange}
            style={s.input}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Mobile number</label>
          <input
            name="phone"
            placeholder="e.g. 9876543210"
            type="tel"
            inputMode="numeric"
            value={form.phone}
            onChange={handleChange}
            style={s.input}
          />
        </div>

        <div style={s.field}>
          <label style={s.label}>Wage per 8 hours (₹) *</label>
          <input
            name="wagePer8h"
            placeholder="e.g. 600"
            type="number"
            inputMode="numeric"
            value={form.wagePer8h}
            onChange={handleChange}
            style={s.input}
          />
        </div>

        <button onClick={handleSubmit} style={s.btnPrimary}>
          {isEditing ? "Update Worker" : "Add Worker"}
        </button>

        {isEditing && (
          <button onClick={resetForm} style={s.btnCancel}>Cancel</button>
        )}
      </div>

      {/* ── LIST ── */}
      {filteredWorkers.length === 0 ? (
        <div style={s.emptyState}>
          <div style={s.emptyIcon}>{search ? "🔍" : showArchived ? "📦" : "👷"}</div>
          <p style={s.emptyTitle}>
            {search
              ? `No results for "${search}"`
              : showArchived
              ? "No archived workers"
              : "No workers yet"}
          </p>
          <p style={s.emptyHint}>
            {search
              ? "Try a different name"
              : showArchived
              ? "Archive a worker from the active list"
              : "Fill the form above to add your first worker"}
          </p>
        </div>
      ) : (
        <div style={s.list}>

          {/* Section label */}
          <p style={s.sectionLabel}>
            {showArchived ? "Archived" : "Active"} · {filteredWorkers.length} shown
          </p>

          {filteredWorkers.map((w) => (
            <div
              key={w.id}
              style={{ ...s.card, ...(w.isActive ? {} : s.archivedCard) }}
              onClick={() => goToDetails(w.id)}
            >
              <div style={s.cardLeft}>
                <div style={{
                  ...s.avatar,
                  background: w.isActive ? "#EEEDFE" : "#e8e8e8",
                  color:      w.isActive ? "#3C3489"  : "#777",
                }}>
                  {getInitials(w.name)}
                </div>

                <div style={s.info}>
                  <div style={s.nameRow}>
                    <p style={s.workerName}>{w.name}</p>
                    {!w.isActive && (
                      <span style={s.archivedBadge}>Archived</span>
                    )}
                  </div>
                  <p style={s.workerPhone}>{w.phone || "No phone"}</p>
                  <span style={{
                    ...s.wageBadge,
                    background: w.isActive ? "#EAF3DE" : "#efefef",
                    color:      w.isActive ? "#3B6D11"  : "#888",
                  }}>
                    ₹{Number(w.wagePer8h).toLocaleString("en-IN")} / 8h
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div style={s.actions} onClick={(e) => e.stopPropagation()}>
                {w.isActive && (
                  <button style={s.btnEdit} onClick={() => handleEdit(w)}>
                    Edit
                  </button>
                )}
                <button
                  style={w.isActive ? s.btnArchive : s.btnRestore}
                  onClick={() => handleArchive(w.id)}
                >
                  {w.isActive ? "Archive" : "Restore"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f4f3ff",
    paddingBottom: "100px",
  },

  // ── Header
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 16px 14px",
    background: "#ffffff",
    borderBottom: "1px solid #eeecfd",
  },
  heading: {
    fontSize: "22px",
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: 1.2,
  },
  subHeading: {
    fontSize: "13px",
    color: "#888",
    marginTop: "2px",
  },
  countBadge: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "#534AB7",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // ── Search row
  searchRow: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
    padding: "12px 12px 0",
  },
  searchWrap: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "12px",
    pointerEvents: "none",
    flexShrink: 0,
  },
  searchInput: {
    width: "100%",
    height: "44px",
    padding: "0 36px 0 36px",
    border: "1.5px solid #e4e2f8",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#1a1a2e",
    background: "#ffffff",
    outline: "none",
    boxSizing: "border-box",
    WebkitAppearance: "none",
  },
  clearBtn: {
    position: "absolute",
    right: "10px",
    background: "none",
    border: "none",
    color: "#aaa",
    fontSize: "13px",
    cursor: "pointer",
    padding: "4px",
  },
  toggleBtn: {
    height: "44px",
    padding: "0 14px",
    borderRadius: "12px",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    flexShrink: 0,
    WebkitTapHighlightColor: "transparent",
  },

  // ── Form
  formCard: {
    background: "#ffffff",
    margin: "12px 12px 0",
    borderRadius: "16px",
    padding: "16px",
    border: "1px solid #eeecfd",
  },
  formLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#534AB7",
    marginBottom: "14px",
  },
  field: { marginBottom: "12px" },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600",
    color: "#555",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    height: "48px",
    padding: "0 14px",
    border: "1.5px solid #e4e2f8",
    borderRadius: "10px",
    fontSize: "15px",
    color: "#1a1a2e",
    background: "#faf9ff",
    outline: "none",
    boxSizing: "border-box",
    WebkitAppearance: "none",
  },
  btnPrimary: {
    width: "100%",
    height: "50px",
    marginTop: "4px",
    background: "#534AB7",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    fontSize: "16px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnCancel: {
    width: "100%",
    height: "46px",
    marginTop: "8px",
    background: "transparent",
    color: "#888",
    border: "1.5px solid #e0e0e0",
    borderRadius: "12px",
    fontSize: "15px",
    cursor: "pointer",
  },

  // ── List
  sectionLabel: {
    fontSize: "12px",
    fontWeight: "700",
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "8px",
  },
  list: {
    padding: "12px 12px 0",
    display: "flex",
    flexDirection: "column",
  },

  // ── Empty state
  emptyState: {
    margin: "12px",
    padding: "40px 20px",
    background: "#ffffff",
    border: "2px dashed #d6d3f5",
    borderRadius: "16px",
    textAlign: "center",
  },
  emptyIcon: { fontSize: "38px", marginBottom: "10px" },
  emptyTitle: { fontSize: "16px", fontWeight: "600", color: "#444" },
  emptyHint: {
    fontSize: "13px",
    color: "#aaa",
    marginTop: "6px",
    lineHeight: 1.5,
  },

  // ── Worker card
  card: {
    background: "#ffffff",
    borderRadius: "14px",
    border: "1.5px solid #eeecfd",
    padding: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    cursor: "pointer",
    marginBottom: "10px",
    WebkitTapHighlightColor: "transparent",
  },
  archivedCard: {
    background: "#f8f8f8",
    borderColor: "#e8e8e8",
    opacity: 0.75,
  },
  cardLeft: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: "46px",
    height: "46px",
    minWidth: "46px",
    borderRadius: "50%",
    fontSize: "15px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1, minWidth: 0 },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "7px",
    marginBottom: "3px",
  },
  workerName: {
    fontSize: "15px",
    fontWeight: "600",
    color: "#1a1a2e",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  archivedBadge: {
    fontSize: "10px",
    fontWeight: "700",
    background: "#FAEEDA",
    color: "#854F0B",
    border: "1px solid #FAC775",
    padding: "2px 7px",
    borderRadius: "20px",
    flexShrink: 0,
  },
  workerPhone: {
    fontSize: "12px",
    color: "#999",
    marginBottom: "6px",
  },
  wageBadge: {
    display: "inline-block",
    fontSize: "12px",
    fontWeight: "600",
    padding: "3px 10px",
    borderRadius: "20px",
  },

  // ── Card actions
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flexShrink: 0,
  },
  btnEdit: {
    width: "68px",
    height: "34px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1.5px solid #d6d3f5",
    background: "#f0effe",
    color: "#534AB7",
  },
  btnArchive: {
    width: "68px",
    height: "34px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1.5px solid #FAC775",
    background: "#FAEEDA",
    color: "#854F0B",
  },
  btnRestore: {
    width: "68px",
    height: "34px",
    borderRadius: "8px",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    border: "1.5px solid #97C459",
    background: "#EAF3DE",
    color: "#3B6D11",
  },
};