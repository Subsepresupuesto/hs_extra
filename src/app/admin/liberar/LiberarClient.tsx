"use client";

import { useEffect, useState, useCallback } from "react";

type Liberado = {
  id: number;
  legajo: string;
  nombre: string | null;
  apellido: string | null;
  periodo: string | null;
  motivo: string | null;
  activo: number;
  createdAt: string;
};

export default function LiberarClient() {
  const [liberados, setLiberados] = useState<Liberado[]>([]);
  const [cargando, setCargando] = useState(true);

  const [legajo, setLegajo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [periodo, setPeriodo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/liberados");
    const data = (await res.json()) as { liberados: Liberado[] };
    setLiberados(data.liberados ?? []);
    setCargando(false);
  }, []);

  function recargar() {
    setCargando(true);
    void cargar();
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/liberados", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ liberados: Liberado[] }>)
      .then((data) => {
        setLiberados(data.liberados ?? []);
        setCargando(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    try {
      const res = await fetch("/api/liberados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          legajo: legajo.trim(),
          nombre: nombre.trim() || null,
          apellido: apellido.trim() || null,
          periodo: periodo.trim() || null,
          motivo: motivo.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo liberar el legajo.");
        return;
      }
      setLegajo("");
      setNombre("");
      setApellido("");
      setPeriodo("");
      setMotivo("");
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  async function handleToggle(id: number, activo: boolean) {
    await fetch(`/api/liberados/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    recargar();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Liberar un legajo</h2>
        <p className="text-sm text-slate-500 mb-4">
          Permite que un legajo supere los topes mensuales. Dejá el período vacío para liberarlo sin fecha de
          vencimiento (hasta que lo desactives).
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Legajo</label>
            <input
              value={legajo}
              onChange={(e) => setLegajo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Nombre (opcional)</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Apellido (opcional)</label>
            <input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Período (AAAA-MM, opcional)</label>
            <input
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
              placeholder="2026-08"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Motivo</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="sm:col-span-2 lg:col-span-5 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 lg:col-span-5">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-800 disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Liberar legajo"}
            </button>
          </div>
        </form>
      </section>

      <TablaLiberados
        titulo="Liberaciones permanentes"
        subtitulo="Sin fecha de vencimiento, quedan activas hasta que se desactiven."
        liberados={liberados.filter((l) => !l.periodo)}
        cargando={cargando}
        onToggle={handleToggle}
      />

      <TablaLiberados
        titulo="Liberaciones temporales"
        subtitulo="Válidas solo para el período (mes) indicado."
        liberados={liberados.filter((l) => !!l.periodo)}
        cargando={cargando}
        onToggle={handleToggle}
      />
    </div>
  );
}

function TablaLiberados({
  titulo,
  subtitulo,
  liberados,
  cargando,
  onToggle,
}: {
  titulo: string;
  subtitulo: string;
  liberados: Liberado[];
  cargando: boolean;
  onToggle: (id: number, activo: boolean) => void;
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-1">{titulo}</h2>
      <p className="text-sm text-slate-500 mb-4">{subtitulo}</p>
      {cargando ? (
        <p className="text-sm text-slate-500">Cargando...</p>
      ) : liberados.length === 0 ? (
        <p className="text-sm text-slate-500">No hay liberaciones en esta categoría.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-4">Legajo</th>
                <th className="py-2 pr-4">Nombre</th>
                {liberados.some((l) => l.periodo) && <th className="py-2 pr-4">Período</th>}
                <th className="py-2 pr-4">Motivo</th>
                <th className="py-2 pr-4">Estado</th>
                <th className="py-2 pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {liberados.map((l) => (
                <tr key={l.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4">{l.legajo}</td>
                  <td className="py-2 pr-4">
                    {l.nombre} {l.apellido}
                  </td>
                  {liberados.some((x) => x.periodo) && <td className="py-2 pr-4">{l.periodo}</td>}
                  <td className="py-2 pr-4 text-slate-500">{l.motivo}</td>
                  <td className="py-2 pr-4">
                    {l.activo ? (
                      <span className="text-emerald-700 text-xs font-medium">Activo</span>
                    ) : (
                      <span className="text-slate-400 text-xs">Inactivo</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <button onClick={() => onToggle(l.id, !l.activo)} className="text-xs text-slate-600 hover:underline">
                      {l.activo ? "Desactivar" : "Reactivar"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
