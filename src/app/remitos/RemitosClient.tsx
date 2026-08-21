"use client";

import { useEffect, useState } from "react";

type Remito = {
  id: number;
  codigo: string;
  area: string | null;
  desde: string;
  hasta: string;
  estado: "borrador" | "confirmado" | "anulado";
  creadoPorUsuario: string;
  createdAt: string;
  confirmadoPorUsuario: string | null;
  confirmadoAt: string | null;
  anuladoPorUsuario: string | null;
  anuladoAt: string | null;
  motivoAnulacion: string | null;
};

const estadoPill: Record<Remito["estado"], string> = {
  borrador: "bg-amber-50 text-amber-700 border-amber-200",
  confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  anulado: "bg-slate-100 text-slate-500 border-slate-200",
};
const estadoLabel: Record<Remito["estado"], string> = {
  borrador: "Borrador",
  confirmado: "Confirmado",
  anulado: "Anulado",
};

export default function RemitosClient({
  areaFija,
  areasDisponibles,
}: {
  areaFija: string | null;
  areasDisponibles: string[];
}) {
  const esAdmin = areaFija === null;

  const [remitos, setRemitos] = useState<Remito[]>([]);
  const [cargando, setCargando] = useState(true);

  const [area, setArea] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function recargar() {
    setCargando(true);
    fetch("/api/remitos")
      .then((r) => r.json() as Promise<{ remitos: Remito[] }>)
      .then((data) => {
        setRemitos(data.remitos ?? []);
        setCargando(false);
      })
      .catch(() => setCargando(false));
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/remitos", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ remitos: Remito[] }>)
      .then((data) => {
        setRemitos(data.remitos ?? []);
        setCargando(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function handleGenerar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (esAdmin === false && !areaFija) {
      setError("Tu usuario no tiene un área asignada.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/remitos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ area: esAdmin ? area || null : areaFija, desde, hasta }),
      });
      const data = (await res.json()) as { error?: string; remito?: { id: number } };
      if (!res.ok) {
        setError(data.error ?? "No se pudo generar el remito.");
        return;
      }
      recargar();
      if (data.remito) window.open(`/imprimir/remito/${data.remito.id}`, "_blank");
    } finally {
      setEnviando(false);
    }
  }

  async function handleAnular(id: number) {
    if (
      !confirm(
        "¿Anular este remito? Las horas que incluye van a quedar disponibles de nuevo para un remito nuevo."
      )
    )
      return;
    const res = await fetch(`/api/remitos/${id}/anular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "No se pudo anular.");
      return;
    }
    recargar();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Generar remito</h2>
        <p className="text-sm text-slate-500 mb-4">
          Junta las horas del período elegido (que todavía no estén en otro remito) en un documento
          único para mandar por GDE. <b>Al generarlo queda confirmado en el momento</b> y esas horas
          quedan bloqueadas para siempre — no se pueden volver a incluir en otro remito. Si hay un
          error, se puede anular y las horas vuelven a estar disponibles.
        </p>
        <form onSubmit={handleGenerar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {esAdmin ? (
            <div>
              <label className="text-sm font-medium text-slate-700">Área</label>
              <select
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Todas</option>
                {areasDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-sm font-medium text-slate-700">Área</label>
              <input
                value={areaFija ?? ""}
                disabled
                className="mt-1 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
              />
            </div>
          )}
          <div>
            <label className="text-sm font-medium text-slate-700">Desde</label>
            <input
              type="month"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="month"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-800 disabled:opacity-60 w-full"
            >
              {enviando ? "Generando..." : "Generar e imprimir remito"}
            </button>
          </div>
          {error && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          {esAdmin ? "Remitos generados" : "Remitos de tu área"}
        </h2>
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : remitos.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no se generó ningún remito.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Código</th>
                  {esAdmin && <th className="py-2 pr-4">Área</th>}
                  <th className="py-2 pr-4">Período</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Generado</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {remitos.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4 font-medium">{r.codigo}</td>
                    {esAdmin && <td className="py-2 pr-4">{r.area ?? "Todas"}</td>}
                    <td className="py-2 pr-4">
                      {r.desde} a {r.hasta}
                    </td>
                    <td className="py-2 pr-4">
                      <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${estadoPill[r.estado]}`}>
                        {estadoLabel[r.estado]}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-slate-500">
                      {r.creadoPorUsuario} · {r.createdAt}
                    </td>
                    <td className="py-2 pr-4 text-right space-x-3 whitespace-nowrap">
                      <a
                        href={`/imprimir/remito/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-slate-600 hover:underline"
                      >
                        Ver / imprimir
                      </a>
                      {r.estado === "confirmado" && (
                        <button onClick={() => handleAnular(r.id)} className="text-xs text-red-700 hover:underline">
                          Anular
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
