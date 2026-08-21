import * as XLSX from "xlsx";

export const PLANTILLA_HEADERS = [
  "Legajo",
  "Nombre",
  "Apellido",
  "Mes (MM/AAAA)",
  "Horas 50%",
  "Horas 100%",
  "Motivo",
];

export async function generarPlantilla(): Promise<Buffer> {
  const wb = XLSX.utils.book_new();
  // Solo encabezado: no se incluye fila de ejemplo para que no se pueda
  // subir por error como si fuera un registro real.
  const ws = XLSX.utils.aoa_to_sheet([PLANTILLA_HEADERS]);
  ws["!cols"] = PLANTILLA_HEADERS.map((_, i) => ({ wch: i === 6 ? 30 : 18 }));
  XLSX.utils.book_append_sheet(wb, ws, "Horas extra");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return Buffer.from(buf);
}

export type FilaCarga = {
  fila: number;
  legajo: string;
  nombre: string;
  apellido: string;
  fecha: string; // YYYY-MM-01 (primer día del mes cargado)
  horas50: number;
  horas100: number;
  motivo: string | null;
  errorFormato?: string;
};

function celdaTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

function celdaMes(v: unknown): string | null {
  if (v === null || v === undefined || v === "") return null;

  if (v instanceof Date) {
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-01`;
  }

  const texto = celdaTexto(v);
  const matchMmAaaa = texto.match(/^(\d{1,2})[/-](\d{4})$/);
  if (matchMmAaaa) {
    const [, m, y] = matchMmAaaa;
    return `${y}-${m.padStart(2, "0")}-01`;
  }
  const matchAaaaMm = texto.match(/^(\d{4})-(\d{1,2})$/);
  if (matchAaaaMm) {
    const [, y, m] = matchAaaaMm;
    return `${y}-${m.padStart(2, "0")}-01`;
  }
  return null;
}

function celdaNumero(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(celdaTexto(v).replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

export async function parsearPlantilla(buffer: Buffer): Promise<FilaCarga[]> {
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const nombreHoja = wb.SheetNames[0];
  if (!nombreHoja) return [];
  const ws = wb.Sheets[nombreHoja];
  const filasCrudas = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });

  const periodoActualStr = new Date().toISOString().slice(0, 7);
  const filas: FilaCarga[] = [];

  filasCrudas.forEach((row, idx) => {
    const rowNumber = idx + 1;
    if (rowNumber === 1) return; // header

    const legajo = celdaTexto(row[0]);
    const nombre = celdaTexto(row[1]);
    const apellido = celdaTexto(row[2]);
    const mesRaw = row[3];
    const horas50Raw = row[4];
    const horas100Raw = row[5];
    const motivo = celdaTexto(row[6]) || null;

    if (!legajo && !nombre && !apellido && !mesRaw) return; // fila vacía

    const fecha = celdaMes(mesRaw);
    const horas50 = celdaNumero(horas50Raw);
    const horas100 = celdaNumero(horas100Raw);

    let errorFormato: string | undefined;
    if (!legajo) errorFormato = "Falta el legajo.";
    else if (!nombre || !apellido) errorFormato = "Falta nombre o apellido.";
    else if (!fecha) errorFormato = "Mes inválido (usar MM/AAAA).";
    else if (fecha.slice(0, 7) > periodoActualStr) errorFormato = "No se pueden cargar meses futuros.";
    else if (Number.isNaN(horas50) || Number.isNaN(horas100))
      errorFormato = "Horas 50%/100% deben ser numéricas.";
    else if (horas50 < 0 || horas100 < 0) errorFormato = "Las horas no pueden ser negativas.";
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

function mesLegible(fecha: string): string {
  const [y, m] = fecha.split("-");
  return `${m}/${y}`;
}

export async function generarExportExcel(filas: FilaExport[], titulo: string): Promise<Buffer> {
  // Todo lo que sea número o fecha va como texto (string), para que Excel no
  // reformatee legajos, horas o meses al abrir el archivo.
  const filasHoja: string[][] = [
    [titulo],
    [],
    ["Área", "Legajo", "Nombre", "Apellido", "Mes", "Horas 50%", "Horas 100%", "Total hs", "Motivo", "Cargado por", "Fecha de carga"],
  ];

  let total50 = 0;
  let total100 = 0;
  for (const f of filas) {
    filasHoja.push([
      f.area,
      f.legajo,
      f.nombre,
      f.apellido,
      mesLegible(f.fecha),
      String(f.horas50),
      String(f.horas100),
      String(f.horas50 + f.horas100),
      f.motivo ?? "",
      f.cargadoPorUsuario,
      f.createdAt,
    ]);
    total50 += f.horas50;
    total100 += f.horas100;
  }

  filasHoja.push([]);
  filasHoja.push(["TOTAL", "", "", "", "", String(total50), String(total100), String(total50 + total100)]);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(filasHoja);
  ws["!cols"] = [14, 12, 14, 14, 10, 12, 12, 12, 30, 14, 20].map((wch) => ({ wch }));
  XLSX.utils.book_append_sheet(wb, ws, "Consolidado");
  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return Buffer.from(buf);
}
