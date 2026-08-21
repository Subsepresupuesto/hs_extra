import { redirect } from "next/navigation";
import { getCurrentUser, homeForRole } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect(homeForRole(user.role));

  return (
    <div className="flex-1 flex flex-col">
      <Header
        user={user}
        title="Panel de administración"
        nav={[
          { href: "/area", label: "Cargar horas" },
          { href: "/admin/consolidado", label: "Listado consolidado" },
          { href: "/admin/remitos", label: "Remitos" },
          { href: "/admin", label: "Topes" },
          { href: "/admin/liberar", label: "Liberar legajos" },
          { href: "/admin/usuarios", label: "Usuarios" },
        ]}
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
