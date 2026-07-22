import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-secret-key-please-replace-in-production'
);

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD || 'bs8110pass';

    if (username !== expectedUser || password !== expectedPass) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    // Create session JWT token
    const token = await new SignJWT({ username, role: 'admin' })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    const response = NextResponse.json({ success: true, message: 'Login successful' });
    
    // Set HTTP-Only Cookie
    response.cookies.set('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error processing request' }, { status: 500 });
  }
}
