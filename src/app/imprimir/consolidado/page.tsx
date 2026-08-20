import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dbAll } from "@/lib/db";
import type { FilaExport } from "@/lib/excel";
import ImprimirButton from "./ImprimirButton";

export default async function ImprimirConsolidadoPage({
  searchParams,
}: {
  searchParams: Promise<{ area?: string; legajo?: string; desde?: string; hasta?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/area");

  const { area, legajo, desde, hasta } = await searchParams;

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
    clauses.push("fecha >= ?");
    params.push(desde);
  }
  if (hasta) {
    clauses.push("fecha <= ?");
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

  const total50 = filas.reduce((acc, f) => acc + f.horas50, 0);
  const total100 = filas.reduce((acc, f) => acc + f.horas100, 0);
  const generado = new Date().toLocaleString("es-AR");

  return (
    <div className="print-page">
      <style>{`
        .print-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; color: #0f172a; }
        .print-page h1 { font-size: 18px; margin: 0 0 2px; }
        .print-page .sub { font-size: 12.5px; color: #64748b; margin: 0 0 20px; }
        .print-page table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .print-page th { text-align: left; border-bottom: 1.5px solid #0f172a; padding: 4px 8px 4px 0; }
        .print-page td { border-bottom: 1px solid #e2e8f0; padding: 4px 8px 4px 0; }
        .print-page tfoot td { border-top: 1.5px solid #0f172a; border-bottom: none; font-weight: 600; }
        .no-print { margin-bottom: 20px; }
        @media print {
          .no-print { display: none; }
          .print-page { padding: 0; }
        }
      `}</style>

      <div className="no-print">
        <ImprimirButton />
      </div>

      <h1>Listado consolidado de horas extra</h1>
      <p className="sub">
        Período: {desde || "inicio"} a {hasta || "actualidad"}
        {area ? ` · Área: ${area}` : ""} · Generado: {generado}
      </p>

      <table>
        <thead>
          <tr>
            <th>Área</th>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Fecha</th>
            <th>50%</th>
            <th>100%</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={i}>
              <td>{f.area}</td>
              <td>{f.legajo}</td>
              <td>
                {f.nombre} {f.apellido}
              </td>
              <td>{f.fecha}</td>
              <td>{f.horas50}</td>
              <td>{f.horas100}</td>
              <td>{f.motivo}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={4}>TOTAL</td>
            <td>{total50}</td>
            <td>{total100}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
