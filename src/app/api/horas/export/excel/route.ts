import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll } from "@/lib/db";
import { generarExportExcel, type FilaExport } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(req.url);
  const area = searchParams.get("area");
  const legajo = searchParams.get("legajo");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const clauses: string[] = [];
  const params: (string | number)[] = [];
  if (area) {
    clauses.push("area = ?");
    params.push(area);
  }
  if (legajo) {
    clauses.push("legajo LIKE ?");
    params.push(`%${legajo}%`);
  }
  if (desde) {
    clauses.push("periodo >= ?");
    params.push(desde);
  }
  if (hasta) {
    clauses.push("periodo <= ?");
    params.push(hasta);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

  const filas = await dbAll<FilaExport>(
    `SELECT area, legajo, nombre, apellido, fecha, horas_50 as horas50, horas_100 as horas100,
            motivo, cargado_por_usuario as cargadoPorUsuario, created_at as createdAt
     FROM horas_extra ${where}
     ORDER BY area, fecha, legajo`,
    ...params
  );

  const titulo = `Listado consolidado de horas extra${desde || hasta ? ` (${desde ?? "..."} a ${hasta ?? "..."})` : ""}`;
  const buffer = await generarExportExcel(filas, titulo);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="consolidado_horas_extra.xlsx"',
    },
  });
}
