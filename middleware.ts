import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./lib/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Route segments (after optional locale prefix) that require a logged-in user.
const PROTECTED_SEGMENTS = ["/profile", "/academy"];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_SEGMENTS.some(
    (seg) =>
      pathname === seg ||
      pathname.startsWith(`${seg}/`) ||
      routing.locales.some(
        (locale) =>
          pathname === `/${locale}${seg}` ||
          pathname.startsWith(`/${locale}${seg}/`)
      )
  );
}

export async function middleware(request: NextRequest) {
  // ── Step 1: Always run Supabase to refresh the session token ───────────────
  //
  // Supabase SSR requires createServerClient on EVERY request — not just
  // protected ones — so it can silently rotate the access token before it
  // expires.  Skipping this for public routes was the root cause of the
  // "freeze after login" bug: router.refresh() asked the server to re-render
  // but the middleware returned a stale response with no refreshed cookie, so
  // the RSC cache never saw the new session.
  //
  // IMPORTANT: nothing must execute between createServerClient and getUser().
  // Even an innocent log statement can break token rotation.

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet: { name: string; value: string; options: CookieOptions }[]) => {
          // Write into both the request (so downstream Server Components see
          // the refreshed token) and into supabaseResponse (so the browser
          // receives Set-Cookie with the rotated token).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() validates the JWT and refreshes it when close to expiry.
  // Do NOT use getSession() — it trusts the cookie without server validation.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ── Step 2: Guard protected routes ─────────────────────────────────────────
  if (isProtectedPath(request.nextUrl.pathname) && !user) {
    const url    = request.nextUrl.clone();
    const path   = request.nextUrl.pathname;
    const locale = routing.locales.find(
      (l) => path.startsWith(`/${l}/`) || path === `/${l}`
    );
    url.pathname = locale ? `/${locale}` : "/";
    url.search   = "";
    return NextResponse.redirect(url);
  }

  // ── Step 3: Run next-intl locale detection ─────────────────────────────────
  // Pass the now-updated request so intl sees the refreshed cookies.
  const intlResponse = intlMiddleware(request);

  // Merge the Supabase-refreshed auth cookies onto the intl response so the
  // browser receives both the locale cookie AND the rotated access token.
  supabaseResponse.cookies.getAll().forEach(({ name, value }) => {
    intlResponse.cookies.set(name, value);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    // All routes except Next.js internals, static files, and API routes.
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
