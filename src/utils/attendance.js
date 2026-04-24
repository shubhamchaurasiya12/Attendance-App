// src/utils/attendance.js

import { ATTENDANCE_STATUS } from "./constants";

// Create a new attendance entry
export const createAttendanceEntry = ({
  workerId,
  date,
  status = ATTENDANCE_STATUS.ABSENT,
  advance = 0,
}) => {
  return {
    workerId,
    date,
    status,
    advance: Number(advance) || 0,
    updatedAt: Date.now(),
  };
};

// Validate attendance entry
export const validateAttendance = (entry) => {
  if (!entry.workerId) return false;
  if (!entry.date) return false;

  const validStatuses = Object.values(ATTENDANCE_STATUS);

  if (!validStatuses.includes(entry.status)) return false;

  if (entry.advance < 0) return false;

  return true;
};