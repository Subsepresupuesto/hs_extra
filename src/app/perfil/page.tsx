import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";
import PerfilClient from "./PerfilClient";

export default async function PerfilPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col">
      <Header user={user} title="Mi cuenta" />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <PerfilClient />
      </main>
    </div>
  );
}
