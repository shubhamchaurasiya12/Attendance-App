// src/utils/pdf.js

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_STATUS } from "./constants";

// ── Helpers ─────────────────────────────────────────────────
const fmtCurrency = (amount) =>
  `Rs.${Number(amount).toLocaleString("en-IN")}`;

const fmtDayDate = (dateStr) => {
  const d = new Date(dateStr);
  const day  = String(d.getDate()).padStart(2, "0");
  const wday = d.toLocaleDateString("en-IN", { weekday: "short" });
  const mon  = d.toLocaleDateString("en-IN", { month: "short" });
  return `${day} ${mon}  (${wday})`;
};

const getMonthLabel = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
};

const getAttendanceSymbol = (status) => {
  if (status === ATTENDANCE_STATUS.FULL)     return "P";
  if (status === ATTENDANCE_STATUS.OVERTIME) return "P+";
  return "";
};

// Group records by month — sorted ASCENDING (day 1 first) within each month
const groupByMonth = (records) => {
  const map = {};
  [...records]
    .sort((a, b) => new Date(a.date) - new Date(b.date)) // ← fix: ascending sort first
    .forEach((r) => {
      const key = getMonthLabel(r.date);
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
  return map;
};

// ── Color constants ──────────────────────────────────────────
const C = {
  purple:      [83,  74,  183],   // #534AB7
  purpleLight: [238, 237, 254],   // #EEEDFE
  purpleDark:  [60,  52,  137],   // #3C3489
  purpleMid:   [175, 169, 236],   // #AFA9EC
  green:       [59,  109, 17 ],
  greenLight:  [234, 243, 222],   // #EAF3DE
  red:         [153, 60,  29 ],
  redLight:    [250, 236, 231],   // #FAECE7
  gray:        [160, 160, 160],
  grayLight:   [245, 244, 254],   // off-white purple tint
  grayBorder:  [220, 218, 245],
  text:        [26,  26,  46 ],   // #1a1a2e
  white:       [255, 255, 255],
};

// Draw a filled rounded rect (simulates rounded corners on section headers)
const roundedRect = (doc, x, y, w, h, r, fillColor) => {
  doc.setFillColor(...fillColor);
  doc.roundedRect(x, y, w, h, r, r, "F");
};

export const generateWorkerPDF = (worker, summary, records) => {
  const doc  = new jsPDF();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentW = pageW - margin * 2;

  let y = 14;

  // ── PAGE TITLE ───────────────────────────────────────────
  roundedRect(doc, margin, y - 5, contentW, 14, 3, C.purple);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.white);
  doc.text("Worker Salary Report", pageW / 2, y + 4, { align: "center" });
  doc.setTextColor(...C.text);
  y += 16;

  // ── WORKER INFO CARD ─────────────────────────────────────
  roundedRect(doc, margin, y, contentW, 22, 3, C.grayLight);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.purpleDark);
  doc.text("Name:", margin + 4, y + 7);
  doc.text("Phone:", margin + 4, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);
  doc.text(worker.name,            margin + 22, y + 7);
  doc.text(worker.phone || "N/A",  margin + 22, y + 14);

  const wageLabel = "Wage / 8h:";
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.purpleDark);
  doc.text(wageLabel, pageW / 2 + 4, y + 7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...C.text);
  doc.text(fmtCurrency(worker.wagePer8h), pageW / 2 + 28, y + 7);
  y += 28;

  // ── SUMMARY TABLE ────────────────────────────────────────
  // Section heading
  roundedRect(doc, margin, y, contentW, 9, 2, C.purpleLight);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...C.purpleDark);
  doc.text("Summary", margin + 4, y + 6);
  doc.setTextColor(...C.text);
  y += 12;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: "plain",
    styles: {
      fontSize: 10,
      cellPadding: { top: 3.5, bottom: 3.5, left: 5, right: 5 },
      font: "helvetica",
      textColor: C.text,
      lineColor: C.grayBorder,
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: C.purple,
      textColor: C.white,
      fontStyle: "bold",
      halign: "center",
      fontSize: 10,
    },
    alternateRowStyles: {
      fillColor: C.grayLight,
    },
    columnStyles: {
      0: { halign: "left",  cellWidth: contentW * 0.6 },
      1: { halign: "right", cellWidth: contentW * 0.4 },
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
    didParseCell: (data) => {
      if (data.row.index === 5 && data.section === "body") {
        data.cell.styles.fontStyle  = "bold";
        data.cell.styles.fillColor  = C.purpleLight;
        data.cell.styles.textColor  = C.purpleDark;
        data.cell.styles.fontSize   = 11;
      }
      // Color total earned green
      if (data.row.index === 3 && data.section === "body" && data.column.index === 1) {
        data.cell.styles.textColor  = C.green;
        data.cell.styles.fontStyle  = "bold";
      }
      // Color advance red
      if (data.row.index === 4 && data.section === "body" && data.column.index === 1) {
        data.cell.styles.textColor  = C.red;
        data.cell.styles.fontStyle  = "bold";
      }
    },
    // Draw rounded border around the whole summary table
    didDrawPage: () => {},
  });

  y = doc.lastAutoTable.finalY + 12;

  // ── MONTHLY ATTENDANCE TABLES ─────────────────────────────
  const grouped = groupByMonth(records);
  const months  = Object.keys(grouped);

  months.forEach((month) => {
    const monthRecords = grouped[month];

    // Month totals
    const presentCount = monthRecords.filter(
      (r) => r.status !== ATTENDANCE_STATUS.ABSENT
    ).length;
    const monthAdvance = monthRecords.reduce((s, r) => s + (r.advance || 0), 0);

    // Page break — needs room for heading + at least 5 rows
    if (y > pageH - 60) {
      doc.addPage();
      y = 14;
    }

    // Month heading pill
    roundedRect(doc, margin, y, contentW, 10, 3, C.purple);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...C.white);
    doc.text(month, margin + 5, y + 6.5);

    // Present count badge (right aligned)
    const badge = `${presentCount} days present`;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.purpleLight);
    doc.text(badge, pageW - margin - 5, y + 6.5, { align: "right" });
    doc.setTextColor(...C.text);
    y += 13;

    // Build rows
    const tableRows = monthRecords.map((r) => [
      fmtDayDate(r.date),
      getAttendanceSymbol(r.status),
      r.advance > 0 ? fmtCurrency(r.advance) : "—",
    ]);

    // Footer totals row
    const footerRow = [
      "Month total",
      `${presentCount} days`,
      monthAdvance > 0 ? fmtCurrency(monthAdvance) : "—",
    ];

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: "plain",
      styles: {
        fontSize: 10,
        cellPadding: { top: 3, bottom: 3, left: 5, right: 5 },
        font: "helvetica",
        textColor: C.text,
        lineColor: C.grayBorder,
        lineWidth: 0.25,
      },
      headStyles: {
        fillColor: C.grayLight,
        textColor: C.purpleDark,
        fontStyle: "bold",
        fontSize: 9.5,
        lineColor: C.grayBorder,
        lineWidth: 0.4,
      },
      alternateRowStyles: {
        fillColor: [250, 249, 255],   // very faint purple tint on alternates
      },
      columnStyles: {
        0: { halign: "left",   cellWidth: contentW * 0.46 },  // Date
        1: { halign: "center", cellWidth: contentW * 0.24 },  // Attendance
        2: { halign: "right",  cellWidth: contentW * 0.30 },  // Advance
      },
      head: [["Date", "Attendance", "Advance Taken"]],
      body: tableRows,
      foot: [footerRow],
      footStyles: {
        fillColor: C.purpleLight,
        textColor: C.purpleDark,
        fontStyle: "bold",
        fontSize: 9.5,
        lineColor: C.purpleMid,
        lineWidth: 0.4,
      },
      showFoot: "lastPage",
      // Color P/P+/absent cells
      didParseCell: (data) => {
        if (data.section !== "body" || data.column.index !== 1) return;
        const val = data.cell.raw;
        if (val === "P") {
          data.cell.styles.textColor  = C.green;
          data.cell.styles.fillColor  = C.greenLight;
          data.cell.styles.fontStyle  = "bold";
        } else if (val === "P+") {
          data.cell.styles.textColor  = C.purpleDark;
          data.cell.styles.fillColor  = C.purpleLight;
          data.cell.styles.fontStyle  = "bold";
        } else {
          // absent — faint red tint, no symbol
          data.cell.styles.fillColor  = C.redLight;
          data.cell.styles.textColor  = [200, 180, 180];
        }
      },
    });

    y = doc.lastAutoTable.finalY + 12;
  });

  // ── FOOTER ON EVERY PAGE ──────────────────────────────────
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Footer rule
    doc.setDrawColor(...C.grayBorder);
    doc.setLineWidth(0.3);
    doc.line(margin, pageH - 10, pageW - margin, pageH - 10);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...C.gray);
    doc.text(
      `${worker.name}  —  Generated on ${new Date().toLocaleDateString("en-IN")}`,
      margin,
      pageH - 6
    );
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW - margin,
      pageH - 6,
      { align: "right" }
    );
    doc.setTextColor(...C.text);
  }

  doc.save(`${worker.name}-report.pdf`);
};