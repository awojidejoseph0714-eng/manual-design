import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-please-replace-in-production'
);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Protect admin dashboard and admin API endpoints
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    // Exclude the login page and authentication API route
    if (pathname === '/admin/login' || pathname === '/api/auth/login') {
      return NextResponse.next();
    }

    const token = req.cookies.get('admin_session')?.value;

    if (!token) {
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    try {
      // Verify JWT session token (Edge runtime compatible)
      const { payload } = await jwtVerify(token, JWT_SECRET);

      const response = NextResponse.next();
      // Inject admin details to headers for API route checking
      response.headers.set('x-admin-user', payload.username as string);
      return response;
    } catch (error) {
      console.error('Admin middleware session verification failed:', error);
      const response = NextResponse.redirect(new URL('/admin/login', req.url));
      response.cookies.delete('admin_session');
      return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
