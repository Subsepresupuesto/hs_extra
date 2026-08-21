import { dbAll, dbGet, dbRun } from "@/lib/db";

export type Limites = {
  limite50: number;
  limite100: number;
  limiteCombinado: number;
};

export async function getLimites(): Promise<Limites> {
  const rows = await dbAll<{ clave: string; valor: string }>("SELECT clave, valor FROM config");
  const map = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  return {
    limite50: Number(map.limite_50 ?? 0),
    limite100: Number(map.limite_100 ?? 0),
    limiteCombinado: Number(map.limite_combinado ?? 0),
  };
}

export async function setLimites(l: Limites): Promise<void> {
  const upsert =
    "INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor";
  await dbRun(upsert, "limite_50", String(l.limite50));
  await dbRun(upsert, "limite_100", String(l.limite100));
  await dbRun(upsert, "limite_combinado", String(l.limiteCombinado));
}

export type VentanaCarga = {
  diaInicio: number | null;
  diaFin: number | null;
};

export async function getVentanaCarga(): Promise<VentanaCarga> {
  const rows = await dbAll<{ clave: string; valor: string }>(
    "SELECT clave, valor FROM config WHERE clave IN ('ventana_dia_inicio', 'ventana_dia_fin')"
  );
  const map = Object.fromEntries(rows.map((r) => [r.clave, r.valor]));
  const diaInicio = map.ventana_dia_inicio ? Number(map.ventana_dia_inicio) : null;
  const diaFin = map.ventana_dia_fin ? Number(map.ventana_dia_fin) : null;
  return {
    diaInicio: diaInicio && diaInicio >= 1 && diaInicio <= 31 ? diaInicio : null,
    diaFin: diaFin && diaFin >= 1 && diaFin <= 31 ? diaFin : null,
  };
}

export async function setVentanaCarga(v: VentanaCarga): Promise<void> {
  const upsert =
    "INSERT INTO config (clave, valor) VALUES (?, ?) ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor";
  await dbRun(upsert, "ventana_dia_inicio", v.diaInicio ? String(v.diaInicio) : "");
  await dbRun(upsert, "ventana_dia_fin", v.diaFin ? String(v.diaFin) : "");
}

export function chequearVentanaCarga(ventana: VentanaCarga, ahora: Date = new Date()): CheckResult {
  const { diaInicio, diaFin } = ventana;
  if (!diaInicio || !diaFin) return { ok: true };

  const diaHoy = ahora.getDate();
  const dentro =
    diaInicio <= diaFin
      ? diaHoy >= diaInicio && diaHoy <= diaFin
      : diaHoy >= diaInicio || diaHoy <= diaFin; // ventana que cruza fin de mes

  if (dentro) return { ok: true };

  return {
    ok: false,
    motivoPublico: `La carga de horas extra solo está habilitada entre el día ${diaInicio} y el día ${diaFin} de cada mes.`,
    motivoAdmin: `Fuera de la ventana de carga (día ${diaInicio} a ${diaFin} del mes). Se puede editar desde "Topes".`,
  };
}

export function periodoDeFecha(fecha: string): string {
  // fecha: YYYY-MM-DD -> periodo: YYYY-MM
  return fecha.slice(0, 7);
}

export function periodoActual(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function totalesLegajoPeriodo(legajo: string, periodo: string) {
  const row = await dbGet<{ h50: number; h100: number }>(
    `SELECT COALESCE(SUM(horas_50),0) as h50, COALESCE(SUM(horas_100),0) as h100
     FROM horas_extra WHERE legajo = ? AND periodo = ?`,
    legajo,
    periodo
  );
  return row ?? { h50: 0, h100: 0 };
}

export async function yaCargado(legajo: string, periodo: string, area: string): Promise<boolean> {
  const row = await dbGet(
    "SELECT id FROM horas_extra WHERE legajo = ? AND periodo = ? AND area = ? LIMIT 1",
    legajo,
    periodo,
    area
  );
  return !!row;
}

export async function legajoLiberado(legajo: string, periodo: string): Promise<boolean> {
  const row = await dbGet(
    `SELECT id FROM legajos_liberados
     WHERE legajo = ? AND activo = 1 AND (periodo = ? OR periodo IS NULL)
     LIMIT 1`,
    legajo,
    periodo
  );
  return !!row;
}

export type CheckResult = { ok: true } | { ok: false; motivoPublico: string; motivoAdmin: string };

export async function chequearLimite(params: {
  legajo: string;
  periodo: string;
  horas50Nuevas: number;
  horas100Nuevas: number;
  limites: Limites;
}): Promise<CheckResult> {
  const { legajo, periodo, horas50Nuevas, horas100Nuevas, limites } = params;

  if (await legajoLiberado(legajo, periodo)) return { ok: true };

  const existentes = await totalesLegajoPeriodo(legajo, periodo);
  const total50 = existentes.h50 + horas50Nuevas;
  const total100 = existentes.h100 + horas100Nuevas;
  const totalCombinado = total50 + total100;

  const excesos: string[] = [];
  if (limites.limite50 > 0 && total50 > limites.limite50) {
    excesos.push(`50% (${total50.toFixed(2)} hs supera el tope de ${limites.limite50} hs)`);
  }
  if (limites.limite100 > 0 && total100 > limites.limite100) {
    excesos.push(`100% (${total100.toFixed(2)} hs supera el tope de ${limites.limite100} hs)`);
  }
  if (limites.limiteCombinado > 0 && totalCombinado > limites.limiteCombinado) {
    excesos.push(
      `combinado (${totalCombinado.toFixed(2)} hs supera el tope de ${limites.limiteCombinado} hs)`
    );
  }

  if (excesos.length > 0) {
    return {
      ok: false,
      motivoPublico: `El legajo ${legajo} supera el tope mensual de ${periodo} en: ${excesos.join(
        "; "
      )}. Contactá a la administración.`,
      motivoAdmin: `El legajo ${legajo} supera el tope mensual de ${periodo} en: ${excesos.join(
        "; "
      )}. Podés liberar el legajo desde "Liberar legajos" si corresponde.`,
    };
  }

  return { ok: true };
}
