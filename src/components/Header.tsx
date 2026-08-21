import LogoutButton from "@/components/LogoutButton";
import type { SessionUser } from "@/lib/auth";

const roleLabel: Record<SessionUser["role"], string> = {
  area: "Secretaría",
  carga: "Oficina",
  admin: "Administración",
};

export default function Header({
  user,
  title,
  nav,
}: {
  user: SessionUser;
  title: string;
  nav?: { href: string; label: string }[];
}) {
  return (
    <header className="border-b border-slate-200 bg-white border-t-4 border-t-red-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-red-700 font-semibold">
            Horas Extra · {roleLabel[user.role]}
          </p>
          <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
        </div>
        <div className="flex items-center gap-4">
          {nav && (
            <nav className="flex gap-3 text-sm">
              {nav.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="text-slate-600 hover:text-red-700 font-medium"
                >
                  {n.label}
                </a>
              ))}
            </nav>
          )}
          <div className="text-sm text-slate-500 text-right">
            <div className="font-medium text-slate-700">{user.username}</div>
            {user.areaName && <div className="text-xs">{user.areaName}</div>}
          </div>
          <a
            href="/perfil"
            className="text-sm font-medium text-slate-500 hover:text-slate-900 border border-slate-200 rounded-md px-3 py-1.5"
          >
            Mi cuenta
          </a>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
