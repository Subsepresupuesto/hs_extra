import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { confirmarRemito } from "@/lib/remitos";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { user } = auth;
  const { id } = await params;

  const resultado = await confirmarRemito(Number(id), user.username);
  if (!resultado.ok) {
    return NextResponse.json({ error: resultado.error }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
