"use client";

import { useEffect, useState, useMemo } from "react";

type Registro = {
  id: number;
  legajo: string;
  nombre: string;
  apellido: string;
  area: string;
  fecha: string;
  horas50: number;
  horas100: number;
  motivo: string | null;
  cargadoPorUsuario: string;
  createdAt: string;
};

export default function ConsolidadoClient() {
  const [areas, setAreas] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [legajo, setLegajo] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/areas")
      .then((r) => r.json() as Promise<{ areas: string[] }>)
      .then((data) => setAreas(data.areas ?? []));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (legajo) params.set("legajo", legajo);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    const controller = new AbortController();
    fetch(`/api/horas?${params.toString()}`, { signal: controller.signal })
      .then((r) => r.json() as Promise<{ registros: Registro[] }>)
      .then((data) => {
        setRegistros(data.registros ?? []);
        setCargando(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [area, legajo, desde, hasta]);

  const totales = useMemo(() => {
    return registros.reduce(
      (acc, r) => ({ h50: acc.h50 + r.horas50, h100: acc.h100 + r.horas100 }),
      { h50: 0, h100: 0 }
    );
  }, [registros]);

  function queryString() {
    const params = new URLSearchParams();
    if (area) params.set("area", area);
    if (legajo) params.set("legajo", legajo);
    if (desde) params.set("desde", desde);
    if (hasta) params.set("hasta", hasta);
    return params.toString();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Área</label>
            <select
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Todas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Legajo</label>
            <input
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Desde</label>
            <input
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Hasta</label>
            <input
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 mt-4">
          <a
            href={`/api/horas/export/excel?${queryString()}`}
            className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2 hover:bg-red-800"
          >
            Descargar Excel
          </a>
          <a
            href={`/imprimir/consolidado?${queryString()}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md bg-slate-100 text-slate-900 text-sm font-medium px-4 py-2 hover:bg-slate-200"
          >
            Imprimir / PDF (GDE)
          </a>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Registros {cargando ? "" : `(${registros.length})`}
          </h2>
          <p className="text-sm text-slate-500">
            Total 50%: <span className="font-medium text-slate-800">{totales.h50}</span> · Total 100%:{" "}
            <span className="font-medium text-slate-800">{totales.h100}</span>
          </p>
        </div>
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-slate-500">No hay registros para el filtro seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Área</th>
                  <th className="py-2 pr-4">Legajo</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">50%</th>
                  <th className="py-2 pr-4">100%</th>
                  <th className="py-2 pr-4">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{r.area}</td>
                    <td className="py-2 pr-4">{r.legajo}</td>
                    <td className="py-2 pr-4">
                      {r.nombre} {r.apellido}
                    </td>
                    <td className="py-2 pr-4">{r.fecha}</td>
                    <td className="py-2 pr-4">{r.horas50}</td>
                    <td className="py-2 pr-4">{r.horas100}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.motivo}</td>
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
