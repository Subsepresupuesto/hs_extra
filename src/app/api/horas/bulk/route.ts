import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll, dbBatch, dbGet } from "@/lib/db";
import { parsearPlantilla } from "@/lib/excel";
import { chequearVentanaCarga, getLimites, getVentanaCarga, periodoDeFecha } from "@/lib/hours";

export async function POST(req: NextRequest) {
  const auth = await requireRole(["area", "carga", "admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;

  if (user.role !== "admin") {
    const ventana = await getVentanaCarga();
    const chequeoVentana = chequearVentanaCarga(ventana);
    if (!chequeoVentana.ok) {
      return NextResponse.json({ error: chequeoVentana.motivoPublico }, { status: 403 });
    }
  }

  const formData = await req.formData().catch(() => null);

  let area: string;
  if (user.role === "area" || user.role === "carga") {
    if (!user.areaName) {
      return NextResponse.json(
        { error: "Tu usuario no tiene un área asignada. Contactá a la administración." },
        { status: 400 }
      );
    }
    area = user.areaName;
  } else {
    const areaSolicitada = String(formData?.get("area") ?? "").trim();
    const existe = await dbGet(
      "SELECT 1 FROM users WHERE role IN ('area','carga') AND area_name = ? AND activo = 1",
      areaSolicitada
    );
    if (!areaSolicitada || !existe) {
      return NextResponse.json({ error: "Elegí un área válida." }, { status: 400 });
    }
    area = areaSolicitada;
  }

  const file = formData?.get("archivo");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const filas = await parsearPlantilla(Buffer.from(arrayBuffer)).catch(() => null);
  if (filas === null) {
    return NextResponse.json({ error: "No se pudo leer el archivo. Verificá que sea el Excel modelo (.xlsx)." }, { status: 400 });
  }
  if (filas.length === 0) {
    return NextResponse.json({ error: "El archivo no tiene filas para cargar." }, { status: 400 });
  }

  const errores: { fila: number; motivo: string }[] = [];

  // Traer de una sola vez todo lo que hace falta para validar (evita N consultas por fila).
  const periodosUnicos = [...new Set(filas.filter((f) => !f.errorFormato).map((f) => periodoDeFecha(f.fecha)))];
  const existentes =
    periodosUnicos.length > 0
      ? await dbAll<{ legajo: string; periodo: string; area: string; horas50: number; horas100: number }>(
          `SELECT legajo, periodo, area, horas_50 as horas50, horas_100 as horas100
           FROM horas_extra WHERE periodo IN (${periodosUnicos.map(() => "?").join(",")})`,
          ...periodosUnicos
        )
      : [];
  const liberados = await dbAll<{ legajo: string; periodo: string | null }>(
    "SELECT legajo, periodo FROM legajos_liberados WHERE activo = 1"
  );
  const limites = await getLimites();

  const sumaExistente = new Map<string, { h50: number; h100: number }>();
  const yaEnEstaArea = new Set<string>();
  for (const e of existentes) {
    const clave = `${e.legajo}|${e.periodo}`;
    const acc = sumaExistente.get(clave) ?? { h50: 0, h100: 0 };
    acc.h50 += e.horas50;
    acc.h100 += e.horas100;
    sumaExistente.set(clave, acc);
    if (e.area === area) yaEnEstaArea.add(clave);
  }
  function estaLiberado(legajo: string, periodo: string) {
    return liberados.some((l) => l.legajo === legajo && (l.periodo === periodo || l.periodo === null));
  }

  const vistosEnArchivo = new Set<string>();
  const filasValidas: (typeof filas)[number][] = [];

  for (const f of filas) {
    if (f.errorFormato) {
      errores.push({ fila: f.fila, motivo: f.errorFormato });
      continue;
    }

    const periodo = periodoDeFecha(f.fecha);
    const clave = `${f.legajo}|${periodo}`;

    if (vistosEnArchivo.has(clave)) {
      errores.push({
        fila: f.fila,
        motivo: `El legajo ${f.legajo} aparece más de una vez en el archivo para ${periodo}. Solo se puede cargar una vez por mes (una por oficina si tiene más de un cargo).`,
      });
      continue;
    }
    vistosEnArchivo.add(clave);

    if (yaEnEstaArea.has(clave)) {
      errores.push({
        fila: f.fila,
        motivo: `Ya se cargaron horas para el legajo ${f.legajo} en ${periodo} desde esta área/oficina.`,
      });
      continue;
    }

    if (!estaLiberado(f.legajo, periodo)) {
      const base = sumaExistente.get(clave) ?? { h50: 0, h100: 0 };
      const total50 = base.h50 + f.horas50;
      const total100 = base.h100 + f.horas100;
      const totalCombinado = total50 + total100;
      const excesos: string[] = [];
      if (limites.limite50 > 0 && total50 > limites.limite50) excesos.push(`50% (${total50.toFixed(2)}/${limites.limite50})`);
      if (limites.limite100 > 0 && total100 > limites.limite100) excesos.push(`100% (${total100.toFixed(2)}/${limites.limite100})`);
      if (limites.limiteCombinado > 0 && totalCombinado > limites.limiteCombinado)
        excesos.push(`combinado (${totalCombinado.toFixed(2)}/${limites.limiteCombinado})`);
      if (excesos.length > 0) {
        errores.push({ fila: f.fila, motivo: `Supera el tope mensual en: ${excesos.join("; ")}.` });
        continue;
      }
    }

    filasValidas.push(f);
  }

  // Todo o nada: si hay algún error, no se carga ninguna fila.
  if (errores.length > 0) {
    return NextResponse.json(
      { error: "El archivo tiene filas con problemas. No se cargó nada.", rechazados: errores },
      { status: 400 }
    );
  }

  await dbBatch(
    filasValidas.map((f) => ({
      sql: `INSERT INTO horas_extra
        (legajo, nombre, apellido, area, fecha, periodo, horas_50, horas_100, motivo, cargado_por, cargado_por_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        f.legajo,
        f.nombre,
        f.apellido,
        area,
        f.fecha,
        periodoDeFecha(f.fecha),
        f.horas50,
        f.horas100,
        f.motivo,
        user.id,
        user.username,
      ],
    }))
  );

  return NextResponse.json({ insertados: filasValidas.length, rechazados: [] });
}
