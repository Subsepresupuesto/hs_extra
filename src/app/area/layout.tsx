import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Header from "@/components/Header";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const nav =
    user.role === "admin"
      ? [
          { href: "/area", label: "Cargar horas" },
          { href: "/admin/consolidado", label: "Listado consolidado" },
          { href: "/remitos", label: "Remitos" },
          { href: "/admin", label: "Topes" },
          { href: "/admin/liberar", label: "Liberar legajos" },
          { href: "/admin/usuarios", label: "Usuarios" },
        ]
      : user.role === "area"
        ? [
            { href: "/area", label: "Cargar horas" },
            { href: "/remitos", label: "Remitos" },
          ]
        : undefined;

  return (
    <div className="flex-1 flex flex-col">
      <Header user={user} title="Carga de horas extra" nav={nav} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
