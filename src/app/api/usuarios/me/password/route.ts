import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, findUserByUsername, verifyPassword, hashPassword } from "@/lib/auth";
import { dbRun } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const actual = String(body?.actual ?? "");
  const nueva = String(body?.nueva ?? "");

  if (nueva.length < 8) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }

  const registro = await findUserByUsername(user.username);
  if (!registro || !verifyPassword(actual, registro.password_hash)) {
    return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 401 });
  }

  await dbRun("UPDATE users SET password_hash = ? WHERE id = ?", hashPassword(nueva), user.id);
  return NextResponse.json({ ok: true });
}
