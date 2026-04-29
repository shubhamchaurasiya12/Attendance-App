import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { buildWorkerMonthlyTable } from "./reportTable";

const getColumnStyles = (days) => {
  const firstColWidth = 30;

  // 🔥 More realistic width calculation
  const usableWidth = 277 - firstColWidth;
  const perDay = usableWidth / days;

  const styles = {
    0: { cellWidth: firstColWidth, halign: "left" },
  };

  for (let i = 1; i <= days; i++) {
    styles[i] = {
      cellWidth: perDay,
      halign: "center",
    };
  }

  return styles;
};

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

  // HEADER
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(
    `Attendance Report - ${monthName} ${year}`,
    pageW / 2,
    startY,
    { align: "center" }
  );

  startY += 10;

  workers.forEach((worker) => {
    const { datesRow, statusRow, advanceRow } =
      buildWorkerMonthlyTable(worker, attendance, year, month);

    const days = datesRow.length;

    // PAGE BREAK
    if (startY > pageH - 60) {
      doc.addPage();
      startY = margin + 10;
    }

    // Worker name
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`Worker: ${worker.name}`, margin, startY);

    startY += 5;

    autoTable(doc, {
      startY,
      margin: { left: margin, right: margin },
      tableWidth: pageW - margin * 2,

      theme: "grid",

      styles: {
        fontSize: 6.8, // 🔥 reduced slightly (fix overflow)
        cellPadding: { top: 2.5, bottom: 2.5, left: 1.2, right: 1.2 },
        valign: "middle",
        halign: "center",

        overflow: "linebreak", // 🔥 KEY FIX (no cropping)
      },

      headStyles: {
        fillColor: [245, 245, 245],
        fontStyle: "bold",
      },

      columnStyles: getColumnStyles(days),

      head: [["Date", ...datesRow]],

      body: [
        ["Attendance", ...statusRow],

        // 🔥 ADVANCE ROW FIXED
        [
          "Advance",
          ...advanceRow.map((v) =>
            v === "-" ? "-" : String(v)
          ),
        ],
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

        // Advance styling (IMPORTANT)
        if (!isNaN(val) && val !== "" && val !== "-") {
          data.cell.styles.textColor = [153, 60, 29];
          data.cell.styles.fontStyle = "bold";
        }
      },
    });

    // spacing
    startY = doc.lastAutoTable.finalY + 14;
  });

  // FOOTER
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