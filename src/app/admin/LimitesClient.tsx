"use client";

import { useEffect, useState } from "react";

export default function LimitesClient() {
  const [limite50, setLimite50] = useState("");
  const [limite100, setLimite100] = useState("");
  const [limiteCombinado, setLimiteCombinado] = useState("");
  const [diaInicio, setDiaInicio] = useState("");
  const [diaFin, setDiaFin] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/config")
      .then(
        (r) =>
          r.json() as Promise<{
            limite50: number;
            limite100: number;
            limiteCombinado: number;
            diaInicio: number | null;
            diaFin: number | null;
          }>
      )
      .then((data) => {
        setLimite50(String(data.limite50 ?? 0));
        setLimite100(String(data.limite100 ?? 0));
        setLimiteCombinado(String(data.limiteCombinado ?? 0));
        setDiaInicio(data.diaInicio ? String(data.diaInicio) : "");
        setDiaFin(data.diaFin ? String(data.diaFin) : "");
      })
      .finally(() => setCargando(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMensaje(null);
    setGuardando(true);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limite50: Number(limite50),
          limite100: Number(limite100),
          limiteCombinado: Number(limiteCombinado),
          diaInicio: diaInicio === "" ? null : Number(diaInicio),
          diaFin: diaFin === "" ? null : Number(diaFin),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar.");
        return;
      }
      setMensaje("Configuración actualizada.");
    } finally {
      setGuardando(false);
    }
  }

  if (cargando) return <p className="text-sm text-slate-500">Cargando...</p>;

  return (
    <div className="space-y-6 max-w-xl">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Topes mensuales de horas extra</h2>
        <p className="text-sm text-slate-500 mb-4">
          Se aplican por legajo y por mes calendario. Usá 0 para no aplicar tope.
        </p>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Tope al 50%</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={limite50}
              onChange={(e) => setLimite50(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Tope al 100%</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={limite100}
              onChange={(e) => setLimite100(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Tope combinado</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={limiteCombinado}
              onChange={(e) => setLimiteCombinado(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="sm:col-span-3 border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-1">Ventana de carga</h3>
            <p className="text-sm text-slate-500 mb-3">
              Días del mes en que las áreas pueden cargar horas (por ejemplo, del 1 al 10). Dejá los
              dos campos vacíos para no aplicar restricción. No afecta a administración.
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Día de inicio</label>
            <input
              type="number"
              min={1}
              max={31}
              value={diaInicio}
              onChange={(e) => setDiaInicio(e.target.value)}
              placeholder="Sin restricción"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Día de fin</label>
            <input
              type="number"
              min={1}
              max={31}
              value={diaFin}
              onChange={(e) => setDiaFin(e.target.value)}
              placeholder="Sin restricción"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          {error && (
            <p className="sm:col-span-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {mensaje && (
            <p className="sm:col-span-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {mensaje}
            </p>
          )}

          <div className="sm:col-span-3">
            <button
              type="submit"
              disabled={guardando}
              className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-800 disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
