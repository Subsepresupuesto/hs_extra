import { NextRequest, NextResponse } from "next/server";
import { requireRole, hashPassword } from "@/lib/auth";
import { dbRun } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const updates: string[] = [];
  const values: (string | number)[] = [];

  if (typeof body?.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
    }
    updates.push("password_hash = ?");
    values.push(hashPassword(body.password));
  }
  if (typeof body?.activo === "boolean") {
    updates.push("activo = ?");
    values.push(body.activo ? 1 : 0);
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "No hay cambios para aplicar." }, { status: 400 });
  }

  values.push(id);
  await dbRun(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, ...values);

  if (typeof body?.activo === "boolean" && body.activo === false) {
    await dbRun("DELETE FROM sessions WHERE user_id = ?", id);
  }

  return NextResponse.json({ ok: true });
}
