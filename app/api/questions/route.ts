import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSanityWriteClient } from '@/lib/sanity';

// Zod Schema for validation
const submissionSchema = z.object({
  email: z.string().email('Invalid email address'),
  question: z.string().min(10, 'Question must be at least 10 characters').max(1000, 'Question cannot exceed 1000 characters'),
  website: z.string().optional(), // Honeypot
});

// Simple in-memory rate-limiter (for static serverless/VPS run)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 15 * 60 * 1000; // 15 mins
  const maxRequests = 5;

  const record = rateLimitStore.get(ip);
  if (!record) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + limitWindow });
    return false;
  }

  if (now > record.resetTime) {
    rateLimitStore.set(ip, { count: 1, resetTime: now + limitWindow });
    return false;
  }

  record.count++;
  return record.count > maxRequests;
}

// Basic HTML escaping helper to neutralize XSS
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.ip || 'unknown-ip';

    // 1. Rate Limit Check
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await req.json();

    // 2. Honeypot Validation
    if (body.website) {
      // Silently discard spam to trick bots into thinking they succeeded
      console.log(`Spam submission trapped from IP: ${ip}`);
      return NextResponse.json({ success: true, message: 'Submission received' });
    }

    // 3. Zod Payload Validation
    const parsed = submissionSchema.safeParse(body);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || 'Invalid payload';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { email, question } = parsed.data;

    // 4. Sanitize Input
    const sanitizedQuestion = escapeHtml(question.trim());
    const sanitizedEmail = email.toLowerCase().trim();

    // 5. Write to Sanity Content Lake
    try {
      const writeClient = getSanityWriteClient();
      await writeClient.create({
        _type: 'userSubmission',
        email: sanitizedEmail,
        question: sanitizedQuestion,
        status: 'pending',
        timestamp: new Date().toISOString(),
      });
    } catch (sanityError) {
      console.error('Failed writing to Sanity:', sanityError);
      // Fallback: log it locally so we don't lose it if Sanity API is unreachable
      console.log(`[FALLBACK LOG] Submission - Email: ${sanitizedEmail}, Question: ${sanitizedQuestion}`);
      return NextResponse.json(
        { error: 'CMS connection offline. Submission logged in fallback queue.' },
        { status: 200 }
      );
    }

    return NextResponse.json({ success: true, message: 'Submission successfully received!' });
  } catch (err: any) {
    console.error('Submission api error:', err);
    return NextResponse.json({ error: 'Server error processing request.' }, { status: 500 });
  }
}
