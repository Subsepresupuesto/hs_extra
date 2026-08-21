import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getLimites, getVentanaCarga, setLimites, setVentanaCarga } from "@/lib/hours";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const [limites, ventana] = await Promise.all([getLimites(), getVentanaCarga()]);
  return NextResponse.json({ ...limites, ...ventana });
}

export async function PUT(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const limite50 = Number(body?.limite50);
  const limite100 = Number(body?.limite100);
  const limiteCombinado = Number(body?.limiteCombinado);

  if ([limite50, limite100, limiteCombinado].some((n) => !Number.isFinite(n) || n < 0)) {
    return NextResponse.json({ error: "Los topes deben ser números válidos (0 = sin tope)." }, { status: 400 });
  }

  const diaInicioRaw = body?.diaInicio;
  const diaFinRaw = body?.diaFin;
  const diaInicio = diaInicioRaw === null || diaInicioRaw === "" ? null : Number(diaInicioRaw);
  const diaFin = diaFinRaw === null || diaFinRaw === "" ? null : Number(diaFinRaw);

  if (diaInicio !== null && (!Number.isInteger(diaInicio) || diaInicio < 1 || diaInicio > 31)) {
    return NextResponse.json({ error: "El día de inicio de la ventana debe ser entre 1 y 31." }, { status: 400 });
  }
  if (diaFin !== null && (!Number.isInteger(diaFin) || diaFin < 1 || diaFin > 31)) {
    return NextResponse.json({ error: "El día de fin de la ventana debe ser entre 1 y 31." }, { status: 400 });
  }
  if ((diaInicio === null) !== (diaFin === null)) {
    return NextResponse.json(
      { error: "Completá los dos días de la ventana, o dejá los dos vacíos." },
      { status: 400 }
    );
  }

  await setLimites({ limite50, limite100, limiteCombinado });
  await setVentanaCarga({ diaInicio, diaFin });
  return NextResponse.json({ ok: true });
}
