import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbRun } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const activo = body?.activo ? 1 : 0;

  await dbRun("UPDATE legajos_liberados SET activo = ? WHERE id = ?", activo, id);
  return NextResponse.json({ ok: true });
}
