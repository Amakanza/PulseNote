import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  // Paths that require auth:
  const protectedPaths = [/^\/$/, /^\/report/, /^\/api\/(parse|draft|export|projects|reports)/];
  const isProtected = protectedPaths.some((re) => re.test(req.nextUrl.pathname));
  if (!isProtected) return NextResponse.next();

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (k) => req.cookies.get(k)?.value,
        set: (k, v, opts) => {
          res.cookies.set(k, v, opts);
        },
        remove: (k, opts) => {
          res.cookies.set(k, "", opts);
        }
      }
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const url = req.nextUrl.clone();
    url.pathname = "/signin";
    url.searchParams.set("redirectedFrom", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|signin|signup|public).*)"],
};
