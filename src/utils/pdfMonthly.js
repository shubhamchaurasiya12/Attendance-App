import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { buildWorkerMonthlyTable } from "./reportTable";

// ── COLUMN WIDTH CALCULATION ─────────────────────
const getColumnStyles = (days) => {
  const firstColWidth = 28;
  const remainingWidth = 277 - firstColWidth; // A4 landscape usable width
  const perDayWidth = remainingWidth / days;

  const styles = {
    0: { cellWidth: firstColWidth, halign: "left" },
  };

  for (let i = 1; i <= days; i++) {
    styles[i] = {
      cellWidth: perDayWidth,
      halign: "center",
    };
  }

  return styles;
};

// ── MAIN FUNCTION ───────────────────────────────
export const generateMonthlyPDF = (
  workers,
  attendance,
  year,
  month
) => {
  const doc = new jsPDF("landscape");

  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();

  const margin = 10;

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });

  let startY = margin + 5;

  // ── HEADER ───────────────────────────────────
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Attendance Report - ${monthName} ${year}`,
    pageW / 2,
    startY,
    { align: "center" }
  );

  startY += 10;

  workers.forEach((worker, index) => {
    const { datesRow, statusRow, advanceRow } =
      buildWorkerMonthlyTable(worker, attendance, year, month);

    const days = datesRow.length;

    // 🔥 Page break BEFORE drawing
    if (startY > pageH - 60) {
      doc.addPage();
      startY = margin + 10;
    }

    // ── Worker Name ───────────────────────────
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Worker: ${worker.name}`, margin, startY);

    startY += 4;

    // ── TABLE ─────────────────────────────────
    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,

      theme: "grid",

      styles: {
        fontSize: 7.5,
        cellPadding: { top: 2, bottom: 2, left: 1.5, right: 1.5 },
        valign: "middle",
        halign: "center",
        overflow: "ellipsize", // 🔥 prevents overflow
        lineWidth: 0.2,
      },

      headStyles: {
        fillColor: [245, 245, 245],
        textColor: [40, 40, 40],
        fontStyle: "bold",
      },

      columnStyles: getColumnStyles(days),

      head: [["Date", ...datesRow]],

      body: [
        ["Attendance", ...statusRow],
        ["Advance", ...advanceRow],
      ],

      didParseCell: (data) => {
        const val = data.cell.raw;

        // Attendance colors
        if (val === "P") {
          data.cell.styles.textColor = [0, 128, 0];
          data.cell.styles.fontStyle = "bold";
        }

        if (val === "P+") {
          data.cell.styles.textColor = [0, 0, 200];
          data.cell.styles.fontStyle = "bold";
        }

        if (val === "A") {
          data.cell.styles.textColor = [200, 0, 0];
        }

        // Advance color
        if (!isNaN(val) && val !== "" && val !== "-") {
          data.cell.styles.textColor = [153, 60, 29];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // 🔥 Proper spacing between workers
    startY = doc.lastAutoTable.finalY + 12;
  });

  // ── FOOTER (PAGE NUMBER) ─────────────────────
  const totalPages = doc.internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);

    doc.text(
      `Page ${i} of ${totalPages}`,
      pageW / 2,
      pageH - 6,
      { align: "center" }
    );
  }

  doc.save(`attendance-${monthName}-${year}.pdf`);
};