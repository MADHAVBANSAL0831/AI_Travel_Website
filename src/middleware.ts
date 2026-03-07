import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected routes - require authentication
  const protectedRoutes = ["/", "/chat"];
  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith("/chat/")
  );

  // Auth routes - redirect to home if already logged in
  const authRoutes = ["/login", "/register"];
  const isAuthRoute = authRoutes.some((route) => pathname === route);

  // Skip auth check if not on protected or auth routes
  if (!isProtectedRoute && !isAuthRoute) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Properly validate the session (not just check for cookies)
  const { data: { session }, error } = await supabase.auth.getSession();
  const hasSession = !!session && !error;

  // If user is not authenticated and trying to access protected route
  if (!hasSession && isProtectedRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // If user is authenticated and trying to access auth routes
  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     * - auth (auth callback)
     * - admin (admin routes - separate protection)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|auth/callback|admin).*)",
  ],
};

