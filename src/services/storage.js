// src/services/storage.js

import { db } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

// ==============================
// COLLECTIONS
// ==============================
const WORKERS = "workers";
const ATTENDANCE = "attendance";

// ==============================
// WORKERS API
// ==============================

// Get all workers
export const getWorkers = async () => {
  const snapshot = await getDocs(collection(db, WORKERS));
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// Real-time workers listener
export const subscribeWorkers = (callback) => {
  return onSnapshot(collection(db, WORKERS), (snapshot) => {
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    callback(data);
  });
};

// Add worker
export const addWorker = async (worker) => {
  await setDoc(doc(db, WORKERS, worker.id), worker);
};

// Update worker
export const updateWorker = async (worker) => {
  await updateDoc(doc(db, WORKERS, worker.id), worker);
};

// Archive / Restore worker
export const toggleWorkerStatus = async (workerId, currentStatus) => {
  await updateDoc(doc(db, WORKERS, workerId), {
    isActive: !currentStatus,
    archivedAt: currentStatus ? Date.now() : null,
  });
};

// Delete worker
export const deleteWorker = async (workerId) => {
  await deleteDoc(doc(db, WORKERS, workerId));
};

// ==============================
// ATTENDANCE API
// ==============================

// Get all attendance
export const getAttendance = async () => {
  const snapshot = await getDocs(collection(db, ATTENDANCE));
  return snapshot.docs.map((doc) => doc.data());
};

// Real-time attendance listener
export const subscribeAttendance = (callback) => {
  return onSnapshot(collection(db, ATTENDANCE), (snapshot) => {
    const data = snapshot.docs.map((doc) => doc.data());
    callback(data);
  });
};

// Save / override attendance
export const upsertAttendance = async (entry) => {
  const id = `${entry.workerId}_${entry.date}`;
  await setDoc(doc(db, ATTENDANCE, id), entry);
};

// Get attendance by worker
export const getAttendanceByWorker = async (workerId) => {
  const q = query(
    collection(db, ATTENDANCE),
    where("workerId", "==", workerId)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => doc.data());
};