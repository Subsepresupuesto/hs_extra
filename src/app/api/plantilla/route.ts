import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { generarPlantilla } from "@/lib/excel";

export async function GET() {
  const auth = await requireRole(["area", "admin"]);
  if ("error" in auth) return auth.error;

  const buffer = await generarPlantilla();
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="plantilla_horas_extra.xlsx"',
    },
  });
}
