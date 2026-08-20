import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex-1 flex flex-col">
      <Header
        user={user}
        title="Carga de horas extra"
        nav={
          user.role === "admin"
            ? [
                { href: "/area", label: "Cargar horas" },
                { href: "/admin/consolidado", label: "Listado consolidado" },
                { href: "/admin", label: "Topes" },
                { href: "/admin/liberar", label: "Liberar legajos" },
                { href: "/admin/usuarios", label: "Usuarios" },
              ]
            : undefined
        }
      />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
