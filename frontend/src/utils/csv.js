/**
 * Downloads rows (array of plain objects) as a CSV file. Cells starting with
 * = + - @ are prefixed with ' so spreadsheet apps don't run them as formulas.
 */
export const downloadCsv = (filename, rows) => {
  if (!rows.length) return;
  const cols = Object.keys(rows[0]);
  const cell = (v) => {
    let s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [cols.map(cell), ...rows.map((r) => cols.map((c) => cell(r[c])))].map((line) => line.join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
};
