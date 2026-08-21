import { dbAll } from "@/lib/db";
import RemitosClient from "./RemitosClient";

export default async function RemitosPage() {
  const rows = await dbAll<{ area: string }>(
    "SELECT DISTINCT area_name as area FROM users WHERE role IN ('area','carga') AND area_name IS NOT NULL AND activo = 1 ORDER BY area_name"
  );
  return <RemitosClient areas={rows.map((r) => r.area)} />;
}
