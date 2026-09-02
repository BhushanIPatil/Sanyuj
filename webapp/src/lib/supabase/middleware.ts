import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GUEST_COOKIE, hasGuestCookie, isAuthRequiredPath } from "@/lib/auth/guest";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isApp = path.startsWith("/app");
  const isOnboarding = path.startsWith("/auth/onboarding");
  const isLoginFlow = path === "/auth/login" || path.startsWith("/auth/otp");
  const isGuest = hasGuestCookie(request.headers.get("cookie"));

  if ((isApp || isOnboarding) && !user) {
    if (isApp && isGuest && !isAuthRequiredPath(path)) {
      return supabaseResponse;
    }
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user) {
    const clearGuestCookie = (res: NextResponse) => {
      res.cookies.set(GUEST_COOKIE, "", { path: "/", maxAge: 0 });
      return res;
    };
    supabaseResponse.cookies.set(GUEST_COOKIE, "", { path: "/", maxAge: 0 });

    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete, is_active, is_deleted")
      .eq("id", user.id)
      .maybeSingle();

    const accountClosed = !!profile && (profile.is_deleted || !profile.is_active);
    if (accountClosed) {
      await supabase.auth.signOut();
      if (isApp || isOnboarding) {
        const redirect = request.nextUrl.clone();
        redirect.pathname = "/auth/login";
        return clearGuestCookie(NextResponse.redirect(redirect));
      }
      return clearGuestCookie(supabaseResponse);
    }

    if (isLoginFlow) {
      // Only skip login when the account is fully set up. An unfinished
      // session used to jump straight to onboarding and hid guest / sign-in.
      if (profile?.onboarding_complete) {
        const redirect = request.nextUrl.clone();
        const next = request.nextUrl.searchParams.get("next");
        redirect.pathname = next && next.startsWith("/app") ? next : "/app";
        redirect.search = "";
        return clearGuestCookie(NextResponse.redirect(redirect));
      }
      return clearGuestCookie(supabaseResponse);
    }

    if (isApp && profile && !profile.onboarding_complete) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/auth/login";
      redirect.searchParams.set("next", path);
      return clearGuestCookie(NextResponse.redirect(redirect));
    }
  }

  return supabaseResponse;
}
