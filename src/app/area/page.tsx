import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dbAll } from "@/lib/db";
import AreaClient from "./AreaClient";

export default async function AreaPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  let areas: string[] = [];
  if (user.role === "admin") {
    const rows = await dbAll<{ area: string }>(
      "SELECT DISTINCT area_name as area FROM users WHERE role IN ('area','carga') AND area_name IS NOT NULL AND activo = 1 ORDER BY area_name"
    );
    areas = rows.map((r) => r.area);
  }

  return <AreaClient rol={user.role} areasDisponibles={areas} />;
}
