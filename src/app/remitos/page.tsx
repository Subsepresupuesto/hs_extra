import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { dbAll } from "@/lib/db";
import RemitosClient from "./RemitosClient";

export default async function RemitosPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "carga") redirect("/area");

  let areasDisponibles: string[] = [];
  if (user.role === "admin") {
    const rows = await dbAll<{ area: string }>(
      "SELECT DISTINCT area_name as area FROM users WHERE role IN ('area','carga') AND area_name IS NOT NULL AND activo = 1 ORDER BY area_name"
    );
    areasDisponibles = rows.map((r) => r.area);
  }

  return <RemitosClient areaFija={user.role === "admin" ? null : user.areaName} areasDisponibles={areasDisponibles} />;
}
