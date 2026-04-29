import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ATTENDANCE_STATUS } from "./constants";

// ── Helpers ─────────────────────────────────────
const fmtCurrency = (amount) =>
  `₹${Number(amount).toLocaleString("en-IN")}`;

const fmtDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.getDate();
};

const getMonthLabel = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });

const getSymbol = (status) => {
  if (status === ATTENDANCE_STATUS.FULL) return "P";
  if (status === ATTENDANCE_STATUS.OVERTIME) return "P+";
  return "A";
};

const groupByMonth = (records) => {
  const map = {};
  records.forEach((r) => {
    const key = getMonthLabel(r.date);
    if (!map[key]) map[key] = [];
    map[key].push(r);
  });
  return map;
};

// ── MAIN ───────────────────────────────────────
export const generateWorkerPDF = (worker, summary, records) => {
  const doc = new jsPDF("landscape");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 10;

  let y = margin;

  // ── TITLE ───────────────────────────────────
  doc.setFontSize(14);
  doc.text("Attendance Report", pageW / 2, y, { align: "center" });
  y += 8;

  doc.setFontSize(10);
  doc.text(`Worker: ${worker.name}`, margin, y);
  y += 10;

  const grouped = groupByMonth(records);

  Object.keys(grouped).forEach((month) => {
    const monthRecords = grouped[month];

    if (y > pageH - 40) {
      doc.addPage();
      y = margin;
    }

    // ── Month Header ───────────────────────────
    doc.setFontSize(11);
    doc.text(month, margin, y);
    y += 5;

    // ── Build Rows (DATE / ATT / ADV) ──────────
    const days = 31;

    const dates = [];
    const status = [];
    const advance = [];

    for (let d = 1; d <= days; d++) {
      const dateStr = `${new Date(month).getFullYear()}-${String(
        new Date(month).getMonth() + 1
      ).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

      const rec = monthRecords.find((r) => r.date === dateStr);

      dates.push(d);

      if (!rec) {
        status.push("-");
        advance.push("-");
      } else {
        status.push(getSymbol(rec.status));
        advance.push(rec.advance ? rec.advance : "-");
      }
    }

    // ── TABLE ─────────────────────────────────
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,

      styles: {
        fontSize: 7,
        cellPadding: 2,
        halign: "center",
        valign: "middle",
        overflow: "ellipsize",
      },

      head: [["Date", ...dates]],
      body: [
        ["Attendance", ...status],
        ["Advance", ...advance],
      ],

      columnStyles: {
        0: { cellWidth: 25, halign: "left" },
      },

      didParseCell: (data) => {
        const val = data.cell.raw;

        if (val === "P") data.cell.styles.textColor = [0, 128, 0];
        if (val === "P+") data.cell.styles.textColor = [0, 0, 200];
        if (val === "A") data.cell.styles.textColor = [200, 0, 0];

        if (!isNaN(val)) {
          data.cell.styles.textColor = [153, 60, 29];
        }
      },
    });

    y = doc.lastAutoTable.finalY + 12; // 🔥 spacing fix
  });

  doc.save(`${worker.name}-monthly.pdf`);
};