export function escapeCsvCell(value: unknown) {
  const text = value == null
    ? ""
    : typeof value === "string"
      ? value
      : JSON.stringify(value);

  if (/[";\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function buildCsvContent(headers: string[], rows: unknown[][]) {
  return [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(";"))
    .join("\n");
}

export function downloadCsvFile(content: string, fileName: string) {
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}