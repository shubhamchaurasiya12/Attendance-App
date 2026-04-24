// src/utils/calculations.js

import { ATTENDANCE_STATUS } from "./constants";

// ==============================
// DAILY EARNING
// ==============================
export const calculateDailyEarning = (status, wage) => {
  if (!wage) return 0;

  switch (status) {
    case ATTENDANCE_STATUS.FULL:
      return wage;

    case ATTENDANCE_STATUS.OVERTIME:
      return wage * 1.5;

    case ATTENDANCE_STATUS.ABSENT:
    default:
      return 0;
  }
};

// ==============================
// WORKER SUMMARY
// ==============================
export const calculateWorkerSummary = (
  workerId,
  attendance,
  wage
) => {
  let totalEarned = 0;
  let totalAdvance = 0;

  let fullDays = 0;
  let overtimeDays = 0;
  let absentDays = 0;

  const records = attendance.filter(
    (a) => a.workerId === workerId
  );

  records.forEach((a) => {
    const earning = calculateDailyEarning(a.status, wage);

    totalEarned += earning;
    totalAdvance += a.advance || 0;

    // Count days
    if (a.status === ATTENDANCE_STATUS.FULL) fullDays++;
    else if (a.status === ATTENDANCE_STATUS.OVERTIME) overtimeDays++;
    else absentDays++;
  });

  return {
    totalEarned,
    totalAdvance,
    remaining: totalEarned - totalAdvance,
    fullDays,
    overtimeDays,
    absentDays,
    totalDays: records.length,
  };
};