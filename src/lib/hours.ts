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

export function periodoDeFecha(fecha: string): string {
  // fecha: YYYY-MM-DD -> periodo: YYYY-MM
  return fecha.slice(0, 7);
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

export type CheckResult = { ok: true } | { ok: false; motivo: string };

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
      motivo: `El legajo ${legajo} supera el tope mensual de ${periodo} en: ${excesos.join(
        "; "
      )}. Pedile a la administración que libere el legajo si corresponde.`,
    };
  }

  return { ok: true };
}
