import { NextRequest, NextResponse } from "next/server";

export async function middleware(req: NextRequest) {
    console.log("lewat middleware")

    const access = req.cookies.get("access_token")?.value;
    const refresh = req.cookies.get("refresh_token")?.value;

    if (!access && !refresh) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // const pathname = req.nextUrl.pathname;
    // const isAdminRoute = pathname.startsWith("/admin");
    // if (isAdminRoute && !accessToken) {
    //     return NextResponse.redirect(new URL("/login", req.url));
    // }

    return NextResponse.next()
}

export const config = {
    matcher: [
        "/((?!login|forgot-password|_next|api|favicon.ico).*)",
    ],

};