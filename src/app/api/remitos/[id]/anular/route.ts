import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { anularRemito } from "@/lib/remitos";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // Un remito confirmado ya no se puede anular salvo por administración
  // (excepción, no algo de uso normal): una vez generado queda firme.
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const motivo = body?.motivo ? String(body.motivo).trim() : null;

  const resultado = await anularRemito(Number(id), user.username, motivo || null);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
