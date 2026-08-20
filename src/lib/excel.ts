import ExcelJS from "exceljs";

export const PLANTILLA_HEADERS = [
  "Legajo",
  "Nombre",
  "Apellido",
  "Fecha (DD/MM/AAAA)",
  "Horas 50%",
  "Horas 100%",
  "Motivo",
];

export async function generarPlantilla(): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Horas extra");
  ws.addRow(PLANTILLA_HEADERS);
  ws.getRow(1).font = { bold: true };
  ws.addRow(["12345", "Juan", "Pérez", "01/08/2026", 2, 0, "Guardia"]);
  ws.columns.forEach((col, i) => {
    col.width = i === 6 ? 30 : 18;
  });
  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

export type FilaCarga = {
  fila: number;
  legajo: string;
  nombre: string;
  apellido: string;
  fecha: string; // YYYY-MM-DD
  horas50: number;
  horas100: number;
  motivo: string | null;
  errorFormato?: string;
};

function celdaTexto(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && "text" in (v as { text?: string })) {
    return String((v as { text?: string }).text ?? "").trim();
  }
  return String(v).trim();
}

function celdaFecha(v: ExcelJS.CellValue): string | null {
  if (v === null || v === undefined || v === "") return null;
  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const texto = celdaTexto(v);
  const match = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const isoMatch = texto.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return texto;
  return null;
}

function celdaNumero(v: ExcelJS.CellValue): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(celdaTexto(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export async function parsearPlantilla(buffer: Buffer): Promise<FilaCarga[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const filas: FilaCarga[] = [];
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // header
    const legajo = celdaTexto(row.getCell(1).value);
    const nombre = celdaTexto(row.getCell(2).value);
    const apellido = celdaTexto(row.getCell(3).value);
    const fechaRaw = row.getCell(4).value;
    const horas50Raw = row.getCell(5).value;
    const horas100Raw = row.getCell(6).value;
    const motivo = celdaTexto(row.getCell(7).value) || null;

    if (!legajo && !nombre && !apellido && !fechaRaw) return; // fila vacía

    const fecha = celdaFecha(fechaRaw);
    const horas50 = celdaNumero(horas50Raw);
    const horas100 = celdaNumero(horas100Raw);

    let errorFormato: string | undefined;
    if (!legajo) errorFormato = "Falta el legajo.";
    else if (!nombre || !apellido) errorFormato = "Falta nombre o apellido.";
    else if (!fecha) errorFormato = "Fecha inválida (usar DD/MM/AAAA).";
    else if (Number.isNaN(horas50) || Number.isNaN(horas100))
      errorFormato = "Horas 50%/100% deben ser numéricas.";
    else if (horas50 < 0 || horas100 < 0)
      errorFormato = "Las horas no pueden ser negativas.";
    else if (horas50 === 0 && horas100 === 0)
      errorFormato = "Debe cargar al menos horas al 50% o al 100%.";

    filas.push({
      fila: rowNumber,
      legajo,
      nombre,
      apellido,
      fecha: fecha ?? "",
      horas50: Number.isFinite(horas50) ? horas50 : 0,
      horas100: Number.isFinite(horas100) ? horas100 : 0,
      motivo,
      errorFormato,
    });
  });

  return filas;
}

export type FilaExport = {
  area: string;
  legajo: string;
  nombre: string;
  apellido: string;
  fecha: string;
  horas50: number;
  horas100: number;
  motivo: string | null;
  cargadoPorUsuario: string;
  createdAt: string;
};

export async function generarExportExcel(
  filas: FilaExport[],
  titulo: string
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Consolidado");

  ws.addRow([titulo]);
  ws.getRow(1).font = { bold: true, size: 14 };
  ws.addRow([]);

  const headerRow = ws.addRow([
    "Área",
    "Legajo",
    "Nombre",
    "Apellido",
    "Fecha",
    "Horas 50%",
    "Horas 100%",
    "Total hs",
    "Motivo",
    "Cargado por",
    "Fecha de carga",
  ]);
  headerRow.font = { bold: true };

  let total50 = 0;
  let total100 = 0;
  for (const f of filas) {
    ws.addRow([
      f.area,
      f.legajo,
      f.nombre,
      f.apellido,
      f.fecha,
      f.horas50,
      f.horas100,
      f.horas50 + f.horas100,
      f.motivo ?? "",
      f.cargadoPorUsuario,
      f.createdAt,
    ]);
    total50 += f.horas50;
    total100 += f.horas100;
  }

  ws.addRow([]);
  const totalRow = ws.addRow([
    "TOTAL",
    "",
    "",
    "",
    "",
    total50,
    total100,
    total50 + total100,
  ]);
  totalRow.font = { bold: true };

  ws.columns.forEach((col, i) => {
    col.width = i === 8 ? 30 : i <= 3 ? 14 : 12;
  });

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
