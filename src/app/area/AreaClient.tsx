"use client";

import { useEffect, useState } from "react";

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

type Disponible = {
  periodo: string;
  totales: { h50: number; h100: number };
  limites: { limite50: number; limite100: number; limiteCombinado: number };
  liberado: boolean;
};

function hoyIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AreaClient({
  areaFija,
  areasDisponibles,
}: {
  areaFija: string | null;
  areasDisponibles: string[];
}) {
  const esAdmin = areaFija === null;

  const [registros, setRegistros] = useState<Registro[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  const [areaSeleccionada, setAreaSeleccionada] = useState("");
  const [legajo, setLegajo] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [fecha, setFecha] = useState(hoyIso());
  const [horas50, setHoras50] = useState("");
  const [horas100, setHoras100] = useState("");
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState<string | null>(null);
  const [disponible, setDisponible] = useState<Disponible | null>(null);

  const [archivo, setArchivo] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [resultadoBulk, setResultadoBulk] = useState<{ insertados: number; rechazados: { fila: number; motivo: string }[] } | null>(null);

  function recargar() {
    setCargandoLista(true);
    fetch("/api/horas")
      .then((r) => r.json() as Promise<{ registros: Registro[] }>)
      .then((data) => {
        setRegistros(data.registros ?? []);
        setCargandoLista(false);
      })
      .catch(() => setCargandoLista(false));
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/horas", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ registros: Registro[] }>)
      .then((data) => {
        setRegistros(data.registros ?? []);
        setCargandoLista(false);
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const legajoConsulta = legajo.trim();

  // Autocompletar nombre y apellido a partir de una carga anterior del mismo legajo.
  useEffect(() => {
    if (!legajoConsulta) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/legajos/${encodeURIComponent(legajoConsulta)}`, { signal: controller.signal })
        .then((r) => (r.ok ? (r.json() as Promise<{ encontrado: boolean; nombre: string | null; apellido: string | null }>) : null))
        .then((data) => {
          if (data?.encontrado) {
            setNombre(data.nombre ?? "");
            setApellido(data.apellido ?? "");
          }
        })
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [legajoConsulta]);

  useEffect(() => {
    if (!legajoConsulta || !fecha) return;
    const controller = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/horas/disponible?legajo=${encodeURIComponent(legajoConsulta)}&fecha=${fecha}`, {
        signal: controller.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<Disponible>) : null))
        .then((data) => setDisponible(data))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [legajoConsulta, fecha]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setExito(null);
    if (esAdmin && !areaSeleccionada) {
      setError("Elegí un área.");
      return;
    }
    setEnviando(true);
    try {
      const res = await fetch("/api/horas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          area: esAdmin ? areaSeleccionada : undefined,
          legajo: legajo.trim(),
          nombre: nombre.trim(),
          apellido: apellido.trim(),
          fecha,
          horas50: horas50 === "" ? 0 : Number(horas50),
          horas100: horas100 === "" ? 0 : Number(horas100),
          motivo: motivo.trim() || null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el registro.");
        return;
      }
      setExito("Carga registrada correctamente.");
      setLegajo("");
      setNombre("");
      setApellido("");
      setHoras50("");
      setHoras100("");
      setMotivo("");
      setDisponible(null);
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  async function handleEliminar(id: number) {
    if (!confirm("¿Eliminar esta carga? Solo se puede borrar el mismo día que se cargó.")) return;
    const res = await fetch(`/api/horas/${id}`, { method: "DELETE" });
    if (res.ok) {
      recargar();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "No se pudo eliminar.");
    }
  }

  async function handleBulkSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!archivo) return;
    if (esAdmin && !areaSeleccionada) {
      alert("Elegí un área antes de subir el archivo.");
      return;
    }
    setSubiendo(true);
    setResultadoBulk(null);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      if (esAdmin) formData.append("area", areaSeleccionada);
      const res = await fetch("/api/horas/bulk", { method: "POST", body: formData });
      const data = (await res.json()) as {
        error?: string;
        insertados: number;
        rechazados: { fila: number; motivo: string }[];
      };
      if (!res.ok) {
        alert(data.error ?? "No se pudo procesar el archivo.");
        return;
      }
      setResultadoBulk(data);
      setArchivo(null);
      recargar();
    } finally {
      setSubiendo(false);
    }
  }

  const hoy = hoyIso();

  return (
    <div className="space-y-8">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Cargar una hora extra</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {esAdmin && (
            <div>
              <label className="text-sm font-medium text-slate-700">Área</label>
              <select
                value={areaSeleccionada}
                onChange={(e) => setAreaSeleccionada(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              >
                <option value="">Elegir área…</option>
                {areasDisponibles.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          )}
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
            <label className="text-sm font-medium text-slate-700">Nombre</label>
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Apellido</label>
            <input
              value={apellido}
              onChange={(e) => setApellido(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Horas al 50%</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={horas50}
              onChange={(e) => setHoras50(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Horas al 100%</label>
            <input
              type="number"
              min={0}
              step={0.5}
              value={horas100}
              onChange={(e) => setHoras100(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-2">
            <label className="text-sm font-medium text-slate-700">Motivo (opcional)</label>
            <input
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Tarea o motivo de la hora extra"
            />
          </div>

          {disponible && legajoConsulta && (
            <div className="sm:col-span-2 lg:col-span-4 text-xs rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-600">
              Período {disponible.periodo}: acumulado {disponible.totales.h50} hs al 50% (tope{" "}
              {disponible.limites.limite50 || "sin tope"}) y {disponible.totales.h100} hs al 100% (tope{" "}
              {disponible.limites.limite100 || "sin tope"}).{" "}
              {disponible.liberado ? (
                <span className="text-emerald-700 font-medium">Legajo liberado para este período.</span>
              ) : (
                <span>Tope combinado: {disponible.limites.limiteCombinado || "sin tope"} hs.</span>
              )}
            </div>
          )}

          {error && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {exito && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {exito}
            </p>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-800 disabled:opacity-60"
            >
              {enviando ? "Guardando..." : "Guardar carga"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-2">Carga masiva por Excel</h2>
        <p className="text-sm text-slate-500 mb-4">
          Descargá la plantilla, completala y subila para cargar varios registros a la vez.{" "}
          <a href="/api/plantilla" className="text-red-700 underline font-medium">
            Descargar plantilla
          </a>
        </p>
        <form onSubmit={handleBulkSubmit} className="flex flex-wrap items-center gap-3">
          {esAdmin && (
            <select
              value={areaSeleccionada}
              onChange={(e) => setAreaSeleccionada(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Elegir área…</option>
              {areasDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          )}
          <input
            type="file"
            accept=".xlsx"
            onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
            className="text-sm"
          />
          <button
            type="submit"
            disabled={!archivo || subiendo}
            className="rounded-md bg-slate-100 text-slate-900 text-sm font-medium px-4 py-2 hover:bg-slate-200 disabled:opacity-60"
          >
            {subiendo ? "Procesando..." : "Subir archivo"}
          </button>
        </form>
        {resultadoBulk && (
          <div className="mt-4 text-sm space-y-2">
            <p className="text-emerald-700">{resultadoBulk.insertados} filas cargadas correctamente.</p>
            {resultadoBulk.rechazados.length > 0 && (
              <div className="text-red-700">
                <p className="font-medium">{resultadoBulk.rechazados.length} filas rechazadas:</p>
                <ul className="list-disc list-inside">
                  {resultadoBulk.rechazados.map((r) => (
                    <li key={r.fila}>
                      Fila {r.fila}: {r.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          {esAdmin ? "Cargas recientes" : "Cargas de tu área"}
        </h2>
        {cargandoLista ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : registros.length === 0 ? (
          <p className="text-sm text-slate-500">Todavía no hay cargas.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  {esAdmin && <th className="py-2 pr-4">Área</th>}
                  <th className="py-2 pr-4">Legajo</th>
                  <th className="py-2 pr-4">Nombre</th>
                  <th className="py-2 pr-4">Fecha</th>
                  <th className="py-2 pr-4">50%</th>
                  <th className="py-2 pr-4">100%</th>
                  <th className="py-2 pr-4">Motivo</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    {esAdmin && <td className="py-2 pr-4">{r.area}</td>}
                    <td className="py-2 pr-4">{r.legajo}</td>
                    <td className="py-2 pr-4">
                      {r.nombre} {r.apellido}
                    </td>
                    <td className="py-2 pr-4">{r.fecha}</td>
                    <td className="py-2 pr-4">{r.horas50}</td>
                    <td className="py-2 pr-4">{r.horas100}</td>
                    <td className="py-2 pr-4 text-slate-500">{r.motivo}</td>
                    <td className="py-2 pr-4 text-right">
                      {(esAdmin || r.createdAt.slice(0, 10) === hoy) && (
                        <button
                          onClick={() => handleEliminar(r.id)}
                          className="text-red-700 hover:underline text-xs"
                        >
                          Eliminar
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
