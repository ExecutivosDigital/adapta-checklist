import { NextRequest, NextResponse } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];

const TOKEN_COOKIE = process.env.NEXT_PUBLIC_USER_TOKEN ?? "adapta_driver_token";
const PERFIL_COOKIE = "adapta_perfil";

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(TOKEN_COOKIE)?.value;
  const perfil = request.cookies.get(PERFIL_COOKIE)?.value; // "frota" | "motorista"
  const onPublicRoute = isPublicRoute(pathname);

  // Home de cada perfil: a Frota NÃO cai no fluxo do motorista.
  const home = perfil === "frota" ? "/frota" : "/";
  const isFrotaRoute = pathname === "/frota" || pathname.startsWith("/frota/");

  const redirect = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = "";
    return NextResponse.redirect(url);
  };

  // Já logado numa rota pública → manda pra home do perfil.
  if (token && onPublicRoute) return redirect(home);

  // Não logado numa rota privada → login.
  if (!token && !onPublicRoute) return redirect("/login");

  // Mantém cada perfil na sua casa (só a HOME; cross-nav legítima continua livre):
  if (token && perfil === "frota" && pathname === "/") return redirect("/frota");
  if (token && perfil !== "frota" && isFrotaRoute) return redirect("/");

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.png|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
