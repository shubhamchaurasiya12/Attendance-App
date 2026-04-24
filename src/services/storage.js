// src/services/storage.js

// ==============================
// STORAGE KEYS
// ==============================
const KEYS = {
  WORKERS: "workers",
  ATTENDANCE: "attendance",
};

// ==============================
// SAFE PARSE (prevents crashes)
// ==============================
const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    console.error("Storage parse error:", error);
    return null;
  }
};

// ==============================
// GENERIC GET
// ==============================
const get = (key) => {
  const data = localStorage.getItem(key);

  if (!data) return [];

  const parsed = safeParse(data);

  return Array.isArray(parsed) ? parsed : [];
};

// ==============================
// GENERIC SET
// ==============================
const set = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// ==============================
// WORKERS API
// ==============================

// Normalize worker (important for old data)
const normalizeWorker = (worker) => ({
  ...worker,
  isActive: worker.isActive !== false, // default true
  archivedAt: worker.archivedAt || null,
});

export const getWorkers = () => {
  const workers = get(KEYS.WORKERS);
  return workers.map(normalizeWorker);
};

export const saveWorkers = (workers) => {
  set(KEYS.WORKERS, workers);
};

// Add worker
export const addWorker = (worker) => {
  const workers = getWorkers();

  const newWorker = normalizeWorker({
    ...worker,
    isActive: true,
    archivedAt: null,
  });

  const updated = [...workers, newWorker];

  saveWorkers(updated);
  return updated;
};

// Update worker
export const updateWorker = (updatedWorker) => {
  const workers = getWorkers();

  const updated = workers.map((w) =>
    w.id === updatedWorker.id
      ? normalizeWorker(updatedWorker)
      : w
  );

  saveWorkers(updated);
  return updated;
};

// Archive / Restore worker (NEW)
export const toggleWorkerStatus = (workerId) => {
  const workers = getWorkers();

  const updated = workers.map((w) => {
    if (w.id !== workerId) return w;

    return {
      ...w,
      isActive: !w.isActive,
      archivedAt: w.isActive ? Date.now() : null,
    };
  });

  saveWorkers(updated);
  return updated;
};

// Delete worker (rarely used now)
export const deleteWorker = (workerId) => {
  const workers = getWorkers();

  const updated = workers.filter((w) => w.id !== workerId);

  saveWorkers(updated);
  return updated;
};

// ==============================
// ATTENDANCE API
// ==============================

export const getAttendance = () => {
  return get(KEYS.ATTENDANCE);
};

export const saveAttendance = (attendance) => {
  set(KEYS.ATTENDANCE, attendance);
};

// Save or override attendance
export const upsertAttendance = (entry) => {
  const attendance = getAttendance();

  const filtered = attendance.filter(
    (a) =>
      !(
        a.workerId === entry.workerId &&
        a.date === entry.date
      )
  );

  const updated = [...filtered, entry];

  saveAttendance(updated);
  return updated;
};

// Get attendance for one worker
export const getAttendanceByWorker = (workerId) => {
  const attendance = getAttendance();
  return attendance.filter((a) => a.workerId === workerId);
};

// ==============================
// UTILITY (CLEAR ALL - DEV ONLY)
// ==============================
export const clearAllData = () => {
  localStorage.removeItem(KEYS.WORKERS);
  localStorage.removeItem(KEYS.ATTENDANCE);
};