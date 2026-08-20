import { NextRequest, NextResponse } from "next/server";
import { findUserByUsername, verifyPassword, createSession, homeForRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return NextResponse.json({ error: "Usuario y contraseña son obligatorios." }, { status: 400 });
  }

  const user = await findUserByUsername(username);
  if (!user || !user.activo || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }

  await createSession(user.id);

  return NextResponse.json({ redirectTo: homeForRole(user.role) });
}
