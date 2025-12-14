import { NextRequest, NextResponse } from "next/server";

type BetterAuthGetSessionResponse = {
	user?: unknown;
	session?: unknown;
	data?: {
		user?: unknown;
		session?: unknown;
	} | null;
} | null;

async function hasSession(request: NextRequest): Promise<boolean> {
	const url = new URL("/api/auth/get-session", request.nextUrl.origin);
	const res = await fetch(url, {
		method: "GET",
		headers: {
			cookie: request.headers.get("cookie") ?? "",
		},
		cache: "no-store",
	});

	if (!res.ok) {
		return false;
	}

	const json = (await res.json().catch(() => null)) as BetterAuthGetSessionResponse;
	if (!json) {
		return false;
	}

	return Boolean(
		(json as any).user ||
			(json as any).session ||
			(json as any).data?.user ||
			(json as any).data?.session,
	);
}

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	const isProtectedRoute = pathname.startsWith("/user");

	const isSignInRoute = pathname === "/sign-in";

	const sessionExists = await hasSession(request);

	if (!sessionExists && isProtectedRoute) {
		const redirectUrl = new URL("/sign-in", request.url);
		redirectUrl.searchParams.set(
			"next",
			`${request.nextUrl.pathname}${request.nextUrl.search}`,
		);
		return NextResponse.redirect(redirectUrl);
	}

	if (sessionExists && isSignInRoute) {
		const nextPath = request.nextUrl.searchParams.get("next");
		if (nextPath && nextPath.startsWith("/")) {
			return NextResponse.redirect(new URL(nextPath, request.url));
		}
		return NextResponse.redirect(new URL("/user/profile", request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ["/user/:path*", "/sign-in"],
};
