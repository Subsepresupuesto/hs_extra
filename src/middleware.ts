import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "hs_extra_session";

const rutasProtegidas = ["/area", "/admin", "/perfil", "/imprimir", "/remitos"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = rutasProtegidas.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/area/:path*", "/admin/:path*", "/perfil/:path*", "/imprimir/:path*", "/remitos/:path*"],
};
