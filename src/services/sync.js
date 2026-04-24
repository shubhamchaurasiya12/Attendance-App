import { db } from "./firebase";
import {
  collection,
  setDoc,
  doc,
  getDocs,
} from "firebase/firestore";

// Upload all data
export const syncToCloud = async () => {
  try {
    console.log("🚀 Starting sync...");

    const workers =
      JSON.parse(localStorage.getItem("workers")) || [];
    const attendance =
      JSON.parse(localStorage.getItem("attendance")) || [];

    console.log("Workers:", workers.length);
    console.log("Attendance:", attendance.length);

    // Save workers
    for (let w of workers) {
      if (!w.id) {
        console.warn("Skipping worker without id", w);
        continue;
      }
      await setDoc(doc(db, "workers", w.id), w);
    }

    // Save attendance
    for (let a of attendance) {
      if (!a.workerId || !a.date) {
        console.warn("Invalid attendance", a);
        continue;
      }

      const id = `${a.workerId}_${a.date}`;
      await setDoc(doc(db, "attendance", id), a);
    }

    console.log("✅ Sync success");
  } catch (err) {
    console.error("❌ SYNC ERROR:", err);
    throw err;
  }
};

// Download all data
export const syncFromCloud = async () => {
  try {
    console.log("⬇️ Loading from cloud...");

    const workersSnap = await getDocs(
      collection(db, "workers")
    );
    const attendanceSnap = await getDocs(
      collection(db, "attendance")
    );

    const workers = workersSnap.docs.map((d) => d.data());
    const attendance = attendanceSnap.docs.map((d) =>
      d.data()
    );

    localStorage.setItem("workers", JSON.stringify(workers));
    localStorage.setItem(
      "attendance",
      JSON.stringify(attendance)
    );

    console.log("✅ Cloud load success");
  } catch (err) {
    console.error("❌ CLOUD LOAD ERROR:", err);
    throw err;
  }
};