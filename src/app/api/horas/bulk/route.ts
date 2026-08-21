import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbGet, dbRun } from "@/lib/db";
import { parsearPlantilla } from "@/lib/excel";
import {
  chequearVentanaCarga,
  getLimites,
  getVentanaCarga,
  periodoDeFecha,
  totalesLegajoPeriodo,
  legajoLiberado,
} from "@/lib/hours";

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

  const limites = await getLimites();
  // Totales corridos por (legajo, periodo) para validar acumulados dentro del mismo archivo.
  const acumulado = new Map<string, { h50: number; h100: number }>();

  const insertados: number[] = [];
  const rechazados: { fila: number; motivo: string }[] = [];

  for (const f of filas) {
    if (f.errorFormato) {
      rechazados.push({ fila: f.fila, motivo: f.errorFormato });
      continue;
    }

    const periodo = periodoDeFecha(f.fecha);
    const clave = `${f.legajo}__${periodo}`;
    let base = acumulado.get(clave);
    if (!base) {
      base = await totalesLegajoPeriodo(f.legajo, periodo);
      acumulado.set(clave, base);
    }

    const liberado = await legajoLiberado(f.legajo, periodo);
    if (!liberado) {
      const total50 = base.h50 + f.horas50;
      const total100 = base.h100 + f.horas100;
      const totalCombinado = total50 + total100;
      const excesos: string[] = [];
      if (limites.limite50 > 0 && total50 > limites.limite50) excesos.push(`50% (${total50.toFixed(2)}/${limites.limite50})`);
      if (limites.limite100 > 0 && total100 > limites.limite100) excesos.push(`100% (${total100.toFixed(2)}/${limites.limite100})`);
      if (limites.limiteCombinado > 0 && totalCombinado > limites.limiteCombinado)
        excesos.push(`combinado (${totalCombinado.toFixed(2)}/${limites.limiteCombinado})`);
      if (excesos.length > 0) {
        rechazados.push({
          fila: f.fila,
          motivo: `Supera el tope mensual en: ${excesos.join("; ")}.`,
        });
        continue;
      }
    }

    await dbRun(
      `INSERT INTO horas_extra
        (legajo, nombre, apellido, area, fecha, periodo, horas_50, horas_100, motivo, cargado_por, cargado_por_usuario)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      f.legajo,
      f.nombre,
      f.apellido,
      area,
      f.fecha,
      periodo,
      f.horas50,
      f.horas100,
      f.motivo,
      user.id,
      user.username
    );
    base.h50 += f.horas50;
    base.h100 += f.horas100;
    insertados.push(f.fila);
  }

  return NextResponse.json({
    insertados: insertados.length,
    rechazados,
  });
}
