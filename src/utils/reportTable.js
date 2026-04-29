export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

export const buildWorkerMonthlyTable = (
  worker,
  attendance,
  year,
  month
) => {
  const days = getDaysInMonth(year, month);

  const datesRow = [];
  const statusRow = [];
  const advanceRow = [];

  for (let d = 1; d <= days; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

    const record = attendance.find(
      (a) =>
        a.workerId === worker.id &&
        a.date === date
    );

    datesRow.push(d);

    if (!record) {
      statusRow.push("-");
      advanceRow.push("-");
      continue;
    }

    // Status mapping
    if (record.status === "FULL") statusRow.push("P");
    else if (record.status === "OVERTIME") statusRow.push("P+");
    else statusRow.push("A");

    advanceRow.push(record.advance > 0 ? record.advance : "-");
  }

  return {
    datesRow,
    statusRow,
    advanceRow,
  };
};