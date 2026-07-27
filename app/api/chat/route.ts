import { anthropic } from '@ai-sdk/anthropic';
import { streamText, Message } from 'ai';
import { LRUCache } from 'lru-cache';
import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting using lru-cache
const rateLimitCache = new LRUCache<string, { count: number; lastReset: number }>({
  max: 500, // Maximum number of unique IPs to track
  ttl: 1000 * 60 * 60, // 1 hour TTL
});

const MAX_REQUESTS_PER_HOUR = 20;

export async function POST(req: NextRequest) {
  try {
    // 1. Rate Limiting Check
    const ip = req.ip || req.headers.get('x-forwarded-for') || 'anonymous';
    const now = Date.now();
    const windowStart = now - (1000 * 60 * 60);

    let rateLimitInfo = rateLimitCache.get(ip);
    
    if (!rateLimitInfo || rateLimitInfo.lastReset < windowStart) {
      // Reset window
      rateLimitInfo = { count: 1, lastReset: now };
    } else {
      rateLimitInfo.count++;
    }
    
    rateLimitCache.set(ip, rateLimitInfo);

    if (rateLimitInfo.count > MAX_REQUESTS_PER_HOUR) {
      return new NextResponse('Rate limit exceeded. Please try again later or escalate to a human.', { status: 429 });
    }

    // 2. Parse Request
    const { messages, context } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new NextResponse('Invalid messages array', { status: 400 });
    }

    // 3. System Prompt & Persona
    const systemPrompt = `You are a strict structural engineering teaching assistant for the "Manual Design" guide. 
    Explain concepts using BS 8110 terminology consistent with the provided context.
    
    IMPORTANT RULES:
    1. If a question falls outside BS 8110 or the scope of the provided guide text, say so explicitly rather than guessing or hallucinating.
    2. Do NOT invent formulas or clause numbers. If you do not know the exact BS 8110 clause, do not state one.
    3. Be helpful, explanatory, and structured in your responses.
    4. Your answers will eventually be saved as reference material, so accuracy is paramount.
    
    Context from the guide that the user was reading:
    """
    ${context || 'No specific context highlighted.'}
    """`;

    // 4. Stream response using Claude 3.5 Sonnet
    const result = await streamText({
      model: anthropic('claude-3-5-sonnet-20240620'),
      system: systemPrompt,
      messages: messages as Message[],
      maxTokens: 1000,
      temperature: 0.2, // Low temperature for factual accuracy
    });

    return result.toDataStreamResponse();
    
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new NextResponse(error.message || 'An error occurred processing your request', { status: 500 });
  }
}
