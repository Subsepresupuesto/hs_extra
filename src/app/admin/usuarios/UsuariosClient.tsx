"use client";

import { useEffect, useState, useCallback } from "react";

type Usuario = {
  id: number;
  username: string;
  role: "area" | "carga" | "admin";
  areaName: string | null;
  activo: number;
  createdAt: string;
};

const roleLabel: Record<Usuario["role"], string> = {
  area: "Área",
  carga: "Carga (solo cargar, sin ver nada)",
  admin: "Administración",
};

export default function UsuariosClient() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [cargando, setCargando] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Usuario["role"]>("area");
  const [areaName, setAreaName] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    const res = await fetch("/api/usuarios");
    const data = (await res.json()) as { usuarios: Usuario[] };
    setUsuarios(data.usuarios ?? []);
    setCargando(false);
  }, []);

  function recargar() {
    setCargando(true);
    void cargar();
  }

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/usuarios", { signal: controller.signal })
      .then((r) => r.json() as Promise<{ usuarios: Usuario[] }>)
      .then((data) => {
        setUsuarios(data.usuarios ?? []);
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
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username.trim(),
          password,
          role,
          areaName: role === "area" || role === "carga" ? areaName.trim() : null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear el usuario.");
        return;
      }
      setUsername("");
      setPassword("");
      setAreaName("");
      recargar();
    } finally {
      setEnviando(false);
    }
  }

  async function handleResetPassword(id: number) {
    const nueva = prompt("Nueva contraseña (mínimo 8 caracteres):");
    if (!nueva) return;
    const res = await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: nueva }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      alert(data.error ?? "No se pudo cambiar la contraseña.");
    }
  }

  async function handleToggleActivo(id: number, activo: boolean) {
    await fetch(`/api/usuarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo }),
    });
    recargar();
  }

  return (
    <div className="space-y-6">
      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Crear usuario</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium text-slate-700">Usuario</label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700">Rol</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Usuario["role"])}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="area">Área</option>
              <option value="carga">Carga (solo cargar, sin ver nada)</option>
              <option value="admin">Administración</option>
            </select>
          </div>
          {(role === "area" || role === "carga") && (
            <div>
              <label className="text-sm font-medium text-slate-700">Nombre del área</label>
              <input
                value={areaName}
                onChange={(e) => setAreaName(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                required
              />
            </div>
          )}

          {error && (
            <p className="sm:col-span-2 lg:col-span-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              disabled={enviando}
              className="rounded-md bg-red-700 text-white text-sm font-medium px-4 py-2.5 hover:bg-red-800 disabled:opacity-60"
            >
              {enviando ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Usuarios existentes</h2>
        {cargando ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-2 pr-4">Usuario</th>
                  <th className="py-2 pr-4">Rol</th>
                  <th className="py-2 pr-4">Área</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4"></th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="py-2 pr-4">{u.username}</td>
                    <td className="py-2 pr-4">{roleLabel[u.role]}</td>
                    <td className="py-2 pr-4">{u.areaName ?? "-"}</td>
                    <td className="py-2 pr-4">
                      {u.activo ? (
                        <span className="text-emerald-700 text-xs font-medium">Activo</span>
                      ) : (
                        <span className="text-slate-400 text-xs">Deshabilitado</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-right space-x-3">
                      <button
                        onClick={() => handleResetPassword(u.id)}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        Cambiar contraseña
                      </button>
                      <button
                        onClick={() => handleToggleActivo(u.id, !u.activo)}
                        className="text-xs text-slate-600 hover:underline"
                      >
                        {u.activo ? "Deshabilitar" : "Habilitar"}
                      </button>
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
