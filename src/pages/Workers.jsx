import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useNavigate } from "react-router-dom";
import {
  subscribeWorkers,
  addWorker,
  updateWorker,
  toggleWorkerStatus,
} from "../services/storage";

export default function Workers() {
  const [workers, setWorkers] = useState([]);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    id: null,
    name: "",
    phone: "",
    wagePer8h: "",
  });
  const [isEditing, setIsEditing] = useState(false);

  const navigate = useNavigate();

  // 🔥 REALTIME LISTENER
  useEffect(() => {
    const unsubscribe = subscribeWorkers(setWorkers);
    return () => unsubscribe();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({ id: null, name: "", phone: "", wagePer8h: "" });
    setIsEditing(false);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) return alert("Name is required");
    if (!form.wagePer8h || Number(form.wagePer8h) <= 0)
      return alert("Enter valid wage");

    try {
      if (isEditing) {
        await updateWorker({
          ...form,
          wagePer8h: Number(form.wagePer8h),
        });
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

      // 🔥 NO setWorkers here — realtime handles it
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Operation failed");
    }
  };

  const handleEdit = (worker) => {
    setForm(worker);
    setIsEditing(true);
    setShowForm(true);
  };

  const handleArchive = async (worker) => {
    try {
      await toggleWorkerStatus(worker.id, worker.isActive);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    }
  };

  const goToDetails = (id) => navigate(`/worker/${id}`);

  const getInitials = (name) =>
    name
      .trim()
      .split(" ")
      .map((n) => n[0]?.toUpperCase() ?? "")
      .slice(0, 2)
      .join("");

  const filteredWorkers = workers
    .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
    .filter((w) => (showArchived ? !w.isActive : w.isActive));

  const activeCount = workers.filter((w) => w.isActive).length;
  const archivedCount = workers.filter((w) => !w.isActive).length;

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* HEADER SECTION */}
        <div style={s.header}>
          <div>
            <h1 style={s.heading}>Workers</h1>
            <p style={s.subHeading}>
              {activeCount} active · {archivedCount} archived
            </p>
          </div>
          <div style={s.headerRight}>
            <span style={s.countBadge}>{activeCount}</span>
            <button
              onClick={() => {
                if (isEditing) resetForm();
                else setShowForm((p) => !p);
              }}
              style={{
                ...s.addBtn,
                background: showForm ? "#eef2ff" : "#4f46e5",
                color: showForm ? "#4f46e5" : "#fff",
                border: showForm ? "1px solid #c7d2fe" : "none",
              }}
            >
              {showForm ? "Cancel" : "+ Add Worker"}
            </button>
          </div>
        </div>

        {/* SEARCH & FILTER BAR */}
        <div style={s.controlsBar}>
          <div style={s.searchWrapper}>
            <span style={s.searchIcon}>🔍</span>
            <input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={s.searchInput}
            />
          </div>
          <button onClick={() => setShowArchived(!showArchived)} style={s.toggleBtn}>
            {showArchived ? "← Show Active" : "Show Archived →"}
          </button>
        </div>

        {/* FORM CARD (Add/Edit) */}
        {showForm && (
          <div style={s.formCard}>
            <h3 style={s.formTitle}>{isEditing ? "Edit Worker" : "New Worker"}</h3>
            <div style={s.formGroup}>
              <input
                name="name"
                placeholder="Full name"
                value={form.name}
                onChange={handleChange}
                style={s.input}
              />
              <input
                name="phone"
                placeholder="Phone number"
                value={form.phone}
                onChange={handleChange}
                style={s.input}
              />
              <input
                name="wagePer8h"
                type="number"
                placeholder="Daily wage (₹)"
                value={form.wagePer8h}
                onChange={handleChange}
                style={s.input}
              />
            </div>
            <div style={s.formActions}>
              <button onClick={handleSubmit} style={s.btnPrimary}>
                {isEditing ? "Update Worker" : "Add Worker"}
              </button>
              {isEditing && (
                <button onClick={resetForm} style={s.btnCancel}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        )}

        {/* WORKERS LIST */}
        <div style={s.listContainer}>
          {filteredWorkers.length === 0 ? (
            <div style={s.emptyState}>
              <span style={s.emptyIcon}>👷</span>
              <p>No workers found</p>
              <button onClick={() => setShowForm(true)} style={s.emptyBtn}>
                Add your first worker
              </button>
            </div>
          ) : (
            filteredWorkers.map((w) => (
              <div
                key={w.id}
                style={s.card}
                onClick={() => goToDetails(w.id)}
              >
                <div style={s.cardInfo}>
                  <div>
                    <strong style={s.workerName}>{w.name}</strong>
                    {!w.isActive && (
                      <span style={s.archivedBadge}>Archived</span>
                    )}
                  </div>
                  <p style={s.wageText}>₹{w.wagePer8h} / day</p>
                  {w.phone && <p style={s.phoneText}>{w.phone}</p>}
                </div>
                <div style={s.cardActions} onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => handleEdit(w)} style={s.editBtn}>
                    Edit
                  </button>
                  <button onClick={() => handleArchive(w)} style={s.archiveBtn}>
                    {w.isActive ? "Archive" : "Restore"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 🎨 Minimal, clean, modern styling
const s = {
  page: {
    background: "#f8fafc",
    minHeight: "100vh",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  container: {
    maxWidth: "880px",
    margin: "0 auto",
    padding: "32px 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "32px",
    flexWrap: "wrap",
    gap: "16px",
  },
  heading: {
    fontSize: "28px",
    fontWeight: "600",
    color: "#0f172a",
    letterSpacing: "-0.01em",
    margin: "0 0 6px 0",
  },
  subHeading: {
    fontSize: "14px",
    color: "#475569",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  countBadge: {
    background: "#e2e8f0",
    color: "#1e293b",
    fontSize: "14px",
    fontWeight: "500",
    padding: "4px 10px",
    borderRadius: "40px",
  },
  addBtn: {
    border: "none",
    borderRadius: "40px",
    padding: "8px 20px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s ease",
  },
  controlsBar: {
    display: "flex",
    gap: "16px",
    marginBottom: "32px",
    flexWrap: "wrap",
  },
  searchWrapper: {
    flex: 1,
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    fontSize: "14px",
    opacity: 0.6,
  },
  searchInput: {
    width: "100%",
    padding: "12px 16px 12px 38px",
    border: "1px solid #e2e8f0",
    borderRadius: "48px",
    fontSize: "14px",
    background: "#fff",
    outline: "none",
    transition: "all 0.2s",
    fontFamily: "inherit",
  },
  toggleBtn: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: "40px",
    padding: "0 20px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#334155",
    cursor: "pointer",
    whiteSpace: "nowrap",
    transition: "all 0.2s",
  },
  formCard: {
    background: "#fff",
    borderRadius: "24px",
    padding: "24px",
    marginBottom: "32px",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.05)",
    border: "1px solid #f1f5f9",
  },
  formTitle: {
    fontSize: "18px",
    fontWeight: "500",
    margin: "0 0 20px 0",
    color: "#0f172a",
  },
  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "24px",
  },
  input: {
    width: "100%",
    padding: "12px 16px",
    border: "1px solid #e2e8f0",
    borderRadius: "16px",
    fontSize: "14px",
    fontFamily: "inherit",
    outline: "none",
    transition: "all 0.2s",
    background: "#fefefe",
  },
  formActions: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  btnPrimary: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "40px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  btnCancel: {
    background: "#f1f5f9",
    border: "none",
    borderRadius: "40px",
    padding: "10px 24px",
    fontSize: "14px",
    fontWeight: "500",
    color: "#334155",
    cursor: "pointer",
  },
  listContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  card: {
    background: "#fff",
    borderRadius: "20px",
    padding: "20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    boxShadow: "0 1px 2px rgba(0, 0, 0, 0.03), 0 1px 1px rgba(0, 0, 0, 0.02)",
    border: "1px solid #f0f2f5",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  cardInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  workerName: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
    marginRight: "10px",
  },
  archivedBadge: {
    background: "#fef9c3",
    color: "#854d0e",
    fontSize: "12px",
    fontWeight: "500",
    padding: "2px 8px",
    borderRadius: "30px",
    marginLeft: "8px",
  },
  wageText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#334155",
    margin: 0,
  },
  phoneText: {
    fontSize: "13px",
    color: "#64748b",
    margin: 0,
  },
  cardActions: {
    display: "flex",
    gap: "8px",
  },
  editBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "32px",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.2s",
  },
  archiveBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    borderRadius: "32px",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "500",
    color: "#475569",
    cursor: "pointer",
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 24px",
    background: "#fff",
    borderRadius: "24px",
    border: "1px solid #f1f5f9",
    color: "#64748b",
  },
  emptyIcon: {
    fontSize: "48px",
    display: "block",
    marginBottom: "16px",
    opacity: 0.7,
  },
  emptyBtn: {
    background: "#4f46e5",
    color: "#fff",
    border: "none",
    borderRadius: "40px",
    padding: "8px 20px",
    marginTop: "16px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

// Add subtle hover interactions (inline hover simulation)
const addHoverStyles = () => {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    button, [style*="cursor: pointer"] {
      transition: all 0.2s ease;
    }
    button:hover {
      transform: translateY(-1px);
      filter: brightness(0.96);
    }
    div[style*="border-radius: 20px"]:hover {
      border-color: #e2e8f0;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.05);
    }
    input:focus {
      border-color: #c7d2fe !important;
      box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
    }
  `;
  document.head.appendChild(styleSheet);
};

// Call once to add hover/focus enhancements
if (typeof document !== "undefined") {
  addHoverStyles();
}