import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { dbGet, dbRun, type Role } from "@/lib/db";

const SESSION_COOKIE = "hs_extra_session";
const SESSION_DAYS = 7;

export type SessionUser = {
  id: number;
  username: string;
  role: Role;
  areaName: string | null;
};

type UsuarioRow = {
  id: number;
  username: string;
  password_hash: string;
  role: Role;
  area_name: string | null;
  activo: number;
};

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compareSync(plain, hash);
}

export function hashPassword(plain: string) {
  return bcrypt.hashSync(plain, 10);
}

function tokenAleatorio(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function findUserByUsername(username: string) {
  return dbGet<UsuarioRow>(
    "SELECT id, username, password_hash, role, area_name, activo FROM users WHERE username = ?",
    username
  );
}

export async function createSession(userId: number) {
  const token = tokenAleatorio();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await dbRun("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)", token, userId, expiresAt);

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.HS_EXTRA_HTTPS === "1",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await dbRun("DELETE FROM sessions WHERE token = ?", token);
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await dbGet<{
    id: number;
    username: string;
    role: Role;
    areaName: string | null;
    activo: number;
    expiresAt: string;
  }>(
    `SELECT u.id, u.username, u.role, u.area_name as areaName, u.activo, s.expires_at as expiresAt
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    token
  );

  if (!row) return null;
  if (new Date(row.expiresAt).getTime() < Date.now()) {
    await dbRun("DELETE FROM sessions WHERE token = ?", token);
    return null;
  }
  if (!row.activo) return null;

  return {
    id: row.id,
    username: row.username,
    role: row.role,
    areaName: row.areaName,
  };
}

export function homeForRole(role: Role) {
  if (role === "area") return "/area";
  return "/admin";
}

export async function requireRole(
  roles: Role[]
): Promise<{ user: SessionUser } | { error: Response }> {
  const { NextResponse } = await import("next/server");
  const user = await getCurrentUser();
  if (!user) {
    return { error: NextResponse.json({ error: "No autenticado." }, { status: 401 }) };
  }
  if (!roles.includes(user.role)) {
    return { error: NextResponse.json({ error: "No autorizado." }, { status: 403 }) };
  }
  return { user };
}
