import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

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

  if ((isApp || isOnboarding) && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/auth/login";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (user && isLoginFlow) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();

    const redirect = request.nextUrl.clone();
    redirect.pathname = profile?.onboarding_complete ? "/app" : "/auth/onboarding";
    return NextResponse.redirect(redirect);
  }

  if (user && isApp) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_complete")
      .eq("id", user.id)
      .maybeSingle();
    if (profile && !profile.onboarding_complete) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/auth/onboarding";
      return NextResponse.redirect(redirect);
    }
  }

  return supabaseResponse;
}
