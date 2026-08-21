import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll, dbGet, dbRun } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const rows = await dbAll(
    "SELECT id, username, role, area_name as areaName, activo, created_at as createdAt FROM users ORDER BY role, username"
  );

  return NextResponse.json({ usuarios: rows });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const username = String(body?.username ?? "").trim().toLowerCase();
  const password = String(body?.password ?? "");
  const role = String(body?.role ?? "");
  const areaName = body?.areaName ? String(body.areaName).trim() : null;

  if (!username || !password || !["area", "carga", "admin"].includes(role)) {
    return NextResponse.json({ error: "Datos incompletos o rol inválido." }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: "La contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  if ((role === "area" || role === "carga") && !areaName) {
    return NextResponse.json({ error: "Los usuarios de área/carga necesitan un nombre de área." }, { status: 400 });
  }

  const existente = await dbGet("SELECT id FROM users WHERE username = ?", username);
  if (existente) {
    return NextResponse.json({ error: "Ya existe un usuario con ese nombre." }, { status: 409 });
  }

  await dbRun(
    "INSERT INTO users (username, password_hash, role, area_name) VALUES (?, ?, ?, ?)",
    username,
    hashPassword(password),
    role,
    role === "area" || role === "carga" ? areaName : null
  );

  return NextResponse.json({ ok: true });
}
