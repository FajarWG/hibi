import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, verifySession } from "@/lib/session";

/**
 * Next.js 16 mengganti konvensi `middleware.ts` menjadi `proxy.ts`
 * dan menjalankannya di runtime Node.js.
 *
 * Guard ini hanya untuk pengalaman navigasi (redirect cepat tanpa render).
 * Otorisasi sebenarnya tetap dilakukan di `app/(app)/layout.tsx` dan di
 * setiap Server Action, karena proxy tidak boleh jadi satu satunya lapisan.
 */
const PROTECTED_PREFIXES = ["/today", "/anki", "/kakou", "/kanji", "/talk"];
const AUTH_PAGES = ["/login", "/register"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isAuthPage = AUTH_PAGES.includes(pathname);
  // Landing publik. Redirect user yang sudah login ke /today di sini supaya
  // app/page.tsx tidak perlu membaca cookie sesi dan bisa dirender statis
  // (disajikan dari CDN Vercel, tanpa komputasi serverless).
  const isRoot = pathname === "/";

  if (!isProtected && !isAuthPage && !isRoot) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySession(token);

  if (isProtected && !session) {
    const url = new URL("/login", request.nextUrl);
    // Simpan tujuan asal supaya setelah login user kembali ke tempat yang dituju.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if ((isAuthPage || isRoot) && session) {
    return NextResponse.redirect(new URL("/today", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};
