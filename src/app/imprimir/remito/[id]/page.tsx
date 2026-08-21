import { redirect, notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { itemsRemito, obtenerRemito } from "@/lib/remitos";
import ImprimirButton from "../../consolidado/ImprimirButton";

const estadoLabel: Record<string, string> = {
  borrador: "BORRADOR (sin confirmar)",
  confirmado: "CONFIRMADO",
  anulado: "ANULADO",
};

export default async function ImprimirRemitoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/area");

  const { id } = await params;
  const remito = await obtenerRemito(Number(id));
  if (!remito) notFound();
  const items = await itemsRemito(Number(id));

  const total50 = items.reduce((acc, f) => acc + f.horas50, 0);
  const total100 = items.reduce((acc, f) => acc + f.horas100, 0);

  return (
    <div className="print-page">
      <style>{`
        .print-page { max-width: 1000px; margin: 0 auto; padding: 32px 24px; font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; color: #0f172a; }
        .print-page h1 { font-size: 18px; margin: 0 0 2px; }
        .print-page .sub { font-size: 12.5px; color: #64748b; margin: 0 0 4px; }
        .print-page .estado { font-size: 13px; font-weight: 700; margin: 8px 0 20px; }
        .print-page .estado.borrador { color: #b45309; }
        .print-page .estado.confirmado { color: #047857; }
        .print-page .estado.anulado { color: #b91c1c; }
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

      <h1>Remito {remito.codigo}</h1>
      <p className="sub">
        Período: {remito.desde} a {remito.hasta}
        {remito.area ? ` · Área: ${remito.area}` : " · Todas las áreas"}
      </p>
      <p className="sub">
        Generado por {remito.creadoPorUsuario} el {remito.createdAt}
        {remito.estado === "confirmado" &&
          ` · Confirmado por ${remito.confirmadoPorUsuario} el ${remito.confirmadoAt}`}
        {remito.estado === "anulado" &&
          ` · Anulado por ${remito.anuladoPorUsuario} el ${remito.anuladoAt} (motivo: ${remito.motivoAnulacion})`}
      </p>
      <p className={`estado ${remito.estado}`}>{estadoLabel[remito.estado]}</p>

      <table>
        <thead>
          <tr>
            <th>Área</th>
            <th>Legajo</th>
            <th>Nombre</th>
            <th>Mes</th>
            <th>50%</th>
            <th>100%</th>
            <th>Motivo</th>
          </tr>
        </thead>
        <tbody>
          {items.map((f, i) => (
            <tr key={i}>
              <td>{f.area}</td>
              <td>{f.legajo}</td>
              <td>
                {f.nombre} {f.apellido}
              </td>
              <td>{f.fecha.slice(0, 7)}</td>
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
