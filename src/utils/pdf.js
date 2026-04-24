// src/utils/pdf.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_STATUS } from "./constants";

const fmtCurrency = (amount) =>
  `Rs.${Number(amount).toLocaleString("en-IN")}`;

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMonthLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const getAttendanceSymbol = (status) => {
  if (status === ATTENDANCE_STATUS.FULL) return "P";
  if (status === ATTENDANCE_STATUS.OVERTIME) return "P+";
  return "";   // absent = blank cell
};

// Group records by "Month Year" string, preserving sort order
const groupByMonth = (records) => {
  const map = {};
  records.forEach((r) => {
    const key = getMonthLabel(r.date);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
};

export const generateWorkerPDF = (worker, summary, records) => {
  const doc = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();

  // ── Helpers ────────────────────────────────────────────
  const centerText = (text, y, size = 12, style = "normal") => {
    doc.setFontSize(size);
    doc.setFont("helvetica", style);
    doc.text(text, pageW / 2, y, { align: "center" });
  };

  const labelValue = (label, value, x, y) => {
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(label, x, y);
    doc.setFont("helvetica", "normal");
    doc.text(value, x + doc.getTextWidth(label) + 2, y);
  };

  let y = 14;

  // ── Header ─────────────────────────────────────────────
  centerText("Worker Salary Report", y, 16, "bold");
  y += 7;

  // Thin rule
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(10, y, pageW - 10, y);
  y += 6;

  // Worker info row
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  labelValue("Name: ", worker.name, 10, y);
  labelValue("Phone: ", worker.phone || "N/A", 100, y);
  y += 6;
  labelValue("Wage per 8h: ", fmtCurrency(worker.wagePer8h), 10, y);
  y += 5;

  doc.line(10, y, pageW - 10, y);
  y += 7;

  // ── Summary block ──────────────────────────────────────
  centerText("Summary", y, 12, "bold");
  y += 6;

  // 2-column summary table
  autoTable(doc, {
    startY: y,
    margin: { left: 10, right: 10 },
    theme: "grid",
    styles: {
      fontSize: 10,
      cellPadding: 3,
      font: "helvetica",
      textColor: [30, 30, 30],
    },
    headStyles: {
      fillColor: [83, 74, 183],   // #534AB7 purple
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left",  cellWidth: (pageW - 20) / 2 },
      1: { halign: "right", cellWidth: (pageW - 20) / 2 },
    },
    head: [["Particulars", "Value"]],
    body: [
      ["Full days (8h)",      String(summary.fullDays)],
      ["Overtime days (12h)", String(summary.overtimeDays)],
      ["Absent days",         String(summary.absentDays)],
      ["Total earned",        fmtCurrency(summary.totalEarned)],
      ["Total advance taken", fmtCurrency(summary.totalAdvance)],
      ["Remaining to pay",    fmtCurrency(summary.remaining)],
    ],
    // Highlight the last row (remaining)
    didParseCell: (data) => {
      if (data.row.index === 5) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [238, 237, 254]; // #EEEDFE
        data.cell.styles.textColor = [60, 52, 137];   // #3C3489
      }
    },
  });

  y = doc.lastAutoTable.finalY + 10;

  // ── Monthly attendance tables ──────────────────────────
  const grouped = groupByMonth(records);
  const months = Object.keys(grouped);

  months.forEach((month) => {
    const monthRecords = grouped[month];

    // Page break if not enough room for header + at least 3 rows
    if (y > doc.internal.pageSize.getHeight() - 50) {
      doc.addPage();
      y = 14;
    }

    // Month heading centered
    centerText(month, y, 11, "bold");
    y += 5;

    const tableRows = monthRecords.map((r) => [
      fmtDate(r.date),
      getAttendanceSymbol(r.status),
      r.advance > 0 ? fmtCurrency(r.advance) : "—",
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: 10, right: 10 },
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        font: "helvetica",
        textColor: [30, 30, 30],
      },
      headStyles: {
        fillColor: [83, 74, 183],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        halign: "center",
      },
      columnStyles: {
        0: { halign: "left",   cellWidth: 80 },  // Date
        1: { halign: "center", cellWidth: 40 },  // Attendance
        2: { halign: "right",  cellWidth: (pageW - 20) - 120 }, // Advance
      },
      head: [["Date", "Attendance", "Advance Taken"]],
      body: tableRows,
      // Color P rows green, P+ purple, blank (absent) faint red
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const val = data.cell.raw;
        if (val === "P") {
          data.cell.styles.textColor = [59, 109, 17];   // green
          data.cell.styles.fontStyle = "bold";
        } else if (val === "P+") {
          data.cell.styles.textColor = [60, 52, 137];   // purple
          data.cell.styles.fontStyle = "bold";
        } else {
          data.cell.styles.fillColor = [252, 235, 235]; // faint red bg for absent
        }
      },
    });

    y = doc.lastAutoTable.finalY + 10;
  });

  // ── Footer on every page ───────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160, 160, 160);
    doc.text(
      `${worker.name} — Generated on ${new Date().toLocaleDateString("en-IN")}`,
      10,
      doc.internal.pageSize.getHeight() - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - 10,
      doc.internal.pageSize.getHeight() - 6,
      { align: "right" }
    );
    doc.setTextColor(30, 30, 30); // reset
  }

  doc.save(`${worker.name}-report.pdf`);
};