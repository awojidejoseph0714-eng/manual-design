import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  
  // Clear the HTTP-Only cookie
  response.cookies.delete('admin_session');
  return response;
}
