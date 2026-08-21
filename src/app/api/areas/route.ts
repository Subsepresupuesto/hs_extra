import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { dbAll } from "@/lib/db";

export async function GET() {
  const auth = await requireRole(["admin"]);
  if ("error" in auth) return auth.error;

  const rows = await dbAll<{ area: string }>(
    "SELECT DISTINCT area_name as area FROM users WHERE role IN ('area','carga') AND area_name IS NOT NULL ORDER BY area_name"
  );

  return NextResponse.json({ areas: rows.map((r) => r.area) });
}
