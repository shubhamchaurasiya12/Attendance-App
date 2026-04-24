// src/utils/share.js

const formatCurrency = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN")}`;

export const formatWorkerSummary = (worker, summary) => {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const attendanceBar = buildBar(summary.fullDays, summary.overtimeDays, summary.absentDays);

  return `
*${worker.name} — Salary Report*
_Generated on ${today}_

*Worker Details*
Name:  ${worker.name}
Phone: ${worker.phone || "N/A"}
Wage:  ${formatCurrency(worker.wagePer8h)} per 8h

*Attendance*
${attendanceBar}
✅ Full days (8h):    ${summary.fullDays}
⏫ Overtime (12h):   ${summary.overtimeDays}
❌ Absent:           ${summary.absentDays}

*Earnings*
Earned:    ${formatCurrency(summary.totalEarned)}
Advance:  −${formatCurrency(summary.totalAdvance)}
──────────────────
*Remaining: ${formatCurrency(summary.remaining)}*
`.trim();
};

// Visual bar — filled blocks for present days, empty for absent
const buildBar = (full, overtime, absent) => {
  const total = full + overtime + absent;
  if (total === 0) return "";

  const filledFull = "🟩".repeat(full);
  const filledOT   = "🟪".repeat(overtime);
  const filledAbs  = "⬜".repeat(absent);

  return `${filledFull}${filledOT}${filledAbs}  (${total} days)\n`;
};

export const shareOnWhatsApp = (text) => {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
};