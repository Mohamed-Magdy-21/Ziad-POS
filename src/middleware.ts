import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/auth/',
  '/favicon.ico',
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow static, _next and public files
  if (pathname.startsWith('/_next') || pathname.startsWith('/static') || pathname.startsWith('/public')) {
    return NextResponse.next();
  }

  // Allow explicit public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Get token (NextAuth JWT)
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (!token) {
    // Not authenticated -> redirect to login
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = (token as any).role;

  // RBAC: only ADMIN can access inventory and users pages
  if (pathname.startsWith('/inventory') || pathname.startsWith('/users') || pathname.startsWith('/api/users')) {
    if (role !== 'ADMIN') {
      const posUrl = new URL('/pos', req.url);
      return NextResponse.redirect(posUrl);
    }
  }

  // Cashiers can access POS routes and invoice routes
  if (pathname.startsWith('/pos') || pathname.startsWith('/invoice') || pathname.startsWith('/api/products') || pathname.startsWith('/api/sales')) {
    // all authenticated users can access POS, invoice and product/sale APIs
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/:path*',
};
